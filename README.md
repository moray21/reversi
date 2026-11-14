# Reversi

## How to play

## Build

```console
$ cargo tauri build
```

## Run

### Case: linux

#### Run by app image

1. change directory
    ```console
    $ cd target/release/bundle/appimage/
    ```

2. attach executable permission
    ```console
    $ chmod +x reversi_0.1.0_amd64.AppImage
    ```

3. run
    ```console
    $ ./reversi_0.1.0_amd64.AppImage
    ```


#### Install

1. change directory
    ```console
    $ cd target/release/bundle/deb/
    ```

2. install
    ```console
    $ sudo apt install reversi_0.1.0_amd64.deb
    ```

3. run
    ```console
    $ reversi
    ```


## 開発時のコマンド

### Rust

#### format & linter

```console
$ cargo check --workspace --all-targets
$ cargo fmt --all
$ cargo clippy --workspace --all-targets
```

#### test

```console
$ cargo test --workspace
$ cargo +nightly llvm-cov --doctests --workspace --summary-only
```
