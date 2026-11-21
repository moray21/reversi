import { Menu } from 'lucide-react';

/**
 * アプリケーションヘッダープロパティ
 *
 * @param onOpenSettings - 設定画面を開くコールバック
 */
interface HeaderProps {
  onOpenSettings: () => void;
}

/**
 * アプリケーションヘッダーコンポーネント
 *
 * @param HeaderProps アプリケーションヘッダープロパティ
 */
export function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <img src="/favicon.png" alt="Reversi Icon" className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-wider bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Reversi App
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSettings}
          aria-label="Open Settings"
          className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
