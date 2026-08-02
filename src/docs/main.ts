import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as process from 'process';
import * as path from 'path';
import * as fs from 'fs';
import { installZig } from '../utils';

async function deployDocs(docsFolder: string, branch: string, token: string): Promise<void> {
  core.startGroup(`Deploying on branch ${branch}`);

  const fullDocsPath = path.resolve(docsFolder);
  if (!fs.existsSync(fullDocsPath)) {
    throw new Error(`Documentation directory "${docsFolder}" not found. Documentation generation failed?`);
  }

  const repo = process.env.GITHUB_REPOSITORY;
  const remoteUrl = `https://x-access-token:${token}@github.com/${repo}.git`;

  const execOpts = { cwd: fullDocsPath };

  await exec.exec('git', ['init'], execOpts);
  await exec.exec('git', ['checkout', '-b', branch], execOpts);
  await exec.exec('git', ['config', 'user.name', 'github-actions[bot]'], execOpts);
  await exec.exec('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com'], execOpts);
  await exec.exec('git', ['add', '.'], execOpts);
  await exec.exec('git', ['commit', '-m', 'feat(docs): Deploy Zig documentation'], execOpts);
  await exec.exec('git', ['push', '-f', remoteUrl, branch], execOpts);

  core.info(`Documentation pushed successfully on ${branch}!`);
  core.endGroup();
}

async function run(): Promise<void> {
  try {
    const version = core.getInput('zig-version') || '0.16.0';
    const workingDir = core.getInput('working-directory') || '.';
    const commandDocs = core.getInput('command-docs') || 'zig build docs';
    const docsFolder = core.getInput('docs-folder') || 'zig-out/docs';
    const deployBranch = core.getInput('deploy-branch') || 'gh-pages';
    const token = core.getInput('github-token', { required: true });

    await installZig(version);

    if (workingDir && workingDir !== '.') {
      process.chdir(workingDir);
    }

    core.startGroup('Generating documentation');
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd' : 'sh';
    const shellArgs = isWindows ? ['/c', commandDocs] : ['-c', commandDocs];

    const exitCode = await exec.exec(shell, shellArgs, { ignoreReturnCode: true });
    if (exitCode !== 0) {
      throw new Error(`Generation failed (exit code: ${exitCode})`);
    }
    core.endGroup();

    await deployDocs(docsFolder, deployBranch, token);

    core.info('Zig Docs CD ended!');
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
