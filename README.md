# Strict Refactoring Plugin

Claude Code用のリファクタリングスキル。コードレビュー・設計相談時に厳格なOOP原則を適用する。

## 特徴

- **3分類**: Command / Pure / ReadModel
- **完全コンストラクタ**: 生成時点で有効なオブジェクト
- **Polymorphism優先**: switch/if-else より多態性
- **Screaming Architecture**: ディレクトリ構造が目的を語る

## ワークフロー

### 新規プロジェクト

```
1. Claudeと対話してSPEC.mdを作成
2. 「CLAUDE.mdを生成して」でプロジェクト固有設定を自動生成
3. 開発開始
```

### 既存プロジェクトのリファクタリング

```
1. /strict-refactoring をロード
2. リファクタリング対象を指定して相談
```

## ドキュメント

### コアファイル

| ドキュメント | 説明 |
|-------------|------|
| [WHY.md](docs/WHY.md) | 各ルールの「なぜ」を解説 |
| [SKILL.md](skills/SKILL.md) | Core Rules（15ルール + チェックリスト） |
| [examples/](examples/) | プロジェクト別CLAUDE.md例 |

### パターン参照ファイル（オンデマンド読み込み）

| ファイル | 内容 |
|---------|------|
| [command-patterns.md](skills/command-patterns.md) | 3分類判断フロー、Command/Pure/ReadModel、Pending Object、Repository設計 |
| [error-handling.md](skills/error-handling.md) | Result型、DomainError/InfrastructureError、境界層エラーハンドリング |
| [code-quality-patterns.md](skills/code-quality-patterns.md) | 完全コンストラクタ、イミュータビリティ、引数/戻り値 |
| [testing-patterns.md](skills/testing-patterns.md) | テスト戦略、命名規則、Test Data Factory、テストダブル |
| [language-guides.md](skills/language-guides.md) | 言語別緩和ルール（Go/Rust等）、フレームワーク別ガイダンス、ディレクトリ構造 |

## ライセンス

MIT License
