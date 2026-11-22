import { useState } from 'react';
import './App.css';
import type { AppScreen } from './types/reversi';
import { useReversi } from './hooks/useReversi';
import { Header } from './components/common/Header';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { PassOverlay } from './components/common/PassOverlay';
import { GameOverModal } from './components/common/GameOverModal';
import { StartScreen } from './components/start/StartScreen';
import { GameScreen } from './components/game/GameScreen';

/**
 * リバーシアプリケーションのメインコンポーネント
 */
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('start');

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
    setCurrentSize,
    setGameMode,
    setPlayerColor,
    setAiLevel,
    setShowGameOver,
    startNewGame,
    handleCellClick,
    handleUndo,
    handleManualAiMove,
  } = useReversi();

  /** 開始画面から対局を開始する */
  const handleStartGameFromSetup = async () => {
    await startNewGame(currentSize, gameMode, playerColor, aiLevel);
    setCurrentScreen('game');
  };

  /** 開始画面（設定）へ戻る */
  const handleBackToStart = () => {
    setShowGameOver(false);
    setCurrentScreen('start');
  };

  return (
    <div className="bg-[#030712] text-slate-100 min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-white relative overflow-x-hidden font-sans">
      {/* 処理中オーバーレイ */}
      <LoadingOverlay isLoading={isLoading} />

      {/* パス通知オーバーレイ */}
      <PassOverlay visible={passInfo.visible} text={passInfo.text} />

      {/* ヘッダー */}
      <Header
        currentScreen={currentScreen}
        onBackToStart={handleBackToStart}
      />

      {/* 画面切り替え */}
      {currentScreen === 'start' && (
        <StartScreen
          currentSize={currentSize}
          onSizeChange={setCurrentSize}
          gameMode={gameMode}
          onModeChange={setGameMode}
          playerColor={playerColor}
          onPlayerColorChange={setPlayerColor}
          aiLevel={aiLevel}
          onAiLevelChange={setAiLevel}
          onStartGame={handleStartGameFromSetup}
        />
      )}

      {/* 対局メイン画面 */}
      {currentScreen === 'game' && (
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
      )}

      {/* 終局モーダル */}
      <GameOverModal
        show={showGameOver}
        gameState={gameState}
        onPlayAgain={() => {
          setShowGameOver(false);
          startNewGame(currentSize);
        }}
        onBackToStart={handleBackToStart}
      />
    </div>
  );
}
