# AGENTS.md

## Project Overview

下記特徴を持つオセロのアプリケーションを提供するリポジトリ
- フロントエンド: React + Vite + Typescript
- バックエンド: Rust
- フロントエンドとバックエンドの接続
    - デスクトップアプリ: tauri
    - webアプリ: WebAssembly


## Commands

- Lint & Type check: `cargo make check`
- Format: `cargo make format`
- Test: `cargo make test`
- Coverage: `cargo make coverage`
- Build:
    - tauri: `cargo make build`
    - wasm: `cargo make _build_wasm`
- Run:
    - tauri: `cargo tauri dev`
    - wasm: `cargo make run`


## Code Style

- 共通のコアロジックは`core`以下のクレートに実装する
- tauriやwasmと中継する機能は`relay`以下のクレートに実装する
- Docstring
    - 項目の前に`# `をつける
    - 項目: Arguments, Returns, Examples, Panics, so on.
- オブジェクト指向を好み、structやenumなど構造とメソッドを紐づけて管理する


## Testing
- 可能な限りDocstringにExamplesを記載し、ドキュメントテストを実施する
- ビルド時の速度面への影響やプライベートメソッドなどドキュメントテストが困難な場合は、同ファイル下部にテストモジュールを作成する
- カバレッジは参考程度であり、テストがなくても許容される


## Boundaries

- `.env`などの隠しファイルやディレクトリを変更・コミットしない


## Workflow

### 設計

- 設計内容に沿ったディレクトリを`design`以下に作成する（`design/xxx`）
- 作成したディレクトリに`plan.md`を作成し、検討事項を整理する（`design/xxx/plan.md`）
- 変更方針だけでなく、PRの回数や方針も示す


### 実装

- `design/xxx/plan.md`に沿って実装を行う
- コミットはなるべく細かく行う
- コミットメッセージは簡潔に1文でまとめる


### レビュー

現行ブランチとmainブランチの差分をレビューすること
