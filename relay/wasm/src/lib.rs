/// WASMから操作できるゲームの状態を提供します。
///
/// # Structs
///
/// * `WasmGameEngine` - ゲームの状態
use reversi::{BoardSize, GameSession, Point, ai};
use wasm_bindgen::prelude::*;

/// WASMから操作できるゲーム
///
/// # Arguments
///
/// * `session` - ゲームセッション
#[wasm_bindgen]
pub struct WasmGameEngine {
    session: GameSession,
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
            session: GameSession::new(board_size),
        })
    }

    /// ゲームの状態を取得する
    ///
    /// # Returns
    ///
    /// * `Result<JsValue, JsValue>`
    pub fn get_state(&self) -> Result<JsValue, JsValue> {
        let dto = self.session.get_state();
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
        let dto = self
            .session
            .put_disc(Point::new(row, col))
            .map_err(JsValue::from_str)?;
        Ok(serde_wasm_bindgen::to_value(&dto)?)
    }

    /// 1手戻す
    ///
    /// # Returns
    ///
    /// * `Result<JsValue, JsValue>`
    pub fn undo(&mut self) -> Result<JsValue, JsValue> {
        let dto = self.session.undo().map_err(JsValue::from_str)?;
        Ok(serde_wasm_bindgen::to_value(&dto)?)
    }

    /// AIに打たせる
    ///
    /// # Arguments
    ///
    /// * `level` - AIの思考力
    ///
    /// # Return
    ///
    /// * `Result<JsValue, JsValue>`
    pub fn put_by_ai(&mut self, level: &str) -> Result<JsValue, JsValue> {
        let level = level.parse::<ai::facade::IntelligenceLevel>().unwrap();
        let point = ai::facade::select_hand(&mut self.session.main_state, level)
            .map_err(|e| e.to_string())?;

        if let Some(p) = point {
            let _ = self.session.put_disc(p);
        }

        let dto = self.session.get_state();
        Ok(serde_wasm_bindgen::to_value(&dto)?)
    }

    /// 全局面の履歴DTOリストを取得する
    ///
    /// # Returns
    ///
    /// * `Result<JsValue, JsValue>`
    pub fn get_history(&self) -> Result<JsValue, JsValue> {
        let history = self.session.get_history();
        Ok(serde_wasm_bindgen::to_value(&history)?)
    }

    /// 指定した手数の盤面から分岐対局を開始する
    ///
    /// # Arguments
    ///
    /// * `step` - 分岐元の手数
    ///
    /// # Returns
    ///
    /// * `Result<JsValue, JsValue>`
    pub fn fork_at(&mut self, step: usize) -> Result<JsValue, JsValue> {
        let dto = self.session.fork_at(step).map_err(JsValue::from_str)?;
        Ok(serde_wasm_bindgen::to_value(&dto)?)
    }

    /// 分岐を破棄して本譜の分岐元盤面に復帰する
    ///
    /// # Returns
    ///
    /// * `Result<JsValue, JsValue>`
    pub fn reset_to_main(&mut self) -> Result<JsValue, JsValue> {
        let step = self.session.reset_to_main().map_err(JsValue::from_str)?;
        Ok(serde_wasm_bindgen::to_value(&step)?)
    }
}
