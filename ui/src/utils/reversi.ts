import type { BoardSize, GameStateDto } from '../types/reversi';

/**
 * 初期盤面DTOを生成する
 *
 * @param size 盤面のサイズ
 * @returns 初期盤面DTO
 */
export function createMockState(size: BoardSize): GameStateDto {
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

/**
 * 盤面配列をディープコピーする
 *
 * @param board - コピーする盤面配列
 * @returns コピーした盤面配列
 */
export function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}

/**
 * 直前の盤面と現在の盤面を比較し、新しく石が置かれたマスと反転したマスのセットを特定する
 *
 * @param prev - 直前の盤面
 * @param curr - 現在の盤面
 * @returns 新しく置かれたマスと反転したマスのセット
 */
export function detectBoardChanges(
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
