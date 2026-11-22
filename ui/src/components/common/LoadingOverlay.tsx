/**
 * ローディングオーバーレイプロパティ
 *
 * @param isLoading - ローディング中かどうか
 */
interface LoadingOverlayProps {
  isLoading: boolean;
}

/**
 * 処理中ローディングオーバーレイ
 *
 * @param LoadingOverlayProps ローディングオーバーレイプロパティ
 */
export function LoadingOverlay({ isLoading }: LoadingOverlayProps) {
  return (
    <div
      className={`fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-200 ${isLoading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
    >
      <div className="flex flex-col items-center space-y-3">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-cyan-300">Processing Engine...</span>
      </div>
    </div>
  );
}
