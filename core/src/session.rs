//! ゲームセッションを管理するモジュール
//!
//! 通常対局および感想戦における本譜・分岐状態の管理を提供する。
//!
//! # Structs
//!
//! * `GameSession` - ゲームセッション管理構造体

use crate::board::{BoardSize, Point};
use crate::dto::GameStateDto;
use crate::state::GameState;

/// ゲームセッションを管理する構造体
///
/// 通常対局および感想戦における本譜・分岐状態を管理する。
/// 操作は常に `main_state` に対して実行され、感想戦の分岐時は本譜が `hold_state` に退避される。
///
/// # Attributes
///
/// * `main_state` - 常に操作対象となる現在のゲーム状態
/// * `hold_state` - 本譜退避用ゲーム状態（分岐中のみSome）
/// * `forked_step` - 分岐が開始された手番（分岐中のみSome）
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GameSession {
    pub main_state: GameState,
    pub hold_state: Option<GameState>,
    pub forked_step: Option<usize>,
}

impl GameSession {
    /// 新しいゲームセッションを作成する
    ///
    /// # Arguments
    ///
    /// * `size` - 盤面サイズ
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameSession};
    /// let session = GameSession::new(BoardSize::Size8);
    /// assert!(!session.is_forked());
    /// ```
    pub fn new(size: BoardSize) -> Self {
        Self {
            main_state: GameState::new(size),
            hold_state: None,
            forked_step: None,
        }
    }

    /// 新しいゲームを開始する（セッションのリセット）
    ///
    /// # Arguments
    ///
    /// * `size` - 盤面サイズ
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameSession};
    /// let mut session = GameSession::new(BoardSize::Size8);
    /// session.new_game(BoardSize::Size6);
    /// assert_eq!(session.main_state.board.size, BoardSize::Size6);
    /// assert!(!session.is_forked());
    /// ```
    pub fn new_game(&mut self, size: BoardSize) {
        self.main_state = GameState::new(size);
        self.hold_state = None;
        self.forked_step = None;
    }

    /// 現在のゲーム状態のDTOを取得する
    ///
    /// # Returns
    ///
    /// * `GameStateDto` - 現在のゲーム状態DTO
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameSession};
    /// let session = GameSession::new(BoardSize::Size8);
    /// let dto = session.get_state();
    /// assert_eq!(dto.size, 8);
    /// ```
    pub fn get_state(&self) -> GameStateDto {
        GameStateDto::from(&self.main_state)
    }

    /// 初手から現在までの全局面の履歴DTOリストを取得する
    ///
    /// 分岐中の場合は退避されている本譜の履歴を返す。
    ///
    /// # Returns
    ///
    /// * `Vec<GameStateDto>` - 履歴DTOのリスト
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameSession, Point};
    /// let mut session = GameSession::new(BoardSize::Size8);
    /// session.put_disc(Point::new(2, 3)).unwrap();
    /// assert_eq!(session.get_history().len(), 2);
    /// ```
    pub fn get_history(&self) -> Vec<GameStateDto> {
        let target = self.hold_state.as_ref().unwrap_or(&self.main_state);
        GameStateDto::from_state_history(target)
    }

    /// 石を置く
    ///
    /// # Arguments
    ///
    /// * `point` - 置く座標
    ///
    /// # Returns
    ///
    /// * `Result<GameStateDto, &'static str>` - 成功時は新しい状態DTO、失敗時はエラーメッセージ
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameSession, Point};
    /// let mut session = GameSession::new(BoardSize::Size8);
    /// assert!(session.put_disc(Point::new(2, 3)).is_ok());
    /// assert!(session.put_disc(Point::new(0, 0)).is_err());
    /// ```
    pub fn put_disc(&mut self, point: Point) -> Result<GameStateDto, &'static str> {
        self.main_state.put_disc(point)?;
        Ok(self.get_state())
    }

    /// 1手戻る
    ///
    /// # Returns
    ///
    /// * `Result<GameStateDto, &'static str>` - 成功時は戻った後の状態DTO、戻せない場合はエラー
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameSession, Point};
    /// let mut session = GameSession::new(BoardSize::Size8);
    /// assert!(session.undo().is_err());
    /// session.put_disc(Point::new(2, 3)).unwrap();
    /// assert!(session.undo().is_ok());
    /// ```
    pub fn undo(&mut self) -> Result<GameStateDto, &'static str> {
        if self.main_state.undo() {
            Ok(self.get_state())
        } else {
            Err("Failed to undo")
        }
    }

    /// 指定した手数から分岐を開始する
    ///
    /// 本譜を退避した上で、指定手数のスナップショットから新しい対局を開始する。
    /// すでに分岐中の場合は、元の本譜を保持したまま再分岐する。
    ///
    /// # Arguments
    ///
    /// * `step` - 分岐元の手数
    ///
    /// # Returns
    ///
    /// * `Result<GameStateDto, &'static str>` - 分岐後の初期状態DTO
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameSession, Point};
    /// let mut session = GameSession::new(BoardSize::Size8);
    /// session.put_disc(Point::new(2, 3)).unwrap();
    /// assert!(session.fork_at(0).is_ok());
    /// assert!(session.is_forked());
    /// assert_eq!(session.forked_step(), Some(0));
    /// ```
    pub fn fork_at(&mut self, step: usize) -> Result<GameStateDto, &'static str> {
        if self.hold_state.is_none() {
            self.hold_state = Some(self.main_state.clone());
        }

        let hold = self.hold_state.as_ref().unwrap();
        let snapshot = hold.get_snapshot_at(step).ok_or("Invalid step index")?;
        self.main_state = GameState::from(&snapshot);
        self.forked_step = Some(step);

        Ok(self.get_state())
    }

    /// 分岐を破棄し、本譜の分岐元手番の盤面に復帰する
    ///
    /// # Returns
    ///
    /// * `Result<usize, &'static str>` - 本譜復帰結果DTO
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameSession, Point};
    /// let mut session = GameSession::new(BoardSize::Size8);
    /// session.put_disc(Point::new(2, 3)).unwrap();
    /// session.fork_at(0).unwrap();
    /// let step = session.reset_to_main().unwrap();
    /// assert_eq!(step, 0);
    /// assert!(!session.is_forked());
    /// ```
    pub fn reset_to_main(&mut self) -> Result<usize, &'static str> {
        let hold = self.hold_state.take().ok_or("Not in forked mode")?;
        let step = self.forked_step.take().unwrap_or(0);
        self.main_state = hold;
        self.hold_state = None;
        self.forked_step = None;
        Ok(step)
    }

    /// 現在分岐シミュレーション中であるかを判定する
    ///
    /// # Returns
    ///
    /// * `bool` - 分岐中であればtrue
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameSession};
    /// let session = GameSession::new(BoardSize::Size8);
    /// assert!(!session.is_forked());
    /// ```
    pub fn is_forked(&self) -> bool {
        self.hold_state.is_some()
    }

    /// 分岐元の手番番号を取得する
    ///
    /// # Returns
    ///
    /// * `Option<usize>` - 分岐元の手番番号（分岐中のみSome）
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameSession};
    /// let session = GameSession::new(BoardSize::Size8);
    /// assert_eq!(session.forked_step(), None);
    /// ```
    pub fn forked_step(&self) -> Option<usize> {
        self.forked_step
    }
}
