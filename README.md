# Zig Actions

A GitHub Action to automate Zig compilation, testing, and formatting checks while reporting compiler errors directly as GitHub annotations.

## Usage

### All in one

Add this step to your workflow after checking out your repository:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: YetAnotherMechanicusEnjoyer/zig-actions@v1
    with:
      zig-version: '0.16.0'
      working-directory: '.'
      command-test: 'zig build test'
      failure-on-error: true
```

### Zig CI only

Add this step to your workflow after checking out your repository:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: YetAnotherMechanicusEnjoyer/zig-actions/ci@v1
    with:
      zig-version: '0.16.0'
      working-directory: '.'
      command-test: 'zig build test'
      failure-on-error: true
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
