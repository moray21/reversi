//! AI関係のファサード処理を定義するモジュール
//!
//! # Functions
//!
//! * `select_hand` - AIにより手を決定する
use super::{AiAgent, NegamaxAgent};
use crate::{GameState, Point};

/// AIにより手を決定する
///
/// # Arguments
///
/// * `game` - `GameState`オブジェクト
/// * `depth` - NegaMax法で探索する深さ
///
/// # Return
///
/// * `Result<(), String>`
///
/// # Example
///
/// ```rust
/// use reversi::{Board, BoardSize, GameState};
/// use reversi::ai::facade::select_hand;
///
/// // 新規盤面
/// let mut state = GameState::new(BoardSize::Size8);
/// let mut res = select_hand(&mut state, 1);
/// assert!(res.is_ok());
///
/// // 白には合法手なし
/// state.board = Board::new(BoardSize::Size8, 1, 2);
/// let mut res = select_hand(&mut state, 1);
/// assert!(res.is_ok());
///
/// // depthが0以下の場合
/// res = select_hand(&mut state, 0);
/// assert!(res.is_err());
///
/// // ゲームが終了している場合
/// state.board = Board::new(BoardSize::Size8, 0, 0);
/// res = select_hand(&mut state, 1);
/// assert!(res.is_err());
/// ```
pub fn select_hand(game: &mut GameState, depth: u32) -> Result<Option<Point>, String> {
    // depthが0以下の場合
    if depth == 0 {
        return Err("Invalid depth is specified.".into());
    }

    // ゲームが終了している場合
    if game.is_game_over() {
        return Err("Game is already over".into());
    }

    // AIによる手番の決定
    let mut ai = NegamaxAgent::from_rulebased(depth);
    let point = ai.select_hand(&*game);

    Ok(point)
}
