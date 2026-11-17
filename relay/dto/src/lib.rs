//! DTO (Data Transfer Object: データ転送オブジェクト)などtauriやwasmで利用するものを定義する
//!
//! # Structs
//!
//! * `GameStateDto` - フロントエンドに返すゲーム状態
//!
//! # Functions
//!
//! * `put_by_ai` - AIにより手を進める
use reversi::GameState;
pub use reversi::GameStateDto;
use reversi::ai;

/// AIにより手を進める
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
/// use reversi_dto::put_by_ai;
///
/// // 新規盤面
/// let mut state = GameState::new(BoardSize::Size8);
/// let mut res = put_by_ai(&mut state, 1);
/// assert!(res.is_ok());
///
/// // 白には合法手なし
/// state.board = Board::new(BoardSize::Size8, 1, 2);
/// let mut res = put_by_ai(&mut state, 1);
/// assert!(res.is_ok());
///
/// // depthが0以下の場合
/// res = put_by_ai(&mut state, 0);
/// assert!(res.is_err());
///
/// // ゲームが終了している場合
/// state.board = Board::new(BoardSize::Size8, 0, 0);
/// res = put_by_ai(&mut state, 1);
/// assert!(res.is_err());
/// ```
pub fn put_by_ai(game: &mut GameState, depth: u32) -> Result<(), String> {
    // depthが0以下の場合
    if depth == 0 {
        return Err("Invalid depth is specified.".into());
    }

    // 決定
    let level = "average".parse::<ai::facade::IntelligenceLevel>().unwrap();
    let point = ai::facade::select_hand(game, level).map_err(|e| e.to_string())?;

    // Noneの場合は何もしない
    if let Some(p) = point {
        game.put_disc(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}
