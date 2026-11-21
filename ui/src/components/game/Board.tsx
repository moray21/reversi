import type { GameStateDto, FlippingDiscInfo } from '../../types/reversi';

/**
 * Boardで利用するプロパティ
 *
 * @param gameState ゲームの状態
 * @param lastMove  最後に置いた石の位置
 * @param flippingDiscs 反転アニメーション中の石の情報
 * @param canPlayerClick プレイヤーが石を置けるか
 * @param onCellClick セルをクリックしたときの処理
 */
interface BoardProps {
  gameState: GameStateDto;
  lastMove: [number, number] | null;
  flippingDiscs: Map<string, FlippingDiscInfo>;
  canPlayerClick: boolean;
  onCellClick: (row: number, col: number) => void;
}

/** 黒石と白石のスタイル */
const blackDiscClass =
  'rounded-full bg-gradient-to-br from-slate-700 via-slate-900 to-black shadow-lg border border-slate-700/50';
const whiteDiscClass =
  'rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 shadow-lg border border-slate-200';

/**
 * 盤面コンポーネント
 *
 * @param BoardProps Boardで利用するプロパティ
 */
export function Board({
  gameState,
  lastMove,
  flippingDiscs,
  canPlayerClick,
  onCellClick,
}: BoardProps) {
  // 合法手を取得
  const legalSet = new Set(
    (gameState.legal_points || []).map(([r, c]) => `${r},${c}`)
  );

  return (
    <div className="bg-slate-950/90 border-2 border-slate-800 rounded-2xl p-3 shadow-2xl w-full aspect-square flex items-center justify-center">
      <div
        className="grid gap-1.5 w-full h-full aspect-square perspective-board"
        style={{
          gridTemplateColumns: `repeat(${gameState.size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gameState.size}, minmax(0, 1fr))`,
        }}
      >
        {/* 1マスごとに描画 */}
        {gameState.board.map((rowArr, r) =>
          rowArr.map((discVal, c) => {
            const key = `${r},${c}`;
            const isLegal = legalSet.has(key) && !gameState.is_game_over;
            const isLastMoveCell =
              lastMove !== null && lastMove[0] === r && lastMove[1] === c;
            const flipInfo = flippingDiscs.get(key);

            return (
              <button
                key={key}
                type="button"
                disabled={!isLegal || !canPlayerClick}
                onClick={() => onCellClick(r, c)}
                className={`w-full h-full rounded-xl flex items-center justify-center relative transition shadow-inner aspect-square ${isLegal && canPlayerClick
                  ? 'bg-cyan-950/30 border-2 border-cyan-500/50 hover:bg-cyan-900/40 cursor-pointer'
                  : 'bg-slate-900/60 border border-slate-800 cursor-default'
                  } ${isLastMoveCell ? 'ring-2 ring-amber-400/80' : ''}`}
              >
                {/* 反転アニメーション中の石 */}
                {flipInfo ? (
                  <div className="w-[82%] h-[82%] relative animate-jump-arc">
                    <div className="w-full h-full animate-spin-cw">
                      <div className="w-full h-full relative animate-jump-flip">
                        <div
                          className={`absolute inset-0 flip-front-face ${flipInfo.fromColor === 1
                            ? blackDiscClass
                            : whiteDiscClass
                            }`}
                        />
                        <div
                          className={`absolute inset-0 flip-back-face ${flipInfo.toColor === 1
                            ? blackDiscClass
                            : whiteDiscClass
                            }`}
                        />
                      </div>
                    </div>
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
  );
}
