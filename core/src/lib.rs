//! リバーシのコアロジックを定義するライブラリ
//!
//! # Module
//!
//! * `ai` - AIエージェント関連のモジュール
//!
//! # Enum
//!
//! * `Disc` - ディスク
//! * `BoardSize` - 盤面のサイズ
//!
//! # Struct
//!
//! * `Board` - 盤面
//! * `GameSnapshot` - ゲームの状態のスナップショット（履歴・巻き戻し用）
//! * `GameState` - ゲームの進行状態を管理する構造体
//! * `Point` - 盤面の座標

pub mod ai;
mod board;
mod state;
pub use board::{Board, BoardSize, Disc, Point};
pub use state::{GameSnapshot, GameState};
