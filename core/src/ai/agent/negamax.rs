//! ネガマックス法を用いたエージェントを管理するモジュール
//!
//! # Structs
//!
//! * `NegamaxAgent` - ネガマックス法 ＋ αβ枝刈りを行うAI

use super::super::evaluator::{
    Evaluator, LastStoneCountEvaluator, MobilityEvaluator, PositionWeightEvaluator,
    RuleBaseEvaluator,
};
use super::AiAgent;
use crate::board::{Board, Disc, Point};
use crate::state::GameState;

/// ネガマックス法を用いて手を選択するAI
///
/// # Attributes
///
/// * `depth` - 探索する深さ
/// * `evaluator` - 評価関数
pub struct NegamaxAgent<E: Evaluator> {
    depth: u32,
    evaluator: E,
}

impl<E: Evaluator> NegamaxAgent<E> {
    /// NegamaxAgent を作成する
    ///
    /// # Arguments
    ///
    /// * `depth` - 探索する深さ
    /// * `evaluator` - 評価関数のインスタンス
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameState, Point};
    /// use reversi::ai::{AiAgent, NegamaxAgent};
    /// use reversi::ai::evaluator::MobilityEvaluator;
    /// let mut state = GameState::new(BoardSize::Size8);
    /// let mut ai = NegamaxAgent::new(1, MobilityEvaluator);
    /// assert_eq!(ai.select_hand(&state), Some(Point { row: 5, col: 4 }));
    /// ```
    pub fn new(depth: u32, evaluator: E) -> Self {
        Self { depth, evaluator }
    }

    /// ネガマックス法による再帰探索
    ///
    /// # Arguments
    ///
    /// * `board` - 評価対象の盤面
    /// * `depth` - 探索する深さ
    /// * `alpha` - α値
    /// * `beta` - β値
    /// * `disc` - 評価の基準となる手番
    ///
    /// # Returns
    ///
    /// * `f32` - 評価値（高いほど有利）
    ///
    /// # Notes
    ///
    /// * min / maxの計算時にオーバーフローを避けるため、`f32::MIN / 2`, `f32::MAX / 2` を使用している
    fn negamax(&self, board: &Board, depth: u32, mut alpha: f32, beta: f32, disc: Disc) -> f32 {
        let legal_points = board.get_legal_points(disc);

        // 探索終了条件（指定深度に到達、またはゲーム終了）
        let is_gameover =
            board.is_full() || (legal_points.is_empty() && !board.has_legal_hands(disc.opposite()));
        if depth == 0 || is_gameover {
            return self.evaluator.evaluate(board, disc);
        }

        // 打つ手がない場合（パス）は手番を交代して探索を継続
        if legal_points.is_empty() {
            return -self.negamax(board, depth, -beta, -alpha, disc.opposite());
        }

        // 最良の手を探索する (NOTE: 2で割るのはオーバーフロー対策)
        let mut max_score = f32::MIN / 2.0;
        for point in legal_points {
            // 1手進めた盤面を作成し評価
            let mut next_board = board.clone();
            next_board.put_disc(point, disc);
            let score = -self.negamax(&next_board, depth - 1, -beta, -alpha, disc.opposite());

            max_score = max_score.max(score);
            alpha = alpha.max(score);
            if alpha >= beta {
                break;
            }
        }

        max_score
    }
}

impl NegamaxAgent<RuleBaseEvaluator> {
    /// ルールベースの評価関数を用いて NegamaxAgent を作成する
    ///
    /// # Arguments
    ///
    /// * `depth` - 探索する深さ
    ///
    /// # Returns
    ///
    /// * `NegamaxAgent<RuleBasedEvaluator>` - NegamaxAgent のインスタンス
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameState, Point};
    /// use reversi::ai::{AiAgent, NegamaxAgent};
    /// let mut state = GameState::new(BoardSize::Size8);
    /// let mut ai = NegamaxAgent::from_rulebased(1);
    /// assert_eq!(ai.select_hand(&state), Some(Point { row: 5, col: 4 }));
    /// ```
    pub fn from_rulebased(depth: u32) -> Self {
        let evaluators: Vec<Box<dyn Evaluator>> = vec![
            Box::new(MobilityEvaluator),
            Box::new(PositionWeightEvaluator),
            Box::new(LastStoneCountEvaluator),
        ];
        let weights: Vec<f32> = vec![10.0, 5.0, 1.0];
        let evaluator = RuleBaseEvaluator::new(evaluators, weights);
        Self::new(depth, evaluator)
    }
}

impl<E: Evaluator> AiAgent for NegamaxAgent<E> {
    /// 最良の手を選択する
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
    /// use reversi::{BoardSize, Disc, GameState, Point};
    /// use reversi::ai::{AiAgent, NegamaxAgent};
    /// use reversi::ai::evaluator::MobilityEvaluator;
    /// let mut state = GameState::new(BoardSize::Size8);
    /// let mut ai = NegamaxAgent::new(1, MobilityEvaluator);
    /// assert_eq!(ai.select_hand(&state), Some(Point::new(5, 4)));
    ///
    /// // テスト用に手番は変えずに石を置く
    /// state.board.put_disc(Point::new(3, 2), Disc::Black);
    /// assert_eq!(ai.select_hand(&state), Some(Point::new(5, 5)));
    /// ```
    fn select_hand(&mut self, state: &GameState) -> Option<Point> {
        // 合法手を取得
        let legal_points = state.get_legal_points();
        if legal_points.is_empty() {
            return None;
        }

        // NOTE: 2で割るのはオーバーフロー対策
        let mut best_point = legal_points[0];
        let mut max_score = f32::MIN / 2.0;
        let mut alpha = f32::MIN / 2.0;
        let beta = f32::MAX / 2.0;

        let disc = state.turn;
        for point in legal_points {
            // 1手進めた盤面を作成し評価
            let mut next_board = state.board.clone();
            next_board.put_disc(point, disc);
            let score = -self.negamax(&next_board, self.depth - 1, -beta, -alpha, disc.opposite());

            if score > max_score {
                max_score = score;
                best_point = point;
            }
            alpha = alpha.max(score);
            if alpha >= beta {
                break;
            }
        }

        Some(best_point)
    }
}
