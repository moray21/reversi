//! AI関係のファサード処理を定義するモジュール
//!
//! # Functions
//!
//! * `select_hand` - AIにより手を決定する
use super::{AiAgent, NegamaxAgent};
use crate::{GameState, Point};
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
    let point = match level {
        // 弱め
        IntelligenceLevel::Low => {
            let mut ai = NegamaxAgent::from_rulebased(2);
            ai.select_hand(&*game)
        }
        // 普通
        IntelligenceLevel::Average => {
            let mut ai = NegamaxAgent::from_rulebased(6);
            ai.select_hand(&*game)
        }
        // 強め
        IntelligenceLevel::High => {
            let mut ai = NegamaxAgent::from_rulebased(12);
            ai.select_hand(&*game)
        }
    };

    Ok(point)
}
