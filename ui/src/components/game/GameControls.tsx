import { CornerUpLeft, Sparkles } from 'lucide-react';

/**
 * 対局操作コントロールのプロパティ
 *
 * @param isAiThinking AIが思考中か
 * @param isAnimatingMove 盤面遷移アニメーション中か
 * @param isGameOver 対局終了か
 * @param onUndoUndo ボタン押下時のコールバック
 * @param onManualAiMove "Let AI Play"ボタン押下時のコールバック
 */
interface GameControlsProps {
  isAiThinking: boolean;
  isAnimatingMove: boolean;
  isGameOver: boolean;
  onUndo: () => void;
  onManualAiMove: () => void;
}

/**
 * 対局操作コントロール
 *
 * @param GameControlsProps 対局操作コントロールのプロパティ
 */
export function GameControls({
  isAiThinking,
  isAnimatingMove,
  isGameOver,
  onUndo,
  onManualAiMove,
}: GameControlsProps) {
  const isDisabled = isAiThinking || isAnimatingMove;

  return (
    <div className="w-full grid grid-cols-2 gap-2.5 mt-4">
      <button
        type="button"
        disabled={isDisabled}
        onClick={onUndo}
        style={{ opacity: isDisabled ? 0.5 : 1 }}
        className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-all cursor-pointer disabled:cursor-not-allowed"
      >
        <CornerUpLeft className="w-3.5 h-3.5" />
        <span>Undo</span>
      </button>

      <button
        type="button"
        disabled={isDisabled || isGameOver}
        onClick={onManualAiMove}
        style={{ opacity: isDisabled || isGameOver ? 0.5 : 1 }}
        className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-900 border border-purple-500/40 hover:border-purple-400 text-purple-300 hover:text-white font-medium text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        <Sparkles className="w-4 h-4" />
        <span>AI着手</span>
      </button>
    </div>
  );
}
