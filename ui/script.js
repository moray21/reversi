// Lucide アイコン初期化
lucide.createIcons();

// Tauri環境かどうかの自動判定
const _isTauri = Boolean(window.__TAURI__);

class ReversiBackend {
    constructor() {
        this.wasmEngine = null;
        this.wasmModule = null;
    }

    async init() {
        if (!_isTauri) {
            // Web環境の場合のみ WASM モジュールを動的インポートして初期化
            const wasm = await import('./pkg/reversi_wasm.js');
            await wasm.default();
            this.wasmModule = wasm;
        }
    }

    async newGame(size) {
        if (_isTauri) {
            return await window.__TAURI__.core.invoke("new_game", { size });
        } else {
            this.wasmEngine = new this.wasmModule.WasmGameEngine(size);
            return this.wasmEngine.get_state();
        }
    }

    async putDisc(row, col) {
        if (_isTauri) {
            return await window.__TAURI__.core.invoke("put_disc", { row, col });
        } else {
            return this.wasmEngine.put_disc(row, col);
        }
    }

    async undo() {
        if (_isTauri) {
            return await window.__TAURI__.core.invoke("undo");
        } else {
            return this.wasmEngine.undo();
        }
    }

    async putByAi(depth) {
        if (_isTauri) {
            return await window.__TAURI__.core.invoke("put_by_ai", { depth });
        } else {
            return this.wasmEngine.put_by_ai(depth);
        }
    }
}

const backend = new ReversiBackend();

let currentSize = 8;
let gameMode = 'pvp';     // 'pvp' または 'pve'
let playerColor = 1;     // 1: 黒 (先手), -1: 白 (後手)
let turn = 1;  // 1: 黒 (先手), -1: 白 (後手)
let messageTimer = null;
let isAiThinking = false;
let isGameOver = false;

let prevBoard = null;
let lastMove = null; // [row, col]

function waitNextPaint(ms = 50) {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            setTimeout(resolve, ms);
        });
    });
}

// 盤面データのディープコピー
function cloneBoard(board) {
    if (!board) return null;
    return board.map(row => [...row]);
}

// 前回盤面と今回盤面を比較し、新しく石が置かれた座標 [row, col] を検出
function detectLastMove(oldBoard, newBoard) {
    if (!oldBoard || !newBoard || oldBoard.length !== newBoard.length) return null;
    const size = newBoard.length;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (oldBoard[r][c] === 0 && newBoard[r][c] !== 0) {
                return [r, c];
            }
        }
    }
    return null;
}

// ハンバーガーメニューの開閉トグル
function toggleSettingsMenu() {
    const drawer = document.getElementById("settings-drawer");
    if (drawer) {
        drawer.classList.toggle("open");
    }
}

// ゲームモードの切り替え
function setGameMode(mode) {
    gameMode = mode;
    const pvpBtn = document.getElementById("mode-btn-pvp");
    const pveBtn = document.getElementById("mode-btn-pve");
    const aiColorContainer = document.getElementById("ai-color-container");
    const modeLabel = document.getElementById("mode-display-label");

    if (mode === 'pvp') {
        pvpBtn.className = "px-3 py-2 rounded-xl text-xs font-mono font-bold transition bg-emerald-600 text-white shadow-md cursor-pointer";
        pveBtn.className = "px-3 py-2 rounded-xl text-xs font-mono font-bold transition bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50 cursor-pointer";
        aiColorContainer.classList.add("hidden");
        if (modeLabel) modeLabel.innerText = "BOARD GRID (対人戦)";
    } else {
        pveBtn.className = "px-3 py-2 rounded-xl text-xs font-mono font-bold transition bg-emerald-600 text-white shadow-md cursor-pointer";
        pvpBtn.className = "px-3 py-2 rounded-xl text-xs font-mono font-bold transition bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50 cursor-pointer";
        aiColorContainer.classList.remove("hidden");
        if (modeLabel) modeLabel.innerText = "BOARD GRID (AI対戦)";
    }
    newGame(currentSize);
}

// AI対戦時のプレイヤー手番色選択
function setPlayerColor(color) {
    playerColor = color;
    const bBtn = document.getElementById("color-btn-black");
    const wBtn = document.getElementById("color-btn-white");

    if (color === 1) {
        bBtn.className = "px-3 py-2 rounded-xl text-xs font-mono font-bold transition bg-cyan-600 text-white shadow-md cursor-pointer";
        wBtn.className = "px-3 py-2 rounded-xl text-xs font-mono font-bold transition bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50 cursor-pointer";
    } else {
        wBtn.className = "px-3 py-2 rounded-xl text-xs font-mono font-bold transition bg-cyan-600 text-white shadow-md cursor-pointer";
        bBtn.className = "px-3 py-2 rounded-xl text-xs font-mono font-bold transition bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50 cursor-pointer";
    }
    newGame(currentSize);
}

// 盤面サイズの設定変更
function setBoardSize(size) {
    [4, 6, 8].forEach(s => {
        const btn = document.getElementById(`size-btn-${s}`);
        if (!btn) return;
        if (s === size) {
            btn.className = "px-3 py-2 rounded-xl text-xs font-mono font-bold transition bg-emerald-600 text-white shadow-md shadow-emerald-600/20";
        } else {
            btn.className = "px-3 py-2 rounded-xl text-xs font-mono font-bold transition bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50";
        }
    });
    newGame(size);
    toggleSettingsMenu();
}

function setAiThinkingUI(thinking) {
    isAiThinking = thinking;
    const turnText = document.getElementById("turn-text");
    const turnBadge = turnText ? turnText.parentElement : null;
    const indicator = document.getElementById("turn-indicator");

    // 思考中はボタン操作を無効化
    document.querySelectorAll("button").forEach(btn => {
        if (btn.getAttribute("onclick")?.includes("undo") || btn.getAttribute("onclick")?.includes("playAiManual")) {
            btn.disabled = thinking;
            btn.style.opacity = thinking ? "0.5" : "1";
        }
    });

    if (thinking) {
        const colorName = turn === 1 ? "黒" : "白";
        if (turnBadge) {
            turnBadge.className = "flex items-center space-x-2 bg-purple-950/90 px-3 py-1 rounded-full border border-purple-400 font-mono text-xs shadow-lg shadow-purple-500/30 animate-pulse transition-all";
        }
        if (indicator) {
            indicator.className = "w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping";
        }
        if (turnText) {
            turnText.innerText = `AI (${colorName}) 思考中...`;
            turnText.className = "font-bold text-purple-200 text-[11px]";
        }
        setMessage(`🤖 AI (${colorName}) が次の手を計算しています...`, false);
    } else {
        if (turnBadge) {
            turnBadge.className = "flex items-center space-x-2 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800 font-mono text-xs shadow-inner transition-all";
        }
        if (turnText) {
            turnText.className = "font-bold text-white text-[11px]";
        }
    }
}

// パス検知および全画面オーバーレイ表示
async function checkPass(state) {
    if (state.consecutive_passes == 1 && !state.is_game_over) {
        const passedColor = -state.turn;
        await showPassOverlay(passedColor);
        updateUI(state);
    }
}

async function showPassOverlay(passedColor) {
    const overlay = document.getElementById("pass-overlay");
    if (!overlay) return;

    const colorStr = passedColor === 1 ? "黒" : "白";
    let roleStr = "";
    if (gameMode === 'pvp') {
        roleStr = passedColor === playerColor ? "（Player1）" : "（Player2）";
    }
    if (gameMode === 'pve') {
        roleStr = passedColor === playerColor ? "（あなた）" : "（AI）";
    }
    const stoneEmoji = passedColor === 1 ? "⚫" : "⚪";

    // HTMLを変更せずに既存の #pass-overlay 内のテキスト要素を探して更新
    const textElements = overlay.querySelectorAll("p, span, div");
    let updated = false;
    textElements.forEach(el => {
        if (el.children.length === 0 && el.innerText.includes("打てる")) {
            el.innerText = `${stoneEmoji} ${colorStr}${roleStr}は打てる場所がないためパスします`;
            updated = true;
        }
    });

    // 該当要素が見つからない場合のフォールバックとしてメッセージボックスにも表示
    setMessage(`${stoneEmoji} ${colorStr}${roleStr}がパスしました`, true);

    await new Promise(r => setTimeout(r, 300));
    overlay.classList.remove("opacity-0", "pointer-events-none");
    setTimeout(() => {
        overlay.classList.add("opacity-0", "pointer-events-none");
    }, 1200);
    await new Promise(r => setTimeout(r, 1200));
}

function setMessage(text, autoClear = true) {
    const box = document.getElementById("message-box");
    if (!box) return;

    if (messageTimer) {
        clearTimeout(messageTimer);
        messageTimer = null;
    }

    if (!text) {
        box.innerText = "";
        box.classList.add("hidden");
        return;
    }

    box.innerText = text;
    box.classList.remove("hidden");

    if (autoClear) {
        messageTimer = setTimeout(() => {
            box.innerText = "";
            box.classList.add("hidden");
        }, 3500);
    }
}

async function newGame(size) {
    currentSize = size;
    setAiThinkingUI(false);
    lastMove = null;
    prevBoard = null;

    [4, 6, 8].forEach(s => {
        const btn = document.getElementById(`size-btn-${s}`);
        if (!btn) return;
        if (s === size) {
            btn.className = "px-3 py-2 rounded-xl text-xs font-mono font-bold transition bg-emerald-600 text-white shadow-md shadow-emerald-600/20 cursor-pointer";
        } else {
            btn.className = "px-3 py-2 rounded-xl text-xs font-mono font-bold transition bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50 cursor-pointer";
        }
    });

    try {
        const res = await backend.newGame(size);
        setMessage(`${size}x${size} の新規ゲームを開始しました`, true);
        isGameOver = res.is_game_over;
        turn = res.turn;
        prevBoard = cloneBoard(res.board);
        updateUI(res);

        // AI戦でプレイヤーが白（後手）の場合、先手のAIに最初に自動で打たせる
        if (gameMode === 'pve' && playerColor === -1 && !res.is_game_over) {
            await triggerAiTurn();
        }
    } catch (e) {
        setMessage("エラー: " + e, false);
    }
}

async function putDisc(row, col) {
    if (isAiThinking || isGameOver) return;
    if (gameMode === 'pve' && turn !== playerColor) return;

    setMessage("", false);

    try {
        const res = await backend.putDisc(row, col);
        lastMove = [row, col];
        prevBoard = cloneBoard(res.board);
        isGameOver = res.is_game_over;
        turn = res.turn;
        updateUI(res);
        await checkPass(res);

        // プレイヤーが打った後、AI対戦モードかつゲーム未終了かつ次のターンがAIなら自動で打たせる
        if (gameMode === 'pve' && !res.is_game_over && res.turn !== playerColor) {
            await triggerAiTurn();
        }
    } catch (e) {
        setMessage(e, true);
    }
}

// AIの手を自動または手動で実行する（whileループによる堅牢な手番・フラグ管理）
async function triggerAiTurn() {
    if (isAiThinking || isGameOver) return;

    try {
        while (gameMode === 'pve' && !isGameOver && turn !== playerColor) {
            await executeSingleAiMove();
        }
    } catch (e) {
        setMessage(e, true);
        setAiThinkingUI(false);
    }
}

async function executeSingleAiMove() {
    setAiThinkingUI(true);
    updateTurnAndScoreCards(); // AI側スコアカードを思考中スタイルに更新

    await waitNextPaint(50);

    const depth = parseInt(document.getElementById("ai-depth")?.value) || 4;
    const minThinkMs = 500;
    const startTime = performance.now();

    const res = await backend.putByAi(depth);

    const elapsed = performance.now() - startTime;
    if (elapsed < minThinkMs) {
        await new Promise(r => setTimeout(r, minThinkMs - elapsed));
    }

    const detected = detectLastMove(prevBoard, res.board);
    if (detected) {
        lastMove = detected;
    }
    prevBoard = cloneBoard(res.board);
    isGameOver = res.is_game_over;
    turn = res.turn;

    setAiThinkingUI(false);
    setMessage("", false);
    updateUI(res);
    await checkPass(res);
}

// Let AI Playボタン
async function playAiManual() {
    if (isAiThinking || isGameOver) return;

    try {
        await executeSingleAiMove();
        // プレイヤーが打った後、AI対戦モードかつゲーム未終了かつ次のターンがAIなら自動で打たせる
        if (gameMode === 'pve' && !isGameOver && turn !== playerColor) {
            await triggerAiTurn();
        }
    } catch (e) {
        setMessage(e, true);
        setAiThinkingUI(false);
    }
}

async function undo() {
    if (isAiThinking) return;

    try {
        if (gameMode === 'pve') {
            // AI戦の場合は2手戻す（AIの手と自分の手）
            let res = await backend.undo();
            try {
                const res2 = await backend.undo();
                if (res2) res = res2;
            } catch (_) { }

            lastMove = null;
            prevBoard = cloneBoard(res.board);
            isGameOver = res.is_game_over;
            turn = res.turn;
            updateUI(res);
            setMessage("2手戻しました", true);
        } else {
            const res = await backend.undo();
            lastMove = null;
            prevBoard = cloneBoard(res.board);
            isGameOver = res.is_game_over;
            turn = res.turn;
            updateUI(res);
            setMessage("1手戻しました", true);
        }
    } catch (e) {
        setMessage("これ以上戻れません", true);
    }
}

// 手番バッジとスコアカードのハイライト更新
function updateTurnAndScoreCards() {
    const bCard = document.getElementById("player-black-card");
    const wCard = document.getElementById("player-white-card");
    const indicator = document.getElementById("turn-indicator");
    const turnText = document.getElementById("turn-text");

    const activeCardClass = isAiThinking
        ? "flex items-center justify-between px-4 py-2.5 rounded-xl bg-purple-950/70 border-2 border-purple-400 shadow-lg shadow-purple-500/30 animate-pulse transition-all"
        : "flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 border-2 border-cyan-500/80 shadow-lg shadow-cyan-500/10 transition-all";

    const inactiveCardClass = "flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 opacity-65 transition-all";

    if (turn === 1) {
        if (bCard) bCard.className = activeCardClass;
        if (wCard) wCard.className = inactiveCardClass;
        if (indicator && !isAiThinking) indicator.className = "w-2.5 h-2.5 rounded-full bg-black border border-slate-600";
        if (turnText && !isAiThinking) {
            turnText.innerText = gameMode === 'pve' && playerColor === 1 ? "黒の手番 (あなた)" : "黒の手番";
        }
    } else {
        if (wCard) wCard.className = activeCardClass;
        if (bCard) bCard.className = inactiveCardClass;
        if (indicator && !isAiThinking) indicator.className = "w-2.5 h-2.5 rounded-full bg-white border border-slate-400";
        if (turnText && !isAiThinking) {
            turnText.innerText = gameMode === 'pve' && playerColor === -1 ? "白の手番 (あなた)" : "白の手番";
        }
    }
}

function updateUI(state) {
    const container = document.getElementById("board-container");
    if (!container) return;
    container.innerHTML = "";

    const size = state.size;
    const grid = document.createElement("div");
    grid.className = "grid gap-1.5 w-full h-full aspect-square";
    grid.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${size}, minmax(0, 1fr))`;

    const legalSet = new Set((state.legal_points || []).map(p => `${p[0]},${p[1]}`));
    const canPlayerClick = !isAiThinking && !state.is_game_over && (gameMode === 'pvp' || state.turn === playerColor);

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement("button");
            const isLastMoveCell = lastMove && lastMove[0] === r && lastMove[1] === c;

            // 直前に置かれたマスを枠線でハイライト
            cell.className = `w-full h-full aspect-square rounded-xl flex items-center justify-center relative transition shadow-inner ${isLastMoveCell
                ? "bg-slate-800/90 border-2 border-amber-400/40 shadow-amber-500/20"
                : "bg-slate-900/60 border border-slate-800 hover:border-slate-700"
                }`;

            const discVal = state.board[r][c];
            if (discVal === 1) {
                // 黒石
                const stone = document.createElement("div");
                stone.className = "w-[82%] h-[82%] rounded-full bg-gradient-to-br from-slate-700 via-slate-900 to-black shadow-lg border border-slate-700/50 flex items-center justify-center relative";
                cell.appendChild(stone);
            } else if (discVal === -1) {
                // 白石
                const stone = document.createElement("div");
                stone.className = "w-[82%] h-[82%] rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 shadow-lg border border-slate-200 flex items-center justify-center relative";
                cell.appendChild(stone);
            } else if (legalSet.has(`${r},${c}`) && canPlayerClick) {
                // 合法手ガイド
                cell.className = "w-full h-full aspect-square bg-cyan-950/30 border-2 border-cyan-500/50 rounded-xl flex items-center justify-center relative transition hover:bg-cyan-900/40 shadow-inner cursor-pointer";
                const hint = document.createElement("div");
                hint.className = "w-3 h-3 rounded-full bg-cyan-400/60 animate-ping shadow-sm";
                cell.appendChild(hint);
                cell.onclick = () => putDisc(r, c);
            }

            grid.appendChild(cell);
        }
    }

    container.appendChild(grid);

    // スコア更新
    document.getElementById("score-black").innerText = state.n_black;
    document.getElementById("score-white").innerText = state.n_white;

    // 手番バッジ・スコアカード更新
    updateTurnAndScoreCards();

    // ゲーム終了判定
    if (state.is_game_over) {
        showGameOverModal(state);
    }
}

function showGameOverModal(state) {
    const modal = document.getElementById("game-over-modal");
    const title = document.getElementById("modal-title");
    const desc = document.getElementById("modal-desc");
    const icon = document.getElementById("modal-icon");

    if (!modal) return;

    if (state.winner === 1) {
        title.innerText = "BLACK WINNER";
        desc.innerText = `黒の勝利です！ (黒: ${state.n_black} vs 白: ${state.n_white})`;
        icon.innerText = "🖤";
    } else if (state.winner === -1) {
        title.innerText = "WHITE WINNER";
        desc.innerText = `白の勝利です！ (黒: ${state.n_black} vs 白: ${state.n_white})`;
        icon.innerText = "🤍";
    } else {
        title.innerText = "DRAW";
        desc.innerText = `引き分けです！ (黒: ${state.n_black} vs 白: ${state.n_white})`;
        icon.innerText = "🤝";
    }

    modal.classList.remove("opacity-0", "pointer-events-none");
}

function closeModalAndReset() {
    const modal = document.getElementById("game-over-modal");
    if (modal) modal.classList.add("opacity-0", "pointer-events-none");
    newGame(currentSize);
}

// 初期起動
window.onload = async () => {
    try {
        await backend.init();
    } catch (e) {
        console.error("WASMの初期化に失敗しました:", e);
    }
    newGame(8);
};

// グローバルスコープに登録
window.newGame = newGame;
window.putDisc = putDisc;
window.undo = undo;
window.playAiManual = playAiManual;
window.closeModalAndReset = closeModalAndReset;
window.toggleSettingsMenu = toggleSettingsMenu;
window.setGameMode = setGameMode;
window.setPlayerColor = setPlayerColor;
window.setBoardSize = setBoardSize;