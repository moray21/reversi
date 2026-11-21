import { invoke } from '@tauri-apps/api/core';
import type { BoardSize, AILevel, GameStateDto } from '../../types/reversi';
import type { IReversiBackend } from './types';

/** Tauri環境用のバックエンド */
export class TauriBackend implements IReversiBackend {
  /** バックエンドの初期化 */
  async init(): Promise<void> { }

  /**
   *  新しいゲームを開始する
   *
   * @param size 盤面のサイズ
   * @returns 新しいゲームの状態
   */
  async newGame(size: BoardSize): Promise<GameStateDto> {
    return await invoke<GameStateDto>('new_game', { size });
  }

  /**
   *  指定のマスに石を置く
   *
   * @param row 石を置く行
   * @param col 石を置く列
   * @returns ゲームの状態
   */
  async putDisc(row: number, col: number): Promise<GameStateDto> {
    return await invoke<GameStateDto>('put_disc', { row, col });
  }

  /**
   *  1手戻る
   *
   * @returns ゲームの状態
   */
  async undo(): Promise<GameStateDto> {
    return await invoke<GameStateDto>('undo');
  }

  /**
   *  AIに1手打たせる
   *
   * @param level AIの強さ
   * @returns ゲームの状態
   */
  async putByAi(level: AILevel): Promise<GameStateDto> {
    return await invoke<GameStateDto>('put_by_ai', { level });
  }

  /**
   * 初手から現在までの全局面履歴を取得する
   *
   * @returns 盤面のリスト
   */
  async getHistory(): Promise<GameStateDto[]> {
    return await invoke<GameStateDto[]>('get_history');
  }

  /**
   *  指定手数の盤面から分岐対局を開始する
   *
   * @param step 分岐する盤面の番号
   * @returns ゲームの状況
   */
  async forkAt(step: number): Promise<GameStateDto> {
    return await invoke<GameStateDto>('fork_at', { step });
  }

  /**
   *  分岐を破棄して本譜の分岐元手番に復帰する
   *
   * @returns 分岐時点の盤面の番号
   */
  async resetToMain(): Promise<number> {
    return await invoke<number>('reset_to_main');
  }

  /** リソース解放 */
  terminate?(): void { };
}
