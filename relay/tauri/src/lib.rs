//! Tauri ライブラリ
//!
//! # Command
//!
//! * `new_game` - 新しいゲームの開始
//! * `put_disc` - 石を置く
//! * `undo` - 1手戻る
//! * `put_by_ai` - AIに打たせる

use reversi::{BoardSize, GameState, GameStateDto, Point, ai};
use std::sync::{Arc, Mutex};
use tauri::State;

/// アプリケーション全体で共有するゲーム(共有可能なデータ)
///
/// # Attributes
///
/// * `game` - ゲーム状態
pub struct AppState {
    pub game: Arc<Mutex<GameState>>,
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
    // ゲーム状態の取得
    let game = state.game.lock().unwrap();
    Ok(GameStateDto::from(&*game))
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
    // 盤面のサイズ
    let board_size = match size {
        4 => BoardSize::Size4,
        6 => BoardSize::Size6,
        8 => BoardSize::Size8,
        _ => return Err("Invalid board size".to_owned()),
    };

    // ゲーム状態の初期化
    let mut game = state.game.lock().unwrap();
    *game = GameState::new(board_size);

    // DTOへの変換
    Ok(GameStateDto::from(&*game))
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
    // ゲーム状態の取得
    let mut game = state.game.lock().unwrap();

    // 石を置く
    let point = Point::new(row, col);
    game.put_disc(point).map_err(|e| e.to_string())?;

    // DTOへの変換
    Ok(GameStateDto::from(&*game))
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
    // ゲーム状態の取得
    let mut game = state.game.lock().unwrap();

    // 1手戻す
    let result = game.undo();
    if result {
        Ok(GameStateDto::from(&*game))
    } else {
        Err("Failed to undo".to_owned())
    }
}

/// AIに打たせる
///
/// # Arguments
///
/// * `depth` - 探索の深さ
/// * `state` - AppStateの参照
///
/// # Returns
///
/// * `GameStateDto`
#[tauri::command]
async fn put_by_ai(depth: u32, state: State<'_, AppState>) -> Result<GameStateDto, String> {
    // depthが0以下の場合
    if depth == 0 {
        return Err("Invalid depth is specified.".into());
    }

    // AIの探索処理を別スレッド（spawn_blocking）で実行する
    let game = state.game.clone();
    let dto = tauri::async_runtime::spawn_blocking(move || {
        // ゲーム状態の取得
        let mut game = game.lock().unwrap();

        // 決定
        let level = "average".parse::<ai::facade::IntelligenceLevel>().unwrap();
        let point = ai::facade::select_hand(&mut game, level).unwrap();

        // Noneの場合は何もしない
        if let Some(p) = point {
            game.put_disc(p).unwrap();
        }

        // DTOへの変換
        GameStateDto::from(&*game)
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(dto)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            game: Arc::new(Mutex::new(GameState::new(BoardSize::Size8))),
        })
        .invoke_handler(tauri::generate_handler![
            get_state, new_game, put_disc, undo, put_by_ai
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
