//! 合法手からランダムに選択するAIを定義するモジュール
//!
//! # Structs
//!
//! * `RandomAgent` - 合法手からランダムに選択するAI

use super::AiAgent;
use crate::board::Point;
use crate::state::GameState;
use rand::prelude::*;
use rand::rngs::StdRng;

/// 合法手からランダムに選択するAI
///
/// # Attributes
///
/// * `rng` - 乱数生成器
pub struct RandomAgent {
    rng: StdRng,
}

impl RandomAgent {
    /// RandomAgent を作成する
    ///
    /// # Arguments
    ///
    /// * `seed` - 乱数生成器のシード
    ///
    /// # Returns
    ///
    /// * `RandomAgent` - RandomAgent のインスタンス
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameState, Point};
    /// use reversi::ai::{AiAgent, RandomAgent};
    /// let mut state = GameState::new(BoardSize::Size8);
    /// let mut ai = RandomAgent::new(0);
    /// assert_eq!(ai.select_hand(&state), Some(Point { row: 2, col: 3 }));
    /// ```
    pub fn new(seed: u64) -> Self {
        let rng = StdRng::seed_from_u64(seed);
        Self { rng }
    }
}

impl AiAgent for RandomAgent {
    /// ランダムに手を選択する
    ///
    /// # Arguments
    ///
    /// * `state` - 現在のゲーム状態
    ///
    /// # Returns
    ///
    /// * `Option<Point>` - 選択した手。パスなどで打つ手がない場合は `None`
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameState, Point};
    /// use reversi::ai::{AiAgent, RandomAgent};
    /// let mut state = GameState::new(BoardSize::Size8);
    /// let mut ai = RandomAgent::new(0);
    /// assert_eq!(ai.select_hand(&state), Some(Point { row: 2, col: 3 }));
    /// ```
    fn select_hand(&mut self, state: &GameState) -> Option<Point> {
        let legal_points = state.get_legal_points();
        legal_points.choose(&mut self.rng).cloned()
    }
}
