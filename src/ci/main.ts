import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import * as os from 'os';
import * as process from 'process';
import * as path from 'path';

const DEFAULT_ZIG_VERSION = "0.16.0";
const ZIG_ERROR_REGEX = /^([^:]+):(\d+):(\d+):\s+(error|warning):\s+(.*)$/;

function parseZigOutput(line: string) {
  const match = line.match(ZIG_ERROR_REGEX);

  if (match) {
    const file = match[1];
    const lineNum = parseInt(match[2], 10);
    const colNum = parseInt(match[3], 10);
    const type = match[4];
    const message = match[5];

    const properties: core.AnnotationProperties = {
      title: `Zig Compiler ${type === 'error' ? 'Error' : 'Warning'}`,
      file: file,
      startLine: lineNum,
      startColumn: colNum,
    };

    if (type === 'error') {
      core.error(message, properties);
    } else if (type === 'warning') {
      core.warning(message, properties);
    }
  }
}

async function installZig(version: string): Promise<void> {
  const v = version === "master" ? "master" : `v${version}`;
  core.startGroup(`Installing Zig ${v}`);

  const platform = os.platform();
  const arch = os.arch();

  let zigPlatform = '';
  let ext = 'tar.xz';

  if (platform === 'linux') zigPlatform = 'linux';
  else if (platform === 'darwin') zigPlatform = 'macos';
  else if (platform === 'win32') {
    zigPlatform = 'windows';
    ext = 'zip';
  } else {
    throw new Error(`Unsupported OS: ${platform}`);
  }

  let zigArch = '';
  if (arch === 'x64') zigArch = 'x86_64';
  else if (arch === 'arm64') zigArch = 'aarch64';
  else {
    throw new Error(`Unsupported architecture: ${arch}`);
  }

  const url = `https://ziglang.org/download/${version}/zig-${zigArch}-${zigPlatform}-${version}.${ext}`;
  core.info(`Downloading from: ${url}`);

  const downloadPath = await tc.downloadTool(url);
  let extractedPath = '';

  core.info(`Extracting archive...`);
  if (ext === 'zip') {
    extractedPath = await tc.extractZip(downloadPath);
  } else {
    extractedPath = await tc.extractTar(downloadPath, undefined, 'x');
  }

  const folderName = `zig-${zigPlatform}-${zigArch}-${version}`;
  const toolPath = path.join(extractedPath, folderName);

  core.addPath(toolPath);
  core.info(`Zig installed & added the PATH.`);
  core.endGroup();
}

async function runCommand(cmd: string, name: string): Promise<void> {
  if (!cmd || cmd.trim() === '' || cmd === 'none') return;

  core.startGroup(`Executing ${name}...`);

  try {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd' : 'sh';
    const shellArgs = isWindows ? ['/c', cmd] : ['-c', cmd];

    await exec.exec(shell, shellArgs, {
      listeners: {
        stdline: (data: string) => parseZigOutput(data),
        errline: (data: string) => parseZigOutput(data)
      }
    });
  } catch (error) {
    throw new Error(`Command "${name}" failed. More details in annotations.`);
  } finally {
    core.endGroup();
  }
}

async function run(): Promise<void> {
  try {
    const version = core.getInput('zig-version') || DEFAULT_ZIG_VERSION;
    const workingDir = core.getInput('working-directory') || '.';
    const testCmd = core.getInput('command-test') || 'zig build test';

    await installZig(version);

    if (workingDir && workingDir !== '.') {
      core.info(`Changing working directory: ${workingDir}`);
      process.chdir(workingDir);
    }

    await runCommand(testCmd, 'Tests');

    core.info('CI ended successfully!');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
