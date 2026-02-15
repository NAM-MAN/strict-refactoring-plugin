---
name: strict-refactoring
description: "コード修正、リファクタリング、設計相談を受けた際に使用。トリガー: 「リファクタリング」「設計」「アーキテクチャ」「OOP」「ドメイン駆動」「DDD」等で相談された時"
---

# Strict Refactoring Skill

## 対象言語

Java, Kotlin, Scala, C#, F#, TypeScript, JavaScript, Python, Swift, Go, Rust
（純粋関数型言語は対象外。Go/Rustは一部緩和あり）

---

## Level 1: 絶対遵守（5原則）

### 1. 3分類に従え
すべてのクラス/関数は **Command / Pure / ReadModel** のいずれかに分類せよ。

| 分類 | 定義 | 副作用 |
|------|------|:------:|
| Command | 永続化・外部通信 | あり |
| Pure | 型変換・計算・判定 | なし |
| ReadModel | 読み取り専用取得 | なし |

**判断:** 永続化/外部通信？ 書き込み→Command / 読み取り→ReadModel / いずれでもない→Pure

**骨格:** `DraftX(data).submit(repo) → SubmittedX`

📖 詳細: [command-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/command-patterns.md)

---

### 2. 完全コンストラクタ
オブジェクトは生成時点で完全に有効な状態にせよ。

```typescript
class Order {
  constructor(private data: OrderData) {
    if (!data.customerId) throw new Error("必須");
  }
}
```

**骨格:** `new DraftX(id, validatedData)`

📖 詳細: [code-quality-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/code-quality-patterns.md)

---

### 3. ドメイン層でswitch/if-else分岐禁止
複数ロジックは **Interface + 実装クラス**で表現せよ。

```typescript
// ❌ 禁止: switchでビジネスロジック
// ✅ 必須: interface ApprovalRule { canApprove(): boolean }
```

**例外:** 境界層でのインスタンス生成・値変換は許容

**判断:** 各分岐で異なる計算ロジック？ / 独立したテストが必要？ / 将来増える？ → Polymorphism

**骨格:** `new ManagerRule().canApprove(ringi)`

📖 詳細: [command-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/command-patterns.md)

---

### 4. イミュータブル優先
状態変更は最小限に、変更時は新しいオブジェクトを返せ。

```typescript
class Ringi {
  approve(): Ringi {
    return new Ringi(this.id, this.title, this.amount, RingiStatus.APPROVED);
  }
}
```

**骨格:** `ringi.approve() → new Ringi(..., approvedStatus)`

📖 詳細: [code-quality-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/code-quality-patterns.md)

---

### 5. Result型でドメインエラー表現
ドメインエラーは `Result<T, E>` 判別共用体で返せ。絶対にthrowするな。

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
if (!result.ok) return toErrorResponse(result.error);
```

**例外:** InfrastructureErrorは `extends Error` でthrow

**骨格:** `DraftX.create(data) → Result<DraftX, ErrorX>`

📖 詳細: [error-handling.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/error-handling.md)

---

## Level 2: 標準遵守（10ルール）

### 6. Early Return Only
else句は原則使うな。ガード節で処理せよ。

```typescript
if (!order.isValid()) throw new Error();
return doProcess(order);
```

**例外:** 両パスが正常系で対称的な場合は許容

**骨格:** `if (!valid) throw; return process();`

📖 詳細: [code-quality-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/code-quality-patterns.md)

---

### 7. 引数は1-2個
3つ以上は **Parameter Object** にまとめよ。

```typescript
// ❌ Bad: function create(x, y, z): X {}
// ✅ Good: function create(data: CreateData): X {}
```

**骨格:** `new DraftX(data: DraftData)`

📖 詳細: [code-quality-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/code-quality-patterns.md)

---

### 8. 戻り値は名前付き型
複数の値を返す場合、各値に名前を付けよ。生タプルは禁止。

```typescript
// ❌ 禁止: function getDateRange(): [Date, Date]
// ✅ 必須: function getDateRange(): { start: Date; end: Date }
```

**骨格:** `return { start: d1, end: d2 }`

📖 詳細: [code-quality-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/code-quality-patterns.md)

---

### 9. Primitive Obsession回避
プリミティブは専用型で包め。

```typescript
// ❌ Bad: function charge(amount: number): void {}
// ✅ Good: class Money { constructor(readonly amount: number) { if (amount < 0) throw; } }
```

**骨格:** `new Money(1000, "JPY")`

📖 詳細: [code-quality-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/code-quality-patterns.md)

---

### 10. Interface優先、継承禁止
Composition over Inheritance。

```typescript
// ✅ Good: interface Repository { save(x): Promise<void> }
// ❌ Bad: class BaseRepository { /* ... */ }
```

**骨格:** `interface XRepository { save(x): void }`

📖 詳細: [code-quality-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/code-quality-patterns.md)

---

### 11. Pending Object Pattern
状態遷移を型で表現せよ。

```
{状態}{Entity}(入力).{遷移}(依存) → {結果Entity}
```

| 状態 | クラス名例 | メソッド |
|------|-----------|---------|
| 作成 | `Draft{Entity}` | `submit(repo)` |
| 承認待ち | `Awaiting{Entity}` | `approve(repo)` |

**骨格:** `DraftRingi(data).submit(repo) → SubmittedRingi`

📖 詳細: [command-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/command-patterns.md)

---

### 12. Repository = Aggregate Root単位
1 Aggregate Root = 1 Repository。子エンティティは親と一緒に保存。

**許容:** `save`, `findById`, `findByNaturalKey`, `delete` **禁止:** 複雑なクエリ・検索

**骨格:** `interface RingiRepository { save(ringi): void }`

📖 詳細: [command-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/command-patterns.md)

---

### 13. ディレクトリは概念ベース
**Screaming Architecture:** ディレクトリを見れば「何のシステムか」が分かるようにせよ。

```
❌ Bad: domain/, infrastructure/
✅ Good: expense-reports/, approvals/, employees/
```

**禁止:** `common/`, `shared/`, `utils/`

**骨格:** `src/expense-reports/DraftExpenseReport.ts`

📖 詳細: [language-guides.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/language-guides.md)

---

### 14. テスト命名: 仕様書として機能
テスト名が「何を検証しているか」を明確に伝えよ。

| テスト種別 | パターン |
|-----------|---------|
| 単体 | `{Subject} は {input} に対して {output} を返すべき` |
| 結合 | `{A} を {action} すると {result} として記録されるべき` |
| E2E | `{User} が {action} すると {observable} が表示されるべき` |

**禁止:** 「〜できるべき」、「快適に」、技術用語

**骨格:** `it("X は Y に対して Z を返すべき")`

📖 詳細: [testing-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/testing-patterns.md)

---

### 15. 外部リソース/Clockはメソッド引数
External Resource・Clock・Randomはメソッド引数で受け取れ。

| 依存種類 | 生成方針 |
|---------|---------|
| Pure Logic | コンストラクタ内生成 |
| Configured Logic | Config経由で内部生成 |
| **External Resource** | **メソッド引数** |
| **Non-deterministic** | **メソッド引数** |

**判断:** 外部リソース/時間/乱数に依存？ → メソッド引数 / 設定が必要？ → Config / それ以外 → コンストラクタ内

**骨格:** `draft.submit(repository, clock) → SubmittedDraft`

📖 詳細: [code-quality-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/code-quality-patterns.md)

---

## Quick Reference Checklist

コードレビュー時に使用。各項目は上記15ルールに1:1対応。

### Level 1: 絶対遵守
- [ ] **3分類**: Command/Pure/ReadModelのいずれかに分類されているか
- [ ] **完全コンストラクタ**: 生成時点で有効な状態か
- [ ] **ポリモーフィズム**: ドメイン層でswitch/if-else分岐していないか
- [ ] **イミュータブル**: 変更時は新しいオブジェクトを返しているか
- [ ] **Result型**: ドメインエラーはResult<T, E>で表現されているか

### Level 2: 標準遵守
- [ ] **Early Return**: else句なしでガード節を使っているか
- [ ] **引数1-2個**: 3つ以上はParameter Objectにまとめているか
- [ ] **名前付き戻り値**: 生タプルではなく名前付き型を使っているか
- [ ] **Primitive Obsession回避**: プリミティブを専用型で包んでいるか
- [ ] **Interface優先**: Interface + 実装で表現し、継承を避けているか
- [ ] **Pending Object Pattern**: 状態遷移を型で表現しているか
- [ ] **Repository設計**: Aggregate Root単位のRepositoryか
- [ ] **概念ベースディレクトリ**: テクニカルレイヤーではなく機能で分けているか
- [ ] **テスト命名**: テスト名が仕様書として機能しているか
- [ ] **依存注入**: External Resource/Clockはメソッド引数で受け取っているか

---

## 参照ドキュメント（GitHub）

詳細なパターンと実装例は以下のGitHubリポジトリで参照できます：

- 📖 [command-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/command-patterns.md) - Command/Pure/ReadModel、Pending Object Pattern、Repository設計
- 📖 [error-handling.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/error-handling.md) - Result型、DomainError/InfrastructureError、境界層でのエラーハンドリング
- 📖 [testing-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/testing-patterns.md) - テスト戦略、命名規則、Test Data Factory、テストダブル
- 📖 [code-quality-patterns.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/code-quality-patterns.md) - 完全コンストラクタ、イミュータビリティ、引数/戻り値
- 📖 [language-guides.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/skills/language-guides.md) - 言語別緩和ルール（Go/Rust等）、フレームワーク別ガイダンス、ディレクトリ構造
- 📖 [WHY.md](https://github.com/NAM-MAN/strict-refactoring-plugin/blob/main/docs/WHY.md) - 各ルールの「なぜ」を解説

> **Generate CLAUDE.md** はプロジェクトに応じて上記のパターンファイルを自動選択・参照します。
