// ゲーム関連の型定義

/** 盤面のサイズ (4x4, 6x6, 8x8) */
export type BoardSize = 4 | 6 | 8;

/** ゲームモード (対人戦: 'pvp', AI対戦: 'pve') */
export type GameMode = 'pvp' | 'pve';

/** 石の色 (1: 黒/先手, -1: 白/後手) */
export type DiscColor = 1 | -1;

/** AIの強さレベル ('low': 初級, 'average': 中級, 'high': 上級) */
export type AILevel = 'low' | 'average' | 'high';

/** アプリケーションの画面遷移状態 ('start': 開始設定画面, 'game': 対局画面, 'review': 感想戦画面) */
export type AppScreen = 'start' | 'game' | 'review';

/** Rust側から受け取るゲーム状態のDTO */
export interface GameStateDto {
  /** 盤面のサイズ */
  size: BoardSize;

  /** 盤面データ (1: 黒, -1: 白, 0: 空) */
  board: number[][];

  /** 現在の手番 (1: 黒, -1: 白) */
  turn: DiscColor;

  /** 黒の石数 */
  n_black: number;

  /** 白の石数 */
  n_white: number;

  /** ゲームが終了したかどうか */
  is_game_over: boolean;

  /** 勝者 (1: 黒, -1: 白, 0またはnull: 引き分け/対局中) */
  winner: number | null;

  /** 現在の手番の合法手リスト ([row, col] の配列) */
  legal_points: [number, number][];

  /** 連続パス回数 */
  consecutive_passes: number;
}

/** 反転アニメーション中の石の情報 */
export interface FlippingDiscInfo {
  /** 反転前の色 */
  fromColor: DiscColor;

  /** 反転後の色 */
  toColor: DiscColor;
}

// Tauri v2 グローバル型定義
declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}
