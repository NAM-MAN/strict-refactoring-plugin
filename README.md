# Strict Refactoring Plugin

Claude Code用のリファクタリングスキル。コードレビュー・設計相談時に厳格なOOP原則を適用する。

## 🚀 インストール

### 最速インストール（推奨）

**📋 [INSTALL.txt](INSTALL.txt) をクリックしてコピーし、Claude Codeに貼り付けるだけ！**

> **これだけでインストール完了。手動でコマンドを入力する必要はありません。**

または、以下の手順で手動インストール：

```bash
# 1. マーケットプレイスを追加
/plugin marketplace add NAM-MAN/strict-refactoring-plugin

# 2. プラグインをインストール
/plugin install strict-refactoring@strict-refactoring-marketplace

# 3. すぐに使う
「このコードをstrict-refactoringのルールでレビューして」
```

> **注意**: このプラグインは公式マーケットプレイスにはまだ登録されていません。手動でマーケットプレイスを追加する必要があります。

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
3. 「[機能名]をstrict-refactoringの原則で設計して」と依頼して開発開始
```

**CLAUDE.mdの自動生成（generate-claude-md スキル）:**

新規プロジェクトの場合、`generate-claude-md` スキルを使ってプロジェクト固有の CLAUDE.md を自動生成できます。

**使い方:**
1. プロジェクトに以下のファイルを用意します（いずれかでOK）:
   - `README.md` - プロジェクト名、概要
   - `docs/Spec.md` または `SPEC.md` - ドメイン構造、機能要件
   - `docs/Architecture.md` - アーキテクチャ情報
   - `package.json` / `pyproject.toml` - 技術スタック

2. Claudeに以下のいずれかで依頼します:
   ```
   「CLAUDE.mdを生成して」
   「CLAUDE.md作って」
   /generate-claude-md
   ```

3. Claudeが自動的にファイルを読み込んで、プロジェクトに合わせた CLAUDE.md を生成します

**生成される内容:**
- システムタイプ分類（request-response, event-driven, library など）
- プロジェクト固有の Class Classification
- ディレクトリ構造
- 命名規則（日英対応表）
- テスト戦略
- クイックコマンド

> **注意**: CLAUDE.md が既に存在する場合は上書き確認されます。

### 既存プロジェクトのリファクタリング

```
1. リファクタリング対象のコードを選択
2. 「このコードをstrict-refactoringのルールでレビューして」と依頼
3. 必要に応じて「[修正内容]にリファクタリングして」と具体的に指示
```

## ドキュメント

**すべてのドキュメントは [GitHubリポジトリ](https://github.com/NAM-MAN/strict-refactoring-plugin) で参照できます：**

- 📖 **[INSTALL.md](INSTALL.md)** - 🚀 1分で導入完了！クイックスタートガイド
- 📖 **[WHY.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/docs/WHY.md)** - 各ルールの「なぜ」を解説
- 📖 **[SKILL.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/SKILL.md)** - Core Rules（15ルール + チェックリスト）
- 📖 **[command-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/command-patterns.md)** - 3分類判断フロー、Command/Pure/ReadModel、Pending Object、Repository設計
- 📖 **[error-handling.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/error-handling.md)** - Result型、DomainError/InfrastructureError、境界層でのエラーハンドリング
- 📖 **[code-quality-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/code-quality-patterns.md)** - 完全コンストラクタ、イミュータビリティ、引数/戻り値
- 📖 **[testing-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/testing-patterns.md)** - テスト戦略、命名規則、Test Data Factory、テストダブル
- 📖 **[language-guides.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/language-guides.md)** - 言語別緩和ルール（Go/Rust等）、フレームワーク別ガイダンス、ディレクトリ構造
- 📖 **[examples/](https://github.com/NAM-MAN/strict-refactoring-plugin/tree/main/examples)** - プロジェクト別CLAUDE.md例

> **注意**: プラグインとしてインストールされるのは `SKILL.md` と `generate-claude-md/SKILL.md` のみです。その他の詳細ドキュメント（WHY.md、*patterns.mdなど）はGitHubリポジトリで参照してください。

## ライセンス

MIT License

---

## 💡 使用例

### コードレビュー

```
❌ 「このコードレビューして」
✅ 「このコードをstrict-refactoringのルールでレビューして」
```

### 設計相談

```
❌ 「決済機能設計して」
✅ 「決済機能をstrict-refactoringの原則で設計して」
```

### リファクタリング

```
❌ 「このswitch文修正して」
✅ 「このswitch文をポリモーフィズムにリファクタリングして」
```

### アーキテクチャ

```
❌ 「良いアーキテクチャ教えて」
✅ 「DDDアプローチで設計したいからstrict-refactoringを使って相談して」
```

### CLAUDE.md生成

```
❌ 「CLAUDE.md適当に書いて」
✅ 「CLAUDE.mdを生成して」
```

> **ヒント**: CLAUDE.md を自動生成するには、プロジェクトに `README.md`、`docs/Spec.md`、または `package.json` などのファイルを用意しておくと、より正確な設定が生成されます。

**キーワード**: 「リファクタリング」「設計」「アーキテクチャ」「OOP」「ドメイン駆動」「DDD」などを含めると、自動的にstrict-refactoringスキルが適用されます。

---

## ❓ よくある質問

### Q: 公式マーケットプレイスには登録されないのですか？

A: 現時点では公式マーケットプレイス（claude-plugins-official）には登録されていません。そのため、上記の手順で手動でマーケットプレイスを追加してインストールする必要があります。詳細なトラブルシューティングは [INSTALL.md](INSTALL.md) を参照してください。

### Q: インストールでエラーが出た場合は？

A: [INSTALL.md](INSTALL.md) の「🔍 トラブルシューティング」セクションを参照してください。一般的なエラーと解決方法が記載されています。

### Q: 詳細なドキュメント（WHY.mdやpatterns.md）はどこにありますか？

A: 詳細なドキュメントはインストールされません。[GitHubリポジトリ](https://github.com/NAM-MAN/strict-refactoring-plugin) で参照してください。SKILL.mdには各ルールの概要とチェックリストのみ含まれています。

