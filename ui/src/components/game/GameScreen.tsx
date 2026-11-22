import { Grid } from 'lucide-react';
import type {
  GameStateDto,
  GameMode,
  DiscColor,
  FlippingDiscInfo,
} from '../../types/reversi';
import { ScoreBoard } from './ScoreBoard';
import { Board } from './Board';
import { GameControls } from './GameControls';
import { showMessage } from './message';

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
      <div className="rounded-2xl p-3 relative overflow-hidden space-y-2">
        {/* header */}
        <div className="w-full flex items-center justify-between mb-3 px-1">
          <div className="text-xs font-mono text-slate-400 flex items-center space-x-2">
            <Grid className="w-4 h-4 text-cyan-400" />
            <span>Game</span>
          </div>

          {/* 手番インジケーター */}
          {isAiThinking ? (
            <div className="flex items-center space-x-2 bg-purple-950/90 px-3 py-1 rounded-full border border-purple-400 font-mono text-xs shadow-lg shadow-purple-500/30 animate-pulse">
              <div className="w-3.5 h-3.5 rounded-full bg-purple-400 animate-ping" />
              <span className="font-bold text-purple-200 text-[11px]">
                AI ({gameState.turn === 1 ? '黒' : '白'}) 思考中...
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800 font-mono text-xs shadow-inner">
              <div
                className={`w-2.5 h-2 rounded-full ${gameState.turn === 1
                  ? 'bg-black border border-slate-600'
                  : 'bg-white border border-slate-400'
                  }`}
              />
              <span className="font-bold text-white text-[11px]">
                {gameState.turn === 1
                  ? gameMode === 'pve' && playerColor === 1
                    ? '黒の手番 (あなた)'
                    : '黒の手番'
                  : gameMode === 'pve' && playerColor === -1
                    ? '白の手番 (あなた)'
                    : '白の手番'}
              </span>
            </div>
          )}
        </div>

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

      {/* メッセージトースト */}
      {message && showMessage(message)}
    </main>
  );
}
