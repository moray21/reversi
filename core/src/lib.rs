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
//! * `GameStateDto` - DTO(Data Transfer Object): ゲーム状態をシリアライズするための構造体
//! * `GameSnapshot` - ゲームの状態のスナップショット（履歴・巻き戻し用）
//! * `GameState` - ゲームの進行状態を管理する構造体
//! * `GameSession` - ゲームセッションを管理する構造体
//! * `Point` - 盤面の座標

pub mod ai;
mod board;
mod dto;
mod session;
mod state;
pub use board::{Board, BoardSize, Disc, Point};
pub use dto::GameStateDto;
pub use session::GameSession;
pub use state::{GameSnapshot, GameState};
