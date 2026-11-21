import { Sliders, X, Bot, Users, RotateCcw } from 'lucide-react';
import type { BoardSize, GameMode, DiscColor, AILevel } from '../../types/reversi';

/**
 * 設定ドロワーメニューのプロパティ
 *
 * @param isOpen ドロワーが開いているか
 * @param onClose ドロワーを閉じる関数
 * @param gameMode ゲームモード
 * @param onModeChange ゲームモードを変更する関数
 * @param playerColor プレイヤーの色
 * @param onPlayerColorChange プレイヤーの色を変更する関数
 * @param currentSize 盤面のサイズ
 * @param onBoardSizeChange 盤面のサイズを変更する関数
 * @param aiLevel AIのレベル
 * @param onAiLevelChange AIのレベルを変更する関数
 * @param onNewGame 新しいゲームを開始する関数
 */
interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  gameMode: GameMode;
  onModeChange: (mode: GameMode) => void;
  playerColor: DiscColor;
  onPlayerColorChange: (color: DiscColor) => void;
  currentSize: BoardSize;
  onBoardSizeChange: (size: BoardSize) => void;
  aiLevel: AILevel;
  onAiLevelChange: (level: AILevel) => void;
  onNewGame: () => void;
}

/**
 * 設定ドロワーメニュー
 *
 * @param SettingsDrawerProps 設定ドロワーメニューのプロパティ
 */
export function SettingsDrawer({
  isOpen,
  onClose,
  gameMode,
  onModeChange,
  playerColor,
  onPlayerColorChange,
  currentSize,
  onBoardSizeChange,
  aiLevel,
  onAiLevelChange,
  onNewGame,
}: SettingsDrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
    >
      {/* バックドロップ */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      />

      {/* スライディングパネル */}
      <div
        className={`absolute right-0 top-0 h-full w-80 max-w-full glass-panel border-l border-slate-800 p-6 flex flex-col justify-between transform transition-transform duration-300 shadow-2xl overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="space-y-6">
          {/* パネルヘッダー */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              <h2 className="font-bold text-sm tracking-wider font-mono text-white">
                SETTINGS
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 対戦モード選択 */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 font-mono">
              Game Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onModeChange('pve')}
                className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${gameMode === 'pve'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50'
                  }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>vs AI</span>
              </button>
              <button
                onClick={() => onModeChange('pvp')}
                className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${gameMode === 'pvp'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50'
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>vs Player</span>
              </button>
            </div>
          </div>

          {/* プレイヤーの手番（AI対戦時のみ表示） */}
          {gameMode === 'pve' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300 font-mono">
                Your Side
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onPlayerColorChange(1)}
                  className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${playerColor === 1
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50'
                    }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-black border border-slate-500" />
                  <span>黒 (先手)</span>
                </button>
                <button
                  onClick={() => onPlayerColorChange(-1)}
                  className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${playerColor === -1
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50'
                    }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300" />
                  <span>白 (後手)</span>
                </button>
              </div>
            </div>
          )}

          {/* 盤面サイズ */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 font-mono">
              Board Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([4, 6, 8] as BoardSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onClose();
                    onBoardSizeChange(s);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${currentSize === s
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50'
                    }`}
                >
                  {s}x{s}
                </button>
              ))}
            </div>
          </div>

          {/* AIレベル設定 */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 font-mono">
              AI Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'average', 'high'] as AILevel[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => onAiLevelChange(lvl)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${aiLevel === lvl
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50'
                    }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ドロワー下部：New Game ボタン */}
        <div className="pt-6 space-y-3 border-t border-slate-800">
          <button
            onClick={() => {
              onClose();
              onNewGame();
            }}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Game</span>
          </button>
        </div>
      </div>
    </div>
  );
}
