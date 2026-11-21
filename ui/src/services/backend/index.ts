import { isTauri } from '@tauri-apps/api/core';
import type { IReversiBackend } from './types';
import { TauriBackend } from './tauriBackend';
import { WasmBackend } from './wasmBackend';

export * from './types';
export * from './tauriBackend';
export * from './wasmBackend';

/** 実行環境がTauri上であるかを判定する */
export function isTauriEnvironment(): boolean {
  return isTauri();
}

/** 環境に応じたバックエンドインスタンスを生成する */
export function createBackend(): IReversiBackend {
  if (isTauriEnvironment()) {
    return new TauriBackend();
  }
  return new WasmBackend();
}
