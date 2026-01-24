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
| Part 0 | 前提知識（OOP/関数型基礎、凝集度/結合度、SOLID、Code Smells） |
| Part 1 | 4分類（Command / Transition / Query / ReadModel） |
| Part 2 | 完全コンストラクタと依存生成 |
| Part 3 | Polymorphism（多態性） |
| Part 4 | エラー処理（Result型） |
| Part 5 | 設計ルール集（継承禁止、Early Return、Tell Don't Ask、Law of Demeter等） |
| Part 6 | アーキテクチャ（Screaming Architecture、MECE Tree） |
| Part 7 | テスト戦略（InMemory実装、TDD論争、テスト形状） |
| Part 8 | 適用判断ガイド（CQRS/DDD/Microservices） |

## 概要

コードレビュー、リファクタリング、設計相談の際に、以下の原則を徹底的に適用します：

- **Early Return Only** - else句禁止、ガード節で処理
- **Interface優先、継承禁止** - Composition over Inheritance
- **Polymorphism over Switch/Enum** - 振る舞いがあるならクラスで表現
- **Small Classes with Single Responsibility** - SV/SVO命名の小さなクラス
- **Complete Constructor** - 生成時点で完全に有効なオブジェクト
- **Screaming Architecture** - ディレクトリ構造が「何のシステムか」を叫ぶ
- **MECE Tree Decomposition** - 概念ベースのディレクトリ分割（Rule of 5）

## インストール

```bash
# マーケットプレイスを追加
/plugin marketplace add your-username/strict-refactoring-plugin

# プラグインをインストール
/plugin install strict-refactoring@strict-refactoring-marketplace
```

## 対象言語

| 言語 | 適用度 | 注意点 |
|------|--------|--------|
| Java/Kotlin/C# | 高 | 本スキルに最も適合 |
| TypeScript/Python | 高 | 型チェッカー（mypy等）の導入を推奨 |
| Swift | 高 | struct優先 |
| Go | 中 | シンプルさを重視する文化を尊重 |
| Rust | 中 | 所有権システムとの兼ね合いで柔軟に適用 |

**純粋関数型言語（Haskell, Elixir, Clojure等）は対象外。**

## 主要ルール

### 1. クラス優先、関数は従属
```python
# ❌ 関数: 誰が何をするか不明確
validate(order)

# ✅ クラス: 主語が明確
OrderValidator().validate(order)
```

### 2. enum vs Polymorphism
| 振る舞い | 選択 |
|---------|------|
| **なし** | enum（単なる識別子） |
| **あり** | Polymorphism（クラスで表現） |

### 3. 条件式の明確化
| 条件の種類 | 対応 |
|-----------|------|
| 自明な単一条件 | そのまま書いてよい |
| 意味が不明確な単一条件 | `is_xxx` 変数に抽出 |
| 複合条件（2つ以上） | ルールクラスに抽出 |

### 4. ディレクトリ構造
```
❌ Bad: 技術レイヤー名
src/domain/
src/infrastructure/
src/application/

✅ Good: 概念ベース（何のシステムか分かる）
src/catalog/
src/ordering/
src/payments/
```

## ライセンス

MIT License
