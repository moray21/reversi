import type { BoardSize, AILevel, GameStateDto } from '../../types/reversi';

/** リバーシバックエンドのインターフェース */
export interface IReversiBackend {
  /** バックエンドの初期化 */
  init(): Promise<void>;

  /**
   *  新しいゲームを開始する
   *
   * @param size 盤面のサイズ
   * @returns 新しいゲームの状態
   */
  newGame(size: BoardSize): Promise<GameStateDto>;

  /**
   *  指定のマスに石を置く
   *
   * @param row 石を置く行
   * @param col 石を置く列
   * @returns ゲームの状態
   */
  putDisc(row: number, col: number): Promise<GameStateDto>;

  /**
   *  1手戻る
   *
   * @returns ゲームの状態
   */
  undo(): Promise<GameStateDto>;

  /**
   *  AIに1手打たせる
   *
   * @param level AIの強さ
   * @returns ゲームの状態
   */
  putByAi(level: AILevel): Promise<GameStateDto>;

  /**
   * 初手から現在までの全局面履歴を取得する
   *
   * @returns 盤面のリスト
   */
  getHistory(): Promise<GameStateDto[]>;

  /**
   *  指定手数の盤面から分岐対局を開始する
   *
   * @param step 分岐する盤面の番号
   * @returns ゲームの状況
   */
  forkAt(step: number): Promise<GameStateDto>;

  /**
   *  分岐を破棄して本譜の分岐元手番に復帰する
   *
   * @returns 分岐時点の盤面の番号
   */
  resetToMain(): Promise<number>;

  /** リソース解放 */
  terminate?(): void;
}
