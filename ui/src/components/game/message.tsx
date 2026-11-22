/**
 * メッセージトースト
 *
 * @param message 出力するメッセージ
 */
export function showMessage(message: string) {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-panel-glow px-4 py-2 rounded-full border border-cyan-500/50 text-cyan-300 text-xs font-mono shadow-2xl flex items-center space-x-2 animate-bounce">
            <span>{message}</span>
        </div>
    )
}
