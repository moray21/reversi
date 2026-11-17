//! AIの思考ルーチン、評価関数、およびプレイヤーを管理するモジュール
//!
//! # Modules
//!
//! * `agent` - AIエージェントの定義
//! * `evaluator` - 盤面を評価する機能
//! * `facade` - AI関係のファサード処理
//!
//! # Traits
//!
//! * `AiAgent` - AIエージェントのトレイト
//!
//! # Structs
//!
//! * `RandomAgent` - 合法手からランダムに選択するAIエージェント
//! * `RuleBaseEvaluator` - 複数のルールで評価を行う評価器
//! * `NegamaxAgent` - ネガマックス法 ＋ αβ枝刈りを行うAIエージェント

pub mod agent;
pub mod evaluator;
pub mod facade;
pub use agent::{AiAgent, NegamaxAgent, RandomAgent};
pub use evaluator::RuleBaseEvaluator;
