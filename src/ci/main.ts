import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as process from 'process';

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
    const workingDir = core.getInput('WORKING_DIRECTORY') || '.';
    const testCmd = core.getInput('COMMAND_TEST') || 'zig build test';

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
