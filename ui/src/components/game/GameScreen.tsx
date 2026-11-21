import type {
  GameStateDto,
  GameMode,
  DiscColor,
  FlippingDiscInfo,
} from '../../types/reversi';
import { ScoreBoard } from './ScoreBoard';
import { Board } from './Board';
import { GameControls } from './GameControls';

/**
 * 対局画面のプロパティ
 *
 * @param gameState ゲーム状態
 * @param gameMode ゲームモード
 * @param playerColor プレイヤーの色
 * @param isAiThinking AIが思考中か
 * @param isAnimatingMove 盤面遷移アニメーション中か
 * @param lastMove 最後の移動
 * @param flippingDiscs 反転中のディスク
 * @param message ステータスメッセージ
 * @param onCellClick セルクリック時のコールバック
 * @param onUndo Undoボタン押下時のコールバック
 * @param onManualAiMove "Let AI Play"ボタン押下時のコールバック
 */
interface GameScreenProps {
  gameState: GameStateDto;
  gameMode: GameMode;
  playerColor: DiscColor;
  isAiThinking: boolean;
  isAnimatingMove: boolean;
  lastMove: [number, number] | null;
  flippingDiscs: Map<string, FlippingDiscInfo>;
  message: string;
  onCellClick: (row: number, col: number) => void;
  onUndo: () => void;
  onManualAiMove: () => void;
}

/**
 * 対局画面コンポーネント
 *
 * @param GameScreenProps 対局画面のプロパティ
 */
export function GameScreen({
  gameState,
  gameMode,
  playerColor,
  isAiThinking,
  isAnimatingMove,
  lastMove,
  flippingDiscs,
  message,
  onCellClick,
  onUndo,
  onManualAiMove,
}: GameScreenProps) {
  const canPlayerClick =
    !isAiThinking &&
    !isAnimatingMove &&
    !gameState.is_game_over &&
    (gameMode === 'pvp' || gameState.turn === playerColor);

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto p-2 md:p-2 items-center">
      <div className="glass-panel rounded-2xl p-3 relative overflow-hidden space-y-2">
        {/* スコア・手番カード */}
        <ScoreBoard
          gameState={gameState}
          gameMode={gameMode}
          playerColor={playerColor}
          isAiThinking={isAiThinking}
        />

        {/* 正方形ボードコンテナ */}
        <Board
          gameState={gameState}
          lastMove={lastMove}
          flippingDiscs={flippingDiscs}
          canPlayerClick={canPlayerClick}
          onCellClick={onCellClick}
        />

        {/* ボード下部操作ボタン */}
        <GameControls
          isAiThinking={isAiThinking}
          isAnimatingMove={isAnimatingMove}
          isGameOver={gameState.is_game_over}
          onUndo={onUndo}
          onManualAiMove={onManualAiMove}
        />
      </div>

      {/* ステータスメッセージ */}
      {message && (
        <div className="glass-panel rounded-xl p-3 text-xs font-mono text-cyan-300 text-center border border-cyan-500/20 animate-fade-in mt-2">
          {message}
        </div>
      )}
    </main>
  );
}
