import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { installZig } from '../utils';

function hashFile(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function run(): Promise<void> {
  try {
    const workingDir = core.getInput('working-directory') || '.';
    const token = core.getInput('github-token', { required: true });
    const binaryName = core.getInput('binary-name', { required: true });
    const target = core.getInput('target', { required: true });
    const version = core.getInput('zig-version') || '0.16.0';
    const optimize = core.getInput('optimize') || 'ReleaseFast';
    const extraFiles = core.getInput('extra-files');

    await installZig(version);

    if (workingDir && workingDir !== '.') {
      process.chdir(workingDir);
    }

    core.startGroup(`Compiling for ${target}`);
    const buildArgs = ['build', `-Dtarget=${target}`, `-Doptimize=${optimize}`];
    await exec.exec('zig', buildArgs);
    core.endGroup();

    const isWindows = target.includes('windows');
    const actualBinaryName = isWindows ? `${binaryName}.exe` : binaryName;
    const binPath = path.join('zig-out', 'bin', actualBinaryName);

    if (!fs.existsSync(binPath)) {
      throw new Error(`Binary not found: ${binPath}. Check the name in your build.zig.`);
    }

    core.startGroup('Packaging assets');
    const tagName = github.context.ref.replace('refs/tags/', '');
    const archiveName = `${binaryName}-${tagName}-${target}.tar.gz`;

    const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zig-release-'));
    fs.copyFileSync(binPath, path.join(stagingDir, actualBinaryName));

    if (extraFiles) {
      const files = extraFiles.split(',').map(f => f.trim());
      for (const f of files) {
        if (fs.existsSync(f)) {
          fs.copyFileSync(f, path.join(stagingDir, path.basename(f)));
        }
      }
    }

    const filesToArchive = fs.readdirSync(stagingDir);
    await exec.exec('tar', ['-czvf', archiveName, ...filesToArchive], { cwd: stagingDir });

    const finalArchivePath = path.resolve(archiveName);
    fs.renameSync(path.join(stagingDir, archiveName), finalArchivePath);

    const hash = hashFile(finalArchivePath);
    const hashFileName = `${archiveName}.sha256`;
    fs.writeFileSync(hashFileName, `${hash}  ${archiveName}`);
    core.endGroup();

    core.startGroup('Upload to GitHub Releases');
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    let release_id: number;

    try {
      const getResponse = await octokit.rest.repos.getReleaseByTag({ owner, repo, tag: tagName });
      release_id = getResponse.data.id;
    } catch (error: any) {
      if (error.status === 404) {
        const createResponse = await octokit.rest.repos.createRelease({
          owner, repo, tag_name: tagName, name: tagName, draft: false, prerelease: false
        });
        release_id = createResponse.data.id;
      } else {
        throw error;
      }
    }

    const archiveBuffer = fs.readFileSync(finalArchivePath);
    await octokit.rest.repos.uploadReleaseAsset({
      owner, repo, release_id,
      name: archiveName,
      data: archiveBuffer as unknown as string
    });

    const hashBuffer = fs.readFileSync(hashFileName);
    await octokit.rest.repos.uploadReleaseAsset({
      owner, repo, release_id,
      name: hashFileName,
      data: hashBuffer as unknown as string
    });

    core.info(`Successfully uploaded assets!`);
    core.endGroup();

  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
