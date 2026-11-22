import { Bot, Users, Play, Sparkles } from 'lucide-react';
import type { BoardSize, GameMode, DiscColor, AILevel } from '../../types/reversi';

/**
 * ゲーム開始画面プロパティ
 *
 * @param currentSize - 現在の盤面サイズ
 * @param onSizeChange - 盤面サイズ変更時のコールバック
 * @param gameMode - 現在の対戦モード
 * @param onModeChange - 対戦モード変更時のコールバック
 * @param playerColor - プレイヤーの色
 * @param onPlayerColorChange - プレイヤーの色変更時のコールバック
 * @param aiLevel - AIのレベル
 * @param onAiLevelChange - AIレベル変更時のコールバック
 * @param onStartGame - ゲーム開始時のコールバック
 */
interface StartScreenProps {
  currentSize: BoardSize;
  onSizeChange: (size: BoardSize) => void;
  gameMode: GameMode;
  onModeChange: (mode: GameMode) => void;
  playerColor: DiscColor;
  onPlayerColorChange: (color: DiscColor) => void;
  aiLevel: AILevel;
  onAiLevelChange: (level: AILevel) => void;
  onStartGame: () => void;
}

/**
 * ゲーム開始画面コンポーネント
 * 盤面サイズ、対戦モード、手番の色、AIレベルを設定して対局を開始する。
 *
 * @param StartScreenProps ゲーム開始画面プロパティ
 */
export function StartScreen({
  currentSize,
  onSizeChange,
  gameMode,
  onModeChange,
  playerColor,
  onPlayerColorChange,
  aiLevel,
  onAiLevelChange,
  onStartGame,
}: StartScreenProps) {
  return (
    <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center items-center">
      {/* メイン設定カード */}
      <div className="glass-panel-glow rounded-3xl px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-6 w-full space-y-6 border border-cyan-500/20 shadow-2xl relative overflow-hidden animate-fade-in">
        {/* カードヘッダー */}
        <div className="text-center flex items-center space-x-3 justify-center pb-2 border-b border-slate-800">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 mb-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-mono tracking-wider bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              GAME SETUP
            </h2>
          </div>
        </div>

        {/* 1. 対戦モード選択 */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 font-mono flex items-center space-x-1.5">
            <span>1. 対戦モード</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {([
              { mode: 'pve' as GameMode, icon: Bot, label: 'vs AI', desc: 'AIと対局する' },
              { mode: 'pvp' as GameMode, icon: Users, label: 'vs Player', desc: '2人で対局する' },
            ]).map((item) => (
              <button
                key={item.mode}
                type="button"
                onClick={() => onModeChange(item.mode)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl font-mono transition-all cursor-pointer border ${gameMode === item.mode
                  ? 'bg-gradient-to-br from-cyan-500/90 to-teal-700/90 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/50'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
              >
                <span className="font-bold text-sm">
                  <div className="text-center flex items-center space-x-3 justify-center">
                    < item.icon className="w-8 h-8 pr-2" />
                    {item.label}
                  </div>
                </span>
                <span className="text-[10px] font-normal opacity-80">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. 盤面サイズ選択 */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 font-mono flex items-center space-x-1.5">
            2. 盤面サイズ
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {([
              { size: 4 as BoardSize, label: '4x4' },
              { size: 6 as BoardSize, label: '6x6' },
              { size: 8 as BoardSize, label: '8x8' },
            ]).map((item) => (
              <button
                key={item.size}
                type="button"
                onClick={() => onSizeChange(item.size)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl font-mono transition-all cursor-pointer border ${currentSize === item.size
                  ? 'bg-gradient-to-br from-cyan-500/90 to-teal-700/90 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/50'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
              >
                <span className="font-bold text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. 手番の色（AI対戦時のみ） */}
        {gameMode === 'pve' && (
          <div className="space-y-2 animate-fade-in">
            <label className="block text-xs font-semibold text-slate-300 font-mono flex items-center space-x-1.5">
              3. あなたの手番
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { color: 1 as DiscColor, label: '黒 (先手)' },
                { color: -1 as DiscColor, label: '白 (後手)' },
              ]).map((item) => (
                <button
                  key={item.color}
                  type="button"
                  onClick={() => onPlayerColorChange(item.color)}
                  className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl font-mono transition-all cursor-pointer border ${playerColor === item.color
                    ? 'bg-gradient-to-br from-cyan-500/90 to-teal-700/90 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/50'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                >
                  <span className="font-bold text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. AIの強さレベル（AI対戦時のみ） */}
        {gameMode === 'pve' && (
          <div className="space-y-2 animate-fade-in">
            <label className="block text-xs font-semibold text-slate-300 font-mono flex items-center space-x-1.5">
              4. AIの強さ
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {([
                { level: 'low' as AILevel, label: '初級' },
                { level: 'average' as AILevel, label: '中級' },
                { level: 'high' as AILevel, label: '上級' },
              ]).map((item) => (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => onAiLevelChange(item.level)}
                  className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl font-mono transition-all cursor-pointer border ${aiLevel === item.level
                    ? 'bg-gradient-to-br from-cyan-500/90 to-teal-700/90 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/50'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                >
                  <span className="font-bold text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 対局開始ボタン */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onStartGame}
            className="w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-500 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-400 text-white font-extrabold text-base tracking-wider shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>対局開始</span>
          </button>
        </div>
      </div>
    </main>
  );
}
