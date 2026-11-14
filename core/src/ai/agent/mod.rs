//! AIエージェントを管理するモジュール
//!
//! # Traits
//!
//! * `AiAgent` - AIエージェントのトレイト
//!
//! # Structs
//!
//! * `RandomAgent` - 合法手からランダムに選択するAI
//! * `NegamaxAgent` - ネガマックス法 ＋ αβ枝刈りを行うAI

mod negamax;
mod random;

pub use negamax::NegamaxAgent;
pub use random::RandomAgent;

use crate::board::Point;
use crate::state::GameState;

/// AIエージェントのトレイト
pub trait AiAgent {
    /// 現在のゲーム状態から次の手（Point）を選択する
    ///
    /// # Arguments
    ///
    /// * `state` - 現在のゲーム状態
    ///
    /// # Returns
    ///
    /// * `Option<Point>` - 選択した手。パスなどで打つ手がない場合は `None`
    fn select_hand(&mut self, state: &GameState) -> Option<Point>;
}
