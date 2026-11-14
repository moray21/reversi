//! ヒューリスティックな評価関数を管理するモジュール
//!
//! # Structs
//!
//! * `RuleBaseEvaluator` - 複数のルールベースに基づく評価関数
//! * `MobilityEvaluator` - 指し手の多さ（モビリティ）を評価する評価関数
//! * `LastStoneCountEvaluator` - 終局後の石の数を評価する評価関数
//! * `PositionWeightEvaluator` - 石の位置で評価する評価関数

use super::Evaluator;
use crate::board::{Board, BoardSize, Disc};
use ndarray::{Array2, arr2};

/// 複数のルールベースに基づく評価関数
///
/// # Attributes
///
///  * `evaluators`: 評価関数のリスト
///  * `weights`: 各評価関数の重み
pub struct RuleBaseEvaluator {
    evaluators: Vec<Box<dyn Evaluator>>,
    weights: Vec<f32>,
}

impl RuleBaseEvaluator {
    ///　RuleBaseEvaluator を作成する
    ///
    /// # Arguments
    ///
    /// * `evaluators` - 評価関数のリスト
    /// * `weights` - 各評価関数の重み
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc};
    /// use reversi::ai::evaluator::{Evaluator, RuleBaseEvaluator, MobilityEvaluator};
    /// let board = Board::initialize(BoardSize::Size8);
    /// let evaluator = RuleBaseEvaluator::new(vec![Box::new(MobilityEvaluator)], vec![2.0]);
    /// assert_eq!(evaluator.evaluate(&board, Disc::Black), 8.0);
    /// ```
    pub fn new(evaluators: Vec<Box<dyn Evaluator>>, weights: Vec<f32>) -> Self {
        Self {
            evaluators,
            weights,
        }
    }
}

impl Evaluator for RuleBaseEvaluator {
    /// 複数のルールベースに基づく評価関数
    ///
    /// # Arguments
    ///
    /// * `board` - 評価対象の盤面
    /// * `disc` - 評価の基準となる手番
    ///
    /// # Returns
    ///
    /// * `f32` - 評価値（高いほど有利）
    ///
    /// # Examples
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc};
    /// use reversi::ai::evaluator::{Evaluator, RuleBaseEvaluator, MobilityEvaluator};
    /// let board = Board::initialize(BoardSize::Size8);
    /// let evaluator = RuleBaseEvaluator::new(vec![Box::new(MobilityEvaluator)], vec![2.0]);
    /// assert_eq!(evaluator.evaluate(&board, Disc::Black), 8.0);
    /// ```
    fn evaluate(&self, board: &Board, disc: Disc) -> f32 {
        let mut score: f32 = 0.0;

        for (evaluator, weight) in self.evaluators.iter().zip(self.weights.iter()) {
            score += evaluator.evaluate(board, disc) * weight;
        }

        score
    }
}

/// 指し手の多さ（モビリティ）を評価する評価関数
pub struct MobilityEvaluator;

impl Evaluator for MobilityEvaluator {
    /// 指し手の多さ（モビリティ）を評価する評価関数
    ///
    /// # Arguments
    ///
    /// * `board` - 評価対象の盤面
    /// * `disc` - 評価の基準となる手番
    ///
    /// # Returns
    ///
    /// * `f32` - 評価値（高いほど有利）
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc};
    /// use reversi::ai::evaluator::{Evaluator, MobilityEvaluator};
    /// let board = Board::initialize(BoardSize::Size8);
    /// let evaluator = MobilityEvaluator;
    /// assert_eq!(evaluator.evaluate(&board, Disc::Black), 4.0);
    /// ```
    fn evaluate(&self, board: &Board, disc: Disc) -> f32 {
        board.get_legal_points(disc).len() as f32
    }
}

// 終局後の石の数を評価する評価関数
pub struct LastStoneCountEvaluator;

impl Evaluator for LastStoneCountEvaluator {
    /// 終局後の石の数を評価する評価関数
    ///
    /// # Arguments
    ///
    /// * `board` - 評価対象の盤面
    /// * `disc` - 評価の基準となる手番
    ///
    /// # Returns
    ///
    /// * `f32` - 評価値（高いほど有利）
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc};
    /// use reversi::ai::evaluator::{Evaluator, LastStoneCountEvaluator};
    /// let board = Board::initialize(BoardSize::Size8);
    /// let evaluator = LastStoneCountEvaluator;
    /// assert_eq!(evaluator.evaluate(&board, Disc::Black), 0.0);
    ///
    /// let board = Board::new(BoardSize::Size8, u64::MAX, 0);
    /// assert_eq!(evaluator.evaluate(&board, Disc::Black), 64.0);
    ///
    /// let board = Board::new(BoardSize::Size8, 0, u64::MAX);
    /// assert_eq!(evaluator.evaluate(&board, Disc::Black), -64.0);
    ///
    /// let board = Board::new(BoardSize::Size8, 0, 1);
    /// assert_eq!(evaluator.evaluate(&board, Disc::White), 1.0);
    /// ```
    fn evaluate(&self, board: &Board, disc: Disc) -> f32 {
        // 終局していない場合は0を返す
        let legal_points = board.get_legal_points(disc);
        let is_gameover =
            board.is_full() || (legal_points.is_empty() && !board.has_legal_hands(disc.opposite()));
        if !is_gameover {
            return 0.0;
        }
        // 終局していたら石の数の差を評価
        match disc {
            Disc::Black => board.n_black() as f32 - board.n_white() as f32,
            Disc::White => board.n_white() as f32 - board.n_black() as f32,
        }
    }
}

// 石の位置で評価する評価関数
pub struct PositionWeightEvaluator;

impl PositionWeightEvaluator {
    // 4×4のデフォルトの重み
    const WEIGHT_SIZE4: [[i8; 4]; 4] = [
        [30, -5, -5, 30],
        [-5, -5, -5, -5],
        [-5, -5, -5, -5],
        [30, -5, -5, 30],
    ];

    // 6×6のデフォルトの重み
    const WEIGHT_SIZE6: [[i8; 6]; 6] = [
        [30, -12, 5, 5, -12, 30],
        [-12, -15, 1, 1, -15, -12],
        [5, 1, 1, 1, 1, 5],
        [5, 1, 1, 1, 1, 5],
        [-12, -15, 1, 1, -15, -12],
        [30, -12, 5, 5, -12, 30],
    ];

    // 8×8のデフォルトの重み
    const WEIGHT_SIZE8: [[i8; 8]; 8] = [
        [30, -12, 5, 5, 5, 5, -12, 30],
        [-12, -15, 1, 1, 1, 1, -15, -12],
        [5, 1, 1, 1, 1, 1, 1, 5],
        [5, 1, 1, 1, 1, 1, 1, 5],
        [5, 1, 1, 1, 1, 1, 1, 5],
        [5, 1, 1, 1, 1, 1, 1, 5],
        [-12, -15, 1, 1, 1, 1, -15, -12],
        [30, -12, 5, 5, 5, 5, -12, 30],
    ];

    /// 盤面に応じて調整した重みを返す
    ///
    /// # Arguments
    ///
    /// * `board` - 盤面
    ///
    /// # Returns
    ///
    /// * `Array2<i8>` - 重みのリスト
    ///
    /// # Notes
    ///
    /// * 端に既に石が全て置かれている場合は変化しにくい石なので重みを変える
    fn get_weight(&self, board: &Board) -> Array2<i8> {
        // デフォルト値
        let mut weights: Array2<i8> = match board.size {
            BoardSize::Size4 => arr2(&Self::WEIGHT_SIZE4),
            BoardSize::Size6 => arr2(&Self::WEIGHT_SIZE6),
            BoardSize::Size8 => arr2(&Self::WEIGHT_SIZE8),
        };

        // 辺ごとに確認
        let board_data = board.to_numpy();
        let size = board.size as usize;
        let corner_weight = weights[[0, 0]];

        // 行がすべて埋まっているか判定するヘルパー
        let is_row_filled = |r: usize| -> bool { board_data.row(r).iter().all(|&c| c != 0) };

        // 列がすべて埋まっているか判定するヘルパー
        let is_col_filled = |c: usize| -> bool { board_data.column(c).iter().all(|&r| r != 0) };

        // 上から
        for r in 0..size {
            if !is_row_filled(r) {
                break;
            }
            weights.slice_mut(ndarray::s![r, ..]).fill(corner_weight);
        }

        // 下から
        for r in (0..size).rev() {
            if !is_row_filled(r) {
                break;
            }
            weights.slice_mut(ndarray::s![r, ..]).fill(corner_weight);
        }

        // 右から
        for c in (0..size).rev() {
            if !is_col_filled(c) {
                break;
            }
            weights.slice_mut(ndarray::s![.., c]).fill(corner_weight);
        }

        // 左から
        for c in 0..size {
            if !is_col_filled(c) {
                break;
            }
            weights.slice_mut(ndarray::s![.., c]).fill(corner_weight);
        }

        weights
    }
}

impl Evaluator for PositionWeightEvaluator {
    /// 石の位置で評価する評価関数
    ///
    /// # Arguments
    ///
    /// * `board` - 評価対象の盤面
    /// * `disc` - 評価の基準となる手番
    ///
    /// # Returns
    ///
    /// * `f32` - 評価値（高いほど有利）
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc};
    /// use reversi::ai::evaluator::{Evaluator, PositionWeightEvaluator};
    ///
    /// let evaluator = PositionWeightEvaluator;
    ///
    /// // 4×4
    /// let board = Board::initialize(BoardSize::Size4);
    /// assert_eq!(evaluator.evaluate(&board, Disc::Black), 0.0);
    ///
    /// // 6×6
    /// let board = Board::initialize(BoardSize::Size6);
    /// assert_eq!(evaluator.evaluate(&board, Disc::Black), 0.0);
    ///
    /// // 8×8
    /// let board = Board::initialize(BoardSize::Size8);
    /// assert_eq!(evaluator.evaluate(&board, Disc::Black), 0.0);
    ///
    /// // 辺すべてに石が置かれている場合
    /// let board = Board::new(BoardSize::Size8, 0xff818181818181ff, 0);
    /// assert_eq!(evaluator.evaluate(&board, Disc::Black), 30.0 * 28.0);
    /// ```
    fn evaluate(&self, board: &Board, disc: Disc) -> f32 {
        let _ = disc;

        // 重みとボードデータからスコアを計算
        let weights = self.get_weight(board);
        let board_data = board.to_numpy();
        let score = (board_data * weights).mapv(|x| x as f32).sum(); // オーバーフロー対策で事前に型変換
        score
    }
}
