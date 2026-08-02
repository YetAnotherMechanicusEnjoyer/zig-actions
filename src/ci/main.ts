import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as process from 'process';
import { installZig } from '../utils';

const DEFAULT_ZIG_VERSION = "0.16.0";
const ZIG_ERROR_REGEX = /^(.+?):(\d+):(\d+):\s*([^\s:]+)(?::\s*|\s+in\s+)(.*)$/;

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

    if (type === 'error' || type.startsWith('0x')) {
      core.error(message, properties);
    } else if (type === 'warning') {
      core.warning(message, properties);
    } else {
      core.notice(message, properties);
    }
  }
}

async function runCommand(cmd: string, name: string): Promise<void> {
  if (!cmd || cmd.trim() === '' || cmd === 'none') return;
  const failure = core.getBooleanInput('failure-on-error', { required: true });

  core.startGroup(`Executing ${name}...`);

  const isWindows = process.platform === 'win32';
  const shell = isWindows ? 'cmd' : 'sh';
  const shellArgs = isWindows ? ['/c', cmd] : ['-c', cmd];

  const exitCode = await exec.exec(shell, shellArgs, {
    ignoreReturnCode: true,
    listeners: {
      stdline: (data: string) => parseZigOutput(data),
      errline: (data: string) => parseZigOutput(data)
    }
  });

  if (failure === true && exitCode !== 0) {
    throw new Error(`Command ${name} failed. More details in logs.`);
  }

  core.endGroup();
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
