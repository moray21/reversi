//! 条件によりエージェントを切り替えるエージェントを実装するモジュール
//!
//! # Structs
//!
//! * `EmptyCountSwitcher<A: AiAgent, B: AiAgent>`: 残りの空きマスの数でエージェントを切り替えるエージェント

use super::AiAgent;
use crate::board::Point;
use crate::state::GameState;

/// 残りの空きマスの数でエージェントを切り替えるエージェント
///
/// # Attributes
///
/// * `agent_first` - 残りの空きマスの数が`th_count`より多いときに使うエージェント
/// * `agent_second` - 残りの空きマスの数が`th_count`以下のときに使うエージェント
/// * `th_count` - エージェントを切り替える残りの空きマスの数
pub struct EmptyCountSwitcher<A: AiAgent, B: AiAgent> {
    agent_first: A,
    agent_second: B,
    th_count: u8,
}

impl<A: AiAgent, B: AiAgent> EmptyCountSwitcher<A, B> {
    /// EmptyCountSwitcher を作成する
    ///
    /// # Arguments
    ///
    /// * `agent_first` - 残りの空きマスの数が`th_count`より多いときに使うエージェント
    /// * `agent_second` - 残りの空きマスの数が`th_count`以下のときに使うエージェント
    /// * `th_count` - エージェントを切り替える残りの空きマスの数
    ///
    /// # Returns
    ///
    /// * `RandomAgent` - RandomAgent のインスタンス
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameState, Point};
    /// use reversi::ai::{AiAgent, RandomAgent, EmptyCountSwitcher};
    ///
    /// let mut state = GameState::new(BoardSize::Size8);
    ///
    /// let first_ai = RandomAgent::new(0);
    /// let second_ai = RandomAgent::new(1);
    /// let th_count: u8 = 3;
    /// let mut ai = EmptyCountSwitcher::new(first_ai, second_ai, th_count);
    /// assert_eq!(ai.select_hand(&state), Some(Point { row: 2, col: 3 }));
    /// ```
    pub fn new(agent_first: A, agent_second: B, th_count: u8) -> Self {
        Self {
            agent_first,
            agent_second,
            th_count,
        }
    }
}

impl<A: AiAgent, B: AiAgent> AiAgent for EmptyCountSwitcher<A, B> {
    /// 現在のゲーム状態から次の手（Point）を選択する
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
    /// use reversi::ai::{AiAgent, RandomAgent, EmptyCountSwitcher};
    ///
    /// let mut state = GameState::new(BoardSize::Size4);
    ///
    /// let first_ai = RandomAgent::new(0);
    /// let second_ai = RandomAgent::new(1);
    /// let th_count: u8 = 12;
    /// let mut ai = EmptyCountSwitcher::new(first_ai, second_ai, th_count);
    /// assert_eq!(ai.select_hand(&state), Some(Point { row: 0, col: 1 }));
    /// ```
    fn select_hand(&mut self, state: &GameState) -> Option<Point> {
        let n_empty = state.board.n_empty();
        if n_empty <= self.th_count {
            self.agent_second.select_hand(state)
        } else {
            self.agent_first.select_hand(state)
        }
    }
}
