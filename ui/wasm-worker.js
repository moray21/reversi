import init, { WasmGameEngine } from './pkg/reversi_wasm.js';

let engine = null;

self.onmessage = async (event) => {
    const { id, type, payload } = event.data;

    try {
        let result = null;

        switch (type) {
            case 'init':
                await init();
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
                result = engine.put_by_ai(payload.depth);
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
