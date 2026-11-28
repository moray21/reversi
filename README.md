# Reversi

オセロアプリ


## Install Cargo-make

```console
$ cargo install cargo-make
```


## How to play

1. Build as Desktop App

    ```console
    $ cargo make build
    ```

1. Run

- Run by app image

    ```console
    $ cargo make run_desktop
    ```

- Install

    1. install
        ```console
        $ cargo make install_desktop_app
        ```

    1. run
        ```console
        $ reversi
        ```


## Dev Commands

### format & linter

```console
$ cargo make check
$ cargo make format
```

### test

```console
$ cargo make test
$ cargo make coverage
```

### Clean

```console
$ cargo make clean
```

### List commands

```console
$ cargo make --list-category-steps Custom
```
