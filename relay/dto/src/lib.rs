//! DTO (Data Transfer Object: データ転送オブジェクト)などtauriやwasmで利用するものを定義する
//!
//! # Structs
//!
//! * `GameStateDto` - フロントエンドに返すゲーム状態
//!
//! # Functions
//!
//! * `put_by_ai` - AIにより手を進める
use reversi::ai;
use reversi::{Disc, GameState};
use serde::{Deserialize, Serialize};

/// フロントエンドに返すゲーム状態のDTO(Data Transfer Object：データ転送オブジェクト)
///
/// # Attributes
///
/// * `size` - ゲーム盤のサイズ
/// * `board` - ゲーム盤の状態 (1: 黒, -1: 白, 0: 空)
/// * `turn` - 現在の手番 (1: 黒, -1: 白)
/// * `n_black` - 黒の石の数
/// * `n_white` - 白の石の数
/// * `is_game_over` - ゲームが終了しているか
/// * `winner` - 勝者 (Some(1): 黒, Some(-1): 白, Some(0): 引き分け, None: ゲーム中)
/// * `legal_points` - 打てる場所のリスト ((行, 列)のタプル)
/// * `consecutive_passes` - パスが連続した回数
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GameStateDto {
    pub size: usize,
    pub board: Vec<Vec<i8>>,
    pub turn: i8,
    pub n_black: u8,
    pub n_white: u8,
    pub is_game_over: bool,
    pub winner: Option<i8>,
    pub legal_points: Vec<(usize, usize)>,
    pub consecutive_passes: u32,
}

impl From<&GameState> for GameStateDto {
    /// GameStateからGameStateDtoに変換する
    ///
    /// # Arguments
    ///
    /// * `state` - GameStateの参照
    ///
    /// # Returns
    ///
    /// * `GameStateDto`
    ///
    /// # Example
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, GameState};
    /// use reversi_dto::GameStateDto;
    ///
    /// // 新規盤面
    /// let mut state = GameState::new(BoardSize::Size8);
    /// let mut dto = GameStateDto::from(&state);
    /// assert_eq!(dto.size, 8);
    /// assert!(!dto.is_game_over);
    /// assert_eq!(dto.winner, None);
    ///
    /// // 黒が勝った盤面
    /// state.board = Board::new(BoardSize::Size8, u64::MAX, 0);
    /// dto = GameStateDto::from(&state);
    /// assert!(dto.is_game_over);
    /// assert_eq!(dto.winner, Some(1));
    ///
    /// // 白が勝った盤面
    /// state.board = Board::new(BoardSize::Size8, 0, u64::MAX);
    /// dto = GameStateDto::from(&state);
    /// assert!(dto.is_game_over);
    /// assert_eq!(dto.winner, Some(-1));
    ///
    /// // 引き分けの盤面
    /// state.board = Board::new(BoardSize::Size8, 0, 0);
    /// dto = GameStateDto::from(&state);
    /// assert!(dto.is_game_over);
    /// assert_eq!(dto.winner, Some(0));
    /// ```
    fn from(state: &GameState) -> Self {
        // 勝者を取得
        let winner = if state.is_game_over() {
            match state.get_winner() {
                Some(Disc::Black) => Some(Disc::Black as i8),
                Some(Disc::White) => Some(Disc::White as i8),
                None => Some(0),
            }
        } else {
            None
        };

        Self {
            size: state.board.size as usize,
            board: state.board.to_vec(),
            turn: state.turn as i8,
            n_black: state.board.n_black(),
            n_white: state.board.n_white(),
            is_game_over: state.is_game_over(),
            winner,
            legal_points: state
                .get_legal_points()
                .iter()
                .map(|p| (p.row, p.col))
                .collect(),
            consecutive_passes: state.consecutive_passes,
        }
    }
}

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
    // 決定
    let point = ai::facade::select_hand(game, depth).map_err(|e| e.to_string())?;

    // Noneの場合は何もしない
    if let Some(p) = point {
        game.put_disc(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}
