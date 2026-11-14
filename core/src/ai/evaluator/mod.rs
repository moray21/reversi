//! 評価関数を管理するモジュール
//!
//! # Traits
//!
//! * `Evaluator` - 盤面の評価を行うトレイト
//!
//! # Structs
//!
//! * `RuleBaseEvaluator` - 複数のルールベースに基づく評価関数
//! * `MobilityEvaluator` - 指し手の多さ（モビリティ）を評価する評価関数
//! * `LastStoneCountEvaluator` - 終局後の石の数を評価する評価関数
//! * `PositionWeightEvaluator` - 石の位置で評価する評価関数

mod heuristic;
use crate::board::{Board, Disc};
pub use heuristic::*;

/// 盤面の評価を行うトレイト
pub trait Evaluator: Send + Sync {
    /// 指定した盤面と手番から、その手番側にとっての有利度（スコア）を計算する
    ///
    /// # Arguments
    ///
    /// * `board` - 評価対象の盤面
    /// * `disc` - 評価の基準となる手番
    ///
    /// # Returns
    ///
    /// * `f32` - 評価値（高いほど有利）
    fn evaluate(&self, board: &Board, disc: Disc) -> f32;
}
