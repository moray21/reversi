/**
 * パスオーバーレイプロパティ
 *
 * @param visible - パスオーバーレイを表示するかどうか
 * @param text - パスオーバーレイに表示するテキスト
 */
interface PassOverlayProps {
  visible: boolean;
  text: string;
}

/**
 * パス発生時の全画面通知オーバーレイ
 *
 * @param PassOverlayProps パスオーバーレイプロパティ
 */
export function PassOverlay({ visible, text }: PassOverlayProps) {
  return (
    <div
      className={`fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center transition-opacity duration-300 ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
    >
      <div className="glass-panel-glow px-10 py-8 rounded-3xl text-center space-y-2 border border-amber-400/40 shadow-2xl shadow-amber-500/20">
        <div className="text-4xl font-extrabold tracking-widest bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent font-mono">
          PASS
        </div>
        <p className="text-sm font-mono text-slate-200">{text}</p>
      </div>
    </div>
  );
}
