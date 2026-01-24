# Strict Refactoring Plugin

Claude Code 用の厳格なリファクタリングスキルプラグイン。

## ドキュメント

| ドキュメント | 説明 | 対象読者 |
|-------------|------|---------|
| [**WHY.md**](docs/WHY.md) | 各ルールの「なぜ」を解説（4,600行） | 初学者〜中級者 |
| [**SKILL.md**](skills/SKILL.md) | ルール定義・実装パターン（3,000行） | AI / 上級者 |
| [examples/](examples/) | プロジェクト別CLAUDE.md例 | 全員 |

### WHY.md の構成

| Part | 内容 |
|------|------|
| Part 0 | 前提知識（OOP/関数型基礎） |
| Part 1 | 4分類（Command / Transition / Query / ReadModel） |
| Part 2 | 完全コンストラクタと依存生成 |
| Part 3 | Polymorphism（多態性） |
| Part 4 | エラー処理（Result型） |
| Part 5 | 設計ルール集（継承禁止、Early Return、Tell Don't Ask等） |
| Part 6 | アーキテクチャ（Screaming Architecture、MECE Tree） |
| Part 7 | テスト戦略（InMemory実装、TDD論争、テスト形状） |
| Part 8 | 発展編（CQRS/DDD/Microservices） |
| Part A | 理論的背景（凝集度、SOLID、Code Smells） |

## generate-claude-md スキル

プロジェクトの仕様書・README から、strict-refactoring に準拠した `CLAUDE.md` を自動生成するスキル。

### 使い方

```
CLAUDE.mdを生成して
```

または `/generate-claude-md` で起動。

### ワークフロー

1. **ファイル収集**: README.md, docs/Spec.md, package.json 等を自動読み込み
2. **情報抽出**: システムタイプ、ドメイン構造、状態遷移を推論
3. **確認**: 最大2問まで（それ以外はスマートデフォルト）
4. **生成**: strict-refactoring 準拠の CLAUDE.md を出力

### 推論されるシステムタイプ

| 検出キーワード | 推論結果 |
|--------------|---------|
| API, REST, OpenAPI | request-response / rest-api |
| GraphQL | request-response / graphql-api |
| CLI, コマンド | request-response / cli |
| キュー, Kafka, Worker | event-driven / message-consumer |
| バッチ, cron | event-driven / scheduled-job |
| ダッシュボード, チャート | stateful / dashboard |
| ライブラリ, SDK | library / utility |
| 管理画面, CRUD | data-intensive / crud-app |

詳細は [skills/generate-claude-md/SKILL.md](skills/generate-claude-md/SKILL.md) を参照。

## ライセンス

MIT License
