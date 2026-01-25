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

| ドキュメント | 説明 |
|-------------|------|
| [WHY.md](docs/WHY.md) | 各ルールの「なぜ」を解説 |
| [SKILL.md](skills/SKILL.md) | ルール定義・実装パターン |
| [examples/](examples/) | プロジェクト別CLAUDE.md例 |

## ライセンス

MIT License
