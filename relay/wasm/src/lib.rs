/// WASMから操作できるゲームの状態を提供します。
///
/// # Structs
///
/// * `WasmGameEngine` - ゲームの状態
use reversi::{BoardSize, GameState, Point};
use reversi_dto::GameStateDto;
use wasm_bindgen::prelude::*;

/// WASMから操作できるゲーム
///
/// # Arguments
///
/// * `state` - ゲームの状態
#[wasm_bindgen]
pub struct WasmGameEngine {
    state: GameState,
}

#[wasm_bindgen]
impl WasmGameEngine {
    /// 新しいゲームを作成する
    ///
    /// # Arguments
    ///
    /// * `size` - 盤面のサイズ
    ///
    /// # Returns
    ///
    /// * `Result<WasmGameEngine, JsValue>`
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> Result<WasmGameEngine, JsValue> {
        let board_size = match size {
            4 => BoardSize::Size4,
            6 => BoardSize::Size6,
            8 => BoardSize::Size8,
            _ => return Err(JsValue::from_str("Invalid board size")),
        };
        Ok(Self {
            state: GameState::new(board_size),
        })
    }

    /// ゲームの状態を取得する
    ///
    /// # Returns
    ///
    /// * `Result<JsValue, JsValue>`
    pub fn get_state(&self) -> Result<JsValue, JsValue> {
        let dto = GameStateDto::from(&self.state);
        Ok(serde_wasm_bindgen::to_value(&dto)?)
    }

    /// 石を置く
    ///
    /// # Arguments
    ///
    /// * `row` - 行番号
    /// * `col` - 列番号
    ///
    /// # Returns
    ///
    /// * `Result<JsValue, JsValue>`
    pub fn put_disc(&mut self, row: usize, col: usize) -> Result<JsValue, JsValue> {
        self.state
            .put_disc(Point::new(row, col))
            .map_err(JsValue::from_str)?;
        let dto = GameStateDto::from(&self.state);
        Ok(serde_wasm_bindgen::to_value(&dto)?)
    }

    /// 1手戻す
    ///
    /// # Returns
    ///
    /// * `Result<JsValue, JsValue>`
    pub fn undo(&mut self) -> Result<JsValue, JsValue> {
        if self.state.undo() {
            let dto = GameStateDto::from(&self.state);
            Ok(serde_wasm_bindgen::to_value(&dto)?)
        } else {
            Err(JsValue::from_str("Failed to undo"))
        }
    }

    /// AIに打たせる
    ///
    /// # Arguments
    ///
    /// * `depth` - 探索の深さ
    ///
    /// # Return
    ///
    /// * `Result<JsValue, JsValue>`
    pub fn put_by_ai(&mut self, depth: u32) -> Result<JsValue, JsValue> {
        let _ = reversi_dto::put_by_ai(&mut self.state, depth);
        let dto = GameStateDto::from(&self.state);
        Ok(serde_wasm_bindgen::to_value(&dto)?)
    }
}
