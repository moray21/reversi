# DevContainer

コンテナを利用した開発環境

## CLI

### ツールを利用する場合

1. CLIツールをインストールする ([参考: Dev Container CLI](https://github.com/devcontainers/cli))

1. imageをビルドする

    ```console
    $ devcontainer build
    ```

1. コンテナを立ち上げる

    ```console
    $ devcontainer up
    ```

1. コンテナ内にアクセスする

    ```console
    $ devcontainer exec bash
    ```

### dockerを利用する場合

Dockerfileをビルドして利用する (各種コマンドは省略)


## エディタ

vscodeなどでは拡張機能「Dev Containers」 を追加することで利用できる。
Ctrl + Pでコマンドパレットを開き、「Dev containers: Reopen in Container」をクリックすることで接続可能。
