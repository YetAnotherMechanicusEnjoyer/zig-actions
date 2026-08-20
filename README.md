# Zig Actions

A GitHub Action to automate Zig compilation, testing, formatting checks & GitHub Pages for docs while reporting compiler errors directly as GitHub annotations.

## Usage

### All in one

Add this step to your workflow after checking out your repository:

```yaml
permissions:
  contents: write

jobs:
  zig:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: YetAnotherMechanicusEnjoyer/zig-actions@v1
        with:
          zig-version: '0.16.0'
          working-directory: '.'
          command-test: 'zig build test'
          failure-on-error: true
          command-docs: 'zig build docs'
          docs-directory: 'zig-out/docs'
          deploy-branch: 'gh-pages'
          binary-name: "your-executable-name"
          target: "x86_64-linux" // (you can also use matrix for multiple targets)
          optimize: "ReleaseFast"
          extra-files: "README.md, LICENSE"
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Zig CI only

Add this step to your workflow after checking out your repository:

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest 
    steps:
      - uses: actions/checkout@v4
      - uses: YetAnotherMechanicusEnjoyer/zig-actions/ci@v1
        with:
          zig-version: '0.16.0'
          working-directory: '.'
          command-test: 'zig build test'
          failure-on-error: true
```

### Zig Docs CD only

Add this step to your workflow after checking out your repository:

```yaml
permissions:
  contents: write

jobs:
  docs:
    runs-on: ubuntu-latest 
    steps:
      - uses: actions/checkout@v4
      - uses: YetAnotherMechanicusEnjoyer/zig-actions/docs@v1
        with:
          zig-version: '0.16.0'
          working-directory: '.'
          command-docs: 'zig build docs'
          docs-directory: 'zig-out/docs'
          deploy-branch: 'gh-pages'
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Zig Release only

Add this step to your workflow after checking out your repository:

```yaml
on:
  push:
    tags:
      - "v[0-9]+.[0-9]+.[0-9]+*"

permissions:
  contents: write

jobs:
  publish:
    name: Publishing for ${{ matrix.target }}
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        target:
          - x86_64-linux
          - aarch64-linux
          - x86_64-macos
          - aarch64-macos
          - x86_64-windows

    steps:
      - uses: actions/checkout@v4

      - uses: YetAnotherMechanicusEnjoyer/zig-actions/release@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          zig-version: '0.16.0'
          working-directory: '.'
          binary-name: 'your-executable'
          target: ${{ matrix.target }}
          optimize: 'ReleaseFast'
          extra-files: 'README.md, LICENSE'
```

## Inputs

> [!WARNING]
>
> **All in one** option needs all the following inputs

### Zig CI

|Input|Description|Required|Default|
|-----|-----------|--------|-------|
|zig-version|The version of Zig to install.|No|'0.16.0'|
|working-directory|The working directory where commands are executed.|No|'.'|
|command-test|The command to run your tests.|No|'zig build test'|
|failure-on-error|If the action should fail on error.|No|true|

### Zig Docs CD

|Input|Description|Required|Default|
|-----|-----------|--------|-------|
|zig-version|The version of Zig to install.|No|'0.16.0'|
|working-directory|The working directory where commands are executed.|No|'.'|
|command-docs|The command to generate documentation.|No|'zig build docs'|
|docs-directory|The directory where the documentation is generated.|No|'zig-out/docs'|
|deploy-branch|The branch to deploy documentation.|No|'gh-pages'|
|github-token|Your GitHub Token (more likely secrets.GITHUB_TOKEN).|Yes||

### Zig Release
|Input|Description|Required|Default|
|-----|-----------|--------|-------|
|zig-version|The version of Zig to install.|No|'0.16.0'|
|working-directory|The working directory where commands are executed.|No|'.'|
|binary-name|The Binary name (without extension).|Yes||
|target|The compilation target (e.g.: x86_64-linux, aarch64-macos).|Yes||
|optimize|The compilation optimization (Debug, ReleaseSafe, ReleaseFast, ReleaseSmall).|No|'ReleaseFast'|
|extra-files|The files to include in the archive (separated by commas).|No||
|github-token|Your GitHub Token (more likely secrets.GITHUB_TOKEN).|Yes||

