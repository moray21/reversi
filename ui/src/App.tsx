import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu,
  Sliders,
  X,
  CornerUpLeft,
  Bot,
  Grid,
  Users,
  RotateCcw,
} from 'lucide-react';

// ==========================================
// 型定義 (Rust側 GameStateDto と一致)
// ==========================================
export type BoardSize = 4 | 6 | 8;
export type GameMode = 'pvp' | 'pve';
export type DiscColor = 1 | -1; // 1: 黒 (先手), -1: 白 (後手)
export type AILevel = 'low' | 'average' | 'high';

export interface GameStateDto {
  size: BoardSize;
  board: number[][];
  turn: DiscColor;
  n_black: number;
  n_white: number;
  is_game_over: boolean;
  winner: number | null; // 1: 黒勝, -1: 白勝, 0 or null: 引き分け
  legal_points: [number, number][];
  consecutive_passes: number;
}

// Tauri v2 グローバル型宣言
declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}

// ==========================================
// バックエンド抽象化層 (Tauri IPC / WASM Web Worker)
// ==========================================
class ReversiBackend {
  private worker: Worker | null = null;
  private msgId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  private initialized = false;

  private get isTauri(): boolean {
    return typeof window !== 'undefined' && Boolean(window.__TAURI__);
  }

  private sendToWorker<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('WASM Worker is not initialized'));
        return;
      }
      const id = ++this.msgId;
      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, payload });
    });
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (!this.isTauri) {
      try {
        // public/wasm-worker.js を ES Module として起動
        this.worker = new Worker('./wasm-worker.js', { type: 'module' });
        this.worker.onmessage = (event: MessageEvent) => {
          const { id, result, error } = event.data;
          const request = this.pendingRequests.get(id);
          if (!request) return;
          this.pendingRequests.delete(id);
          if (error) {
            request.reject(error);
          } else {
            request.resolve(result);
          }
        };
        this.worker.onerror = (err) => {
          console.error('WASM Worker Error:', err);
        };
        await this.sendToWorker('init');
      } catch (e) {
        console.warn('WASM Worker initialization fallback:', e);
      }
    }
    this.initialized = true;
  }

  async newGame(size: BoardSize): Promise<GameStateDto> {
    if (this.isTauri) {
      return await window.__TAURI__!.core.invoke<GameStateDto>('new_game', { size });
    }
    if (this.worker) {
      return await this.sendToWorker<GameStateDto>('newGame', { size });
    }
    return createMockInitialState(size);
  }

  async putDisc(row: number, col: number): Promise<GameStateDto> {
    if (this.isTauri) {
      return await window.__TAURI__!.core.invoke<GameStateDto>('put_disc', { row, col });
    }
    if (this.worker) {
      return await this.sendToWorker<GameStateDto>('putDisc', { row, col });
    }
    throw new Error('Backend not connected');
  }

  async undo(): Promise<GameStateDto> {
    if (this.isTauri) {
      return await window.__TAURI__!.core.invoke<GameStateDto>('undo');
    }
    if (this.worker) {
      return await this.sendToWorker<GameStateDto>('undo');
    }
    throw new Error('Backend not connected');
  }

  async putByAi(level: AILevel): Promise<GameStateDto> {
    if (this.isTauri) {
      return await window.__TAURI__!.core.invoke<GameStateDto>('put_by_ai', { level });
    }
    if (this.worker) {
      return await this.sendToWorker<GameStateDto>('putByAi', { level });
    }
    throw new Error('Backend not connected');
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.initialized = false;
    }
  }
}

// フォールバック用初期盤面生成（Worker未配置環境での表示崩れ防止）
function createMockInitialState(size: BoardSize): GameStateDto {
  const board = Array.from({ length: size }, () => Array(size).fill(0));
  const mid = size / 2;
  board[mid - 1][mid - 1] = -1;
  board[mid][mid] = -1;
  board[mid - 1][mid] = 1;
  board[mid][mid - 1] = 1;
  return {
    size,
    board,
    turn: 1,
    n_black: 2,
    n_white: 2,
    is_game_over: false,
    winner: null,
    legal_points: [
      [mid - 2, mid - 1],
      [mid - 1, mid - 2],
      [mid, mid + 1],
      [mid + 1, mid],
    ],
    consecutive_passes: 0,
  };
}

// 盤面のディープコピー
function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}

// 直前の盤面と現在の盤面を比較し、新しく置かれたマスと反転したマスを特定する
function detectBoardChanges(
  prev: number[][] | null,
  curr: number[][]
): { placed: [number, number] | null; flippedSet: Set<string> } {
  const flippedSet = new Set<string>();
  let placed: [number, number] | null = null;
  if (!prev || prev.length !== curr.length) {
    return { placed, flippedSet };
  }
  for (let r = 0; r < curr.length; r++) {
    for (let c = 0; c < curr.length; c++) {
      if (prev[r][c] === 0 && curr[r][c] !== 0) {
        placed = [r, c];
      } else if (prev[r][c] !== 0 && curr[r][c] !== 0 && prev[r][c] !== curr[r][c]) {
        flippedSet.add(`${r},${c}`);
      }
    }
  }
  return { placed, flippedSet };
}

// アニメーション中の石のスタイル情報
interface FlippingDiscInfo {
  fromColor: DiscColor;
  toColor: DiscColor;
}

// ==========================================
// メインコンポーネント
// ==========================================
export default function App() {
  const backendRef = useRef<ReversiBackend | null>(null);
  const getBackend = (): ReversiBackend => {
    if (!backendRef.current) {
      backendRef.current = new ReversiBackend();
    }
    return backendRef.current;
  };

  // ゲーム設定ステート
  const [currentSize, setCurrentSize] = useState<BoardSize>(8);
  const [gameMode, setGameMode] = useState<GameMode>('pve');
  const [playerColor, setPlayerColor] = useState<DiscColor>(1);
  const [aiLevel, setAiLevel] = useState<AILevel>('high');

  // 進行・盤面ステート
  const [gameState, setGameState] = useState<GameStateDto>(() => createMockInitialState(8));
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnimatingMove, setIsAnimatingMove] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [flippingDiscs, setFlippingDiscs] = useState<Map<string, FlippingDiscInfo>>(new Map());
  const flipCleanupTimerRef = useRef<number | null>(null);

  // UI・演出ステート
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [passInfo, setPassInfo] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: '',
  });
  const [showGameOver, setShowGameOver] = useState<boolean>(false);
  const messageTimerRef = useRef<number | null>(null);

  // 非同期ループ内で最新値を参照するための Ref
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

  // メッセージ表示ヘルパー
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

  // 盤面更新と差分アニメーション適用
  const applyNewStateWithAnimation = useCallback(
    async (nextState: GameStateDto, prevBoardSnapshot: number[][] | null) => {
      if (flipCleanupTimerRef.current) {
        window.clearTimeout(flipCleanupTimerRef.current);
        flipCleanupTimerRef.current = null;
      }

      const { placed, flippedSet } = detectBoardChanges(prevBoardSnapshot, nextState.board);
      if (placed) {
        setLastMove(placed);
      }

      // 反転する石がある場合は2段階で演出
      if (prevBoardSnapshot && flippedSet.size > 0) {
        setIsAnimatingMove(true);

        // 【第1段階】置いた石だけ反映し、反転対象の石はまだ「元の色」のまま表示して間をあける
        const intermediateBoard = cloneBoard(prevBoardSnapshot);
        if (placed) {
          intermediateBoard[placed[0]][placed[1]] = nextState.board[placed[0]][placed[1]];
        }

        const intermediateState: GameStateDto = {
          ...nextState,
          board: intermediateBoard,
          // アニメーション完了まで合法手ハイライトを一時的に伏せる
          legal_points: [],
        };

        setFlippingDiscs(new Map());
        setGameState(intermediateState);
        stateRef.current.gameState = nextState;

        await new Promise((r) => setTimeout(r, 300));

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

        await new Promise((r) => setTimeout(r, 250));
        setFlippingDiscs(new Map());
        setIsAnimatingMove(false);
      } else {
        setFlippingDiscs(new Map());
        setGameState(nextState);
        stateRef.current.gameState = nextState;
      }

      if (nextState.is_game_over) {
        setShowGameOver(true);
      }
    },
    []
  );

  // AIの自動手番ループ（連続パス・連続手番対応）
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
        showToastMessage(`🤖 AI (${aiColorName}) が次の手を計算しています...`, false);

        // UI描画を先に確定させるための短い待機
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

  // 新規ゲーム開始
  const startNewGame = useCallback(
    async (
      size: BoardSize = stateRef.current.currentSize,
      overrideMode?: GameMode,
      overridePlayerColor?: DiscColor
    ) => {
      const backend = getBackend();
      if (!backend) return;

      const activeMode = overrideMode ?? stateRef.current.gameMode;
      const activePlayerColor = overridePlayerColor ?? stateRef.current.playerColor;

      setCurrentSize(size);
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

        // PvE かつプレイヤーが後手(白)ならAIに初手を打たせる
        if (activeMode === 'pve' && !res.is_game_over && res.turn !== activePlayerColor) {
          setIsLoading(false);
          await runAiTurnLoop();
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

  // Undo 処理（PvE時は自分の手番まで2手戻す）
  const handleUndo = async () => {
    if (isAiThinking || isAnimatingMove) return;
    const backend = getBackend();
    if (!backend) return;

    try {
      let res = await backend.undo();
      if (gameMode === 'pve') {
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

  // 手動でAIに1手打たせるボタン（PvP中の補助・ヒント用など）
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
        await triggerPassOverlay(passedColor, gameMode, playerColor);
      }
    } catch (e) {
      setIsAiThinking(false);
      stateRef.current.isAiThinking = false;
      showToastMessage(String(e), true);
    }
  };

  // モード変更
  const handleModeChange = (mode: GameMode) => {
    setGameMode(mode);
    stateRef.current.gameMode = mode;
    startNewGame(currentSize, mode, playerColor);
  };

  // プレイヤー手番色変更
  const handlePlayerColorChange = (color: DiscColor) => {
    setPlayerColor(color);
    stateRef.current.playerColor = color;
    startNewGame(currentSize, gameMode, color);
  };

  // 盤面サイズ変更
  const handleBoardSizeChange = (size: BoardSize) => {
    setIsSettingsOpen(false);
    startNewGame(size, gameMode, playerColor);
  };

  // 初回マウント時にバックエンド初期化＆8x8開始
  useEffect(() => {
    let mounted = true;
    const backend = getBackend();
    (async () => {
      await backend?.init();
      if (mounted) {
        await startNewGame(8);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [startNewGame]);

  // 合法手セット
  const legalSet = new Set(
    (gameState.legal_points || []).map(([r, c]) => `${r},${c}`)
  );
  const canPlayerClick =
    !isAiThinking &&
    !isAnimatingMove &&
    !gameState.is_game_over &&
    (gameMode === 'pvp' || gameState.turn === playerColor);

  return (
    <div className="bg-[#030712] text-slate-100 min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-white relative overflow-x-hidden font-sans">
      {/* カスタムスタイル（ガラスモーフィズム・アニメーション） */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        body {
          font-family: 'Outfit', sans-serif;
          background-color: #030712;
        }
        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }
        .glass-panel {
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(56, 189, 248, 0.15);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .glass-panel-glow {
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(56, 189, 248, 0.3);
          box-shadow: 0 0 25px rgba(56, 189, 248, 0.15);
        }
        @keyframes placeDiscPop {
          0% { opacity: 0; transform: scale(0.45) translateY(-6px); }
          70% { opacity: 1; transform: scale(1.06) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        /* ジャンプしながらY軸回転して裏返る軌道 */
        @keyframes jumpFlipMotion {
          0% {
            transform: perspective(400px) translateY(0px) scale(1) rotateY(0deg);
          }
          15% {
            transform: perspective(400px) translateY(1px) scale(1) rotateY(5deg);
          }
          45% {
            transform: perspective(400px) translateY(-25px) scale(1.16) rotateY(85deg);
          }
          50% {
            transform: perspective(400px) translateY(-35px) scale(1.18) rotateY(90deg);
          }
          55% {
            transform: perspective(400px) translateY(-25px) scale(1.16) rotateY(95deg);
          }
          85% {
            transform: perspective(400px) translateY(1px) scale(0.97) rotateY(175deg);
          }
          100% {
            transform: perspective(400px) translateY(0px) scale(1) rotateY(180deg);
          }
        }
        /* 前半(0%〜49.9%)だけ表示される元の色の面 */
        @keyframes frontFaceVisibility {
          0%, 49.9% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        /* 後半(50%〜100%)だけ表示される新しい色の面 */
        @keyframes backFaceVisibility {
          0%, 49.9% { opacity: 0; }
          50%, 100% { opacity: 1; }
        }
        .animate-place-disc {
          animation: placeDiscPop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-jump-flip {
          animation: jumpFlipMotion 0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform-style: preserve-3d;
        }
        .flip-front-face {
          animation: frontFaceVisibility 0.52s linear forwards;
        }
        .flip-back-face {
          animation: backFaceVisibility 0.52s linear forwards;
        }
      `}</style>

      {/* ローディングオーバーレイ */}
      <div
        className={`fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-200 ${isLoading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-cyan-300">Processing Engine...</span>
        </div>
      </div>

      {/* パス全画面オーバーレイ */}
      <div
        className={`fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center transition-opacity duration-300 ${passInfo.visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      >
        <div className="glass-panel-glow px-10 py-8 rounded-3xl text-center space-y-2 border border-amber-400/40 shadow-2xl shadow-amber-500/20">
          <div className="text-4xl font-extrabold tracking-widest bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent font-mono">
            PASS
          </div>
          <p className="text-sm font-mono text-slate-200">{passInfo.text}</p>
        </div>
      </div>

      {/* ヘッダー */}
      <header className="w-full border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <img src="/favicon.png"></img>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Reversi App
            </h1>
          </div>
        </div>

        {/* 右側：ステータス & ハンバーガーボタン */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            aria-label="Open Settings"
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 設定ハンバーガーメニュー（ドロワー） */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${isSettingsOpen ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
      >
        {/* バックドロップ */}
        <div
          onClick={() => setIsSettingsOpen(false)}
          className={`absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 ${isSettingsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
        />

        {/* スライディングパネル */}
        <div
          className={`absolute right-0 top-0 h-full w-80 max-w-full glass-panel border-l border-slate-800 p-6 flex flex-col justify-between transform transition-transform duration-300 shadow-2xl overflow-y-auto ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          <div className="space-y-6">
            {/* パネルヘッダー */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-purple-400" />
                <h2 className="font-bold text-sm tracking-wider font-mono text-white">
                  SETTINGS
                </h2>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 対戦モード選択 */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300 font-mono">
                Game Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleModeChange('pve')}
                  className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${gameMode === 'pve'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50'
                    }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>vs AI</span>
                </button>
                <button
                  onClick={() => handleModeChange('pvp')}
                  className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${gameMode === 'pvp'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50'
                    }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>vs Player</span>
                </button>
              </div>
            </div>

            {/* プレイヤーの手番（AI対戦時のみ表示） */}
            {gameMode === 'pve' && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300 font-mono">
                  Your Side
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePlayerColorChange(1)}
                    className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${playerColor === 1
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50'
                      }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-black border border-slate-500" />
                    <span>黒 (先手)</span>
                  </button>
                  <button
                    onClick={() => handlePlayerColorChange(-1)}
                    className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${playerColor === -1
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50'
                      }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300" />
                    <span>白 (後手)</span>
                  </button>
                </div>
              </div>
            )}

            {/* 盤面サイズ */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300 font-mono">
                Board Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([4, 6, 8] as BoardSize[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleBoardSizeChange(s)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${currentSize === s
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50'
                      }`}
                  >
                    {s}x{s}
                  </button>
                ))}
              </div>
            </div>

            {/* AIレベル設定 */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300 font-mono">
                AI Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'average', 'high'] as AILevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setAiLevel(lvl)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${aiLevel === lvl
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50'
                      }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ドロワー下部：New Game ボタン */}
          <div className="pt-6 space-y-3 border-t border-slate-800">
            <button
              onClick={() => {
                setIsSettingsOpen(false);
                startNewGame(currentSize);
              }}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Game</span>
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-2 md:p-2 items-center">
        {/* スコア・手番カード */}
        <div className="glass-panel rounded-2xl p-3 relative overflow-hidden space-y-2">

          <div className="w-full flex items-center justify-between mb-3 px-1">
            <div className="text-xs font-mono text-slate-400 flex items-center space-x-2">
              <Grid className="w-4 h-4 text-cyan-400" />
              <span>BOARD</span>
            </div>

            {/* 手番インジケーター */}
            {isAiThinking ? (
              <div className="flex items-center space-x-2 bg-purple-950/90 px-3 py-1 rounded-full border border-purple-400 font-mono text-xs shadow-lg shadow-purple-500/30 animate-pulse">
                <div className="w-2.5 h-2 rounded-full bg-purple-400 animate-ping" />
                <span className="font-bold text-purple-200 text-[11px]">
                  AI ({gameState.turn === 1 ? '黒' : '白'}) 思考中...
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800 font-mono text-xs shadow-inner">
                <div
                  className={`w-2.5 h-2 rounded-full ${gameState.turn === 1
                    ? 'bg-black border border-slate-600'
                    : 'bg-white border border-slate-400'
                    }`}
                />
                <span className="font-bold text-white text-[11px]">
                  {gameState.turn === 1
                    ? gameMode === 'pve' && playerColor === 1
                      ? '黒の手番 (あなた)'
                      : '黒の手番'
                    : gameMode === 'pve' && playerColor === -1
                      ? '白の手番 (あなた)'
                      : '白の手番'}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 黒スコア */}
            <div
              className={`flex items-center justify-between px-4 py-1 rounded-xl transition-all ${gameState.turn === 1
                ? isAiThinking
                  ? 'bg-purple-950/70 border-2 border-purple-400 shadow-lg shadow-purple-500/30 animate-pulse'
                  : 'bg-slate-900 border-2 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/90 border border-slate-800 opacity-65'
                }`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-black border border-slate-600" />
                <span className="text-xs font-medium text-slate-300">
                  Black
                  {gameMode === 'pve' && playerColor === 1 && (
                    <span className="ml-1 text-[10px] text-cyan-400">(You)</span>
                  )}
                </span>
              </div>
              <span className="text-xl font-bold font-mono text-white">
                {gameState.n_black}
              </span>
            </div>

            {/* 白スコア */}
            <div
              className={`flex items-center justify-between px-4 py-1 rounded-xl transition-all ${gameState.turn === -1
                ? isAiThinking
                  ? 'bg-purple-950/70 border-2 border-purple-400 shadow-lg shadow-purple-500/30 animate-pulse'
                  : 'bg-slate-900 border-2 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/90 border border-slate-800 opacity-65'
                }`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-white border border-slate-300" />
                <span className="text-xs font-medium text-slate-300">
                  White
                  {gameMode === 'pve' && playerColor === -1 && (
                    <span className="ml-1 text-[10px] text-cyan-400">(You)</span>
                  )}
                </span>
              </div>
              <span className="text-xl font-bold font-mono text-white">
                {gameState.n_white}
              </span>
            </div>
          </div>

          {/* 正方形ボードコンテナ */}
          <div className="bg-slate-950/90 border-2 border-slate-800 rounded-2xl p-3 shadow-2xl w-full aspect-square flex items-center justify-center">
            <div
              className="grid gap-1.5 w-full h-full aspect-square"
              style={{
                gridTemplateColumns: `repeat(${gameState.size}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gameState.size}, minmax(0, 1fr))`,
              }}
            >
              {gameState.board.map((rowArr, r) =>
                rowArr.map((discVal, c) => {
                  const key = `${r},${c}`;
                  const isLegal = legalSet.has(key) && !gameState.is_game_over;
                  const isLastMoveCell =
                    lastMove !== null && lastMove[0] === r && lastMove[1] === c;
                  const flipInfo = flippingDiscs.get(key);

                  const blackDiscClass =
                    'rounded-full bg-gradient-to-br from-slate-700 via-slate-900 to-black shadow-lg border border-slate-700/50';
                  const whiteDiscClass =
                    'rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 shadow-lg border border-slate-200';

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!isLegal || !canPlayerClick}
                      onClick={() => handleCellClick(r, c)}
                      className={`w-full h-full rounded-xl flex items-center justify-center relative transition shadow-inner aspect-square ${isLegal && canPlayerClick
                        ? 'bg-cyan-950/30 border-2 border-cyan-500/50 hover:bg-cyan-900/40 cursor-pointer'
                        : 'bg-slate-900/60 border border-slate-800 cursor-default'
                        } ${isLastMoveCell ? 'ring-2 ring-amber-400/80' : ''}`}
                    >
                      {/* 反転アニメーション中の石：色を変えずにジャンプ＋回転し、50%(真横)の瞬間に色が切り替わる */}
                      {flipInfo ? (
                        <div className="w-[82%] h-[82%] relative animate-jump-flip">
                          {/* 前半：元の色の石 */}
                          <div
                            className={`absolute inset-0 flip-front-face ${flipInfo.fromColor === 1 ? blackDiscClass : whiteDiscClass
                              }`}
                          />
                          {/* 後半：反転後の色の石 */}
                          <div
                            className={`absolute inset-0 flip-back-face ${flipInfo.toColor === 1 ? blackDiscClass : whiteDiscClass
                              }`}
                          />
                        </div>
                      ) : (
                        <>
                          {discVal === 1 && (
                            <div
                              className={`w-[82%] h-[82%] ${blackDiscClass} ${isLastMoveCell ? 'animate-place-disc' : ''
                                }`}
                            />
                          )}
                          {discVal === -1 && (
                            <div
                              className={`w-[82%] h-[82%] ${whiteDiscClass} ${isLastMoveCell ? 'animate-place-disc' : ''
                                }`}
                            />
                          )}
                        </>
                      )}
                      {discVal === 0 && isLegal && canPlayerClick && (
                        <div className="w-3 h-3 rounded-full bg-cyan-400/60 animate-ping shadow-sm" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ボード下部：Undo & Let AI Play 1行ボタン */}
          <div className="w-full grid grid-cols-2 gap-2.5 mt-4">
            <button
              type="button"
              disabled={isAiThinking || isAnimatingMove}
              onClick={handleUndo}
              style={{ opacity: isAiThinking || isAnimatingMove ? 0.5 : 1 }}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>

            <button
              type="button"
              disabled={isAiThinking || isAnimatingMove || gameState.is_game_over}
              onClick={handleManualAiMove}
              style={{ opacity: isAiThinking || isAnimatingMove ? 0.5 : 1 }}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <Bot className="w-4 h-4" />
              <span>Let AI Play</span>
            </button>
          </div>
        </div>

        {/* ステータスメッセージ */}
        {message && (
          <div className="glass-panel rounded-xl p-3 text-xs font-mono text-cyan-300 text-center border border-cyan-500/20 animate-fade-in">
            {message}
          </div>
        )}
      </main>

      {/* モーダル（ゲーム終了時） */}
      <div
        className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300 ${showGameOver ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      >
        <div className="glass-panel-glow p-8 rounded-3xl max-w-sm w-full mx-4 text-center space-y-5">
          <div className="text-4xl mx-auto flex items-center justify-center">
            {gameState.winner === 1 ? '🖤' : gameState.winner === -1 ? '🤍' : '🤝'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              {gameState.winner === 1
                ? 'BLACK WINNER'
                : gameState.winner === -1
                  ? 'WHITE WINNER'
                  : 'DRAW'}
            </h3>
            <p className="text-sm font-mono text-cyan-300">
              {gameState.winner === 1
                ? `黒の勝利です！ (黒: ${gameState.n_black} vs 白: ${gameState.n_white})`
                : gameState.winner === -1
                  ? `白の勝利です！ (黒: ${gameState.n_black} vs 白: ${gameState.n_white})`
                  : `引き分けです！ (黒: ${gameState.n_black} vs 白: ${gameState.n_white})`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowGameOver(false);
              startNewGame(currentSize);
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/30 hover:opacity-90 transition-all cursor-pointer"
          >
            Play Again
          </button>
        </div>
      </div>

      {/* フッター */}
      {/* <footer className="w-full py-3 text-center text-xs text-slate-400 font-mono border-t border-slate-900 bg-slate-950/50">
      </footer> */}
    </div>
  );
}
