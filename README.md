# Reversi

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
