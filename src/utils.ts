import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export async function installZig(version: string): Promise<void> {
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

  const items = fs.readdirSync(extractedPath);

  let toolPath = extractedPath;
  const zigFolder = items.find(item => {
    const itemPath = path.join(extractedPath, item);
    return item.startsWith('zig-') && fs.statSync(itemPath).isDirectory();
  });

  if (zigFolder) {
    toolPath = path.join(extractedPath, zigFolder);
  }

  core.addPath(toolPath);
  core.info(`Zig installed & added the PATH.`);
  core.endGroup();
}
