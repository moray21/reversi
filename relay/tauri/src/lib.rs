//! Tauri ライブラリ
//!
//! # Command
//!
//! * `get_state` - 現在のゲーム状態を取得
//! * `new_game` - 新しいゲームの開始
//! * `put_disc` - 石を置く
//! * `undo` - 1手戻る
//! * `put_by_ai` - AIに打たせる
//! * `get_history` - 初手から現在までの全局面の履歴を取得
//! * `fork_at` - 指定した手数の盤面から分岐対局を開始
//! * `reset_to_main` - 分岐を破棄して本譜の分岐元盤面に復帰

use reversi::{BoardSize, GameSession, GameStateDto, Point, ai};
use std::sync::{Arc, Mutex};
use tauri::State;

/// アプリケーション全体で共有するゲームセッション(共有可能なデータ)
///
/// # Attributes
///
/// * `session` - ゲームセッション
pub struct AppState {
    pub session: Arc<Mutex<GameSession>>,
}

// ------------------------------ Command ------------------------------

/// 現在の状態を取得
///
/// # Arguments
///
/// * `state` - AppStateの参照
///
/// # Returns
///
/// * `GameStateDto`
#[tauri::command]
fn get_state(state: State<'_, AppState>) -> Result<GameStateDto, String> {
    let session = state.session.lock().unwrap();
    Ok(session.get_state())
}

/// 新しいゲームの開始
///
/// # Arguments
///
/// * `size` - ゲーム盤のサイズ
/// * `state` - AppStateの参照
///
/// # Returns
///
/// * `GameStateDto`
#[tauri::command]
fn new_game(size: usize, state: State<'_, AppState>) -> Result<GameStateDto, String> {
    let board_size = match size {
        4 => BoardSize::Size4,
        6 => BoardSize::Size6,
        8 => BoardSize::Size8,
        _ => return Err("Invalid board size".to_owned()),
    };

    let mut session = state.session.lock().unwrap();
    session.new_game(board_size);

    Ok(session.get_state())
}

/// 石を置く
///
/// # Arguments
///
/// * `row` - 行
/// * `col` - 列
/// * `state` - AppStateの参照
///
/// # Returns
///
/// * `GameStateDto`
#[tauri::command]
fn put_disc(row: usize, col: usize, state: State<'_, AppState>) -> Result<GameStateDto, String> {
    let mut session = state.session.lock().unwrap();
    let point = Point::new(row, col);
    session.put_disc(point).map_err(|e| e.to_string())
}

/// 1手戻る
///
/// # Arguments
///
/// * `state` - AppStateの参照
///
/// # Returns
///
/// * `GameStateDto`
#[tauri::command]
fn undo(state: State<'_, AppState>) -> Result<GameStateDto, String> {
    let mut session = state.session.lock().unwrap();
    session.undo().map_err(|e| e.to_string())
}

/// AIに打たせる
///
/// # Arguments
///
/// * `level` - AIの思考力
/// * `state` - AppStateの参照
///
/// # Returns
///
/// * `GameStateDto`
#[tauri::command]
async fn put_by_ai(level: String, state: State<'_, AppState>) -> Result<GameStateDto, String> {
    let session = state.session.clone();
    let dto = tauri::async_runtime::spawn_blocking(move || {
        let mut session = session.lock().unwrap();
        let level = level.parse::<ai::facade::IntelligenceLevel>().unwrap();
        let point = ai::facade::select_hand(&mut session.main_state, level).unwrap();

        if let Some(p) = point {
            let _ = session.put_disc(p);
        }

        session.get_state()
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(dto)
}

/// 全局面の履歴DTOリストを取得
///
/// # Arguments
///
/// * `state` - AppStateの参照
///
/// # Returns
///
/// * `Vec<GameStateDto>`
#[tauri::command]
fn get_history(state: State<'_, AppState>) -> Result<Vec<GameStateDto>, String> {
    let session = state.session.lock().unwrap();
    Ok(session.get_history())
}

/// 指定した手数の盤面から分岐対局を開始
///
/// # Arguments
///
/// * `step` - 分岐元の手数
/// * `state` - AppStateの参照
///
/// # Returns
///
/// * `GameStateDto`
#[tauri::command]
fn fork_at(step: usize, state: State<'_, AppState>) -> Result<GameStateDto, String> {
    let mut session = state.session.lock().unwrap();
    session.fork_at(step).map_err(|e| e.to_string())
}

/// 分岐を破棄して本譜の分岐元盤面に復帰
///
/// # Arguments
///
/// * `state` - AppStateの参照
///
/// # Returns
///
/// * `usize`
#[tauri::command]
fn reset_to_main(state: State<'_, AppState>) -> Result<usize, String> {
    let mut session = state.session.lock().unwrap();
    session.reset_to_main().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            session: Arc::new(Mutex::new(GameSession::new(BoardSize::Size8))),
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            new_game,
            put_disc,
            undo,
            put_by_ai,
            get_history,
            fork_at,
            reset_to_main,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
