# Strict Refactoring プラグイン導入ガイド

Claude Code用の厳格なリファクタリングスキルを、1分で導入して使い始める方法。

---

## 🚀 最速インストール（推奨）

**📋 [INSTALL.txt](INSTALL.txt) をクリックしてコピーし、Claude Codeに貼り付けるだけ！**

> **これだけでインストール完了。手動でコマンドを入力する必要はありません。**

---

## 🔧 手動インストール（詳細）

以下の3ステップで手動インストールも可能です。

> **注意**: このプラグインは公式マーケットプレイス（claude-plugins-official）にはまだ登録されていません。手動でマーケットプレイスを追加する必要があります。

### ステップ1: マーケットプレイスを追加

Claude Codeを起動して、以下のコマンドを実行：

```bash
/plugin marketplace add yy/strict-refactoring-plugin
```

> **解説**: このコマンドは `https://github.com/yy/strict-refactoring-plugin` リポジトリのマーケットプレイス設定を読み込みます。このリポジトリは公開されているため、誰でもアクセスできます。

### ステップ2: プラグインをインストール

```bash
/plugin install strict-refactoring@strict-refactoring-marketplace
```

### ステップ3: すぐに使う

```bash
# リファクタリング相談
「このコードをstrict-refactoringのルールでレビューして」

# 設計相談
「決済機能をstrict-refactoringの原則で設計して」

# アーキテクチャ相談
「DDDアプローチで設計したいから相談して」
```

---

## 📋 インストール確認

正しくインストールされたか確認するには：

```bash
/plugin
```

**Installed** タブに `strict-refactoring@strict-refactoring-marketplace` が表示されていれば成功です！

---

---

## 📋 スキルの特徴

- **3分類**: Command / Pure / ReadModel
- **完全コンストラクタ**: 生成時点で有効なオブジェクト
- **Polymorphism優先**: switch/if-else より多態性
- **Screaming Architecture**: ディレクトリ構造が目的を語る

---

## 🎯 使用方法

### コードレビュー時

コードを選択して以下のように依頼：

```bash
「このコードをstrict-refactoringのルールに従ってレビューして」
「switch文が使われているけど、ポリモーフィズムにリファクタリングして」
「このクラスを完全コンストラクタパターンに修正して」
```

### 新規開発時

```bash
「決済機能をstrict-refactoringの原則で設計して」
「ユーザー登録機能をDDDで設計したいからstrict-refactoringを使って相談して」
```

### 既存コードのリファクタリング

```bash
「このモジュール全体をstrict-refactoringのルールに従ってリファクタリングして」
「このクラスを3分類（Command/Pure/ReadModel）に分類して設計し直して」
```

---

## 📚 学習リソース

詳細なドキュメントはすべて [GitHubリポジトリ](https://github.com/yy/strict-refactoring-plugin) で参照できます：

- 📖 **[WHY.md](https://github.com/yy/strict-refactoring-plugin/blob/main/docs/WHY.md)** - 各ルールの「なぜ」を解説
- 📖 **[SKILL.md](https://github.com/yy/strict-refactoring-plugin/blob/main/skills/SKILL.md)** - 15の核心ルールとチェックリスト（インストール済み）
- 📖 **[command-patterns.md](https://github.com/yy/strict-refactoring-plugin/blob/main/skills/command-patterns.md)** - Command/Pure/ReadModel、Pending Object Pattern、Repository設計
- 📖 **[error-handling.md](https://github.com/yy/strict-refactoring-plugin/blob/main/skills/error-handling.md)** - Result型、DomainError/InfrastructureError、境界層でのエラーハンドリング
- 📖 **[testing-patterns.md](https://github.com/yy/strict-refactoring-plugin/blob/main/skills/testing-patterns.md)** - テスト戦略、命名規則、Test Data Factory、テストダブル
- 📖 **[code-quality-patterns.md](https://github.com/yy/strict-refactoring-plugin/blob/main/skills/code-quality-patterns.md)** - 完全コンストラクタ、イミュータビリティ、引数/戻り値
- 📖 **[language-guides.md](https://github.com/yy/strict-refactoring-plugin/blob/main/skills/language-guides.md)** - 言語別緩和ルール（Go/Rust等）、フレームワーク別ガイダンス、ディレクトリ構造
- 📖 **[examples/](https://github.com/yy/strict-refactoring-plugin/tree/main/examples)** - プロジェクト別の適用例

> **注意**: 上記の参照ファイル（*patterns.md, WHY.md）はインストールされません。GitHubリポジトリで参照してください。

---

## 🔧 自動設定生成（新規プロジェクト）

新規プロジェクトでプロジェクト固有の設定を自動生成：

```bash
「CLAUDE.mdを生成して」
```

これでプロジェクトの特性に合わせた設定が自動生成されます。

---

## ❓ よくある質問

### Q: 公式マーケットプレイスには登録されないのですか？

A: 現時点では公式マーケットプレイス（claude-plugins-official）には登録されていません。そのため、上記の手順で手動でマーケットプレイスを追加してインストールする必要があります。将来的に公式マーケットプレイスに登録される予定があるかは、リポジトリのIssuesやREADMEをご確認ください。

### Q: インストール後、どうやって使いますか？

### Q: インストール後、どうやって使いますか？

A: Claudeに対して「リファクタリング」「設計」「アーキテクチャ」「OOP」「DDD」などのキーワードを含めて依頼するだけで、自動的にstrict-refactoringスキルが適用されます。

### Q: どの言語に対応していますか？

A: Java, Kotlin, Scala, C#, F#, TypeScript, JavaScript, Python, Swift, Go, Rust に対応しています。（純粋関数型言語は対象外。Go/Rustは一部緩和あり）

### Q: 既存プロジェクトでも使えますか？

A: はい。既存コードを選択して「このコードをstrict-refactoringでレビューして」と依頼するだけで使えます。

### Q: 詳細なドキュメント（WHY.mdやpatterns.md）はどこにありますか？

A: 詳細なドキュメントはインストールされません。[GitHubリポジトリ](https://github.com/yy/strict-refactoring-plugin) で参照してください。SKILL.mdには各ルールの概要とチェックリストのみ含まれています。

### Q: チームで共有できますか？

A: はい。プロジェクトの `.claude/settings.json` に以下を追加することで、チームメンバー全員が同じ設定を使えます：

```json
{
  "enabledPlugins": {
    "strict-refactoring@strict-refactoring-marketplace": true
  }
}
```

---

## 💡 ヒント

- **初回はWHY.mdから**: 各ルールの背景を理解することで、より効果的に使えます
- **チェックリスト活用**: コードレビュー時にSKILL.mdのチェックリストを使うと漏れがありません
- **例を見る**: `examples/` ディレクトリに、様々なタイプのプロジェクトでの適用例があります

---

## 🔍 トラブルシューティング

### `/plugin marketplace add` で失敗する場合

**エラー例**: `Repository not found` や `Failed to clone repository`

**解決方法**:
1. リポジトリURLが正しいか確認してください: `https://github.com/yy/strict-refactoring-plugin`
2. ブラウザで上記URLにアクセスして、リポジトリが公開されていることを確認してください
3. Git設定が正しいか確認してください:
   ```bash
   git --version
   # Gitがインストールされている必要があります
   ```

### `/plugin install` で失敗する場合

**エラー例**: `Plugin not found` や `Invalid plugin source`

**解決方法**:
1. マーケットプレイスが正しく追加されているか確認:
   ```bash
   /plugin marketplace list
   # `strict-refactoring-marketplace` が表示されるはずです
   ```
2. プラグイン名が正しいか確認（コピペ推奨）:
   ```bash
   /plugin install strict-refactoring@strict-refactoring-marketplace
   ```

### スキルが自動的に適用されない場合

**原因**: 依頼にトリガーキーワードが含まれていない可能性があります

**解決方法**:
- 依頼に以下のキーワードを含めてください:
  - 「リファクタリング」「設計」「アーキテクチャ」「OOP」「ドメイン駆動」「DDD」
- 例: `「このコードをstrict-refactoringのルールでレビューして」`
- 明示的にスキルを指定することもできます:
  ```
  /strict-refactoring:review このコードをレビューして
  ```

---

- **初回はWHY.mdから**: 各ルールの背景を理解することで、より効果的に使えます
- **チェックリスト活用**: コードレビュー時にSKILL.mdのチェックリストを使うと漏れがありません
- **例を見る**: `examples/` ディレクトリに、様々なタイプのプロジェクトでの適用例があります

---

## 📞 サポート

問題がある場合は、GitHubのIssuesに報告してください：
https://github.com/yy/strict-refactoring-plugin/issues

---

**準備完了！** すぐにコードの品質向上を始めましょう。🎉
