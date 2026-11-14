// Windowsでリリースビルド時に余計なコンソール画面が開くのを防ぐ設定
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // lib.rs で定義する run() 関数を呼び出す
    reversi_tauri_lib::run();
}
