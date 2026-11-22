let WasmGameEngine = null;
let engine = null;


async function loadWasmGameEngine(baseUrl) {
    const scriptUrl = `${baseUrl}pkg/reversi_wasm.js`;
    const wasmUrl = `${baseUrl}pkg/reversi_wasm_bg.wasm`;

    const response = await fetch(scriptUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${scriptUrl}: ${response.status} ${response.statusText}`);
    }

    const code = await response.text();
    const resolvedScriptUrl = new URL(scriptUrl, self.location.origin).href;
    const codeWithSourceUrl = `${code}\n//# sourceURL=${resolvedScriptUrl}`;

    const blob = new Blob([codeWithSourceUrl], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    try {
        const wasmModule = await import(/* @vite-ignore */ blobUrl);
        await wasmModule.default(new URL(wasmUrl, self.location.origin).href);
        WasmGameEngine = wasmModule.WasmGameEngine;

    } finally {
        URL.revokeObjectURL(blobUrl);
    }
}

self.onmessage = async (event) => {
    const { id, type, payload } = event.data;

    try {
        let result = null;

        switch (type) {
            case 'init':
                if (!WasmGameEngine) {
                    await loadWasmGameEngine(payload.baseUrl);
                }
                result = true;
                break;

            case 'newGame':
                engine = new WasmGameEngine(payload.size);
                result = engine.get_state();
                break;

            case 'putDisc':
                if (!engine) throw new Error("Engine not initialized");
                result = engine.put_disc(payload.row, payload.col);
                break;

            case 'undo':
                if (!engine) throw new Error("Engine not initialized");
                result = engine.undo();
                break;

            case 'putByAi':
                if (!engine) throw new Error("Engine not initialized");
                result = engine.put_by_ai(payload.level);
                break;

            case 'getHistory':
                if (!engine) throw new Error("Engine not initialized");
                result = engine.get_history();
                break;

            case 'forkAt':
                if (!engine) throw new Error("Engine not initialized");
                result = engine.fork_at(payload.step);
                break;

            case 'resetToMain':
                if (!engine) throw new Error("Engine not initialized");
                result = engine.reset_to_main();
                break;

            default:
                throw new Error(`Unknown command type: ${type}`);
        }

        // 成功結果をメインスレッドに返却
        self.postMessage({ id, result, error: null });

    } catch (err) {
        // Rust側の Err(JsValue) や JSエラーを文字列化して返却
        const errorMessage = err instanceof Error ? err.message : String(err);
        self.postMessage({ id, result: null, error: errorMessage });
    }
};
