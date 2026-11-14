// Lucide アイコン初期化
lucide.createIcons();

const invoke = window.__TAURI__.core.invoke;


let currentSize = 8;
let gameMode = 'pvp';     // 'pvp' または 'pve'
let playerColor = 1;     // 1: 黒 (先手), -1: 白 (後手)
let turn = 1;  // 1: 黒 (先手), -1: 白 (後手)
let messageTimer = null;
let isAiThinking = false;
let isGameOver = false;

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

async function setLoading(isLoading) {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay) return;
    if (isLoading) {
        overlay.classList.remove("opacity-0", "pointer-events-none");
    } else {
        overlay.classList.add("opacity-0", "pointer-events-none");
    }
}

// パス検知および全画面オーバーレイ表示
function checkPass(state) {
    if (state.consecutive_passes == 1 && !state.is_game_over) {
        showPassOverlay();
    }
}

function showPassOverlay() {
    const overlay = document.getElementById("pass-overlay");
    if (!overlay) return;
    overlay.classList.remove("opacity-0", "pointer-events-none");
    setTimeout(() => {
        overlay.classList.add("opacity-0", "pointer-events-none");
    }, 1200);
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
    isAiThinking = false;

    try {
        setLoading(true);
        const res = await invoke("new_game", { size });
        setMessage(`${size}x${size} の新規ゲームを開始しました`, true);
        isGameOver = res.is_game_over;
        turn = res.turn;
        updateUI(res);

        // AI戦でプレイヤーが白（後手）の場合、先手のAIに最初に自動で打たせる
        if (gameMode === 'pve' && playerColor === -1 && !res.is_game_over) {
            await triggerAiTurn();
        }
    } catch (e) {
        setMessage("エラー: " + e, false);
    } finally {
        setLoading(false);
    }
}

async function putDisc(row, col) {
    if (isAiThinking) return;
    setMessage("", false);

    try {
        setLoading(true);
        const res = await invoke("put_disc", { row, col });
        isGameOver = res.is_game_over;
        turn = res.turn;
        checkPass(res);
        updateUI(res);

        // プレイヤーが打った後、AI対戦モードかつゲーム未終了かつ次のターンがAIなら自動で打たせる
        if (gameMode === 'pve' && !res.is_game_over && res.turn !== playerColor) {
            await triggerAiTurn();
        }
    } catch (e) {
        setMessage(e, true);
    } finally {
        setLoading(false);
    }
}

// AIの手を自動または手動で実行する（whileループによる堅牢な手番・フラグ管理）
async function triggerAiTurn() {
    if (isAiThinking) return;

    try {
        while (gameMode === 'pve') {
            await playAiManual();

            // ゲーム終了時、または手番がプレイヤーの色に戻った場合はループを抜ける
            if (isGameOver || turn === playerColor) {
                break;
            }
        }
    } catch (e) {
        setMessage(e, true);
    } finally {
        setLoading(false);
    }
}

// Let AI Playボタン
async function playAiManual() {
    if (isAiThinking) return;

    try {
        isAiThinking = true;
        const depth = parseInt(document.getElementById("ai-depth").value) || 4;
        setLoading(true);
        setMessage("AIが思考中...", false);
        const res = await invoke("put_by_ai", { depth });
        isGameOver = res.is_game_over;
        turn = res.turn;
        checkPass(res);
        updateUI(res);
        setMessage("AIが手を進めました", true);
        isAiThinking = false;

        // プレイヤーが打った後、AI対戦モードかつゲーム未終了かつ次のターンがAIなら自動で打たせる
        if (gameMode === 'pve' && !res.is_game_over && res.turn !== playerColor) {
            await triggerAiTurn();
        }
    } catch (e) {
        setMessage(e, true);
    } finally {
        setLoading(false);
    }
}

async function undo() {
    if (isAiThinking) return;

    try {
        setLoading(true);
        if (gameMode === 'pve') {
            // AI戦の場合は2手戻す（AIの手と自分の手）
            let res = await invoke("undo");
            try {
                const res2 = await invoke("undo");
                if (res2) res = res2;
            } catch (_) { }

            isGameOver = res.is_game_over;
            turn = res.turn;
            updateUI(res);
            setMessage("2手戻しました", true);
        } else {
            const res = await invoke("undo");
            isGameOver = res.is_game_over;
            turn = res.turn;
            updateUI(res);
            setMessage("1手戻しました", true);
        }
    } catch (e) {
        setMessage("これ以上戻れません", true);
    } finally {
        setLoading(false);
    }
}

function updateUI(state) {
    checkPass(state);

    const container = document.getElementById("board-container");
    if (!container) return;
    container.innerHTML = "";

    const size = state.size;
    const grid = document.createElement("div");
    grid.className = "grid gap-1.5 w-full h-full aspect-square";
    grid.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${size}, minmax(0, 1fr))`;

    const legalSet = new Set((state.legal_points || []).map(p => `${p[0]},${p[1]}`));
    const isPlayerTurn = (gameMode === 'pvp') || (state.turn === playerColor);

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement("button");
            cell.className = "w-full h-full aspect-square bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-center relative transition hover:border-slate-700 shadow-inner cursor-pointer";

            const discVal = state.board[r][c];
            if (discVal === 1) {
                // 黒石
                const stone = document.createElement("div");
                stone.className = "w-[82%] h-[82%] rounded-full bg-gradient-to-br from-slate-700 via-slate-900 to-black shadow-lg animate-fade-in border border-slate-700/50";
                cell.appendChild(stone);
            } else if (discVal === -1) {
                // 白石
                const stone = document.createElement("div");
                stone.className = "w-[82%] h-[82%] rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 shadow-lg animate-fade-in border border-slate-200";
                cell.appendChild(stone);
            } else if (legalSet.has(`${r},${c}`) && !state.is_game_over) {
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

    // 手番カードのハイライト
    const bCard = document.getElementById("player-black-card");
    const wCard = document.getElementById("player-white-card");
    const indicator = document.getElementById("turn-indicator");
    const turnText = document.getElementById("turn-text");

    if (state.turn === 1) {
        bCard.className = "flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 border-2 border-cyan-500/80 shadow-lg shadow-cyan-500/10 transition-all";
        wCard.className = "flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 transition-all";
        indicator.className = "w-2.5 h-2.5 rounded-full bg-black border border-slate-600";
        turnText.innerText = "黒の手番";
    } else {
        bCard.className = "flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 transition-all";
        wCard.className = "flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 border-2 border-cyan-500/80 shadow-lg shadow-cyan-500/10 transition-all";
        indicator.className = "w-2.5 h-2.5 rounded-full bg-white border border-slate-400";
        turnText.innerText = "白の手番";
    }

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
window.onload = () => {
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