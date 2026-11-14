# Reversi WebAssembly

## Build

```console
$ wasm-pack build --target web --out-dir ../../ui/pkg
```

## Check

1. Change directory

    ```console
    $ cd ../../ui
    ```

1. Run server

    ```console
    $ uv run python -m http.server 8080
    ```

1. Access to `http://localhost:8080` by browser
