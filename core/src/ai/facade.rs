//! AI関係のファサード処理を定義するモジュール
//!
//! # Functions
//!
//! * `select_hand` - AIにより手を決定する
use super::{AiAgent, EmptyCountSwitcher, EstablishedProcedureAgent, NegamaxAgent, RandomAgent};
use crate::{BoardSize, GameState, Point};
use std::fmt;
use std::str::FromStr;

/// AIの思考力を表すEnum
///
/// # Fields
///
/// * `Low` - 低い思考力
/// * `Average` - 平均的な思考力
/// * `High` - 高い思考力
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IntelligenceLevel {
    Low,
    Average,
    High,
}

impl IntelligenceLevel {
    /// 全要素のイテレータを返す
    ///
    /// # Returns
    ///
    /// * `Iterator<Item = IntelligenceLevel>`
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::ai::facade::IntelligenceLevel;
    ///
    /// assert_eq!(IntelligenceLevel::variants().count(), 3);
    /// ```
    pub fn variants() -> impl Iterator<Item = Self> {
        [Self::Low, Self::Average, Self::High].into_iter()
    }
}

impl fmt::Display for IntelligenceLevel {
    /// 文字列での表現
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::ai::facade::IntelligenceLevel;
    /// assert_eq!(IntelligenceLevel::Low.to_string(), String::from("low"));
    /// assert_eq!(IntelligenceLevel::Average.to_string(), String::from("average"));
    /// assert_eq!(IntelligenceLevel::High.to_string(), String::from("high"));
    /// ```
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            IntelligenceLevel::Low => write!(f, "low"),
            IntelligenceLevel::Average => write!(f, "average"),
            IntelligenceLevel::High => write!(f, "high"),
        }
    }
}

impl FromStr for IntelligenceLevel {
    type Err = String;

    /// 文字列からインスタンスを取得する
    ///
    /// # Arguments
    ///
    /// * `s` - 変化前の文字列
    ///
    /// # Returns
    ///
    /// * `Result<Self, String>`
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::ai::facade::IntelligenceLevel;
    /// assert_eq!("low".parse::<IntelligenceLevel>().unwrap(), IntelligenceLevel::Low);
    /// assert_eq!("average".parse::<IntelligenceLevel>().unwrap(), IntelligenceLevel::Average);
    /// assert_eq!("high".parse::<IntelligenceLevel>().unwrap(), IntelligenceLevel::High);
    /// assert!("invalid".parse::<IntelligenceLevel>().is_err());
    /// ```
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::variants()
            .find(|x| x.to_string() == s)
            .ok_or_else(|| format!("Unknown option: `{}`", s))
    }
}

/// AIにより手を決定する
///
/// # Arguments
///
/// * `game` - `GameState`オブジェクト
/// * `level` - AIの思考力
///
/// # Return
///
/// * `Result<Option<Point>, String>`
///
/// # Example
///
/// ```rust
/// use reversi::{Board, BoardSize, GameState};
/// use reversi::ai::facade::{IntelligenceLevel, select_hand};
///
/// // 新規盤面
/// let mut state = GameState::new(BoardSize::Size8);
/// let mut res = select_hand(&mut state, IntelligenceLevel::Low);
/// assert!(res.is_ok());
///
/// // 白には合法手なし
/// state.board = Board::new(BoardSize::Size8, 1, 2);
/// let mut res = select_hand(&mut state, IntelligenceLevel::Average);
/// assert!(res.is_ok());
///
/// // ゲームが終了している場合
/// state.board = Board::new(BoardSize::Size8, 0, 0);
/// res = select_hand(&mut state, IntelligenceLevel::High);
/// assert!(res.is_err());
/// ```
pub fn select_hand(
    game: &mut GameState,
    level: IntelligenceLevel,
) -> Result<Option<Point>, String> {
    // ゲームが終了している場合
    if game.is_game_over() {
        return Err("Game is already over".into());
    }

    // AIによる手番の決定
    let mut ai = build_ai(game.board.size, level);
    let point = ai.select_hand(&*game);

    Ok(point)
}

/// 盤面のサイズやレベルに応じたエージェントを作成して返す
///
/// # Arguments
///
/// * `size` - 盤面のサイズ
/// * `level` - AIの思考力
///
/// # Returns
///
/// * `Box<dyn AiAgent>`
fn build_ai(size: BoardSize, level: IntelligenceLevel) -> Box<dyn AiAgent> {
    match (size, level) {
        // 弱め
        (_, IntelligenceLevel::Low) => Box::new(RandomAgent::new(0)),
        // 普通
        (BoardSize::Size4, IntelligenceLevel::Average) => Box::new(NegamaxAgent::from_rulebased(6)),
        (_, IntelligenceLevel::Average) => {
            let alternative_agent = NegamaxAgent::from_rulebased(6);
            Box::new(EstablishedProcedureAgent::from_included(alternative_agent))
        }
        // 強め
        (_, IntelligenceLevel::High) => {
            let first_ai = NegamaxAgent::from_rulebased(8);
            let second_ai = NegamaxAgent::from_rulebased(12);
            let th_count = 12;
            let alternative_agent = EmptyCountSwitcher::new(first_ai, second_ai, th_count);
            Box::new(EstablishedProcedureAgent::from_included(alternative_agent))
        }
    }
}
