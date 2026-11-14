//! ゲームの進行状態、履歴、および強化学習用のインターフェースを管理するモジュール
//!
//! Struct
//!
//! * `GameSnapshot` - ゲームの状態のスナップショット（履歴・巻き戻し用）
//! * `GameState` - ゲームの進行状態を管理する構造体

use crate::board::{Board, BoardSize, Disc, Point};

/// ゲームの状態のスナップショット（履歴・巻き戻し用）
///
/// # Attributes
///
/// * `board` - 盤面
/// * `turn` - 手番
/// * `consecutive_passes` - 連続パスの回数
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GameSnapshot {
    pub board: Board,
    pub turn: Disc,
    pub consecutive_passes: u32,
}

/// ゲームの進行状態を管理する構造体
///
/// # Attributes
///
/// * `board` - 現在の盤面
/// * `turn` - 現在の手番
/// * `consecutive_passes` - 連続パスの回数
/// * `history` - 過去の状態のスタック（1手戻るや振り返り用）
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GameState {
    pub board: Board,
    pub turn: Disc,
    pub consecutive_passes: u32,
    history: Vec<GameSnapshot>,
}

impl GameState {
    /// 指定したサイズで新しいゲーム状態を作成する
    ///
    /// # Arguments
    ///
    /// * `size` - 盤面のサイズ
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{GameState, BoardSize, Disc};
    /// let state = GameState::new(BoardSize::Size8);
    /// assert_eq!(state.turn, Disc::Black);
    /// assert!(!state.is_game_over());
    /// ```
    pub fn new(size: BoardSize) -> Self {
        let board = Board::initialize(size);
        Self {
            board,
            turn: Disc::Black,
            consecutive_passes: 0,
            history: Vec::new(),
        }
    }

    /// ゲームの状態を初期状態にリセットする
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{GameState, BoardSize, Disc};
    /// let mut state = GameState::new(BoardSize::Size8);
    /// state.reset();
    /// assert_eq!(state.turn, Disc::Black);
    /// assert!(!state.is_game_over());
    /// ```
    pub fn reset(&mut self) {
        let size = self.board.size;
        self.board = Board::initialize(size);
        self.turn = Disc::Black;
        self.consecutive_passes = 0;
        self.history.clear();
    }

    /// 現在の手番のプレイヤーの合法手一覧を返す
    ///
    /// # Returns
    ///
    /// * `Vec<Point>` - 合法手のリスト
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{GameState, BoardSize, Disc};
    /// let state = GameState::new(BoardSize::Size8);
    /// let legal_points = state.get_legal_points();
    /// assert_eq!(legal_points.len(), 4);
    /// ```
    pub fn get_legal_points(&self) -> Vec<Point> {
        self.board.get_legal_points(self.turn)
    }

    /// ゲームが終了しているかを判定する
    ///
    /// # Returns
    ///
    /// * `true` - 盤面が埋まった、または双方連続パス、あるいはどちらかの石が全滅した場合
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{GameState, BoardSize, Board, Disc};
    /// let mut state = GameState::new(BoardSize::Size8);
    /// assert!(!state.is_game_over());
    ///
    /// state.board = Board::new(BoardSize::Size8, u64::MAX, 0);
    /// assert!(state.is_game_over());
    /// ```
    pub fn is_game_over(&self) -> bool {
        self.board.is_full()
            || self.consecutive_passes >= 2
            || self.board.n_black() == 0
            || self.board.n_white() == 0
    }

    /// 勝者を判定する
    ///
    /// # Returns
    ///
    /// * `Option<Disc>` - Discが勝者、`None`は引き分け、またはゲーム未決着
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{GameState, BoardSize, Board, Disc};
    /// let mut state = GameState::new(BoardSize::Size8);
    /// assert_eq!(state.get_winner(), None);
    ///
    /// // 黒の勝ち
    /// state.board = Board::new(BoardSize::Size8, u64::MAX, 0);
    /// assert_eq!(state.get_winner(), Some(Disc::Black));
    ///
    /// // 白の勝ち
    /// state.board = Board::new(BoardSize::Size8, 0, u64::MAX);
    /// assert_eq!(state.get_winner(), Some(Disc::White));
    ///
    /// // 引き分け
    /// state.board = Board::new(BoardSize::Size8, 0, 0);
    /// assert_eq!(state.get_winner(), None);
    /// ```
    pub fn get_winner(&self) -> Option<Disc> {
        if !self.is_game_over() {
            return None;
        }
        let b = self.board.n_black();
        let w = self.board.n_white();
        if b > w {
            Some(Disc::Black)
        } else if w > b {
            Some(Disc::White)
        } else {
            None // 引き分け
        }
    }

    /// 指定した座標に石を置き、手番を進める
    /// パスが発生する場合は自動的に手番を再交代させる
    ///
    /// # Arguments
    ///
    /// * `point` - 石を置く座標
    ///
    /// # Returns
    ///
    /// * `Result<bool, &'static str>`
    ///     * `Ok(bool)` - 成功した場合。真偽値はパスが発生したかどうか。
    ///     * `Err(&str)` - 不正な手の場合のエラーメッセージ
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{GameState, Board, BoardSize, Disc, Point};
    ///
    /// // 石がおける
    /// let mut state = GameState::new(BoardSize::Size8);
    /// assert!(state.put_disc(Point::new(2, 3)).is_ok());
    ///
    /// // ゲームは既に終了している
    /// state.board = Board::new(BoardSize::Size8, u64::MAX, 0);
    /// assert!(state.put_disc(Point::new(2, 3)).is_err());
    ///
    /// // 白は置けない
    /// state.board = Board::new(BoardSize::Size4, 0x0000_0000_0000_0001, 0x0000_0000_0000_0002);
    /// state.turn = Disc::White;
    /// assert!(state.put_disc(Point::new(2, 3)).is_err());
    ///
    /// // 黒が最後に置くことでゲーム終了になる
    /// state.turn = Disc::Black;
    /// assert!(state.put_disc(Point::new(3, 1)).is_ok());
    /// ```
    pub fn put_disc(&mut self, point: Point) -> Result<bool, &'static str> {
        // 既にゲームが終了している場合はエラー
        if self.is_game_over() {
            return Err("Game is already over.");
        }

        // 現在の状態を履歴に保存（1手戻る用）
        self.history.push(GameSnapshot {
            board: self.board.clone(),
            turn: self.turn,
            consecutive_passes: self.consecutive_passes,
        });

        // 石を置く(置けなかった場合は履歴を戻す)
        if !self.board.put_disc(point, self.turn) {
            self.history.pop();
            return Err("Invalid move.");
        }

        // 手番交代
        self.turn = self.turn.opposite();

        // パスの確認
        let mut passed = false;
        if self.board.has_legal_hands(self.turn) {
            self.consecutive_passes = 0;
        } else {
            // 相手に打つ手がないためパス
            passed = true;
            self.consecutive_passes += 1;

            // さらに自分にも打つ手がない場合は連続パスとなりゲーム終了
            self.turn = self.turn.opposite();
            if !self.board.has_legal_hands(self.turn) {
                self.consecutive_passes += 1;
            }
        }

        Ok(passed)
    }

    /// 1手前に戻る
    ///
    /// # Returns
    ///
    /// * `bool` - `true` - 戻ることに成功した場合、`false`はこれ以上戻れない場合
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{GameState, BoardSize, Disc, Point};
    /// let mut state = GameState::new(BoardSize::Size8);
    /// assert!(state.put_disc(Point::new(2, 3)).is_ok());
    /// assert_eq!(state.turn, Disc::White);
    /// assert!(state.undo());
    /// assert!(!state.undo());
    /// assert_eq!(state.turn, Disc::Black);
    /// ```
    pub fn undo(&mut self) -> bool {
        if let Some(snapshot) = self.history.pop() {
            self.board = snapshot.board;
            self.turn = snapshot.turn;
            self.consecutive_passes = snapshot.consecutive_passes;
            true
        } else {
            false
        }
    }

    /// 履歴の長さを返す
    ///
    /// # Returns
    ///
    /// * `usize` - 履歴の長さ
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{GameState, BoardSize, Disc, Point};
    /// let mut state = GameState::new(BoardSize::Size8);
    /// assert_eq!(state.history_len(), 0);
    /// assert!(state.put_disc(Point::new(2, 3)).is_ok());
    /// assert_eq!(state.history_len(), 1);
    /// ```
    pub fn history_len(&self) -> usize {
        self.history.len()
    }

    /// 指定した履歴インデックスの状態を取得する（終局後の振り返りや分岐シミュレーション用）
    ///
    /// # Arguments
    ///
    /// * `index` - 履歴のインデックス（0が初期状態、history_len() が最新状態）
    ///
    /// # Returns
    ///
    /// * `Option<GameSnapshot>` - 履歴のインデックスに対応する状態
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{GameState, BoardSize, Disc, Point};
    /// let mut state = GameState::new(BoardSize::Size8);
    /// assert!(state.put_disc(Point::new(2, 3)).is_ok());
    /// assert_eq!(state.get_snapshot_at(0).unwrap().board.n_black(), 2);
    /// assert_eq!(state.get_snapshot_at(1).unwrap().board.n_black(), 4);
    /// assert!(state.get_snapshot_at(2).is_none());
    /// ```
    pub fn get_snapshot_at(&self, index: usize) -> Option<GameSnapshot> {
        if index < self.history.len() {
            Some(self.history[index].clone())
        } else if index == self.history.len() {
            Some(GameSnapshot {
                board: self.board.clone(),
                turn: self.turn,
                consecutive_passes: self.consecutive_passes,
            })
        } else {
            None
        }
    }
}
