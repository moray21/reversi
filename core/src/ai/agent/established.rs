//! 組み込み済みの定石を利用するAIを管理するモジュール
//!
//! # Structs
//!
//! * `EstablishedProcedureAgent` - 組み込み済みの定石を利用するAI

use super::AiAgent;
use crate::board::{Board, BoardSize, Disc, Point};
use crate::state::GameState;
use serde::Deserialize;
use std::collections::HashMap;

/// 定石を利用するAI
///
/// 定石に載っている手なら定石の手を打ち、載っていなければ別のAIの手を打つ。
///
/// # Attributes
///
/// * `dictionary` - 定石を保存するハッシュマップ
/// * `alternative_agent` - 定石に載っていない手のときに使うAI
pub struct EstablishedProcedureAgent<A: AiAgent> {
    dictionary: HashMap<(BoardSize, Disc, Board), Point>,
    alternative_agent: A,
}

impl<A: AiAgent> AiAgent for EstablishedProcedureAgent<A> {
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
    /// use reversi::{BoardSize, GameState, Point, Disc};
    /// use reversi::ai::{AiAgent, RandomAgent, EstablishedProcedureAgent};
    ///
    /// let mut state = GameState::new(BoardSize::Size4);
    /// let alternative_ai = RandomAgent::new(0);
    /// let mut ai = EstablishedProcedureAgent::from_included(alternative_ai);
    /// assert_eq!(ai.select_hand(&state), Some(Point::new(0, 1)));
    /// ```
    fn select_hand(&mut self, state: &GameState) -> Option<Point> {
        let size = state.board.size;
        let turn = state.turn;
        for (board, sym) in state.board.get_all_symmetries() {
            if let Some(&book_hand) = self.dictionary.get(&(size, turn, board)) {
                let hand = book_hand.inverse_transform(sym, size);
                return Some(hand);
            }
        }
        self.alternative_agent.select_hand(state)
    }
}

impl<A: AiAgent> EstablishedProcedureAgent<A> {
    /// EstablishedProcedureAgentを作成する
    ///
    /// # Arguments
    ///
    /// * `dictionary` - 定石を保存するハッシュマップ
    /// * `alternative_agent` - 定石に載っていない手のときに使うAI
    ///
    /// # Returns
    ///
    /// * `EstablishedProcedureAgent`
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameState, Point, Disc};
    /// use reversi::ai::{AiAgent, RandomAgent, EstablishedProcedureAgent};
    /// use std::collections::HashMap;
    ///
    /// let mut state = GameState::new(BoardSize::Size4);
    /// let dictionary = HashMap::from(
    ///     [
    ///         ((BoardSize::Size4, Disc::Black, state.board.clone()), Point::new(0, 1),)
    ///     ]
    /// );
    /// let alternative_ai = RandomAgent::new(0);
    /// let mut ai = EstablishedProcedureAgent::new(dictionary, alternative_ai);
    /// assert_eq!(ai.select_hand(&state), Some(Point::new(0, 1)));
    /// ```
    pub fn new(dictionary: HashMap<(BoardSize, Disc, Board), Point>, alternative_agent: A) -> Self {
        Self {
            dictionary,
            alternative_agent,
        }
    }

    /// 組み込む辞書ファイル
    const ESTABLISHED_HANDS_TOML: &str = include_str!("./data/established_hands.toml");

    /// 組み込み済みの辞書からEstablishedProcedureAgentを作成する
    ///
    /// # Arguments
    ///
    /// * `alternative_agent` - 定石に載っていない手のときに使うAI
    ///
    /// # Returns
    ///
    /// * `EstablishedProcedureAgent`
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{BoardSize, GameState, Point};
    /// use reversi::ai::{AiAgent, RandomAgent, EstablishedProcedureAgent};
    ///
    /// let mut state = GameState::new(BoardSize::Size4);
    /// let alternative_ai = RandomAgent::new(0);
    /// let mut ai = EstablishedProcedureAgent::<RandomAgent>::from_included(alternative_ai);
    /// assert_eq!(ai.select_hand(&state), Some(Point::new(0, 1)));
    /// ```
    pub fn from_included(alternative_agent: A) -> Self {
        let dictionary = Self::load_dictionary_from_toml(Self::ESTABLISHED_HANDS_TOML).unwrap();
        Self::new(dictionary, alternative_agent)
    }

    /// tomlファイル内の定石の一覧を読んで返す
    ///
    /// # Arguments
    ///
    /// * `toml_str` - 文字列として読み込んだtomlファイル
    ///
    /// # Returns
    ///
    /// * `Result<HashMap<u128, Point>, String>`
    fn load_dictionary_from_toml(
        toml_str: &str,
    ) -> Result<HashMap<(BoardSize, Disc, Board), Point>, String> {
        let parsed: EstablishedFile = toml::from_str(toml_str).map_err(|e| e.to_string())?;

        let mut dictionary = HashMap::with_capacity(parsed.entries.len());
        for entry in parsed.entries {
            // 盤面
            let size = BoardSize::from_value(entry.size).unwrap();
            let turn = Disc::from_value(entry.turn).unwrap();
            let board = Board::from_vec(entry.board);
            // point
            let (row, col) = entry.hand;
            let hand = Point::new(row, col);
            dictionary.insert((size, turn, board), hand);
        }
        Ok(dictionary)
    }
}

/// Tomlファイルの形式
///
/// # Attributes
///
/// * `entries` - 定石のリスト
#[derive(Debug, Deserialize)]
struct EstablishedFile {
    #[serde(default)]
    entries: Vec<RawEstablishedEntry>,
}

/// 定石の内容
///
/// # Arguments
///
/// * `board` - 盤面
/// * `hand` - 次の手
#[derive(Debug, Deserialize)]
struct RawEstablishedEntry {
    size: usize,
    turn: i8,
    board: Vec<Vec<i8>>,
    hand: (usize, usize),
}

#[cfg(test)]
mod tests {
    use super::super::RandomAgent;
    use super::*;

    #[test]
    fn included_established_hands_toml_is_valid() {
        // 読み込めること
        let dict = EstablishedProcedureAgent::<RandomAgent>::load_dictionary_from_toml(
            EstablishedProcedureAgent::<RandomAgent>::ESTABLISHED_HANDS_TOML,
        )
        .unwrap();

        // 空ではないこと
        assert!(!dict.is_empty());

        // 有効な手だけが登録されていること
        for ((size, disc, mut board), point) in dict {
            if !board.put_disc(point, disc) {
                println!("size: {:?}", size);
                println!("turn: {:?}", disc);
                println!("board: ");
                println!("{:?}", board.to_numpy());
                println!("{:?}", point);
                panic!("invalid hand is included.");
            }
        }
    }
}
