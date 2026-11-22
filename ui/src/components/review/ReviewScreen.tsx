import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  GitFork,
  BookOpen,
  RotateCcw,
  Sparkles,
  Home,
  Undo2,
  Grid,
} from 'lucide-react';
import type { GameStateDto, FlippingDiscInfo } from '../../types/reversi';
import { Board } from '../game/Board';

/**
 * 感想戦画面のプロパティ
 *
 * @param reviewGameState 現在表示している盤面の状態DTO
 * @param historyLength 履歴のサイズ
 * @param reviewStep 現在表示している手のインデックス
 * @param isForked 現在分岐シミュレーション中かどうか
 * @param forkedStep 分岐シミュレーション中の起点となる手のインデックス
 * @param isAiThinking AIの思考中かどうか
 * @param isAnimatingMove 石の反転アニメーション中かどうか
 * @param lastMove 最後に打たれた手のインデックス
 * @param flippingDiscs 反転中の石の情報
 * @param message 表示メッセージ
 * @param onCellClick セルをクリックしたときのハンドラ
 * @param onStepChange ステップ変更時のハンドラ
 * @param onAiMove AIに手を打たせるときのハンドラ
 * @param onUndo Undo処理のハンドラ
 * @param onResetToReview 本譜に戻るハンドラ
 * @param onBackToStart 開始画面に戻るハンドラ
 * @param onPlayAgain もう一度対局を行うハンドラ
 */
interface ReviewScreenProps {
  reviewGameState: GameStateDto;
  historyLength: number;
  reviewStep: number;
  isForked: boolean;
  forkedStep: number | null;
  isAiThinking: boolean;
  isAnimatingMove: boolean;
  lastMove: [number, number] | null;
  flippingDiscs: Map<string, FlippingDiscInfo>;
  message: string;
  onCellClick: (row: number, col: number) => void;
  onStepChange: (step: number) => void;
  onAiMove: () => void;
  onUndo: () => void;
  onResetToReview: () => void;
  onBackToStart: () => void;
  onPlayAgain: () => void;
}

/**
 * 感想戦（手順振り返り・分岐シミュレーション）画面コンポーネント
 *
 * @param ReviewScreenProps 感想戦画面のプロパティ
 */
export function ReviewScreen({
  reviewGameState,
  historyLength,
  reviewStep,
  isForked,
  forkedStep,
  isAiThinking,
  isAnimatingMove,
  lastMove,
  flippingDiscs,
  message,
  onCellClick,
  onStepChange,
  onAiMove,
  onUndo,
  onResetToReview,
  onBackToStart,
  onPlayAgain,
}: ReviewScreenProps) {
  const maxStep = Math.max(0, historyLength - 1);
  const canInteract = !isAiThinking && !isAnimatingMove;

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 max-w-lg w-full mx-auto select-none space-y-3 sm:space-y-4">
      {/* 上部ステータスバー */}
      <div className="w-full flex items-center justify-between px-1">
        <div className="text-xs font-mono text-slate-400 flex items-center space-x-2">
          <Grid className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold tracking-wider">REVIEW MODE</span>
        </div>

        {/* 分岐中 / 本譜閲覧中バッジ */}
        {isForked ? (
          <div className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-950/90 to-orange-950/90 border border-amber-500/80 px-3 py-1 rounded-full shadow-lg shadow-amber-500/20 animate-pulse">
            <GitFork className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-amber-300 font-mono">
              分岐シミュレーション中 (起点: {forkedStep}手目)
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-700 px-3 py-1 rounded-full shadow-inner">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium text-slate-300 font-mono">
              本譜閲覧中 ({reviewStep} / {maxStep} 手目)
            </span>
          </div>
        )}
      </div>

      {/* スコア・手番情報カード */}
      <div className="w-full grid grid-cols-2 gap-3">
        {/* 黒スコア */}
        <div
          className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all ${reviewGameState.turn === 1 && !reviewGameState.is_game_over
            ? 'bg-slate-900 border-2 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
            : 'bg-slate-900/90 border border-slate-800 opacity-70'
            }`}
        >
          <div className="flex items-center space-x-2">
            <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-600" />
            <span className="text-xs font-medium text-slate-300">Black</span>
          </div>
          <span className="text-xl font-bold font-mono text-white">
            {reviewGameState.n_black}
          </span>
        </div>

        {/* 白スコア */}
        <div
          className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all ${reviewGameState.turn === -1 && !reviewGameState.is_game_over
            ? 'bg-slate-900 border-2 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
            : 'bg-slate-900/90 border border-slate-800 opacity-70'
            }`}
        >
          <div className="flex items-center space-x-2">
            <div className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300" />
            <span className="text-xs font-medium text-slate-300">White</span>
          </div>
          <span className="text-xl font-bold font-mono text-white">
            {reviewGameState.n_white}
          </span>
        </div>
      </div>

      {/* 盤面 */}
      <Board
        gameState={reviewGameState}
        lastMove={lastMove}
        flippingDiscs={flippingDiscs}
        canPlayerClick={canInteract && !reviewGameState.is_game_over}
        onCellClick={onCellClick}
      />

      {/* コントロールエリア */}
      {!isForked ? (
        /* ================= 未分岐コントロール ================= */
        <div className="w-full glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="space-y-3">
            {/* スライダー & 手数 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                <span>0 手目 (初期)</span>
                <span className="text-cyan-400 font-bold text-sm">
                  {reviewStep} / {maxStep} 手目
                </span>
                <span>{maxStep} 手目 (終局)</span>
              </div>
              <input
                type="range"
                min={0}
                max={maxStep}
                value={reviewStep}
                onChange={(e) => onStepChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition"
              />
            </div>

            {/* ナビゲーションボタン群 */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                disabled={reviewStep === 0 || !canInteract}
                onClick={() => onStepChange(0)}
                className="flex items-center justify-center py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white transition cursor-pointer"
                title="最初の手へ"
              >
                <ChevronsLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                disabled={reviewStep === 0 || !canInteract}
                onClick={() => onStepChange(reviewStep - 1)}
                className="flex items-center justify-center py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white transition cursor-pointer"
                title="1手戻る"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                disabled={reviewStep === maxStep || !canInteract}
                onClick={() => onStepChange(reviewStep + 1)}
                className="flex items-center justify-center py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white transition cursor-pointer"
                title="1手進む"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                disabled={reviewStep === maxStep || !canInteract}
                onClick={() => onStepChange(maxStep)}
                className="flex items-center justify-center py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white transition cursor-pointer"
                title="最新の手へ"
              >
                <ChevronsRight className="w-5 h-5" />
              </button>
            </div>

            {/* AI着手ボタン */}
            <button
              type="button"
              disabled={
                reviewGameState.is_game_over ||
                !reviewGameState.legal_points?.length ||
                !canInteract
              }
              onClick={onAiMove}
              className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-900 border border-purple-500/40 hover:border-purple-400 text-purple-300 hover:text-white font-medium text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>AI着手</span>
            </button>

            <p className="text-[11px] text-slate-400 text-center font-mono leading-relaxed">
              💡 着手可能位置に石を置くことでシミュレーションを開始します
            </p>
          </div>
        </div>
      ) : (
        /* ================= 分岐シミュレーション中コントロール ================= */
        <div className="w-full space-y-3">
          {/* 分岐中の操作ボタン */}
          <div className="grid grid-cols-3 gap-2">
            {/* 1手戻る */}
            <button
              type="button"
              disabled={!canInteract}
              onClick={onUndo}
              className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-medium text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
              <span>Undo</span>
            </button>

            {/* AI着手 */}
            <button
              type="button"
              disabled={
                reviewGameState.is_game_over ||
                !reviewGameState.legal_points?.length ||
                !canInteract
              }
              onClick={onAiMove}
              className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-900 border border-purple-500/40 hover:border-purple-400 text-purple-300 hover:text-white font-medium text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>AI着手</span>
            </button>

            {/* 本譜に戻る */}
            <button
              type="button"
              disabled={!canInteract}
              onClick={onResetToReview}
              className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-700 text-white font-bold text-xs shadow-lg shadow-cyan-700/50 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition disabled:opacity-30 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>本譜に戻る</span>
            </button>
          </div>
        </div>
      )}

      {/* フッターナビゲーション */}
      <div className="w-full flex items-center justify-between space-x-3 pt-1">
        <button
          type="button"
          onClick={onBackToStart}
          className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white font-medium text-xs transition cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>設定に戻る</span>
        </button>

        <button
          type="button"
          onClick={onPlayAgain}
          className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white font-medium text-xs transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-cyan-400/50" />
          <span>もう一度対局</span>
        </button>
      </div>

      {/* メッセージトースト */}
      {message && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-panel-glow px-4 py-2 rounded-full border border-cyan-500/50 text-cyan-300 text-xs font-mono shadow-2xl flex items-center space-x-2 animate-bounce">
          <span>{message}</span>
        </div>
      )}
    </main>
  );
}