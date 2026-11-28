FROM rust:1-slim-bookworm AS rust-builder
FROM node:24-bookworm-slim AS node-base
FROM ghcr.io/astral-sh/uv:latest AS uv_base
FROM debian:bookworm-slim

# 必要なパッケージ
RUN apt-get update && apt-get install -y --no-install-recommends \
    procps \
    wget \
    ca-certificates \
    curl \
    build-essential \
    pkg-config \
    libglib2.0-dev \
    libwebkit2gtk-4.1-dev \
    git \
    && rm -rf /var/lib/apt/lists/*


# Rust
COPY --from=rust-builder /usr/local/rustup /usr/local/rustup
COPY --from=rust-builder /usr/local/cargo /usr/local/cargo
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH="/usr/local/cargo/bin:/usr/local/bin:${PATH}"

RUN rustup component add clippy \
    && rustup toolchain install nightly \
    && rustup target add wasm32-unknown-unknown --toolchain nightly
RUN cargo install cargo-llvm-cov cargo-make wasm-pack tauri-cli


# Node.js (node, npm, corepack)
COPY --from=node-base /usr/local/bin/node /usr/local/bin/node
COPY --from=node-base /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx


# python
COPY --from=uv_base /uv /uvx /usr/local/bin/


# DevContainer 用の非rootユーザー
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=$USER_UID
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m -s /bin/bash $USERNAME \
    && chown -R $USERNAME:$USERNAME /usr/local/rustup /usr/local/cargo

# sudoでの実行を可能にする
RUN apt-get update && apt-get install -y --no-install-recommends sudo \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && rm -rf /var/lib/apt/lists/*

USER $USERNAME
