import { useState } from 'react';
import './App.css';
import { useReversi } from './hooks/useReversi';
import { Header } from './components/common/Header';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { PassOverlay } from './components/common/PassOverlay';
import { GameOverModal } from './components/common/GameOverModal';
import { SettingsDrawer } from './components/game/SettingsDrawer';
import { GameScreen } from './components/game/GameScreen';

/**
 * リバーシアプリケーションのメインコンポーネント
 */
export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const {
    currentSize,
    gameMode,
    playerColor,
    aiLevel,
    gameState,
    isAiThinking,
    isLoading,
    isAnimatingMove,
    lastMove,
    flippingDiscs,
    message,
    passInfo,
    showGameOver,
    setAiLevel,
    setShowGameOver,
    startNewGame,
    handleCellClick,
    handleUndo,
    handleManualAiMove,
    handleModeChange,
    handlePlayerColorChange,
    handleBoardSizeChange,
  } = useReversi();

  return (
    <div className="bg-[#030712] text-slate-100 min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-white relative overflow-x-hidden font-sans">
      {/* 処理中オーバーレイ */}
      <LoadingOverlay isLoading={isLoading} />

      {/* パス通知オーバーレイ */}
      <PassOverlay visible={passInfo.visible} text={passInfo.text} />

      {/* ヘッダー */}
      <Header onOpenSettings={() => setIsSettingsOpen((prev) => !prev)} />

      {/* 設定ドロワー */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        gameMode={gameMode}
        onModeChange={handleModeChange}
        playerColor={playerColor}
        onPlayerColorChange={handlePlayerColorChange}
        currentSize={currentSize}
        onBoardSizeChange={handleBoardSizeChange}
        aiLevel={aiLevel}
        onAiLevelChange={setAiLevel}
        onNewGame={() => startNewGame(currentSize)}
      />

      {/* 対局メイン画面 */}
      <GameScreen
        gameState={gameState}
        gameMode={gameMode}
        playerColor={playerColor}
        isAiThinking={isAiThinking}
        isAnimatingMove={isAnimatingMove}
        lastMove={lastMove}
        flippingDiscs={flippingDiscs}
        message={message}
        onCellClick={handleCellClick}
        onUndo={handleUndo}
        onManualAiMove={handleManualAiMove}
      />

      {/* 終局モーダル */}
      <GameOverModal
        show={showGameOver}
        gameState={gameState}
        onPlayAgain={() => {
          setShowGameOver(false);
          startNewGame(currentSize);
        }}
      />
    </div>
  );
}
