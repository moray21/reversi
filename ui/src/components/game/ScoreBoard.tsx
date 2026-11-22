import type { GameStateDto, GameMode, DiscColor } from '../../types/reversi';

/**
 * 手番インジケーターおよび石数スコア表示のプロパティ
 *
 * @param gameState ゲーム状態
 * @param gameMode ゲームモード
 * @param playerColor プレイヤーの色
 * @param isAiThinking AIが思考中か
 */
interface ScoreBoardProps {
  gameState: GameStateDto;
  gameMode: GameMode;
  playerColor: DiscColor;
  isAiThinking: boolean;
}

/**
 * 手番インジケーターおよび石数スコア表示コンポーネント
 *
 * @param ScoreBoardProps 手番インジケーターおよび石数スコア表示のプロパティ
 */
export function ScoreBoard({
  gameState,
  gameMode,
  playerColor,
  isAiThinking,
}: ScoreBoardProps) {
  return (
    <>
      <div className="w-full grid grid-cols-2 gap-3">
        {/* 黒スコア */}
        <div
          className={`flex items-center justify-between px-4 py-1 rounded-xl transition-all ${gameState.turn === 1
            ? isAiThinking
              ? 'bg-purple-950/70 border-2 border-purple-400 shadow-lg shadow-purple-500/30 animate-pulse'
              : 'bg-slate-900 border-2 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
            : 'bg-slate-900/90 border border-slate-800 opacity-65'
            }`}
        >
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-black border border-slate-600" />
            <span className="text-xs font-medium text-slate-300">
              Black
              {gameMode === 'pve' && playerColor === 1 && (
                <span className="ml-1 text-[10px] text-cyan-400">(You)</span>
              )}
            </span>
          </div>
          <span className="text-xl font-bold font-mono text-white">
            {gameState.n_black}
          </span>
        </div>

        {/* 白スコア */}
        <div
          className={`flex items-center justify-between px-4 py-1 rounded-xl transition-all ${gameState.turn === -1
            ? isAiThinking
              ? 'bg-purple-950/70 border-2 border-purple-400 shadow-lg shadow-purple-500/30 animate-pulse'
              : 'bg-slate-900 border-2 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
            : 'bg-slate-900/90 border border-slate-800 opacity-65'
            }`}
        >
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-white border border-slate-300" />
            <span className="text-xs font-medium text-slate-300">
              White
              {gameMode === 'pve' && playerColor === -1 && (
                <span className="ml-1 text-[10px] text-cyan-400">(You)</span>
              )}
            </span>
          </div>
          <span className="text-xl font-bold font-mono text-white">
            {gameState.n_white}
          </span>
        </div>
      </div>
    </>
  );
}
