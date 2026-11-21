import type { GameStateDto } from '../../types/reversi';

/**
 * ゲーム終了モーダルのプロパティ
 *
 * @param show - モーダルを表示するかどうか
 * @param gameState - ゲームの状態
 * @param onPlayAgain - 再プレイ時のコールバック
 */
interface GameOverModalProps {
  show: boolean;
  gameState: GameStateDto;
  onPlayAgain: () => void;
}

/**
 * ゲーム終了時の勝敗結果モーダル
 *
 * @param GameOverModalProps ゲーム終了モーダルのプロパティ
 */
export function GameOverModal({
  show,
  gameState,
  onPlayAgain,
}: GameOverModalProps) {
  return (
    <div
      className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300 ${show ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
    >
      <div className="glass-panel-glow p-8 rounded-3xl max-w-sm w-full mx-4 text-center space-y-5">
        <div className="text-4xl mx-auto flex items-center justify-center">
          {gameState.winner === 1 ? '🖤' : gameState.winner === -1 ? '🤍' : '🤝'}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-1">
            {gameState.winner === 1
              ? 'BLACK WINNER'
              : gameState.winner === -1
                ? 'WHITE WINNER'
                : 'DRAW'}
          </h3>
          <p className="text-sm font-mono text-cyan-300">
            {gameState.winner === 1
              ? `黒の勝利です！ (黒: ${gameState.n_black} vs 白: ${gameState.n_white})`
              : gameState.winner === -1
                ? `白の勝利です！ (黒: ${gameState.n_black} vs 白: ${gameState.n_white})`
                : `引き分けです！ (黒: ${gameState.n_black} vs 白: ${gameState.n_white})`}
          </p>
        </div>
        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/30 hover:opacity-90 transition-all cursor-pointer"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
