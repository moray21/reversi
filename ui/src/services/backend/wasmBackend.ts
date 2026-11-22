import type { BoardSize, AILevel, GameStateDto } from '../../types/reversi';
import type { IReversiBackend } from './types';

/** Webブラウザ (WebAssembly + Web Worker) 環境用のバックエンド */
export class WasmBackend implements IReversiBackend {
  private worker: Worker | null = null;
  private msgId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  private initialized = false;

  private sendToWorker<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('WASM Worker is not initialized'));
        return;
      }
      const id = ++this.msgId;
      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, payload });
    });
  }

  /** バックエンドの初期化 */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.worker = new Worker(
        new URL('./wasm-worker.js', import.meta.url), { type: 'module' }
      );
      this.worker.onmessage = (event: MessageEvent) => {
        const { id, result, error } = event.data;
        const request = this.pendingRequests.get(id);
        if (!request) return;
        this.pendingRequests.delete(id);
        if (error) {
          request.reject(error);
        } else {
          request.resolve(result);
        }
      };
      this.worker.onerror = (err) => {
        console.error('WASM Worker Error:', err);
      };

      const baseUrl = import.meta.env.BASE_URL || '/';
      await this.sendToWorker('init', { baseUrl });
    } catch (e) {
      console.warn('WASM Worker initialization fallback:', e);
    }
    this.initialized = true;
  }

  /**
   *  新しいゲームを開始する
   *
   * @param size 盤面のサイズ
   * @returns 新しいゲームの状態
   */
  async newGame(size: BoardSize): Promise<GameStateDto> {
    if (this.worker) {
      return await this.sendToWorker<GameStateDto>('newGame', { size });
    }
    throw new Error('Backend not connected');
  }

  /**
   *  指定のマスに石を置く
   *
   * @param row 石を置く行
   * @param col 石を置く列
   * @returns ゲームの状態
   */
  async putDisc(row: number, col: number): Promise<GameStateDto> {
    if (this.worker) {
      return await this.sendToWorker<GameStateDto>('putDisc', { row, col });
    }
    throw new Error('Backend not connected');
  }

  /**
   *  1手戻る
   *
   * @returns ゲームの状態
   */
  async undo(): Promise<GameStateDto> {
    if (this.worker) {
      return await this.sendToWorker<GameStateDto>('undo');
    }
    throw new Error('Backend not connected');
  }

  /**
   *  AIに1手打たせる
   *
   * @param level AIの強さ
   * @returns ゲームの状態
   */
  async putByAi(level: AILevel): Promise<GameStateDto> {
    if (this.worker) {
      return await this.sendToWorker<GameStateDto>('putByAi', { level });
    }
    throw new Error('Backend not connected');
  }

  /**
   * 初手から現在までの全局面履歴を取得する
   *
   * @returns 盤面のリスト
   */
  async getHistory(): Promise<GameStateDto[]> {
    if (this.worker) {
      return await this.sendToWorker<GameStateDto[]>('getHistory');
    }
    throw new Error('Backend not connected');
  }

  /**
   *  指定手数の盤面から分岐対局を開始する
   *
   * @param step 分岐する盤面の番号
   * @returns ゲームの状況
   */
  async forkAt(step: number): Promise<GameStateDto> {
    if (this.worker) {
      return await this.sendToWorker<GameStateDto>('forkAt', { step });
    }
    throw new Error('Backend not connected');
  }

  /**
   *  分岐を破棄して本譜の分岐元手番に復帰する
   *
   * @returns 分岐時点の盤面の番号
   */
  async resetToMain(): Promise<number> {
    if (this.worker) {
      return await this.sendToWorker<number>('resetToMain');
    }
    throw new Error('Backend not connected');
  }

  /** リソース解放 */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.initialized = false;
    }
  }
}
