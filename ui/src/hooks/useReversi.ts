import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  BoardSize,
  GameMode,
  DiscColor,
  AILevel,
  GameStateDto,
  FlippingDiscInfo,
} from '../types/reversi';
import { createBackend, type IReversiBackend } from '../services/backend';
import {
  createMockState,
  cloneBoard,
  detectBoardChanges,
} from '../utils/reversi';

/**
 * リバーシのゲーム進行・ルール・AI・アニメーション制御を管理するカスタムフック
 */
export function useReversi() {
  const backendRef = useRef<IReversiBackend | null>(null);
  const getBackend = (): IReversiBackend => {
    if (!backendRef.current) {
      backendRef.current = createBackend();
    }
    return backendRef.current;
  };

  // ゲーム設定ステート
  const [currentSize, setCurrentSize] = useState<BoardSize>(8);
  const [gameMode, setGameMode] = useState<GameMode>('pve');
  const [playerColor, setPlayerColor] = useState<DiscColor>(1);
  const [aiLevel, setAiLevel] = useState<AILevel>('high');

  // 進行・盤面ステート
  const [gameState, setGameState] = useState<GameStateDto>(() =>
    createMockState(8)
  );
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnimatingMove, setIsAnimatingMove] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [flippingDiscs, setFlippingDiscs] = useState<
    Map<string, FlippingDiscInfo>
  >(new Map());
  const flipCleanupTimerRef = useRef<number | null>(null);

  // UI・通知ステート
  const [message, setMessage] = useState<string>('');
  const [passInfo, setPassInfo] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: '',
  });
  const [showGameOver, setShowGameOver] = useState<boolean>(false);
  const messageTimerRef = useRef<number | null>(null);

  // 感想戦ステート
  const [historyList, setHistoryList] = useState<GameStateDto[]>([]);
  const [reviewStep, setReviewStep] = useState<number>(0);
  const [isForked, setIsForked] = useState<boolean>(false);
  const [forkedStep, setForkedStep] = useState<number | null>(null);

  // 非同期処理ループで常に最新の状態を参照するためのRef
  const stateRef = useRef({
    currentSize,
    gameMode,
    playerColor,
    gameState,
    isAiThinking,
  });

  useEffect(() => {
    stateRef.current = {
      currentSize,
      gameMode,
      playerColor,
      gameState,
      isAiThinking,
    };
  }, [currentSize, gameMode, playerColor, gameState, isAiThinking]);

  // トーストメッセージ表示
  const showToastMessage = useCallback((text: string, autoClear = true) => {
    if (messageTimerRef.current) {
      window.clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }
    setMessage(text);
    if (text && autoClear) {
      messageTimerRef.current = window.setTimeout(() => {
        setMessage('');
        messageTimerRef.current = null;
      }, 3500);
    }
  }, []);

  // パスオーバーレイ演出
  const triggerPassOverlay = useCallback(
    async (passedColor: DiscColor, mode: GameMode, pColor: DiscColor) => {
      const colorStr = passedColor === 1 ? '黒' : '白';
      let roleStr = '';
      if (mode === 'pvp') {
        roleStr = passedColor === pColor ? '（Player1）' : '（Player2）';
      } else if (mode === 'pve') {
        roleStr = passedColor === pColor ? '（あなた）' : '（AI）';
      }
      const stoneEmoji = passedColor === 1 ? '⚫' : '⚪';
      const passText = `${stoneEmoji} ${colorStr}${roleStr}は打てる場所がないためパスします`;

      showToastMessage(`${stoneEmoji} ${colorStr}${roleStr}がパスしました`, true);
      await new Promise((r) => setTimeout(r, 250));
      setPassInfo({ visible: true, text: passText });
      await new Promise((r) => setTimeout(r, 1200));
      setPassInfo({ visible: false, text: '' });
    },
    [showToastMessage]
  );

  // 盤面更新と石の反転アニメーション適用
  const applyNewStateWithAnimation = useCallback(
    async (
      nextState: GameStateDto,
      prevBoardSnapshot: number[][] | null,
      suppressGameOverModal = false
    ) => {
      if (flipCleanupTimerRef.current) {
        window.clearTimeout(flipCleanupTimerRef.current);
        flipCleanupTimerRef.current = null;
      }

      const { placed, flippedSet } = detectBoardChanges(
        prevBoardSnapshot,
        nextState.board
      );
      if (placed) {
        setLastMove(placed);
      }

      if (prevBoardSnapshot && flippedSet.size > 0) {
        setIsAnimatingMove(true);

        // 第1段階: 置いた石のみ反映し、挟まれた石は元の色で待機
        const intermediateBoard = cloneBoard(prevBoardSnapshot);
        if (placed) {
          intermediateBoard[placed[0]][placed[1]] =
            nextState.board[placed[0]][placed[1]];
        }

        const intermediateState: GameStateDto = {
          ...nextState,
          board: intermediateBoard,
          legal_points: [],
        };

        setFlippingDiscs(new Map());
        setGameState(intermediateState);
        stateRef.current.gameState = nextState;

        await new Promise((r) => setTimeout(r, 300));

        // 第2段階: 反転アニメーションを開始
        const flipMap = new Map<string, FlippingDiscInfo>();
        flippedSet.forEach((key) => {
          const [rStr, cStr] = key.split(',');
          const r = Number(rStr);
          const c = Number(cStr);
          flipMap.set(key, {
            fromColor: prevBoardSnapshot[r][c] as DiscColor,
            toColor: nextState.board[r][c] as DiscColor,
          });
        });

        setFlippingDiscs(flipMap);
        setGameState(nextState);

        await new Promise((r) => setTimeout(r, 550));
        setFlippingDiscs(new Map());
        setIsAnimatingMove(false);
      } else {
        setFlippingDiscs(new Map());
        setGameState(nextState);
        stateRef.current.gameState = nextState;
      }

      if (nextState.is_game_over && !suppressGameOverModal) {
        setShowGameOver(true);
      }
    },
    []
  );

  // AIの自動着手ループ（連続パス時も継続）
  const runAiTurnLoop = useCallback(async () => {
    if (stateRef.current.isAiThinking) return;
    const backend = getBackend();
    if (!backend) return;

    try {
      while (
        stateRef.current.gameMode === 'pve' &&
        !stateRef.current.gameState.is_game_over &&
        stateRef.current.gameState.turn !== stateRef.current.playerColor
      ) {
        setIsAiThinking(true);
        stateRef.current.isAiThinking = true;

        const aiColorName = stateRef.current.gameState.turn === 1 ? '黒' : '白';
        showToastMessage(
          `🤖 AI (${aiColorName}) が次の手を計算しています...`,
          false
        );

        await new Promise((resolve) =>
          requestAnimationFrame(() => setTimeout(resolve, 120))
        );

        const prevSnap = cloneBoard(stateRef.current.gameState.board);

        const minThinkMs = 500;
        const startTime = performance.now();
        const res = await backend.putByAi(aiLevel);
        const elapsed = performance.now() - startTime;
        if (elapsed < minThinkMs) {
          await new Promise((r) => setTimeout(r, minThinkMs - elapsed));
        }

        setIsAiThinking(false);
        stateRef.current.isAiThinking = false;
        showToastMessage('', true);

        await applyNewStateWithAnimation(res, prevSnap);

        if (res.consecutive_passes === 1 && !res.is_game_over) {
          const passedColor = (-res.turn) as DiscColor;
          await triggerPassOverlay(
            passedColor,
            stateRef.current.gameMode,
            stateRef.current.playerColor
          );
        }
      }
    } catch (e) {
      setIsAiThinking(false);
      stateRef.current.isAiThinking = false;
      showToastMessage(String(e), true);
    }
  }, [aiLevel, applyNewStateWithAnimation, showToastMessage, triggerPassOverlay]);

  // 新規ゲームの開始
  const startNewGame = useCallback(
    async (
      size: BoardSize = stateRef.current.currentSize,
      overrideMode?: GameMode,
      overridePlayerColor?: DiscColor,
      overrideAiLevel?: AILevel
    ) => {
      const backend = getBackend();
      if (!backend) return;

      const activeMode = overrideMode ?? stateRef.current.gameMode;
      const activePlayerColor =
        overridePlayerColor ?? stateRef.current.playerColor;

      setCurrentSize(size);
      if (overrideMode) setGameMode(overrideMode);
      if (overridePlayerColor) setPlayerColor(overridePlayerColor);
      if (overrideAiLevel) setAiLevel(overrideAiLevel);

      setIsAiThinking(false);
      stateRef.current.isAiThinking = false;
      setIsAnimatingMove(false);
      setLastMove(null);
      setFlippingDiscs(new Map());
      setShowGameOver(false);

      try {
        setIsLoading(true);
        const res = await backend.newGame(size);
        setGameState(res);
        stateRef.current.gameState = res;
        showToastMessage(`${size}x${size} の新規ゲームを開始しました`, true);

        if (
          activeMode === 'pve' &&
          !res.is_game_over &&
          res.turn !== activePlayerColor
        ) {
          setIsLoading(false);
          void runAiTurnLoop();
        }
      } catch (e) {
        showToastMessage(String(e), true);
      } finally {
        setIsLoading(false);
      }
    },
    [runAiTurnLoop, showToastMessage]
  );

  // マスクリック時の着手処理
  const handleCellClick = async (row: number, col: number) => {
    if (isAiThinking || isAnimatingMove || gameState.is_game_over) return;
    if (gameMode === 'pve' && gameState.turn !== playerColor) return;

    const backend = getBackend();
    if (!backend) return;

    try {
      const prevSnap = cloneBoard(gameState.board);
      const res = await backend.putDisc(row, col);
      await applyNewStateWithAnimation(res, prevSnap);

      if (res.consecutive_passes === 1 && !res.is_game_over) {
        const passedColor = (-res.turn) as DiscColor;
        await triggerPassOverlay(passedColor, gameMode, playerColor);
      }

      if (gameMode === 'pve' && !res.is_game_over && res.turn !== playerColor) {
        await runAiTurnLoop();
      }
    } catch (e) {
      showToastMessage(String(e), true);
    }
  };

  // 1手戻る（Undo）処理
  const handleUndo = async () => {
    if (isAiThinking || isAnimatingMove) return;
    const backend = getBackend();
    if (!backend) return;

    try {
      let res = await backend.undo();
      if ((gameMode === 'pve') && res.consecutive_passes != 1) {
        try {
          const res2 = await backend.undo();
          if (res2) res = res2;
        } catch {
          // 1手しか履歴がない場合は1手戻しで確定
        }
        showToastMessage('2手戻しました', true);
      } else {
        showToastMessage('1手戻しました', true);
      }

      setLastMove(null);
      setFlippingDiscs(new Map());
      setShowGameOver(false);
      setGameState(res);
      stateRef.current.gameState = res;
    } catch {
      showToastMessage('これ以上戻れません', true);
    }
  };

  // 手動でAIに1手打たせる（Let AI Play）処理
  const handleManualAiMove = async () => {
    if (isAiThinking || isAnimatingMove || gameState.is_game_over) return;
    const backend = getBackend();
    if (!backend) return;

    try {
      setIsAiThinking(true);
      stateRef.current.isAiThinking = true;
      const colorName = gameState.turn === 1 ? '黒' : '白';
      showToastMessage(`🤖 AI (${colorName}) が次の手を計算しています...`, false);

      await new Promise((resolve) =>
        requestAnimationFrame(() => setTimeout(resolve, 80))
      );

      const prevSnap = cloneBoard(gameState.board);

      const minThinkMs = 500;
      const startTime = performance.now();
      const res = await backend.putByAi('high');  // 常に最強で補助
      const elapsed = performance.now() - startTime;
      if (elapsed < minThinkMs) {
        await new Promise((r) => setTimeout(r, minThinkMs - elapsed));
      }

      setIsAiThinking(false);
      stateRef.current.isAiThinking = false;
      showToastMessage('', true);

      await applyNewStateWithAnimation(res, prevSnap);

      if (res.consecutive_passes === 1 && !res.is_game_over) {
        const passedColor = (-res.turn) as DiscColor;
        await triggerPassOverlay(passedColor, gameMode, playerColor);
      }

      runAiTurnLoop();

    } catch (e) {
      setIsAiThinking(false);
      stateRef.current.isAiThinking = false;
      showToastMessage(String(e), true);
    }
  };

  // 感想戦モードへの移行
  const enterReviewMode = useCallback(async () => {
    const backend = getBackend();
    if (!backend) return;

    try {
      setIsLoading(true);
      const history = await backend.getHistory();
      setHistoryList(history);
      const lastIndex = history.length > 0 ? history.length - 1 : 0;
      setReviewStep(lastIndex);
      setIsForked(false);
      setForkedStep(null);
      setLastMove(null);
      setFlippingDiscs(new Map());
      setShowGameOver(false);
    } catch (e) {
      showToastMessage(String(e), true);
    } finally {
      setIsLoading(false);
    }
  }, [showToastMessage]);

  // 感想戦での手数移動（未分岐時のみ）
  const goToReviewStep = useCallback(
    (step: number) => {
      if (isForked) return;
      const clamped = Math.max(0, Math.min(step, historyList.length - 1));
      setReviewStep(clamped);
      setLastMove(null);
      setFlippingDiscs(new Map());
    },
    [isForked, historyList.length]
  );

  // 感想戦でのマスクリック処理（分岐開始または分岐中の一手）
  const handleReviewCellClick = useCallback(
    async (row: number, col: number) => {
      if (isAiThinking || isAnimatingMove) return;
      const backend = getBackend();
      if (!backend) return;

      try {
        if (!isForked) {
          const currentState = historyList[reviewStep] ?? gameState;
          if (currentState.is_game_over) return;
          const isLegal = (currentState.legal_points || []).some(
            ([r, c]) => r === row && c === col
          );
          if (!isLegal) return;

          setIsLoading(true);
          await backend.forkAt(reviewStep);
          setIsForked(true);
          setForkedStep(reviewStep);

          const prevSnap = cloneBoard(currentState.board);
          const res = await backend.putDisc(row, col);
          setIsLoading(false);
          await applyNewStateWithAnimation(res, prevSnap, true);

          if (res.consecutive_passes === 1 && !res.is_game_over) {
            const passedColor = (-res.turn) as DiscColor;
            await triggerPassOverlay(passedColor, 'pvp', 1);
          }
        } else {
          if (gameState.is_game_over) return;
          const isLegal = (gameState.legal_points || []).some(
            ([r, c]) => r === row && c === col
          );
          if (!isLegal) return;

          const prevSnap = cloneBoard(gameState.board);
          const res = await backend.putDisc(row, col);
          await applyNewStateWithAnimation(res, prevSnap, true);

          if (res.consecutive_passes === 1 && !res.is_game_over) {
            const passedColor = (-res.turn) as DiscColor;
            await triggerPassOverlay(passedColor, 'pvp', 1);
          }
        }
      } catch (e) {
        showToastMessage(String(e), true);
      } finally {
        setIsLoading(false);
      }
    },
    [
      isAiThinking,
      isAnimatingMove,
      isForked,
      historyList,
      reviewStep,
      gameState,
      applyNewStateWithAnimation,
      triggerPassOverlay,
      showToastMessage,
    ]
  );

  // 感想戦でのAI着手処理（分岐開始または分岐中の一手）
  const handleReviewAiMove = useCallback(async () => {
    if (isAiThinking || isAnimatingMove) return;
    const backend = getBackend();
    if (!backend) return;

    try {
      if (!isForked) {
        const currentState = historyList[reviewStep] ?? gameState;
        if (currentState.is_game_over || !currentState.legal_points?.length) return;

        setIsAiThinking(true);
        stateRef.current.isAiThinking = true;
        const colorName = currentState.turn === 1 ? '黒' : '白';
        showToastMessage(`🤖 AI (${colorName}) が次の手を計算しています...`, false);

        await new Promise((resolve) =>
          requestAnimationFrame(() => setTimeout(resolve, 80))
        );

        await backend.forkAt(reviewStep);
        setIsForked(true);
        setForkedStep(reviewStep);

        const prevSnap = cloneBoard(currentState.board);
        const minThinkMs = 400;
        const startTime = performance.now();
        const res = await backend.putByAi('high');
        const elapsed = performance.now() - startTime;
        if (elapsed < minThinkMs) {
          await new Promise((r) => setTimeout(r, minThinkMs - elapsed));
        }

        setIsAiThinking(false);
        stateRef.current.isAiThinking = false;
        showToastMessage('', true);

        await applyNewStateWithAnimation(res, prevSnap, true);

        if (res.consecutive_passes === 1 && !res.is_game_over) {
          const passedColor = (-res.turn) as DiscColor;
          await triggerPassOverlay(passedColor, 'pvp', 1);
        }
      } else {
        if (gameState.is_game_over || !gameState.legal_points?.length) return;

        setIsAiThinking(true);
        stateRef.current.isAiThinking = true;
        const colorName = gameState.turn === 1 ? '黒' : '白';
        showToastMessage(`🤖 AI (${colorName}) が次の手を計算しています...`, false);

        await new Promise((resolve) =>
          requestAnimationFrame(() => setTimeout(resolve, 80))
        );

        const prevSnap = cloneBoard(gameState.board);
        const minThinkMs = 400;
        const startTime = performance.now();
        const res = await backend.putByAi('high');
        const elapsed = performance.now() - startTime;
        if (elapsed < minThinkMs) {
          await new Promise((r) => setTimeout(r, minThinkMs - elapsed));
        }

        setIsAiThinking(false);
        stateRef.current.isAiThinking = false;
        showToastMessage('', true);

        await applyNewStateWithAnimation(res, prevSnap, true);

        if (res.consecutive_passes === 1 && !res.is_game_over) {
          const passedColor = (-res.turn) as DiscColor;
          await triggerPassOverlay(passedColor, 'pvp', 1);
        }
      }
    } catch (e) {
      setIsAiThinking(false);
      stateRef.current.isAiThinking = false;
      showToastMessage(String(e), true);
    }
  }, [
    isAiThinking,
    isAnimatingMove,
    isForked,
    historyList,
    reviewStep,
    gameState,
    showToastMessage,
    applyNewStateWithAnimation,
    triggerPassOverlay,
  ]);

  // 感想戦での1手戻る（Undo）処理
  const handleReviewUndo = useCallback(async () => {
    if (!isForked || isAiThinking || isAnimatingMove) return;
    const backend = getBackend();
    if (!backend) return;

    try {
      const res = await backend.undo();
      setLastMove(null);
      setFlippingDiscs(new Map());
      setGameState(res);
      stateRef.current.gameState = res;
      showToastMessage('1手戻しました', true);
    } catch {
      showToastMessage('分岐起点局面です（これ以上戻れません）', true);
    }
  }, [isForked, isAiThinking, isAnimatingMove, showToastMessage]);

  // 分岐シミュレーションから本譜へ戻る（Reset to Main）
  const handleResetToReview = useCallback(async () => {
    if (!isForked || isAiThinking || isAnimatingMove) return;
    const backend = getBackend();
    if (!backend) return;

    try {
      setIsLoading(true);
      const resetStep = await backend.resetToMain();
      setIsForked(false);
      setForkedStep(null);
      setReviewStep(resetStep);
      setLastMove(null);
      setFlippingDiscs(new Map());
      showToastMessage(`本譜（${resetStep}手目）に戻りました`, true);
    } catch (e) {
      showToastMessage(String(e), true);
    } finally {
      setIsLoading(false);
    }
  }, [isForked, isAiThinking, isAnimatingMove, showToastMessage]);

  // 感想戦で現在表示すべき局面
  const currentReviewGameState = isForked
    ? gameState
    : (historyList[reviewStep] ?? gameState);

  // 感想戦で現在表示すべき着手位置
  const currentReviewLastMove = isForked
    ? lastMove
    : reviewStep > 0 && historyList[reviewStep - 1] && historyList[reviewStep]
      ? detectBoardChanges(
        historyList[reviewStep - 1].board,
        historyList[reviewStep].board
      ).placed
      : null;

  // 初回マウント時のバックエンド初期化
  useEffect(() => {
    const backend = getBackend();
    (async () => {
      await backend?.init();
    })();
  }, []);

  return {
    // 状態
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
    // 感想戦状態
    historyList,
    reviewStep,
    isForked,
    forkedStep,
    currentReviewGameState,
    currentReviewLastMove,
    // 更新アクション
    setCurrentSize,
    setGameMode,
    setPlayerColor,
    setAiLevel,
    setShowGameOver,
    startNewGame,
    handleCellClick,
    handleUndo,
    handleManualAiMove,
    // 感想戦アクション
    enterReviewMode,
    goToReviewStep,
    handleReviewCellClick,
    handleReviewAiMove,
    handleReviewUndo,
    handleResetToReview,
  };
}
