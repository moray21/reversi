import { Home } from 'lucide-react';
import type { AppScreen } from '../../types/reversi';

/**
 * アプリケーションヘッダープロパティ
 *
 * @param currentScreen - 現在の画面
 * @param onBackToStart - 開始画面に戻るコールバック
 */
interface HeaderProps {
  currentScreen: AppScreen;
  onBackToStart?: () => void;
}

/**
 * アプリケーションヘッダーコンポーネント
 *
 * @param HeaderProps アプリケーションヘッダープロパティ
 */
export function Header({
  currentScreen,
  onBackToStart,
}: HeaderProps) {
  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div>
          <img src={`${import.meta.env.BASE_URL || "/"}favicon.png`} alt="Reversi Icon" className="w-8 h-8" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-wider bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Reversi App
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* 対局画面中のみ「開始画面に戻る」ボタンを表示 */}
        {currentScreen !== 'start' && onBackToStart && (
          <button
            type="button"
            onClick={onBackToStart}
            title="開始画面に戻る"
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-center text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
          </button>
        )}

      </div>
    </header>
  );
}
