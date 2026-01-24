---
name: strict-refactoring
description: コード修正、リファクタリング、設計相談を受けた際に使用。Command/Query分類、完全コンストラクタ、ポリモーフィズムを適用する。
---

# Strict Refactoring Skill

## 対象言語

OOP を主軸とし、部分的に関数型の考えを導入している言語:
- Java, Kotlin, Scala
- C#, F#
- TypeScript, JavaScript
- Python
- Swift
- Go
- Rust

**純粋関数型言語（Haskell, Elixir, Clojure等）は対象外。**

### 言語別の適用度合い

| 言語 | 適用度 | 注意点 |
|------|--------|--------|
| Java/Kotlin/C# | 高 | 本スキルに最も適合 |
| TypeScript/Python | 高 | 型チェッカー（mypy等）の導入を推奨 |
| Swift | 高 | struct優先 |
| Go | 中 | 下記「Go での緩和ルール」参照 |
| Rust | 中 | 所有権システムとの兼ね合いで柔軟に適用。match式は許容 |

### Go での緩和ルール

Go はシンプルさを重視する文化を持つ。以下のルールを緩和せよ:

| 本スキルのルール | Go での扱い |
|------------------|-------------|
| 条件式の変数抽出 | `if err != nil` は抽出不要。そのまま書いてよい |
| interface 優先 | 先行定義不要。2つ以上の実装が必要になった時点で抽出せよ |
| 小さな struct 分割 | 過度な分割より、明快な関数を優先してよい |
| ドットチェーン制限 | receiver methods のチェーンは許容 |
| Polymorphism | 単純な type switch は許容（interface が過剰な場合） |
| Command/Query 分類 | struct + receiver method で表現。Pending Object Pattern は適用 |

#### Go での Command/Query 実装例

```go
// Command: Pending Object Pattern
type PendingReservation struct {
    data ReservationData
}

func NewPendingReservation(data ReservationData) (*PendingReservation, error) {
    if data.CustomerID == "" {
        return nil, errors.New("customer_id is required")
    }
    return &PendingReservation{data: data}, nil
}

func (p *PendingReservation) Confirm(store ReservationStore) (*Reservation, error) {
    reservation := NewReservation(p.data)
    if err := store.Save(reservation); err != nil {
        return nil, err
    }
    return reservation, nil
}

// Query: struct + receiver method
type TaxOn struct {
    purchase Money
    rate     TaxRate
}

func NewTaxOn(purchase Money, rate TaxRate) TaxOn {
    return TaxOn{purchase: purchase, rate: rate}
}

func (t TaxOn) Amount() Money {
    return t.purchase.Multiply(t.rate.Value())
}
```

### 言語間の構文対応表

本スキルの例は TypeScript で記述。他言語での対応は以下を参照:

| 概念 | TypeScript | Python | Rust |
|------|------------|--------|------|
| Interface | `interface Foo { }` | `class Foo(Protocol):` | `trait Foo { }` |
| 実装 | `class Bar implements Foo` | `class Bar:` (duck typing) | `impl Foo for Bar` |
| Immutable Config | `interface { readonly x: T }` | `@dataclass(frozen=True)` | `struct { x: T }` |
| Null許容 | `T \| null` | `T \| None` | `Option<T>` |
| 非同期 | `async/await`, `Promise<T>` | `async/await`, `Awaitable[T]` | `async/await`, `Future<T>` |
| private field | `private readonly x` | `self._x` (convention) | `x` (private by default) |
| 定数 | `private static readonly X` | `_X = ...` (class level) | `const X: T = ...` |

## 大原則

1. **4分類に従え**: すべてのクラスは **Command / Transition / Query / ReadModel** のいずれかに分類せよ
2. **完全コンストラクタ**: オブジェクトは生成時点で完全に有効な状態にせよ
3. **ポリモーフィズム**: 複数ロジックは Interface + 実装クラスで表現せよ（enum + switch 禁止）
4. **イミュータブル優先**: 状態変更は最小限に、変更時は新しいオブジェクトを返す
5. **本スキルのルールを優先**: Fレームワークが構文レベルで強制する場合のみ例外を許容

### イミュータビリティの実現

TypeScript の `readonly` は**浅い**イミュータビリティ。ネストしたオブジェクトは保護されない。

```typescript
// ⚠️ 浅いイミュータビリティ: nested.value は変更可能
interface Config {
  readonly nested: { value: number };
}

const config: Config = { nested: { value: 1 } };
config.nested.value = 2; // ← 変更できてしまう！
```

#### 深いイミュータビリティの実現方法

| 方法 | 適用場面 |
|------|---------|
| ネストも readonly | 単純な構造 |
| `Readonly<T>` 再帰適用 | 型レベルで強制 |
| `Object.freeze()` | ランタイムで強制 |
| イミュータブルライブラリ | 大規模データ（Immer等） |

```typescript
// ✅ 深いイミュータビリティ: 再帰的 Readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

interface RingiData {
  title: string;
  applicant: { name: string; department: string };
}

type ImmutableRingiData = DeepReadonly<RingiData>;
// applicant.name も readonly になる
```

```typescript
// ✅ クラスでの実現: 変更メソッドは新しいインスタンスを返す
class Ringi {
  constructor(
    readonly id: RingiId,
    readonly title: string,
    readonly amount: Money,
    readonly status: RingiStatus
  ) {}

  approve(): Ringi {
    // 自分自身を変更せず、新しいインスタンスを返す
    return new Ringi(this.id, this.title, this.amount, RingiStatus.APPROVED);
  }

  withAmount(newAmount: Money): Ringi {
    return new Ringi(this.id, this.title, newAmount, this.status);
  }
}
```

## 1. クラス分類: Command / Transition / Query / ReadModel

すべてのクラスは以下の4つに**排他的に**分類される。

| 分類 | 定義 | 副作用 | 外部リソース | 主な用途 |
|------|------|:------:|:------:|---------|
| **Command** | 永続状態を変更する、または外部システムに作用する | あり | メソッド引数 | 状態変更の実行 |
| **Transition** | 型 A → 型 B への変換（純粋関数） | なし | なし | バリデーション、パース |
| **Query** | 値の計算・導出（純粋関数） | なし | なし | 税計算、判定 |
| **ReadModel** | 永続層から読み取り専用でデータを取得 | なし | メソッド引数 | 一覧取得、検索 |

**4分類の判断フロー:**

```
このクラスは...
├─ 永続化/外部通信を行う？
│   ├─ YES + 書き込み → Command
│   └─ YES + 読み取りのみ → ReadModel
│
└─ NO（純粋関数）
    ├─ 入力型と出力型が異なる？ → Transition
    └─ 同じ概念の別表現？ → Query
```

**Transition と Query の違い:**
- **Transition**: `UnvalidatedData` → `ValidatedData`（型が変わる）
- **Query**: `Money` → `number`（同じ「金額」の別表現）

### 1.1 Command（命令実行）

永続状態を変更する、または外部システムに作用するクラス。**必ず副作用を伴う。**

#### Pending Object Pattern

状態遷移を型で表現する。クラス名と遷移メソッド名で意味の重複を避ける。

```
{状態}{Entity}(入力データ).{遷移}(依存) → {結果Entity}
```

**State vs Identity:** Pending Object Pattern は新しいオブジェクトを生成する。同一性（Identity）は維持しない。`起案中稟議` と `申請済稟議` は別のオブジェクトである。

#### Identity の伝播

状態遷移で Identity を維持するには、ID を明示的に引き継ぐ（正規例は Section 1.1「実装例」参照）:

```typescript
// ID の引き継ぎのポイント
class DraftRingi {
  constructor(readonly id: RingiId, ...) {}  // ← ID は最初から持つ

  async submit(...): Promise<SubmittedRingi> {
    return new SubmittedRingi(this.id, ...);  // ← 同じ ID を引き継ぐ
  }
}
```

**ルール:**
1. ID は最初の状態（Draft）で生成し、全状態で引き継ぐ
2. 古いオブジェクトへの参照は使用しない
3. イベントソーシングを使う場合、各状態遷移をイベントとして記録

| 操作 | クラス名パターン | メソッド | 例 |
|------|-----------------|---------|-----|
| 作成 | `Draft{Entity}` / `Pending{Entity}` | `submit(store)` | `DraftRingi(data).submit(store)` |
| 承認 | `Awaiting{Entity}` | `approve(store)` | `AwaitingApproval(ringi).approve(store)` |
| 変更 | `{Entity}Change` | `apply(store)` | `ExpenseChange(current, diff).apply(store)` |
| 取消 | `{Entity}Cancellation` | `execute(store)` | `InvoiceCancellation(target).execute(store)` |
| 送信 | `Outgoing{Resource}` | `deliver(transport)` | `OutgoingNotification(to, message).deliver(slack)` |

**注意:** 検証（バリデーション）は Transition（1.1.1節）として分類。Command は必ず外部リソースへの副作用を伴う。

#### 状態名の選択

ドメインに応じて適切な状態名を選べ:

| ドメイン | 初期状態 | 遷移 | 最終状態 |
|---------|---------|------|---------|
| 稟議 | `DraftRingi` | `submit` | `SubmittedRingi` |
| 経費精算 | `DraftExpenseReport` | `submit` | `SubmittedExpenseReport` |
| 請求書 | `DraftInvoice` | `issue` | `IssuedInvoice` |
| 発注 | `PendingPurchaseOrder` | `place` | `PlacedPurchaseOrder` |
| 承認待ち | `AwaitingApproval` | `approve` | `ApprovedRingi` |
| 月次締め | `OpenMonth` | `close` | `ClosedMonth` |

#### 状態名の使い分け

| 状態 | 意味 | 使用場面 |
|------|------|---------|
| `Draft` | 下書き、編集中 | まだ提出されていない |
| `Pending` | 処理待ち | システムが処理を待っている |
| `Awaiting` | 承認/確認待ち | 人間のアクションを待っている |
| `Unvalidated` | 未検証 | バリデーション前のデータ |
| `Outgoing` | 送信予定 | 外部への送信前 |

#### 実装例（正規例）

以下が DraftRingi の正規実装。他のセクションの DraftRingi 例はこれを簡略化したもの。

```typescript
// 稟議: Draft → submit → Submitted（正規例）
class DraftRingi {
  private constructor(
    readonly id: RingiId,
    private readonly data: ValidatedRingiInput
  ) {}

  // 静的ファクトリ: ドメインエラーがある場合は Result を返す
  static create(
    id: RingiId,
    data: ValidatedRingiInput
  ): Result<DraftRingi, RingiAmountExceededError> {
    if (data.amount.isGreaterThan(Money.of(100_000_000))) {
      return Result.err(RingiErrors.amountExceeded(id, data.amount, Money.of(100_000_000)));
    }
    return Result.ok(new DraftRingi(id, data));
  }

  // Command: ドメインエラーがない場合は Promise<T> を返す
  // ※ InfrastructureError は throw される（境界層で catch）
  async submit(repository: RingiRepository, clock: Clock): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data, clock.now());
    await repository.save(submitted);
    return submitted;
  }
}

// 使用（境界層）
const validation = validateRingiInput(req.body);
if (!validation.ok) {
  return Response.badRequest({ errors: validation.error.violations });
}

const draftResult = DraftRingi.create(RingiId.generate(), validation.value);
if (!draftResult.ok) {
  return Response.conflict({ error: draftResult.error });
}

// ドメインエラーがないので直接 await（InfrastructureError は上位で catch）
const submitted = await draftResult.value.submit(ringiRepository, systemClock);
```

```typescript
// 経費精算: 変更申請（ドメインエラーがない場合は Promise<T> でよい）
class ExpenseReportChange {
  private constructor(
    private readonly current: ExpenseReport,
    private readonly newItems: ExpenseItem[]
  ) {}

  // 静的ファクトリ: バリデーションエラーがある場合は Result を返す
  static create(
    current: ExpenseReport,
    newItems: ExpenseItem[]
  ): Result<ExpenseReportChange, ValidationError> {
    if (newItems.length === 0) {
      return Result.err(DomainErrors.validation([
        new ValidationViolation('items', 'REQUIRED', '経費明細は1件以上必要です')
      ]));
    }
    return Result.ok(new ExpenseReportChange(current, newItems));
  }

  // Command: ドメインエラーがないので Promise<T> を返す
  async apply(repository: ExpenseReportRepository): Promise<ExpenseReport> {
    const updated = this.current.withItems(this.newItems);
    await repository.save(updated); // InfrastructureError は throw される
    return updated;
  }
}

// 使用
const changeResult = ExpenseReportChange.create(report, newItems);
if (!changeResult.ok) {
  return Response.badRequest({ error: changeResult.error });
}
const updated = await changeResult.value.apply(repository);
```

#### 永続化の命名規則

| パターン | 使用する名前 | 非推奨 |
|---------|-------------|--------|
| 永続化 | `{Entity}Repository` | `{Entity}Store`, `{Entity}Dao` |
| 外部通信 | `{Service}Gateway` | `{Service}Client`, `{Service}Transport` |

**Repository を使用する理由:**
- 業界標準のパターン名（Spring Data Repository, TypeORM Repository 等）
- フレームワークとの整合性が高い
- 「Store」は Redux 等の状態管理と混同しやすい

```typescript
// ✅ 推奨
interface RingiRepository {
  save(ringi: Ringi): Promise<void>;
  findById(id: RingiId): Promise<Ringi | null>;
}

// ❌ 非推奨（既存コードベースでのみ許容）
interface RingiStore { ... }
```

**レガシーコードベースでの移行:**
既存コードが `Store` を使用している場合、新規コードでも `Store` を継続してよい。ただし、大規模リファクタリング時に `Repository` への統一を検討せよ。

#### Repository 設計指針

Repository は Interface で定義し、最小限のメソッドに絞れ。

```typescript
// Repository Interface
interface RingiRepository {
  save(ringi: Ringi): Promise<void>;
  findById(id: RingiId): Promise<Ringi | null>;
}

// 実装（技術詳細を隠蔽）
class PostgresRingiRepository implements RingiRepository {
  constructor(private readonly conn: DatabaseConnection) {}

  async save(ringi: Ringi): Promise<void> {
    await this.conn.execute(/* ... */);
  }

  async findById(id: RingiId): Promise<Ringi | null> {
    const row = await this.conn.queryOne(/* ... */);
    return row ? Ringi.fromRow(row) : null;
  }
}
```

**Repository 設計の原則:**

| 原則 | 説明 |
|------|------|
| Interface で定義 | テスト時に InMemory 実装に差し替え可能にする |
| Aggregate Root 単位 | 1 Repository = 1 Aggregate Root（下記参照） |
| 単一キー検索に絞る | 複雑なクエリは ReadModel に分離 |
| ドメインオブジェクトを返す | 生のデータ（Row, Record）を返さない |

#### Repository に許容するメソッド

| メソッド | 許容 | 理由 |
|---------|:----:|------|
| `save(entity)` | ✅ | 永続化の基本操作 |
| `findById(id)` | ✅ | 単一キーでの取得 |
| `findByNaturalKey(key)` | ✅ | 自然キー（社員番号等）での取得 |
| `delete(id)` | ✅ | 削除の基本操作 |
| `findByStatus(status)` | ⚠️ | 件数が少なければ許容 |
| `findByCustomerAndDateRange(...)` | ❌ | ReadModel に分離 |
| `searchByKeyword(keyword)` | ❌ | ReadModel に分離 |

**判断基準:** 検索条件が2つ以上、または結果が複数件になる可能性が高い場合は ReadModel に分離。

#### Aggregate Root と Repository の関係

```
Aggregate Root = 整合性の境界を持つエンティティの集合のルート

稟議 Aggregate:
┌─────────────────────────────┐
│ Ringi (Aggregate Root)      │  ← RingiRepository で永続化
│   ├── ApprovalStep[]        │  ← Ringi と一緒に保存
│   └── Attachment[]          │  ← Ringi と一緒に保存
└─────────────────────────────┘

経費精算 Aggregate:
┌─────────────────────────────────┐
│ ExpenseReport (Aggregate Root)  │  ← ExpenseReportRepository で永続化
│   └── ExpenseItem[]             │  ← ExpenseReport と一緒に保存
└─────────────────────────────────┘
```

**ルール:**
- Repository は Aggregate Root に対してのみ作成
- 子エンティティ（ApprovalStep, ExpenseItem）は親と一緒に保存
- 子エンティティ単体の Repository は作らない

### 1.1.1 Transition（状態遷移）

状態遷移を型で表現するクラス。**副作用なし、純粋関数。**

CQS の定義上は Query に分類されるが、「状態の変換」という意図を明示するため別カテゴリとして扱う。

#### Query との違い

| 観点 | Transition | Query |
|------|-----------|-------|
| 意図 | 状態 A → 状態 B への変換 | 値の計算・導出 |
| 入出力 | 型が変わる（UnvalidatedExpense → ValidatedExpense） | 同じ概念の別表現（Money → string） |
| 命名 | `Unvalidated{Entity}`, `Raw{Entity}` | `{計算内容}` |
| メソッド | `validate()`, `parse()`, `normalize()` | `amount()`, `count()`, `ok()` |

#### パターン

```
{状態}{Entity}(入力データ).{遷移}(依存) → {変換後Entity}
```

| 操作 | クラス名パターン | メソッド | 例 |
|------|-----------------|---------|-----|
| 検証 | `Unvalidated{Entity}` | `validate(rules)` | `UnvalidatedExpense(data).validate(rules)` |
| パース | `Raw{Entity}` | `parse()` | `RawCsvRow(line).parse()` |
| 正規化 | `Denormalized{Entity}` | `normalize()` | `DenormalizedAddress(input).normalize()` |

#### 実装例

```typescript
// 検証: Unvalidated → validate → Validated（Result を返す）
class UnvalidatedExpense {
  constructor(private readonly data: ExpenseData) {}

  validate(rules: ExpenseRules): Result<ValidatedExpense, ValidationError> {
    const errors = rules.check(this.data);
    if (errors.length > 0) {
      return Result.err(DomainErrors.validation(errors));
    }
    return Result.ok(new ValidatedExpense(this.data));
  }
}

// 使用
const result = new UnvalidatedExpense(data).validate(companyRules);
if (!result.ok) {
  return Response.badRequest({ errors: result.error.violations });
}
const validated = result.value;
```

```typescript
// パース: RawCsvRow → parse → ParsedTransaction
class RawCsvRow {
  constructor(private readonly line: string) {}

  parse(): ParsedTransaction {
    const [date, amount, description] = this.line.split(',');
    return new ParsedTransaction(
      LocalDate.parse(date),
      Money.of(Number(amount)),
      description.trim()
    );
  }
}

// 使用
const transaction = new RawCsvRow("2025-01-25,10000,交通費").parse();
```

**注意:** Transition は副作用がないため、テストが容易。モック不要で単体テスト可能。

### 1.2 Query（問い合わせ）

入力から出力を導出するクラス。**純粋計算のみ、外部リソースなし。**

#### パターン

```
{計算内容}(入力).{出力メソッド}()
```

#### 出力の意味別メソッド名

メソッド名は「出力の型」ではなく「出力の意味」で選択せよ。

| 意味 | メソッド名 | 返す型 | 例 |
|------|----------|--------|-----|
| 金額を問う | `amount()` | Money | `消費税(税抜金額).amount()` |
| 数量を問う | `count()` / `quantity()` | int | `未承認件数(稟議一覧).count()` |
| 割合を問う | `rate()` / `ratio()` | Decimal | `承認率(部署).rate()` |
| 適合判定 | `ok()` / `satisfied()` | bool | `経費規定適合(経費).ok()` |
| 表示用変換 | `text()` / `formatted()` | str | `金額表示(money).text()` |
| 型変換 | `result()` | 変換先の型 | `請求書From(受注).result(clock)` |
| 解決/選択 | `resolve()` | Strategy等 | `承認ルート解決(申請種別).resolve()` |

**判断基準:**
- ドメイン的に「金額」を問う Query → `amount()`
- ドメイン的に「数量」を問う Query → `count()`
- 型変換として別オブジェクトを生成 → `result()`
- Strategy/Policy を選択 → `resolve()`

#### 実装例

```typescript
// 消費税計算
class ConsumptionTaxOn {
  private static readonly RATE = 0.10;

  constructor(private readonly subtotal: Money) {}

  amount(): Money {
    return this.subtotal.multiply(ConsumptionTaxOn.RATE);
  }
}

// 使用
const tax = new ConsumptionTaxOn(subtotal).amount();
```

```typescript
// 経費規定チェック
class ExpensePolicyCompliance {
  constructor(
    private readonly expense: Expense,
    private readonly policy: ExpensePolicy
  ) {}

  ok(): boolean {
    return (
      this.expense.amount.isLessThanOrEqual(this.policy.maxAmount) &&
      this.policy.allowedCategories.includes(this.expense.category)
    );
  }
}

// 使用
if (new ExpensePolicyCompliance(expense, companyPolicy).ok()) {
  // 規定内
}
```

```typescript
// 条件判定 + 値（役職別承認限度額）
class ApprovalLimit {
  private static readonly LIMITS: Record<Role, Money> = {
    [Role.MANAGER]: Money.of(100_000),
    [Role.DIRECTOR]: Money.of(500_000),
    [Role.EXECUTIVE]: Money.of(10_000_000),
  };

  constructor(private readonly approver: Employee) {}

  amount(): Money {
    return ApprovalLimit.LIMITS[this.approver.role] ?? Money.ZERO;
  }

  canApprove(ringiAmount: Money): boolean {
    return ringiAmount.isLessThanOrEqual(this.amount());
  }
}

// 使用
const limit = new ApprovalLimit(manager);
if (limit.canApprove(ringi.amount)) {
  // 承認可能
}
```

```typescript
// 型変換（請求書生成）
class InvoiceFromOrder {
  constructor(private readonly order: Order) {}

  result(clock: Clock): Invoice {
    return new Invoice({
      orderNumber: this.order.number,
      items: this.order.items,
      total: this.order.total,
      issuedAt: clock.now(),
    });
  }
}

// 使用
const invoice = new InvoiceFromOrder(order).result(systemClock);
```

```typescript
// 表示用変換
class MoneyDisplay {
  constructor(private readonly money: Money) {}

  text(): string {
    return `¥${this.money.amount.toLocaleString()}`;
  }
}

// 使用
const label = new MoneyDisplay(total).text(); // "¥1,234,567"
```

### 1.3 ReadModel（読み取りモデル）

永続層からデータを読み取るクラス。**読み取り専用、書き込みなし。**

#### パターン

```
{取得内容}(検索条件).fetch(conn): Promise<{結果}>
```

#### Query との違い

| 観点 | Query | ReadModel |
|------|-------|-----------|
| 外部リソース | なし | DB接続等を受け取る |
| 副作用 | なし | なし（読み取りのみ） |
| テスト方法 | モック不要 | DB接続をモック |
| 用途 | 純粋計算 | 一覧取得、検索、集計 |

#### 実装例

```typescript
// 承認待ち稟議一覧（特定承認者向け）
class PendingRingisForApprover {
  constructor(private readonly approverId: EmployeeId) {}

  async fetch(conn: DatabaseConnection): Promise<RingiSummary[]> {
    const rows = await conn.query(`
      SELECT r.id, r.title, r.amount, r.applicant_name, r.submitted_at
      FROM ringis r
      JOIN approval_steps s ON r.id = s.ringi_id
      WHERE s.approver_id = ? AND s.status = 'pending'
      ORDER BY r.submitted_at
    `, [this.approverId.value]);

    return rows.map(row => new RingiSummary(row));
  }
}

// 使用
const pendings = await new PendingRingisForApprover(myId).fetch(conn);
```

```typescript
// 月次経費集計
class MonthlyExpenseSummary {
  constructor(
    private readonly department: Department,
    private readonly month: YearMonth
  ) {}

  async fetch(conn: DatabaseConnection): Promise<ExpenseAggregate> {
    const row = await conn.queryOne(`
      SELECT 
        SUM(amount) as total,
        COUNT(*) as count,
        category,
        SUM(amount) as category_total
      FROM expenses
      WHERE department_id = ? 
        AND year_month = ?
        AND status = 'approved'
      GROUP BY category
    `, [this.department.id.value, this.month.value]);

    return new ExpenseAggregate(row);
  }
}

// 使用
const summary = await new MonthlyExpenseSummary(salesDept, YearMonth.of(2025, 1)).fetch(conn);
```

```typescript
// 検索（キーワード検索など）
class RingiSearch {
  constructor(private readonly criteria: RingiSearchCriteria) {}

  async fetch(conn: DatabaseConnection): Promise<RingiSearchResult[]> {
    // 複雑な検索ロジック
    const query = this.buildQuery();
    const rows = await conn.query(query, this.criteria.params());
    return rows.map(row => new RingiSearchResult(row));
  }

  private buildQuery(): string {
    // 動的クエリ構築
  }
}

// 使用
const results = await new RingiSearch({ keyword: "備品", status: "approved" }).fetch(conn);
```

### 1.4 ポリモーフィズムによる分岐排除

複数のロジックバリエーションがある場合、**Interface + 実装クラス**で表現せよ。

#### 禁止: enum + switch

```typescript
// ❌ 禁止: enum + switch でビジネスロジック
class ApprovalProcessor {
  process(ringi: Ringi, approverRole: Role): void {
    switch (approverRole) {
      case Role.MANAGER:
        // 課長の承認ロジック...
        break;
      case Role.DIRECTOR:
        // 部長の承認ロジック...
        break;
    }
  }
}
```

#### 必須: Interface + 実装クラス

```typescript
// ✅ 必須: Interface + 実装クラス
interface ApprovalRule {
  canApprove(ringi: Ringi): boolean;
  maxAmount(): Money;
}

class ManagerApprovalRule implements ApprovalRule {
  private static readonly MAX = Money.of(100_000);

  canApprove(ringi: Ringi): boolean {
    return ringi.amount.isLessThanOrEqual(ManagerApprovalRule.MAX);
  }

  maxAmount(): Money {
    return ManagerApprovalRule.MAX;
  }
}

class DirectorApprovalRule implements ApprovalRule {
  private static readonly MAX = Money.of(500_000);

  canApprove(ringi: Ringi): boolean {
    return ringi.amount.isLessThanOrEqual(DirectorApprovalRule.MAX);
  }

  maxAmount(): Money {
    return DirectorApprovalRule.MAX;
  }
}

// 使用
const rule: ApprovalRule = new ManagerApprovalRule();
if (rule.canApprove(ringi)) {
  // 承認可能
}
```

#### Strategy パターン = Query + ポリモーフィズム

Strategy パターンは「差し替え可能な Query」として実装される:

```typescript
// 承認ルート戦略（稟議の種類や金額で異なるルートを選択）
interface ApprovalRouteStrategy {
  nextApprovers(ringi: Ringi): Employee[];
}

// 通常ルート: 課長 → 部長
class StandardApprovalRoute implements ApprovalRouteStrategy {
  nextApprovers(ringi: Ringi): Employee[] {
    return [ringi.applicant.manager, ringi.applicant.director];
  }
}

// 高額ルート: 課長 → 部長 → 経営会議
class HighValueApprovalRoute implements ApprovalRouteStrategy {
  nextApprovers(ringi: Ringi): Employee[] {
    return [
      ringi.applicant.manager,
      ringi.applicant.director,
      ...this.executiveCommittee(),
    ];
  }

  private executiveCommittee(): Employee[] {
    // 経営会議メンバー取得
  }
}

// 緊急ルート: 直属上長のみ
class UrgentApprovalRoute implements ApprovalRouteStrategy {
  nextApprovers(ringi: Ringi): Employee[] {
    return [ringi.applicant.manager];
  }
}
```

### 1.5 Resolver（解決クラス）

Resolver は **Factory パターンの一種** として、条件に基づいて Strategy や実装を選択する。

**注意:** Resolver は Command / Transition / Query / ReadModel の4分類には属さない。境界層専用のユーティリティパターンである。

#### Resolver の位置づけ

| 観点 | 説明 |
|------|------|
| **分類** | Factory（4分類外、境界層専用） |
| **配置** | **境界層**（Controller, UseCase, Handler から呼び出す） |
| **役割** | 条件に基づいて適切な Strategy/実装を選択 |
| **副作用** | なし（インスタンス生成のみ） |

**Query との違い:**
- Query: 値を計算して返す（`amount()`, `count()`）
- Resolver: オブジェクトを生成して返す（`resolve()` → Strategy インスタンス）

**switch の許容:**
Resolver 内の `switch` は「実装の選択」であり、ビジネスロジックの分岐ではない。ただし、switch 内でビジネスロジックを書いてはならない。

```typescript
// 承認ルート Resolver: 稟議の属性に基づいてルートを選択
class ApprovalRouteResolver {
  private static readonly HIGH_VALUE_THRESHOLD = Money.of(1_000_000);

  constructor(private readonly ringi: Ringi) {}

  resolve(): ApprovalRouteStrategy {
    // 緊急フラグ
    if (this.ringi.isUrgent) {
      return new UrgentApprovalRoute();
    }
    // 高額稟議
    if (this.ringi.amount.isGreaterThan(ApprovalRouteResolver.HIGH_VALUE_THRESHOLD)) {
      return new HighValueApprovalRoute();
    }
    // 通常
    return new StandardApprovalRoute();
  }
}

// 使用（境界層で Strategy を選択し、ドメイン層に渡す）
const route = new ApprovalRouteResolver(ringi).resolve();
const approvers = route.nextApprovers(ringi);
```

```typescript
// 経費精算ルール Resolver: 経費カテゴリに基づいてルールを選択
class ExpenseRuleResolver {
  constructor(private readonly expense: Expense) {}

  resolve(): ExpenseRule {
    switch (this.expense.category) {
      case ExpenseCategory.TRAVEL:
        return new TravelExpenseRule();
      case ExpenseCategory.ENTERTAINMENT:
        return new EntertainmentExpenseRule();
      case ExpenseCategory.EQUIPMENT:
        return new EquipmentExpenseRule();
      default:
        return new GeneralExpenseRule();
    }
  }
}
```

**Resolver のルール:**
- **メソッド名**: `resolve()`
- **戻り値**: Strategy や Policy などの Interface 実装
- **switch の許容**: 実装選択の switch は許容。ただし分岐内でビジネスロジックを書かない
- **配置**: 境界層のみ。ドメイン層に Resolver を置かない

### 1.6 境界層での条件分岐（許容）

#### 層の定義と責務

本スキルでは3層を定義する。Clean Architecture の4層ではなく、実用的な3層構成を採用。

| 層 | 責務 | 例 |
|---|------|-----|
| **境界層** | 外部世界との接点（HTTP, DB, Queue）| Controller, Handler, RepositoryImpl |
| **アプリケーション層** | ユースケースの調整（トランザクション、複数 Aggregate の協調） | UseCase, ApplicationService |
| **ドメイン層** | ビジネスルール、状態遷移 | Entity, ValueObject, DomainService |

#### Command（Pending Object）の配置: ドメイン層

**重要:** `DraftRingi.submit()` のような Command はドメイン層に属する。Repository を引数で受け取ることは、ドメイン層がインフラ層に依存することを意味しない。

```
┌─────────────────────────────────────────────────────────┐
│ 境界層                                                   │
│   Controller / Handler                                  │
│     ↓ 呼び出し                                          │
├─────────────────────────────────────────────────────────┤
│ アプリケーション層（省略可能）                            │
│   UseCase（複数 Aggregate の協調が必要な場合）            │
│     ↓ 呼び出し                                          │
├─────────────────────────────────────────────────────────┤
│ ドメイン層                                               │
│   DraftRingi.submit(repository, clock)                  │
│     ↓ 依存                                              │
│   RingiRepository（Interface）← ドメイン層で定義        │
├─────────────────────────────────────────────────────────┤
│ インフラ層                                               │
│   PostgresRingiRepository implements RingiRepository    │
└─────────────────────────────────────────────────────────┘
```

**なぜ Command がドメイン層か:**
1. **依存性逆転原則**: Repository は Interface としてドメイン層で定義。実装はインフラ層
2. **状態遷移はビジネスルール**: `Draft → Submitted` の遷移条件はドメイン知識
3. **テスト容易性**: InMemoryRepository を渡せば単体テスト可能

#### アプリケーション層が必要な場合

| ケース | アプリケーション層 | 理由 |
|--------|:----------------:|------|
| 単一 Aggregate の操作 | 不要 | Controller → Command で十分 |
| 複数 Aggregate の協調 | **必要** | トランザクション境界の管理 |
| 外部サービス連携 | **必要** | Saga パターン等の調整 |

```typescript
// アプリケーション層が不要な場合（単一 Aggregate）
// Controller から直接 Command を呼ぶ
async function submitRingiHandler(req: Request): Promise<Response> {
  const draft = DraftRingi.create(...);
  const submitted = await draft.value.submit(repository, clock);
  return Response.created({ id: submitted.id.value });
}

// アプリケーション層が必要な場合（複数 Aggregate の協調）
class ApproveRingiUseCase {
  async execute(ringiId: RingiId, approverId: EmployeeId): Promise<Result<ApprovedRingi, ApprovalError>> {
    // トランザクション開始
    const ringi = await this.ringiRepository.findById(ringiId);
    const approver = await this.employeeRepository.findById(approverId);
    
    // 複数 Aggregate の協調
    const result = await ringi.approve(approver, this.ringiRepository);
    if (!result.ok) return result;
    
    // 通知（別 Aggregate）
    await this.notificationService.notifyApproval(result.value);
    
    return result;
  }
}
```

#### 境界層の定義

境界層は「外部世界とドメインロジックの接点」である。

| 層 | 役割 | ファイル名パターン |
|---|------|-------------------|
| **境界層** | 外部世界との接点 | `*Controller.ts`, `*Handler.ts`, `*Mapper.ts`, `*RepositoryImpl.ts`, `*Gateway.ts`, `*Resolver.ts` |
| **ドメイン層** | ビジネスロジック | `Draft*.ts`, `*Tax.ts`, `Money.ts`, `*Repository.ts`（Interface） |

**判断フロー:**

```
このクラスは...
├─ HTTP/CLI/Queue を直接扱う？ → 境界層
├─ DB/外部API と直接通信する？ → 境界層
├─ JSON/Row など外部形式を扱う？ → 境界層
└─ 上記すべて NO → ドメイン層
```

#### 境界層で許容される条件分岐

| 場所 | 例 | 理由 |
|------|-----|------|
| Controller | HTTPメソッドによる分岐 | フレームワークの制約 |
| Mapper | JSON値 → enum変換 | 外部形式の吸収 |
| Resolver | Strategy選択 | 条件に基づく実装の選択 |
| Store実装 | DB行 → Entity変換 | 技術詳細の隠蔽 |

```typescript
// ✅ OK: 境界層での分岐（Mapper）
class RingiStatusMapper {
  static fromString(value: string): RingiStatus {
    switch (value) {
      case "draft": return RingiStatus.DRAFT;
      case "submitted": return RingiStatus.SUBMITTED;
      case "approved": return RingiStatus.APPROVED;
      default: throw new Error(`Unknown status: ${value}`);
    }
  }
}

// ❌ NG: ドメイン層での分岐
class RingiProcessor {
  process(ringi: Ringi): void {
    switch (ringi.status) {
      case RingiStatus.DRAFT:
        // ビジネスロジック... ← 禁止
        break;
    }
  }
}
```

**ルール:** 境界層の分岐内では「変換」のみ行い、ビジネスロジックを書かない。

### 1.7 enum と switch の使用ルール

#### switch 許容/禁止の判断基準

| 場所 | switch 内の処理 | 可否 | 例 |
|------|---------------|:----:|-----|
| **境界層** | インスタンス生成（`return new XxxRule()`） | ✅ | Resolver |
| **境界層** | 値の変換（`return Status.ACTIVE`） | ✅ | Mapper |
| **ドメイン層** | 計算/判定ロジック | ❌ | 禁止 |
| **どこでも** | 2行以上のビジネスロジック | ❌ | 禁止 |

**判断フロー:**

```
switch を書こうとしている...
├─ 境界層のファイルか？
│   ├─ YES → 各 case は「インスタンス生成」または「値の変換」のみか？
│   │   ├─ YES → ✅ 許容
│   │   └─ NO → ❌ 禁止（ビジネスロジックを含む）
│   └─ NO → ❌ 禁止（ドメイン層での switch）
```

#### enum の使い方

| 使い方 | 可否 | 例 |
|--------|:----:|-----|
| 状態の識別子 | ✅ | `OrderStatus.CONFIRMED` |
| 単一条件での比較 | ✅ | `if (status === OrderStatus.CONFIRMED)` |
| 境界層での switch | ✅ | Resolver, Mapper |
| ドメイン層での switch | ❌ | Polymorphism を使え |

```typescript
// ✅ OK: enum を識別子として使用
enum RingiStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  APPROVED = "approved",
  REJECTED = "rejected",
}

// ✅ OK: 単一条件での比較
if (ringi.status === RingiStatus.APPROVED) {
  // 承認済みの場合の処理
}

// ❌ NG: switch で分岐してロジック実行
switch (ringi.status) {
  case RingiStatus.DRAFT:
    // 下書きのビジネスロジック... ← 禁止
    break;
  case RingiStatus.SUBMITTED:
    // 申請中のビジネスロジック... ← 禁止
    break;
}

// ✅ 代替: Polymorphism で表現
interface RingiAction {
  execute(ringi: Ringi): Promise<Ringi>;
}

class SubmitRingiAction implements RingiAction {
  async execute(ringi: Ringi): Promise<Ringi> { /* 申請処理 */ }
}

class ApproveRingiAction implements RingiAction {
  async execute(ringi: Ringi): Promise<Ringi> { /* 承認処理 */ }
}
```

### 1.8 注意事項

#### いつ適用しないか（YAGNI）

本スキルを厳格に適用すると、小さなドメインでもクラス数が爆発する。以下の場合は適用を緩和せよ:

| 状況 | 緩和 |
|------|------|
| プロトタイプ/PoC | 本スキル無視でOK。動くことを優先 |
| 分岐が2つだけで値の選択のみ | Polymorphism 不要。if/else で十分 |
| 分岐が将来増える見込みなし | Polymorphism 不要 |
| 1回しか使わない計算 | Query クラス化不要。インラインでOK |
| チーム全員が理解できない | 段階的に導入。一度に全部やらない |

#### Polymorphism の判断基準（統合版）

**このセクションが Polymorphism 判断の唯一の基準である。**

##### 判断フロー（この順序で評価せよ）

```
この分岐は...

1. 各分岐で異なる計算ロジックを持つか？
   └─ YES → Polymorphism
   └─ NO → 次へ

2. 各分岐に独立したテストケースが必要か？
   （「この分岐にテストを書くなら、別々のテストケースになるか？」）
   └─ YES → Polymorphism
   └─ NO → 次へ

3. 分岐が将来増える可能性が高いか？
   （現時点で3つ目のケースが想定できるか？）
   └─ YES → Polymorphism
   └─ NO → 次へ

4. 上記すべて NO → if/else または三項演算子
```

##### 具体的な判断表

| ケース | 判断 | 理由 |
|--------|:----:|------|
| 定数を返すだけ（`isGold ? 0.2 : 0.1`） | if/else | 計算ロジックなし |
| 会員種別ごとに割引計算式が異なる | Polymorphism | 異なる計算ロジック |
| 状態によってバリデーションルールが異なる | Polymorphism | 独立したテストが必要 |
| 国によって税率が異なる（今後増える可能性あり） | Polymorphism | 将来の拡張性 |
| 真偽値で2択を選ぶだけ | if/else | 単純な値の選択 |

##### コード例

```typescript
// ✅ if/else で十分: 値の選択のみ（計算ロジックなし）
const discount = member.isGold ? 0.2 : 0.1;

// ✅ if/else で十分: 対称的な値の返却
discountRate(): number {
  return this.member.isGold() ? 0.2 : 0.1;
}

// ✅ Polymorphism: 各分岐で異なる計算ロジック
interface MemberDiscount {
  calculate(order: Order): Money;
}

class GoldMemberDiscount implements MemberDiscount {
  calculate(order: Order): Money {
    // ゴールド会員: 基本10% + 購入額に応じた追加割引
    const base = order.subtotal.multiply(0.1);
    const bonus = order.subtotal.isGreaterThan(Money.of(10000)) 
      ? order.subtotal.multiply(0.05) 
      : Money.ZERO;
    return base.add(bonus);
  }
}

class StandardMemberDiscount implements MemberDiscount {
  calculate(order: Order): Money {
    // 一般会員: 一律5%
    return order.subtotal.multiply(0.05);
  }
}

// ❌ 過剰: 値を返すだけなのにクラス化
interface DiscountRate { rate(): number; }
class GoldRate implements DiscountRate { rate() { return 0.2; } }
class StandardRate implements DiscountRate { rate() { return 0.1; } }
```

**対称パス else との関係:** 値の選択のみなら if/else で十分。各分岐で異なる計算ロジックがある場合のみ Polymorphism を使う。

#### Pending Object Pattern のスケーラビリティ

状態数が多い場合、Pending Object Pattern はクラス爆発を招く:

| 状態数 | 推奨アプローチ |
|--------|---------------|
| 2-4 | Pending Object Pattern |
| 5-7 | Pending Object Pattern または State パターン |
| 8+ | State パターン、または状態機械ライブラリ |

**State パターンとの比較:**

| 観点 | Pending Object Pattern | State パターン |
|------|----------------------|---------------|
| 型安全性 | 高（不正な遷移がコンパイルエラー） | 中（ランタイムチェック） |
| クラス数 | 状態数 × 1 | 1 + 状態数 |
| 柔軟性 | 低（遷移の追加が大変） | 高（State クラスの追加のみ） |
| 推奨場面 | 状態が少なく、型安全性を重視 | 状態が多く、柔軟性を重視 |

#### ドットチェーンのルール

**禁止の意図:** 「他のオブジェクトの内部構造を知りすぎている」ことを防ぐ（デメテルの法則）。

| パターン | 可否 | 理由 |
|---------|:----:|------|
| `this.ringi.applicant.department.name` | ❌ | プロパティの深いアクセス |
| `builder.withTitle("x").withAmount(100).build()` | ✅ | Fluent API / Builder パターン |
| `array.filter(...).map(...).reduce(...)` | ✅ | 関数型チェーン |
| `this.ringi?.applicant?.name` | ✅ | Optional chaining（null 安全） |

```typescript
// ❌ Bad: プロパティの深いアクセス
this.ringi.applicant.department.name

// ✅ Good: メソッドで隠蔽
this.ringi.applicantDepartmentName()

// ✅ OK: Fluent API
const ringi = RingiBuilder.create()
  .withTitle("備品購入")
  .withAmount(Money.of(50000))
  .build();

// ✅ OK: 関数型チェーン
const total = items
  .filter(item => item.isApproved)
  .map(item => item.amount)
  .reduce((sum, amount) => sum.add(amount), Money.ZERO);
```

#### 行数の目安

**目安:** 10行以内を目指すが、以下の場合は超過を許容:

| 許容ケース | 理由 |
|-----------|------|
| 複数のガード節（Early Return）がある | 安全性のため |
| 完全コンストラクタのバリデーションが多い | 不変条件の保証 |
| 分割すると逆に可読性が下がる | 実用性優先 |

**真の基準:** 「このメソッドは**1つのこと**だけをしているか？」

Command/Query/Transition の分類に従えば自然と短くなる。行数より「単一責任」を重視せよ。

#### 行数 vs 引数のトレードオフ

| 優先 | 理由 |
|------|------|
| **引数を減らす** > 行数を減らす | 引数が多いとテストが困難になる |

```typescript
// ❌ Bad: 引数が多い（引数 vs 行数のトレードオフの例）
function createReservation(
  customerId: string,
  date: Date,
  time: string,
  partySize: number,
  notes: string
): Reservation {
  return new Reservation({ customerId, date, time, partySize, notes });
}

// ✅ Good: Parameter Object で引数を1つに（正規例は Section 1.1 参照）
function createReservation(data: ReservationData): Reservation {
  return new Reservation(data);
}
```

## 2. 完全コンストラクタと依存生成

### 2.1 完全コンストラクタの原則

**オブジェクトは生成された時点で完全に有効な状態にせよ。**

```typescript
// ❌ Bad: 不完全な状態を許容
class Order {
  constructor(private readonly data: OrderData | null) {
    // data が null かもしれない
  }
}

// ✅ Good: 完全コンストラクタ
class Order {
  constructor(private readonly data: OrderData) {
    if (!data) throw new Error("注文データは必須です");
    if (!data.customerId) throw new Error("顧客IDは必須です");
    if (data.items.length === 0) throw new Error("商品は1つ以上必要です");
  }
}
```

**稟議の正規例:** Section 1.1「実装例（正規例）」の DraftRingi を参照。

### 2.1.1 入力バリデーションと完全コンストラクタの関係

**2フェーズアプローチ:** ユーザー入力の検証と、ドメインオブジェクトの不変条件保証は分離せよ。

| フェーズ | 目的 | エラー処理 | 実行場所 |
|---------|------|-----------|---------|
| **入力バリデーション** | ユーザー入力の形式・値チェック | Result型で複数エラー集約 | 境界層（Controller等） |
| **完全コンストラクタ** | ドメイン不変条件の保証 | 即座に例外（単一） | ドメイン層 |

#### フロー図

```
┌─────────────────────────────────────────────────────────────┐
│ 境界層（Controller / Handler）                               │
│                                                             │
│   rawInput ─→ validateRingiInput(rawInput)                  │
│                    │                                        │
│                    ▼                                        │
│              ValidationResult                               │
│                    │                                        │
│         ┌─────────┴─────────┐                               │
│         │ ok: false         │ ok: true                      │
│         ▼                   ▼                               │
│   return 400 +         ValidatedInput                       │
│   全エラー一覧               │                               │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ ドメイン層                                                   │
│                                                             │
│   new DraftRingi(id, validatedInput)                        │
│        │                                                    │
│        ▼                                                    │
│   不変条件チェック（検証済みデータ前提）                       │
│        │                                                    │
│        ▼                                                    │
│   DraftRingi インスタンス                                    │
└─────────────────────────────────────────────────────────────┘
```

#### 実装例

**正規例:** Section 1.1「実装例（正規例）」の DraftRingi を参照。ポイント:

1. **境界層**: `validateRingiInput()` で複数エラーを集約
2. **ドメイン層**: `DraftRingi` コンストラクタはドメイン不変条件のみチェック
3. **Controller**: 検証後に `new DraftRingi(id, validation.value).submit(repository, clock)`

**詳細な実装例:** Section 11.6「バリデーション結果の集約」を参照。

**なぜ分離するか:**
- 入力バリデーション: ユーザーに**全ての**問題を一度に伝えたい（UX向上）
- 完全コンストラクタ: 不変条件は**即座に**失敗すべき（プログラミングエラーの検出）

### 2.2 依存の分類と生成方針

依存オブジェクトをコンストラクタ内で生成してよいかは、依存の種類で決まる。

#### 依存の4分類

| 分類 | 定義 | 例 | 生成方針 |
|------|------|-----|---------|
| **Pure Logic** | 外部リソース不使用、決定論的 | Validator, Calculator | ✅ コンストラクタ内生成 |
| **Configured Logic** | 設定値に依存する Pure Logic | TaxCalculator(rate) | ✅ Config経由で内部生成 |
| **External Resource** | 永続化、外部通信 | Repository, Gateway, API | ❌ メソッド引数で受け取る |
| **Non-deterministic** | 時間、乱数 | Clock, RandomGenerator | ❌ メソッド引数で受け取る |

#### 判断フローチャート

```
この依存は...
├─ 外部リソース（DB, HTTP, File, Queue）にアクセスする？
│   └─ YES → メソッド引数で受け取る
│
├─ 時間/乱数に依存する？
│   └─ YES → メソッド引数で受け取る
│
├─ 設定値が必要？
│   └─ YES → Config経由でコンストラクタ内生成
│
└─ 上記いずれでもない（Pure Logic）？
    └─ YES → コンストラクタ内で直接生成
```

### 2.3 各分類の実装例

#### Pure Logic: コンストラクタ内で生成

```typescript
class DraftExpenseReport {
  private readonly validator: ExpenseValidator;
  private readonly calculator: ExpenseTotalCalculator;

  constructor(private readonly items: ExpenseItem[]) {
    // Pure Logic: 内部で生成してよい
    this.validator = new ExpenseValidator();
    this.calculator = new ExpenseTotalCalculator();
  }
}
```

**理由:**
- 外部リソースに依存しない
- テストでモックする必要がない（Validator自体を単体テストすればよい）
- 呼び出し側が内部構造を知る必要がない

#### Configured Logic: Config経由で内部生成

```typescript
// Immutable Config（readonly で不変性を保証）
interface ExpenseConfig {
  readonly maxAmountPerItem: Money;
  readonly allowedCategories: ExpenseCategory[];
  readonly requiresReceipt: boolean;
}

class DraftExpenseReport {
  private readonly validator: ExpenseValidator;
  private readonly policyChecker: ExpensePolicyChecker;

  constructor(
    private readonly items: ExpenseItem[],
    config: ExpenseConfig
  ) {
    // Configured Logic: Config経由で内部生成
    this.validator = new ExpenseValidator();
    this.policyChecker = new ExpensePolicyChecker(config);
  }
}
```

**理由:**
- 設定は外部から受け取るが、依存の構築は内部の責務
- 呼び出し側は「設定」だけ知っていればよい
- 依存クラスの存在は実装詳細として隠蔽

#### Config の分割基準

| 基準 | 分割する | 統合する |
|------|---------|---------|
| 変更頻度 | 異なる | 同じ |
| ライフサイクル | 異なる | 同じ |
| 利用コンテキスト | 異なる | 同じ |

```typescript
// ❌ Bad: 変更頻度・ライフサイクルが異なるものを混在
interface AppConfig {
  readonly taxRate: TaxRate;           // 法改正時のみ変更
  readonly retryCount: number;         // 運用チューニングで頻繁に変更
  readonly featureFlags: FeatureFlags; // リリースごとに変更
}

// ✅ Good: 変更頻度・ライフサイクルで分割
interface TaxConfig {
  readonly rate: TaxRate;
}

interface RetryConfig {
  readonly maxCount: number;
  readonly backoffMs: number;
}

interface FeatureConfig {
  readonly flags: FeatureFlags;
}
```

**Config 分割の判断フロー:**

```
この設定値は...
├─ 他の設定値と同時に変更される？
│   └─ YES → 同じ Config に統合
│
├─ 同じコンテキスト（ドメイン/機能）で使用される？
│   └─ YES → 同じ Config に統合
│
└─ 上記いずれでもない？
    └─ 分割して独立した Config にする
```

#### External Resource: メソッド引数で受け取る

```typescript
class PendingOrder {
  private readonly validator: OrderValidator;

  constructor(
    private readonly data: OrderData,
    config: OrderConfig
  ) {
    this.validator = new OrderValidator(config.validationRules);
  }

  async confirm(store: OrderStore): Promise<Order> {
    // External Resource: メソッド引数で受け取る
    this.validator.validate(this.data);
    const order = Order.fromData(this.data);
    await store.save(order);
    return order;
  }
}
```

**理由:**
- 外部リソースはテストでモックが必要
- 環境によって実装が変わる可能性がある
- メソッド引数にすることで呼び出し側が明示的に依存を渡す

#### Non-deterministic: メソッド引数で受け取る

```typescript
class TokenGenerator {
  generate(clock: Clock, random: RandomSource): Token {
    // Non-deterministic: メソッド引数で受け取る
    const timestamp = clock.now();
    const randomPart = random.nextBytes(16);
    return new Token(timestamp, randomPart);
  }
}

// 本番
const token = generator.generate(new SystemClock(), new SecureRandom());

// テスト
const token = generator.generate(new FixedClock(knownTime), new FakeRandom(knownBytes));
```

**理由:**
- テストで再現可能な結果が必要
- 時間や乱数を固定できないとテストが不安定になる

### 2.4 テスト戦略

| 依存の種類 | テスト方法 |
|-----------|-----------|
| Pure Logic | 依存クラス自体を単体テスト。親クラスは統合テストとして扱う |
| Configured Logic | 異なる Config を渡してテスト |
| External Resource | モックを注入してテスト |
| Non-deterministic | 固定値を返すモックを注入してテスト |

#### Pure Logic のテスト

依存クラス自体を単体テストし、親クラスではモックしない。

```typescript
// ExpenseValidator の単体テスト
describe("ExpenseValidator", () => {
  it("金額が0以下の経費を拒否する", () => {
    const validator = new ExpenseValidator();
    const invalidExpense = new ExpenseItem({ amount: Money.of(-100) });
    expect(validator.isValid(invalidExpense)).toBe(false);
  });

  it("有効な経費を受け入れる", () => {
    const validator = new ExpenseValidator();
    const validExpense = new ExpenseItem({ amount: Money.of(1000), category: "交通費" });
    expect(validator.isValid(validExpense)).toBe(true);
  });
});

// DraftExpenseReport の統合テスト（Validator をモックしない）
describe("DraftExpenseReport", () => {
  it("有効な経費精算を申請できる", async () => {
    const report = await new DraftExpenseReport(validItems, config).submit(mockStore);
    expect(report.status).toBe(ExpenseStatus.SUBMITTED);
  });

  it("無効な経費を含む場合は申請を拒否する", async () => {
    await expect(
      new DraftExpenseReport(invalidItems, config).submit(mockStore)
    ).rejects.toThrow(ValidationError);
  });
});
```

#### Configured Logic のテスト

異なる設定値でテストし、設定に応じた挙動を検証。

```typescript
describe("経費精算の上限チェック", () => {
  it("1件あたり上限5万円の設定で検証", async () => {
    const config: ExpenseConfig = { maxAmountPerItem: Money.of(50_000) };
    const items = [new ExpenseItem({ amount: Money.of(30_000) })];
    
    const report = await new DraftExpenseReport(items, config).submit(mockStore);
    expect(report.status).toBe(ExpenseStatus.SUBMITTED);
  });

  it("上限を超える経費は拒否される", async () => {
    const config: ExpenseConfig = { maxAmountPerItem: Money.of(50_000) };
    const items = [new ExpenseItem({ amount: Money.of(60_000) })];
    
    await expect(
      new DraftExpenseReport(items, config).submit(mockStore)
    ).rejects.toThrow("1件あたりの上限を超えています");
  });
});
```

#### External Resource のテスト

InMemory 実装またはモックを使用。

```typescript
// InMemory Repository（テスト用）
class InMemoryRingiRepository implements RingiRepository {
  private ringis = new Map<string, Ringi>();

  async save(ringi: Ringi): Promise<void> {
    this.ringis.set(ringi.id.value, ringi);
  }

  async findById(id: RingiId): Promise<Ringi | null> {
    return this.ringis.get(id.value) ?? null;
  }
}

// テスト（正規例は Section 1.1 参照）
describe("DraftRingi", () => {
  it("申請後にRepositoryに保存される", async () => {
    const repository = new InMemoryRingiRepository();
    const clock = new FixedClock(new Date("2025-01-25"));
    const id = RingiId.generate();
    
    const ringi = await new DraftRingi(id, validData).submit(repository, clock);

    expect(await repository.findById(ringi.id)).toEqual(ringi);
  });
});
```

#### Non-deterministic のテスト

固定値を返す Fake を使用し、再現可能なテストを実現。

```typescript
// Fake Clock
class FixedClock implements Clock {
  constructor(private readonly fixedTime: Date) {}

  now(): Date {
    return this.fixedTime;
  }
}

// テスト
describe("請求書発行", () => {
  it("発行日時にClockの時刻が使用される", () => {
    const fixedTime = new Date("2025-01-31T23:59:59+09:00");
    const clock = new FixedClock(fixedTime);

    const invoice = new InvoiceFromOrder(order).result(clock);

    expect(invoice.issuedAt).toEqual(fixedTime);
  });
});
```

#### テストピラミッド

```
         /\
        /E2E\          <- 最小限（主要フロー）
       /------\
      / 統合   \       <- Command のテスト（Repository モック）
     /----------\
    /   単体     \     <- Pure Logic, Query のテスト
   /--------------\
```

| テスト種類 | 対象 | モック |
|-----------|------|--------|
| 単体 | Query, Pure Logic 依存 | なし |
| 統合 | Command | Repository, Gateway のみ |
| E2E | ユースケース全体 | なし（実環境） |

### 2.4.1 テストデータ戦略

#### 禁止事項

| 禁止 | 理由 |
|------|------|
| **静的 Fixtures** (YAML/JSON ファイル) | テスト間の結合、メンテナンス困難 |
| **共有 Seeds** (アプリ起動時投入) | 暗黙の依存、変更影響の予測困難 |
| **テスト間でのデータ共有** | 独立性の欠如 |

**例外**: 不変の参照データ（国コード、通貨コード等）は Seeds を許容。ただし、テストで変更してはならない。

#### 推奨パターン: Test Data Factory

テストデータは **Test Data Factory** パターンで作成せよ。各テストが自身のデータを作成・管理する。

```typescript
// tests/ringis/RingiTestFactory.ts
export class RingiTestFactory {
  private static readonly DEFAULTS: RingiData = {
    title: 'テスト稟議',
    amount: Money.of(10000),
    status: RingiStatus.DRAFT,
  };

  static draft(overrides?: Partial<RingiData>): DraftRingi {
    const id = RingiId.generate();
    const data = { ...RingiTestFactory.DEFAULTS, ...overrides };
    return DraftRingi.create(id, data).value;
  }

  static submitted(overrides?: Partial<RingiData>): SubmittedRingi {
    const draft = RingiTestFactory.draft(overrides);
    return draft.toSubmitted(new FixedClock(new Date()));
  }
}

// テストでの使用
it('承認できる', async () => {
  const ringi = RingiTestFactory.submitted({ amount: Money.of(50000) });
  const repository = new InMemoryRingiRepository();
  
  const result = await ringi.approve(repository);
  
  expect(result.status).toBe(RingiStatus.APPROVED);
});
```

#### Factory の設計ルール

| ルール | 説明 |
|--------|------|
| **Aggregate Root 単位** | 1 Factory = 1 Aggregate Root |
| **状態ごとにメソッド分離** | `draft()`, `submitted()`, `approved()` |
| **条件分岐禁止** | Factory 内に if/switch を書かない |
| **20行以内** | 超える場合は Aggregate が複雑すぎる |
| **明示的な依存** | 他の Factory を暗黙的に呼ばない |

```typescript
// ❌ Bad: 条件分岐を含む Factory
const createRingi = (type: 'draft' | 'submitted') => {
  if (type === 'draft') { ... }
  else { ... }
};

// ❌ Bad: 暗黙的な依存
const createRingi = async () => {
  const applicant = await EmployeeTestFactory.create(); // 暗黙的!
  return { applicantId: applicant.id, ... };
};

// ✅ Good: 状態ごとにメソッド分離、明示的な依存
class RingiTestFactory {
  static draft(overrides?) { ... }
  static submitted(overrides?) { ... }
  static withApplicant(applicant: Employee, overrides?) { ... }
}
```

#### コロケーション

Test Data Factory はテストと同じディレクトリに配置せよ（Section 8 のコロケーションルールに従う）。

```
src/
├── ringis/
│   ├── DraftRingi.ts
│   ├── DraftRingi.test.ts
│   └── RingiTestFactory.ts      ← テストと同じディレクトリ
├── expenses/
│   ├── ExpenseReport.ts
│   ├── ExpenseReport.test.ts
│   └── ExpenseTestFactory.ts
└── shared/
    └── MoneyTestFactory.ts      ← 複数ドメインで使用する場合
```

#### テストデータ戦略の優先順位

| 優先度 | 戦略 | 使用場面 |
|:------:|------|---------|
| 1 | **インラインリテラル** | 単純なテスト |
| 2 | **Test Data Factory** | 複雑なドメインオブジェクト |
| 3 | **InMemory Repository** | Command のテスト |
| 4 | **Testcontainers** | ReadModel、SQL検証 |
| 5 | ~~共有 Fixtures~~ | **使用禁止** |

```typescript
// 優先度 1: インラインリテラル（単純なテスト）
it('金額が正しく計算される', () => {
  const tax = new ConsumptionTaxOn(Money.of(1000)).amount();
  expect(tax).toEqual(Money.of(100));
});

// 優先度 2: Test Data Factory（複雑なオブジェクト）
it('承認フローが正しく動作する', async () => {
  const ringi = RingiTestFactory.submitted({ amount: Money.of(50000) });
  // ...
});

// 優先度 3: InMemory Repository（Command のテスト）
it('申請後にRepositoryに保存される', async () => {
  const repository = new InMemoryRingiRepository();
  const draft = RingiTestFactory.draft();
  await draft.submit(repository, clock);
  expect(await repository.findById(draft.id)).toBeDefined();
});

// 優先度 4: Testcontainers（ReadModel、SQL検証）
it('複雑なクエリが正しく動作する', async () => {
  const container = await PostgresTestContainer.start();
  // SQL固有の挙動を検証
});
```

#### DB統合テストのガイドライン

| クラス分類 | 推奨テスト方式 | DB必要？ |
|-----------|---------------|:--------:|
| Query | 純粋単体テスト | ❌ |
| Transition | 純粋単体テスト | ❌ |
| Command | InMemory Repository | ❌ |
| ReadModel | Testcontainers | ✅ |
| Repository実装 | Testcontainers | ✅ |

**原則**: 大半のテストは DB 不要。ReadModel と Repository 実装のテストのみ実 DB を使用。

#### テスト分離の実現

DB統合テストでは、トランザクションロールバックでテスト間の分離を実現。

```typescript
describe('RingiApproval', () => {
  let tx: Transaction;
  
  beforeEach(async () => {
    tx = await testDb.beginTransaction();
  });
  
  afterEach(async () => {
    await tx.rollback();
  });
  
  it('承認後にステータスが更新される', async () => {
    // Arrange
    const ringi = await RingiTestFactory.insertSubmitted(tx, { 
      amount: Money.of(50000) 
    });
    
    // Act
    await approveRingi(ringi.id, tx);
    
    // Assert
    const updated = await findRingi(ringi.id, tx);
    expect(updated.status).toBe(RingiStatus.APPROVED);
  });
});
```

#### InMemory Repository の必須化

**すべての Repository Interface に対応する InMemory 実装を用意せよ。**

```typescript
// Interface（ドメイン層）
interface RingiRepository {
  save(ringi: Ringi): Promise<void>;
  findById(id: RingiId): Promise<Ringi | null>;
}

// 本番実装（インフラ層）
class PostgresRingiRepository implements RingiRepository { ... }

// テスト実装（テストディレクトリ）
class InMemoryRingiRepository implements RingiRepository {
  private ringis = new Map<string, Ringi>();
  
  async save(ringi: Ringi): Promise<void> {
    this.ringis.set(ringi.id.value, ringi);
  }
  
  async findById(id: RingiId): Promise<Ringi | null> {
    return this.ringis.get(id.value) ?? null;
  }
}
```

これにより、Command のテストは DB 接続なしで実行可能になる。

### 2.5 完全な実装例

```typescript
// Immutable Config
interface ExpenseReportConfig {
  readonly maxAmountPerItem: Money;
  readonly allowedCategories: ExpenseCategory[];
  readonly requiresReceipt: boolean;
}

class DraftExpenseReport {
  private readonly calculator: ExpenseTotalCalculator;
  private readonly validator: ExpenseValidator;
  private readonly policyChecker: ExpensePolicyChecker;

  constructor(
    private readonly items: ExpenseItem[],
    private readonly applicant: Employee,
    config: ExpenseReportConfig
  ) {
    // バリデーション（完全コンストラクタ）
    if (items.length === 0) {
      throw new Error("経費明細は1件以上必要です");
    }

    // Pure Logic: 内部生成
    this.calculator = new ExpenseTotalCalculator();
    this.validator = new ExpenseValidator();

    // Configured Logic: Config経由で内部生成
    this.policyChecker = new ExpensePolicyChecker(config);
  }

  async submit(store: ExpenseReportStore, clock: Clock): Promise<SubmittedExpenseReport> {
    // Pure Logic: バリデーション
    for (const item of this.items) {
      if (!this.validator.isValid(item)) {
        throw new ValidationError("無効な経費明細があります");
      }
      if (!this.policyChecker.isCompliant(item)) {
        throw new PolicyViolationError("経費規定に違反しています");
      }
    }

    // 計算
    const total = this.calculator.calculate(this.items);

    // Entity生成
    const report = new SubmittedExpenseReport({
      items: this.items,
      applicant: this.applicant,
      total,
      submittedAt: clock.now(),
    });

    // External Resource: メソッド引数で永続化
    await store.save(report);
    return report;
  }
}

// 使用
const config: ExpenseReportConfig = {
  maxAmountPerItem: Money.of(50_000),
  allowedCategories: [ExpenseCategory.TRAVEL, ExpenseCategory.SUPPLIES],
  requiresReceipt: true,
};
const report = await new DraftExpenseReport(items, currentUser, config)
  .submit(expenseStore, systemClock);
```

## 3. Interface優先、継承禁止

**Abstract Class / 継承は使うな。** Composition over Inheritance。

| 言語 | 推奨 | 禁止 |
|------|------|------|
| Java/TS/C# | Interface + 実装クラス | abstract class, extends |
| Kotlin | Interface + data class | open class継承 |
| Python | Protocol + class | ABC継承, class継承 |
| Swift | Protocol + struct | class継承 |
| Go | interface + struct | 埋め込みによる擬似継承 |
| Rust | Trait + struct | - |

**唯一の例外:** フレームワークが継承を強制する場合（Django Model, Android Activity等）

## 4. Early Return Only

`else` 句は原則使うな。ガード節で処理せよ。

```typescript
// ❌ Bad: else句
async function processOrder(order: Order): Promise<ProcessedOrder> {
  if (order.isValid()) {
    return doProcess(order);
  } else {
    throw new ValidationError("注文データが不正です");
  }
}

// ✅ Good: ガード節
async function processOrder(order: Order): Promise<ProcessedOrder> {
  if (!order.isValid()) {
    throw new ValidationError("注文データが不正です");
  }
  return doProcess(order);
}
```

**例外:** 両パスが正常系で対称的な場合は `else` または三項演算子を許容する。

```typescript
// ✅ OK: 両パス正常系で対称的
class ApprovalLimitRate {
  private static readonly MANAGER_LIMIT = Money.of(100_000);
  private static readonly STAFF_LIMIT = Money.of(30_000);

  constructor(private readonly employee: Employee) {}

  limit(): Money {
    if (this.employee.isManager()) {
      return ApprovalLimitRate.MANAGER_LIMIT;
    } else {
      return ApprovalLimitRate.STAFF_LIMIT;
    }
  }
}
```

### 「対称的なパス」の条件

以下の**すべて**を満たす場合のみ `else` を許容:
1. 両方が正常系である（片方がエラー処理ではない）
2. 両方の処理量がほぼ同じ（1-3行程度）
3. 両方が同じ型を返す
4. 論理的に排他的な2択である

### 対称パス else と Polymorphism の境界

**判断基準（Section 1.8 より）:**

| ケース | 対応 |
|--------|------|
| 値の選択のみ（`isGold ? 0.2 : 0.1`） | 対称 else / 三項演算子 |
| 各分岐で異なる計算ロジック | Polymorphism |
| 各分岐に独立したテストケースが必要 | Polymorphism |

```typescript
// ✅ 対称 else OK: 値の選択のみ
discountRate(): number {
  return this.member.isGold() ? 0.2 : 0.1;
}

// ❌ 対称 else NG: 各分岐が異なる計算ロジックを持つ
// → GoldMemberDiscount / StandardMemberDiscount で Polymorphism
```

## 5. 条件式の明確化

### 条件の抽出ルール

| 条件 | 使用箇所 | 対応 |
|------|---------|------|
| 自明な単一条件 | どこでも | そのまま |
| 不明確な単一条件 | どこでも | `isXxx` 変数に抽出 |
| 複合条件（2条件以上）| 1箇所のみ | `isXxx` 変数に抽出 |
| 複合条件（2条件以上）| **2箇所以上** | **Query クラスに抽出** |

**判断フロー:**

```
この条件は...
├─ 自明か？（null/空/enum比較） → そのまま
├─ 単一条件か？
│   └─ YES → isXxx 変数に抽出
└─ 複合条件（2条件以上）か？
    ├─ 1箇所のみで使用 → isXxx 変数に抽出
    └─ 2箇所以上で使用 → Query クラスに抽出
```

```typescript
// ✅ OK: 自明な単一条件
if (order.status === OrderStatus.CONFIRMED) {
  // ...
}
if (!order) {
  throw new NotFoundError();
}

// ✅ Good: 意味が不明確 → 変数
const isEligible = customer.totalPurchases > DISCOUNT_THRESHOLD;
if (isEligible) {
  // ...
}

// ✅ Good: 複合条件 → Query クラス
class ShippingEligibility {
  constructor(private readonly order: Order) {}

  ok(): boolean {
    return (
      this.order.status === OrderStatus.CONFIRMED &&
      this.order.isPaid &&
      !this.order.isCancelled
    );
  }
}

if (new ShippingEligibility(order).ok()) {
  // ...
}
```

### 「自明」の定義

以下は「自明」とみなし、変数抽出不要:
- null チェック: `x === null`, `!x`
- 空チェック: `x.length === 0`, `x.isEmpty()`
- 存在チェック: `collection.includes(x)`
- enum等値比較: `status === OrderStatus.CONFIRMED`
- 単純な数値比較: `count > 0`, `age >= 18`
- 真偽値そのもの: `isActive`, `!isDeleted`

以下は「不明確」とみなし、`isXxx` 変数に抽出せよ:
- ビジネスルールを含む比較: `totalPurchases > 10000`
- 計算を含む比較: `order.total * 0.1 > shippingCost`
- ドメイン知識が必要な比較: `user.createdAt < thirtyDaysAgo`

## 6. Primitive Obsession の回避

### 値オブジェクトを作成すべき場合

以下の**いずれか**に該当すればプリミティブを専用型にせよ:

| 条件 | 例 |
|------|-----|
| 単位がある | Money, Distance, Weight, Duration |
| フォーマット制約がある | PhoneNumber, Email, PostalCode |
| 値域制約がある | Score(0-100), Quantity(正数), Percentage |
| 同じ型で意味が異なる | UserId vs OrderId（両方int） |

```typescript
// ❌ Bad: プリミティブ
function charge(amount: number, currency: string): void { /* ... */ }

// ✅ Good: 値オブジェクト
class Money {
  constructor(
    readonly amount: number,
    readonly currency: Currency
  ) {
    if (amount < 0) {
      throw new Error("amount must be non-negative");
    }
  }
}

function charge(money: Money): void { /* ... */ }
```

### マジックナンバー/文字列は名前付き定数にせよ

```typescript
// ❌ Bad
if (retryCount > 3) {
  throw new TooManyRetriesError();
}

// ✅ Good
const MAX_RETRY_COUNT = 3;

if (retryCount > MAX_RETRY_COUNT) {
  throw new TooManyRetriesError();
}
```

### 戻り値への適用

戻り値における Primitive Obsession については Section 7.1 を参照。タプル `[A, B, C]` を返すことは、引数で `(a: A, b: B, c: C)` を受け取ることと同様の問題を持つ。

## 7. Parameters: Max 1-2

引数は原則1-2個にせよ。3つ以上は Parameter Object にまとめよ。

```typescript
// ❌ Bad: 引数が多い
function createReservation(
  customerId: string,
  date: Date,
  time: string,
  partySize: number,
  notes?: string
): void { /* ... */ }

// ✅ Good: Parameter Object
interface ReservationData {
  readonly customerId: CustomerId;
  readonly date: ReservationDate;
  readonly time: ReservationTime;
  readonly partySize: PartySize;
  readonly notes?: string;
}

function createReservation(data: ReservationData): void { /* ... */ }
```

**戻り値のルール**: 引数と同様に、戻り値も複数の値を返す場合は名前付き型を使用せよ。詳細は Section 7.1 を参照。

## 7.1 Return Values: Named Over Tuples

戻り値が複数の値を含む場合、各値に名前を付けよ。生のタプルは原則禁止。

### 禁止/許容の判断表

| パターン | 可否 | 理由 |
|---------|:----:|------|
| 単一の値 (`Money`) | ✅ | 名前付け不要 |
| 同種の配列 (`Employee[]`) | ✅ | 単一概念の集合 |
| 名前付きオブジェクト (`{ start: Date, end: Date }`) | ✅ | 各値に名前あり |
| 判別共用体 (`Result<T, E>`) | ✅ | `value`/`error` で名前付き |
| 生タプル (`[Date, Date]`) | ❌ | 順序を覚える必要あり |
| 生タプル (`[Money, string, boolean]`) | ❌ | 意味が不明確 |

### 認知負荷の問題

タプルの認知負荷は要素数に対して**二次的に増加**する:

| 戻り値の型 | 覚えるべきこと |
|-----------|---------------|
| `Money` | 1（型のみ） |
| `Employee[]` | 1（配列の要素型） |
| `[A, B]` | 3（型A, 型B, 順序） |
| `[A, B, C]` | 6（型A, 型B, 型C, 順序×3） |
| `{ a: A, b: B }` | 2（プロパティ名で自己文書化） |

### 特に危険: 同じ型のタプル

```typescript
// ❌ 禁止: どちらが start でどちらが end か不明
function getDateRange(): [Date, Date]

// ✅ 必須: 名前で明確化
function getDateRange(): { start: Date; end: Date }
```

```typescript
// ❌ 禁止: 座標の順序が不明
function getPosition(): [number, number]

// ✅ 必須: 名前で明確化
function getPosition(): { x: number; y: number }
```

### 許容される例外

| 例外 | 理由 | 例 |
|------|------|-----|
| 言語イディオム | Section 0.3 で定義済み | Go の `(T, error)` |
| フレームワークAPI（境界層） | 外部APIの消費 | React hooks `[state, setState]` |
| 内部実装 | 即時分解、private メソッド | `const [a, b] = line.split(',')` |

#### 境界層での例外

フレームワークが返すタプルの**消費**は許容。**作成**は禁止。

```typescript
// ✅ OK: フレームワークAPIの消費（境界層）
const [state, formAction] = useActionState(submitRingi, null);

// ❌ NG: 自作APIでタプルを返す
function useRingiForm(): [RingiState, (data: RingiData) => void] {
  // ...
}

// ✅ Good: 自作APIは名前付きオブジェクトを返す
function useRingiForm(): { state: RingiState; submit: (data: RingiData) => void } {
  // ...
}
```

#### 内部実装での例外

private メソッドや即時分解は許容。ただし、public API には適用しない。

```typescript
// ✅ OK: 内部での即時分解（外部に露出しない）
private parseRow(line: string): void {
  const [date, amount, description] = line.split(',');
  // 即座に使用、外部に返さない
}

// ❌ NG: public メソッドでタプルを返す
public parseRow(line: string): [Date, Money, string] {
  // ...
}

// ✅ Good: public メソッドは名前付き型を返す
public parseRow(line: string): ParsedTransaction {
  const [date, amount, description] = line.split(',');
  return new ParsedTransaction(
    LocalDate.parse(date),
    Money.of(Number(amount)),
    description.trim()
  );
}
```

### Section 6 (Primitive Obsession) との関係

タプル戻り値は**戻り値における Primitive Obsession** である。

| Section 6 のルール | Section 7.1 への適用 |
|-------------------|---------------------|
| 単位がある値 → 専用型 | 複数の値 → 名前付き型 |
| フォーマット制約 → 専用型 | 順序依存 → 名前付き型 |
| 同じ型で意味が異なる → 専用型 | 同じ型のタプル → 名前付き型 |

### Section 11 (Result型) との関係

`Result<T, E>` は許容される理由:

```typescript
// Result は「名前付き」の判別共用体
type Result<T, E> = 
  | { ok: true; value: T }   // ← "value" という名前
  | { ok: false; error: E }; // ← "error" という名前

// 生タプルではない
type BadResult<T, E> = [boolean, T | E]; // ❌ これは禁止
```

### 言語別の緩和

| 言語 | 緩和ルール |
|------|-----------|
| Go | `(T, error)` パターンは許容（Section 0.3 で定義済み） |
| Python | `tuple[A, B]` より `NamedTuple` または `dataclass` を推奨 |
| Rust | `(A, B)` より `struct` を推奨。ただし `Result<T, E>` は標準 |
| TypeScript | 生タプル禁止。`interface` または `type` で名前付け |

## 8. Directory Structure: Concept-based MECE Tree

### 禁止: アーキテクチャレイヤー名

**ディレクトリ名**に以下を使うな:

```
❌ domain/        ❌ infrastructure/   ❌ application/
❌ presentation/  ❌ usecase/          ❌ entity/
❌ core/          ❌ common/           ❌ shared/
❌ services/      ❌ repositories/     ❌ controllers/
```

**ファイル名・クラス名**には技術的役割を含めてよい:

```
✅ order_store.py       # ファイル名はOK
✅ OrderStore           # クラス名はOK
❌ stores/order.py      # ディレクトリ名はNG
```

#### 共通コードの配置（コロケーションルールの適用）

**例外なし**。共通コードもコロケーションルールをそのまま適用する。

| 使用範囲 | 配置場所 |
|---------|---------|
| 1つのドメインでのみ使用 | そのドメインに配置 |
| 複数のドメインで使用 | 共通の親ディレクトリに配置 |

**禁止:**
- `common/`, `shared/`, `utils/` 等の汎用フォルダ
- 「とりあえず共通」という理由での配置

```
✅ Good: コロケーションルールに従う
src/
├── DomainError.ts        ← 全ドメインで使う → src/ 直下
├── Money.ts              ← 全ドメインで使う → src/ 直下
├── ringis/
│   └── RingiErrors.ts    ← ringis でのみ使う
├── expenses/
│   └── ExpenseErrors.ts  ← expenses でのみ使う
└── approvals/

❌ Bad: 汎用フォルダ化
src/
├── common/               ← 何でも入れる汎用フォルダ化
│   ├── utils.ts          ← 責務不明確
│   └── helpers.ts        ← 責務不明確
```

### Screaming Architecture

ディレクトリを見れば「何のシステムか」が分かるようにせよ。

```
❌ Bad: 何のシステムか不明
src/
├── domain/
├── infrastructure/
└── application/

✅ Good: 経費精算システムだと一目で分かる
src/
├── expense-reports/     # 経費精算
├── approvals/           # 承認ワークフロー
├── employees/           # 社員マスタ
├── departments/         # 部署マスタ
└── monthly-closing/     # 月次締め処理

✅ Good: 稟議システム
src/
├── ringis/              # 稟議
├── approval-routes/     # 承認ルート
├── notifications/       # 通知
└── reports/             # レポート
```

### MECE Tree Decomposition

1. 各概念は1つの分類にのみ属させよ (Mutually Exclusive)
2. 全ての概念がいずれかの分類に属させよ (Collectively Exhaustive)
3. 各ディレクトリの子は5つ以下にせよ (Rule of 5)

### Colocation

ソースとテストは同ディレクトリに同居させよ（FW制約がない限り）。

## 9. パフォーマンス考慮

本スキルはオブジェクト生成を多用する。以下の点に注意せよ:

```typescript
// ⚠️ ホットパスでの毎回インスタンス生成に注意
for (const ringi of allRingis) {  // 10万件ループ
  if (new ApprovalDeadlineCheck(ringi).isOverdue()) {  // 毎回生成
    // ...
  }
}

// ✅ パフォーマンスが問題になる場合は設計を調整
const checker = new ApprovalDeadlineChecker();
for (const ringi of allRingis) {
  if (checker.isOverdue(ringi)) {
    // ...
  }
}
```

**方針:** まず正しく書き、計測して問題があれば最適化する。

## 10. 既存プロジェクトへの適用

一度に全て変更するな。以下の順序で段階的に適用せよ:

1. **新規コード:** 本スキルに従って書け
2. **変更するコード:** 変更箇所のみリファクタリングせよ
3. **大規模リファクタ:** チームで合意後、モジュール単位で実施せよ

## 11. エラー処理

### 11.1 Result 型の定義

ビジネスエラーは「想定内の失敗」であり、例外的状況ではない。Result 型で表現する。

#### Result 型

```typescript
// Result 型: 成功または失敗を表す判別共用体
type Result<T, E> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

// Result 作成ヘルパー
const Result = {
  ok: <T>(value: T): Result<T, never> => ({ ok: true, value }),
  err: <E>(error: E): Result<never, E> => ({ ok: false, error }),
};
```

#### なぜ Result はクラスではなく関数ベースか

Result 型は例外的に関数ベースで実装する。理由:

| 観点 | クラスベース | 判別共用体 + 関数 |
|------|-------------|------------------|
| **型の絞り込み** | ❌ 手動で型ガード必要 | ✅ `if (result.ok)` で自動 |
| **シリアライズ** | ❌ 復元時に型情報消失 | ✅ `JSON.stringify/parse` でそのまま |
| **例外の排除** | ❌ getter で throw しがち | ✅ 例外なし |

```typescript
// クラスベースの問題点
class ResultClass<T, E> {
  get value(): T { 
    if (!this._ok) throw new Error(); // ← 例外を避けるための Result なのに例外!
    return this._value!;              // ← 非null アサーション（型安全性が失われる）
  }
}

// 判別共用体の利点
const result = DraftRingi.create(data);
if (result.ok) {
  result.value; // ✅ TypeScript が自動で型を絞り込む
}
```

これは「OOP 主軸」の例外であり、**代数的データ型（ADT）には関数型アプローチが適切**であることを示している。

#### ヘルパー関数（Advanced）

```typescript
// map: 成功値を変換
function map<T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? Result.ok(fn(result.value)) : result;
}

// andThen: 成功値に Result を返す関数を適用（チェーン）
function andThen<T, E, U, F>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, F>
): Result<U, E | F> {
  return result.ok ? fn(result.value) : result;
}

// match: 成功・失敗それぞれの処理を実行
function match<T, E, R>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => R; err: (error: E) => R }
): R {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error);
}

```

#### ヘルパー関数の使用例

```typescript
// andThen でチェーン: if チェーンより簡潔
const result = andThen(
  validateRingiInput(req.body),
  validated => DraftRingi.create(RingiId.generate(), validated)
);

if (!result.ok) {
  return toDomainErrorResponse(result.error);
}
const draft = result.value;

// map で成功値を変換
const idResult = map(draftResult, draft => draft.id.value);

// match でパターンマッチ
return match(result, {
  ok: draft => Response.ok({ id: draft.id.value }),
  err: error => toDomainErrorResponse(error),
});
```

#### 推奨: if チェック（Early Return）

| パターン | 推奨度 | 理由 |
|---------|--------|------|
| **if チェック** | ✅ 推奨 | 誰でも読める、デバッグしやすい、Early Return と一貫 |
| **andThen チェーン** | ⚠️ Advanced | チーム**全員**が習熟している場合のみ |

```typescript
// ✅ 推奨: if チェック（明示的、デバッグしやすい）
const validation = validateRingiInput(req.body);
if (!validation.ok) return handleError(validation.error);

const draftResult = DraftRingi.create(RingiId.generate(), validation.value);
if (!draftResult.ok) return handleError(draftResult.error);

const submitted = await draftResult.value.submit(repository, clock);
```

**`if` チェックを推奨する理由:**
1. **Early Return パターン（Section 4）との一貫性**
2. **デバッグのしやすさ**: ブレークポイントを置きやすい
3. **認知負荷の低さ**: チームの最も経験の浅いメンバーでも読める
4. **型の絞り込み**: `if (result.ok)` で TypeScript が自動的に型を絞り込む

#### Advanced: andThen チェーン（オプション）

以下のヘルパー関数は**チーム全員が Railway Oriented Programming を理解している場合のみ**使用せよ。

```typescript
// ⚠️ Advanced: andThen チェーン（チーム習熟が前提）
const result = andThen(
  validateRingiInput(req.body),
  v => DraftRingi.create(RingiId.generate(), v)
);

if (!result.ok) {
  return handleError(result.error);
}
```

**使用条件:**
- チーム全員が `map`, `andThen`, `match` の意味を理解している
- コードレビューで「これ何？」と聞かれない自信がある

**注意:** neverthrow や fp-ts は導入しない。学習コストを考慮し、上記の軽量な実装で十分。

### 11.1.2 interface vs type の使い分け

TypeScript では `interface` と `type` のどちらでもオブジェクトの形状を定義できるが、用途に応じて使い分けよ。

| 用途 | 推奨 | 理由 |
|------|------|------|
| **ADT（判別共用体）** | `type` | 共用体（`\|`）との親和性、閉じた型 |
| **Intersection（`&`）で拡張** | `type` | 自然な構文 |
| **クラスが `implements` する契約** | `interface` | `implements` が使える |
| **オブジェクトの形状定義（単純）** | どちらでもOK | チームで統一 |

**判断フロー:**
```
この型は...
├─ 判別共用体（`|` で結合）の一部？ → type
├─ Intersection（`&`）で拡張？ → type
├─ クラスが `implements` する？ → interface
└─ 上記いずれでもない → どちらでもOK（チームで統一）
```

**なぜ ADT には `type` か:**

```typescript
// ✅ type: ADT に適している
type DomainErrorBase = {
  readonly _tag: string;
  readonly code: string;
  readonly message: string;
};

type ValidationError = DomainErrorBase & {
  readonly _tag: 'ValidationError';
  readonly violations: ValidationViolation[];
};

type DomainError = ValidationError | NotFoundError | ConflictError;
```

```typescript
// ❌ interface: Declaration merging が可能（ADT では危険）
interface DomainErrorBase {
  readonly _tag: string;
}

// 別ファイルで誰かが勝手に拡張できてしまう
interface DomainErrorBase {
  readonly extraField: string; // ← 意図しない拡張
}
```

**クラスの契約には `interface`:**

```typescript
// ✅ interface: クラスが実装する契約
interface RingiRepository {
  save(ringi: Ringi): Promise<void>;
  findById(id: RingiId): Promise<Ringi | null>;
}

class PostgresRingiRepository implements RingiRepository {
  // ...
}
```

### 11.2 エラー型の分類

#### DomainError: 判別共用体

ビジネスエラーは `Error` を継承せず、判別共用体として定義する。

#### `_tag` と `code` の役割分担

| プロパティ | 役割 | 例 | 用途 |
|-----------|------|-----|------|
| `_tag` | 基底エラー型（5種類） | `'NotFoundError'` | HTTP ステータス決定、switch 分岐 |
| `code` | 具体的なエラー識別子 | `'RINGI_NOT_FOUND'` | ログ、モニタリング、フロントエンド |

```typescript
// エラーの基本構造（type を使用。理由は Section 11.1.2 参照）
type DomainErrorBase = {
  readonly _tag: string;      // 基底エラー型（HTTP ステータス決定用）
  readonly code: string;      // 具体的なエラーコード（識別用）
  readonly message: string;   // 人間可読メッセージ
};

// 具体的なエラー型
type ValidationError = DomainErrorBase & {
  readonly _tag: 'ValidationError';
  readonly violations: ValidationViolation[];
};

type NotFoundError = DomainErrorBase & {
  readonly _tag: 'NotFoundError';
  readonly resourceType: string;
  readonly resourceId: string;
};

type ConflictError = DomainErrorBase & {
  readonly _tag: 'ConflictError';
  readonly existingId?: string;
};

type AuthorizationError = DomainErrorBase & {
  readonly _tag: 'AuthorizationError';
  readonly requiredPermission: string;
};

type BusinessRuleViolationError = DomainErrorBase & {
  readonly _tag: 'BusinessRuleViolationError';
};

// DomainError の共用体
type DomainError = 
  | ValidationError 
  | NotFoundError 
  | ConflictError 
  | AuthorizationError 
  | BusinessRuleViolationError;
```

#### InfrastructureError: 例外として維持

外部ライブラリは例外を throw するため、InfrastructureError は `Error` を継承する。

```typescript
abstract class InfrastructureError extends Error {
  abstract readonly code: string;
  abstract readonly retryable: boolean;
  abstract readonly suggestedRetryAfterMs?: number;
  
  constructor(message: string, readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

#### HTTP ステータスコードとの対応

| エラー種別 | HTTP Status | 用途 |
|-----------|-------------|------|
| ValidationError | 400 | 入力形式エラー |
| AuthorizationError | 403 | 権限不足 |
| NotFoundError | 404 | リソース不存在 |
| ConflictError | 409 | 競合・重複 |
| BusinessRuleViolationError | 422 | ビジネスルール違反 |
| InfrastructureError (retryable) | 503 | 一時的障害 |
| InfrastructureError (!retryable) | 500 | 恒久的障害 |

### 11.3 エラー作成ヘルパー

ファクトリ関数でエラーオブジェクトを作成する。

```typescript
// ドメイン共通のエラー作成ヘルパー
const DomainErrors = {
  validation: (violations: ValidationViolation[]): ValidationError => ({
    _tag: 'ValidationError',
    code: 'VALIDATION_ERROR',
    message: `バリデーションエラー: ${violations.length}件`,
    violations,
  }),
  
  notFound: (resourceType: string, resourceId: string): NotFoundError => ({
    _tag: 'NotFoundError',
    code: `${resourceType.toUpperCase()}_NOT_FOUND`,
    message: `${resourceType} ${resourceId} が見つかりません`,
    resourceType,
    resourceId,
  }),
  
  conflict: (code: string, message: string, existingId?: string): ConflictError => ({
    _tag: 'ConflictError',
    code,
    message,
    existingId,
  }),
};

// エンティティ固有のエラー作成ヘルパー（RingiErrors.ts）
const RingiErrors = {
  amountExceeded: (ringiId: RingiId, amount: Money, limit: Money) => ({
    _tag: 'BusinessRuleViolationError' as const,
    code: 'RINGI_AMOUNT_EXCEEDED',
    message: `稟議金額 ${amount.value} が上限 ${limit.value} を超えています`,
    ringiId,
    amount,
    limit,
  }),
  
  approvalRouteNotFound: (ringiId: RingiId) => ({
    _tag: 'BusinessRuleViolationError' as const,
    code: 'RINGI_APPROVAL_ROUTE_NOT_FOUND',
    message: `稟議 ${ringiId.value} の承認ルートが設定されていません`,
    ringiId,
  }),
};
```

### 11.4 どこで何を返すか

| 場所 | 返すもの | 例 |
|------|---------|-----|
| 静的ファクトリ | `Result<T, E>` | `DraftRingi.create(data)` |
| Command メソッド | `Promise<Result<T, E>>` | `draft.submit(repo)` |
| Repository実装 | `InfrastructureError` を throw | DB接続失敗 |
| 境界層 | 例外 → Result 変換 | try-catch wrapper |

#### パターン1: 静的ファクトリメソッド（Constructor 代替）

```typescript
class TaxOn {
  private constructor(private readonly subtotal: Money) {}
  
  // 静的ファクトリで Result を返す
  static create(subtotal: Money): Result<TaxOn, TaxSubtotalInvalidError> {
    if (subtotal.isNegative()) {
      return Result.err({
        _tag: 'BusinessRuleViolationError',
        code: 'TAX_SUBTOTAL_INVALID',
        message: `税計算の対象金額が不正です: ${subtotal.value}`,
        subtotal,
      });
    }
    return Result.ok(new TaxOn(subtotal));
  }
  
  // Query は常に成功（前提条件は create で検証済み）
  amount(): Money {
    return this.subtotal.multiply(0.10);
  }
}

// 使用
const taxResult = TaxOn.create(subtotal);
if (!taxResult.ok) {
  return Response.badRequest({ error: taxResult.error });
}
const tax = taxResult.value.amount();
```

#### パターン2: Command でドメインエラーがある場合

ビジネスルール違反が発生する可能性がある Command は `Promise<Result<T, E>>` を返す。

```typescript
class AwaitingApproval {
  // ドメインエラーがある場合: Promise<Result<T, E>>
  async approve(
    repository: RingiRepository
  ): Promise<Result<ApprovedRingi, ApprovalExpiredError>> {
    if (this.isExpired()) {
      return Result.err(RingiErrors.approvalExpired(this.id));
    }
    const approved = ApprovedRingi.from(this);
    await repository.save(approved);
    return Result.ok(approved);
  }
}
```

#### パターン3: Command でドメインエラーがない場合

ドメインエラーが発生しない Command は `Promise<T>` を返す。`Result<T, never>` は使わない。

```typescript
class DraftRingi {
  // ドメインエラーがない場合: Promise<T>
  async submit(repository: RingiRepository, clock: Clock): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data, clock.now());
    await repository.save(submitted); // InfrastructureError は throw される
    return submitted;
  }
}
```

**ルール:** `Result<T, never>` は型の嘘。ドメインエラーがないなら `Promise<T>` を使え。

#### Query と Result

**原則:** Query は Result を返さない。計算不能な状態は静的ファクトリで検証すべき。

```typescript
// ✅ Good: ファクトリで検証済みなので Query は常に成功
class TaxOn {
  private constructor(private readonly subtotal: Money) {}
  
  static create(subtotal: Money): Result<TaxOn, TaxSubtotalInvalidError> {
    if (subtotal.isNegative()) {
      return Result.err({ /* エラー情報 */ });
    }
    return Result.ok(new TaxOn(subtotal));
  }
  
  amount(): Money {
    return this.subtotal.multiply(0.10); // 常に成功
  }
}
```

### 11.5 エラー情報の構造

#### 必須プロパティ

| プロパティ | 型 | 用途 |
|-----------|-----|------|
| `_tag` | `string` | 判別子（エラー種別の判定） |
| `code` | `string` | エラーコード（ログ、モニタリング） |
| `message` | `string` | 人間可読メッセージ |

#### コンテキスト情報（推奨）

デバッグに必要な情報は追加プロパティとして定義せよ。

```typescript
// エラー型定義
type RingiAmountExceededError = BusinessRuleViolationError & {
  readonly code: 'RINGI_AMOUNT_EXCEEDED';
  readonly ringiId: RingiId;
  readonly amount: Money;
  readonly limit: Money;
};

// ファクトリ関数で作成
const error = RingiErrors.amountExceeded(
  ringi.id,
  ringi.amount,
  approver.approvalLimit
);
// Result.err(error) で返す
```

### 11.6 バリデーション結果の集約（境界層）

複数の入力バリデーションエラーを集約する。`Result<T, ValidationError>` を使用。

```typescript
// ValidationViolation: 個別のバリデーション違反
class ValidationViolation {
  constructor(
    readonly field: string,
    readonly code: ValidationCode,
    readonly message: string
  ) {}
}

type ValidationCode = 
  | 'REQUIRED' | 'MAX_LENGTH' | 'MIN_LENGTH'
  | 'MIN_VALUE' | 'MAX_VALUE' | 'INVALID_FORMAT';

// ValidationResult は Result<T, ValidationError> の特殊形
type ValidationResult<T> = Result<T, ValidationError>;

// バリデーション関数
function validateRingiInput(data: unknown): ValidationResult<ValidatedRingiInput> {
  const violations: ValidationViolation[] = [];
  
  if (!data.title) {
    violations.push(new ValidationViolation('title', 'REQUIRED', '件名は必須です'));
  }
  if (data.amount === undefined) {
    violations.push(new ValidationViolation('amount', 'REQUIRED', '金額は必須です'));
  } else if (data.amount < 0) {
    violations.push(new ValidationViolation('amount', 'MIN_VALUE', '金額は0以上です'));
  }
  
  if (violations.length > 0) {
    return Result.err(DomainErrors.validation(violations));
  }
  return Result.ok(data as ValidatedRingiInput);
}

// 使用（Controller / Handler）
const result = validateRingiInput(req.body);
if (!result.ok) {
  return res.status(400).json({ 
    code: result.error.code,
    errors: result.error.violations 
  });
}
// ここから先もドメイン層で Result を使用
const draftResult = DraftRingi.create(RingiId.generate(), result.value);
```

### 11.7 Pending Object Pattern との関係

状態遷移は Result を返す。「却下」のような**正常な状態遷移**も成功として返す。

```typescript
class AwaitingApproval {
  // ビジネスルール違反: Result.err を返す
  async approve(
    repository: RingiRepository
  ): Promise<Result<ApprovedRingi, ApprovalError>> {
    if (this.isExpired()) {
      return Result.err({
        _tag: 'BusinessRuleViolationError',
        code: 'RINGI_APPROVAL_EXPIRED',
        message: '承認期限が過ぎています',
      });
    }
    
    const approved = ApprovedRingi.from(this);
    await repository.save(approved);
    return Result.ok(approved);
  }
  
  // 正常な状態遷移: 却下も成功として返す
  async reject(
    reason: string,
    repository: RingiRepository
  ): Promise<Result<RejectedRingi, never>> {
    const rejected = RejectedRingi.from(this, reason);
    await repository.save(rejected);
    return Result.ok(rejected); // 却下も成功
  }
}
```

| 状況 | 対応 |
|------|------|
| ビジネスルール違反 | `Result.err(DomainError)` を返す |
| インフラ障害 | `InfrastructureError` を throw（境界層で catch） |
| 正常な状態遷移（却下等） | `Result.ok(新しい状態)` を返す |

### 11.8 境界層でのエラーハンドリング

境界層は以下の責務を持つ:
1. 入力バリデーション（Result型）
2. ドメインロジック呼び出し（Result型）
3. InfrastructureError のキャッチと Result への変換

```typescript
// InfrastructureError を Result に変換するラッパー
async function withInfraResult<T>(
  fn: () => Promise<T>
): Promise<Result<T, InfrastructureError>> {
  try {
    return Result.ok(await fn());
  } catch (e) {
    if (e instanceof InfrastructureError) {
      return Result.err(e);
    }
    throw e; // 予期しないエラーは再 throw
  }
}
```

**実装例:** Section 11.13「Controller 実装パターン」を参照。

### 11.9 InfrastructureError と cause

InfrastructureError は元の例外を `cause` として保持せよ。

```typescript
class DatabaseConnectionError extends InfrastructureError {
  readonly code = "DATABASE_CONNECTION_FAILED";
  readonly retryable = true;
  readonly suggestedRetryAfterMs = 1000;
  
  constructor(cause: Error) {
    super("データベース接続に失敗しました", cause);
  }
}

// Repository実装での使用
class PostgresRingiRepository implements RingiRepository {
  async save(ringi: Ringi): Promise<void> {
    try {
      await this.conn.execute(/* ... */);
    } catch (e) {
      throw new DatabaseConnectionError(e as Error);
    }
  }
}
```

### 11.10 専用エラー型の作成基準

#### 判断フロー

以下の質問に1つでも YES があれば**専用型**を作成。すべて NO なら**ValidationViolation**を使用。

| 質問 | 判断基準 |
|------|---------|
| Q1: 業務用語として確立している？ | ドメインエキスパートが名前で呼ぶ |
| Q2: 特別なリカバリー処理が必要？ | 通常のエラーハンドリングとは異なる対応 |
| Q3: 異なるHTTPステータスコードを返す？ | 400以外（404, 409, 422等） |
| Q4: ログ/モニタリングで区別したい？ | アラート設定、ダッシュボード |

#### 具体例

| ケース | 専用/汎用 | 理由 |
|--------|----------|------|
| タイトルが必須 | 汎用 | 技術的制約、400 |
| 金額が上限超過 | **専用** | 業務用語「決裁権限超過」、409 |
| 承認ルート未設定 | **専用** | 設定ミス、特別な対応 |

#### 専用エラー型の定義

```typescript
// 専用エラー型（ファクトリ関数で作成）
type RingiAmountExceededError = BusinessRuleViolationError & {
  readonly code: 'RINGI_AMOUNT_EXCEEDED';
  readonly ringiId: RingiId;
  readonly amount: Money;
  readonly limit: Money;
};

// RingiErrors.ts でファクトリを提供
const RingiErrors = {
  amountExceeded: (
    ringiId: RingiId,
    amount: Money,
    limit: Money
  ): RingiAmountExceededError => ({
    _tag: 'BusinessRuleViolationError',
    code: 'RINGI_AMOUNT_EXCEEDED',
    message: `稟議金額 ${amount.value} が上限 ${limit.value} を超えています`,
    ringiId,
    amount,
    limit,
  }),
};
```

### 11.11 エラー型の配置（Colocation）

#### 基本構造

```
src/
├── result.ts                   ← Result 型とヘルパー関数
├── errors.ts                   ← DomainError 基底型、InfrastructureError
├── ValidationViolation.ts      ← バリデーション違反（値オブジェクト）
│
├── {entity}/
│   ├── {Entity}.ts             ← エンティティ
│   ├── {Entity}Errors.ts       ← エラー型とファクトリ
│   └── ...
```

#### 配置ルール

| 条件 | 配置 |
|------|------|
| Result 型、基底エラー型 | `src/` 直下 |
| ドメイン固有エラー型 | `{Entity}Errors.ts` |
| 複数ドメインで共有 | 共通の親ディレクトリに配置 |

#### {Entity}Errors.ts の実装例

```typescript
// src/ringi/RingiErrors.ts
import { BusinessRuleViolationError, NotFoundError } from '../errors';
import { RingiId } from './RingiId';
import { Money } from '../Money';

// エラー型定義
export type RingiAmountExceededError = BusinessRuleViolationError & {
  readonly code: 'RINGI_AMOUNT_EXCEEDED';
  readonly ringiId: RingiId;
  readonly amount: Money;
  readonly limit: Money;
};

export type RingiApprovalRouteNotFoundError = BusinessRuleViolationError & {
  readonly code: 'RINGI_APPROVAL_ROUTE_NOT_FOUND';
  readonly ringiId: RingiId;
};

// ファクトリ関数
export const RingiErrors = {
  amountExceeded: (
    ringiId: RingiId,
    amount: Money,
    limit: Money
  ): RingiAmountExceededError => ({
    _tag: 'BusinessRuleViolationError',
    code: 'RINGI_AMOUNT_EXCEEDED',
    message: `稟議金額 ${amount.value} が上限 ${limit.value} を超えています`,
    ringiId,
    amount,
    limit,
  }),
  
  approvalRouteNotFound: (ringiId: RingiId): RingiApprovalRouteNotFoundError => ({
    _tag: 'BusinessRuleViolationError',
    code: 'RINGI_APPROVAL_ROUTE_NOT_FOUND',
    message: `稟議 ${ringiId.value} の承認ルートが設定されていません`,
    ringiId,
  }),
};
```

### 11.12 InfrastructureError のリトライ戦略

InfrastructureError は `retryable` と `suggestedRetryAfterMs` プロパティを持つ。

```typescript
// リトライ可能: DB接続エラー
class DatabaseConnectionError extends InfrastructureError {
  readonly code = "DATABASE_CONNECTION_FAILED";
  readonly retryable = true;
  readonly suggestedRetryAfterMs = 1000;
  
  constructor(cause: Error) {
    super('データベース接続に失敗しました', cause);
  }
}

// リトライ不可: 設定エラー
class InvalidConfigurationError extends InfrastructureError {
  readonly code = "INVALID_CONFIGURATION";
  readonly retryable = false;
  readonly suggestedRetryAfterMs = undefined;
  
  constructor(readonly configKey: string, message: string) {
    super(`設定エラー [${configKey}]: ${message}`);
  }
}
```

| エラー種別 | retryable | suggestedRetryAfterMs |
|-----------|:---------:|:---------------------:|
| 一時的な接続障害 | `true` | 1000-5000 |
| レート制限 | `true` | API指定値 |
| 設定ミス | `false` | - |

### 11.13 Controller 実装パターン（統合）

境界層では以下を統合する:
1. 入力バリデーション（Result型）
2. ドメインオブジェクト作成（Result型）
3. Command 実行（ドメインエラーがあれば Result、なければ直接 await）
4. InfrastructureError は try-catch でキャッチ

```typescript
async function submitRingiHandler(req: Request): Promise<Response> {
  // 1. 入力バリデーション
  const validation = validateRingiInput(req.body);
  if (!validation.ok) {
    return toDomainErrorResponse(validation.error);
  }
  
  // 2. ドメインオブジェクト作成
  const draftResult = DraftRingi.create(RingiId.generate(), validation.value);
  if (!draftResult.ok) {
    return toDomainErrorResponse(draftResult.error);
  }
  
  // 3. Command 実行
  try {
    // ドメインエラーがない Command は直接 await
    const submitted = await draftResult.value.submit(repository, clock);
    return Response.created({ id: submitted.id.value });
  } catch (e) {
    // InfrastructureError をキャッチ
    if (e instanceof InfrastructureError) {
      return toInfraErrorResponse(e);
    }
    throw e; // 予期しないエラーは再 throw
  }
}

// ドメインエラーがある Command の場合
async function approveRingiHandler(req: Request): Promise<Response> {
  const ringi = await ringiRepository.findById(RingiId.of(req.params.id));
  if (!ringi) {
    return Response.notFound();
  }
  
  try {
    // ドメインエラーがある Command は Result を返す
    const result = await ringi.approve(repository);
    if (!result.ok) {
      return toDomainErrorResponse(result.error);
    }
    return Response.ok({ id: result.value.id.value });
  } catch (e) {
    if (e instanceof InfrastructureError) {
      return toInfraErrorResponse(e);
    }
    throw e;
  }
}

// HTTP ステータスコード変換
function toDomainErrorResponse(error: DomainError): Response {
  const statusMap: Record<DomainError['_tag'], number> = {
    ValidationError: 400,
    NotFoundError: 404,
    ConflictError: 409,
    AuthorizationError: 403,
    BusinessRuleViolationError: 422,
  };
  
  return Response.status(statusMap[error._tag]).json({
    type: 'domain_error',
    code: error.code,
    message: error.message,
  });
}

function toInfraErrorResponse(error: InfrastructureError): Response {
  console.error('[InfrastructureError]', error.code, error.message, error.cause);
  const status = error.retryable ? 503 : 500;
  return Response.status(status).json({
    type: 'infrastructure_error',
    code: error.code,
    message: 'サービスが一時的に利用できません',
    retryable: error.retryable,
  });
}
```

### 11.14 新規プロジェクト vs 既存プロジェクト

| プロジェクト | 推奨アプローチ |
|-------------|---------------|
| **新規** | Result 型を全面採用 |
| **既存（例外ベース）** | 境界層で統一、段階的に移行 |

#### 既存プロジェクトでの共存パターン

```typescript
// 既存コード（例外ベース）を Result でラップ
async function legacyServiceCall(): Promise<Result<Data, DomainError>> {
  try {
    const data = await legacyService.getData(); // throws
    return Result.ok(data);
  } catch (e) {
    if (e instanceof LegacyDomainError) {
      return Result.err(toDomainError(e));
    }
    throw e; // InfrastructureError は再 throw
  }
}
```

#### 移行の優先順位

1. **新規機能** → Result 型で実装
2. **既存機能の修正** → 修正箇所のみ Result 型に
3. **リファクタリング** → モジュール単位で移行

#### 具体的な移行手順

##### Step 1: 基盤を整備（1日目）

```typescript
// 1. result.ts を作成
// src/result.ts
type Result<T, E> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

const Result = {
  ok: <T>(value: T): Result<T, never> => ({ ok: true, value }),
  err: <E>(error: E): Result<never, E> => ({ ok: false, error }),
};

export { Result };

// 2. errors.ts を作成
// src/errors.ts
interface DomainErrorBase {
  readonly _tag: string;
  readonly code: string;
  readonly message: string;
}

// 基底エラー型を定義...（Section 11.2 参照）
```

##### Step 2: 既存エラークラスをマッピング

```typescript
// 既存の例外クラス
class RingiAmountExceededError extends Error {
  constructor(readonly amount: number, readonly limit: number) {
    super(`Amount ${amount} exceeds limit ${limit}`);
  }
}

// 新しい判別共用体エラーへの変換関数
function toDomainError(e: Error): DomainError {
  if (e instanceof RingiAmountExceededError) {
    return RingiErrors.amountExceeded(
      RingiId.unknown(), // 既存コードに ID がない場合
      Money.of(e.amount),
      Money.of(e.limit)
    );
  }
  // 他のエラー型も同様にマッピング
  return DomainErrors.unknown(e.message);
}
```

##### Step 3: 境界層にアダプターを追加

```typescript
// Controller で既存コードをラップ
async function submitRingiHandler(req: Request): Promise<Response> {
  // 新しいバリデーション（Result 型）
  const validation = validateRingiInput(req.body);
  if (!validation.ok) {
    return toDomainErrorResponse(validation.error);
  }
  
  // 既存コードをラップ
  try {
    const ringi = await legacyRingiService.submit(validation.value); // throws
    return Response.created({ id: ringi.id });
  } catch (e) {
    if (e instanceof LegacyDomainError) {
      return toDomainErrorResponse(toDomainError(e));
    }
    throw e;
  }
}
```

##### Step 4: モジュール単位で置換

```typescript
// Before: 例外ベース
class LegacyRingiService {
  submit(data: RingiData): Ringi {
    if (data.amount > MAX_AMOUNT) {
      throw new RingiAmountExceededError(data.amount, MAX_AMOUNT);
    }
    // ...
  }
}

// After: Result 型
class DraftRingi {
  static create(id: RingiId, data: ValidatedRingiInput): Result<DraftRingi, RingiAmountExceededError> {
    if (data.amount.isGreaterThan(Money.of(MAX_AMOUNT))) {
      return Result.err(RingiErrors.amountExceeded(id, data.amount, Money.of(MAX_AMOUNT)));
    }
    return Result.ok(new DraftRingi(id, data));
  }
}
```

##### Step 5: テストの移行

```typescript
// Before: 例外をテスト
it('金額超過時に例外をスローする', () => {
  expect(() => service.submit({ amount: 1000000 }))
    .toThrow(RingiAmountExceededError);
});

// After: Result 型をテスト
it('金額超過時にエラーを返す', () => {
  const result = DraftRingi.create(id, { amount: Money.of(1000000) });
  
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe('RINGI_AMOUNT_EXCEEDED');
  }
});
```

#### 移行時の注意点

| 注意点 | 対応 |
|--------|------|
| 既存の try-catch を壊さない | アダプター層で吸収 |
| テストを先に書き換えない | 新旧両方のテストを維持 |
| 一度に大きく変えない | 1 モジュール/1 PR |
| 型の不整合 | `as unknown as` は禁止。変換関数を書く |

#### 移行完了の判断基準

- [ ] 全ての Controller が Result 型を返すドメインロジックを呼んでいる
- [ ] 新しいドメインエラーは判別共用体で定義されている
- [ ] InfrastructureError のみが `extends Error`
- [ ] 既存の例外クラスは非推奨（deprecated）としてマーク
- [ ] テストが Result 型の検証に移行している

---

## 12. フレームワーク別ガイダンス

### NestJS

| 本スキルのルール | NestJS での適用 |
|-----------------|----------------|
| Repository をメソッド引数で受け取る | `@Injectable()` で DI を使用してよい |
| 完全コンストラクタ | DTO → Domain Object 変換時に適用 |
| Result 型 | UseCase は Result を返し、Controller で HTTP 変換 |

```typescript
// UseCase: Result 型を返す
@Injectable()
class SubmitRingiUseCase {
  constructor(
    private readonly repository: RingiRepository,
    private readonly clock: Clock
  ) {}

  async execute(data: RingiData): Promise<Result<SubmittedRingi, DomainError>> {
    const validation = validateRingiInput(data);
    if (!validation.ok) {
      return validation; // ValidationError を含む Result
    }
    
    const draftResult = DraftRingi.create(RingiId.generate(), validation.value);
    if (!draftResult.ok) {
      return draftResult;
    }
    
    return draftResult.value.submit(this.repository, this.clock);
  }
}

// Controller: Result → HTTP 変換
@Controller('ringis')
class RingiController {
  constructor(private readonly useCase: SubmitRingiUseCase) {}
  
  @Post()
  async submit(@Body() data: RingiData): Promise<RingiResponse> {
    const result = await this.useCase.execute(data);
    if (!result.ok) {
      throw new HttpException(
        { code: result.error.code, message: result.error.message },
        this.toHttpStatus(result.error._tag)
      );
    }
    return { id: result.value.id.value };
  }
}
```

### Next.js (App Router)

| 本スキルのルール | Next.js での適用 |
|-----------------|-----------------|
| Command/Query 分類 | Server Actions = Command, RSC = ReadModel |
| Repository | Server Actions 内で直接使用可 |
| エラー処理 | Server Actions は Result 型を返す |

```typescript
// Server Action: Result 型を返す
'use server'
async function submitRingi(data: RingiData): Promise<ActionResult<SubmittedRingi>> {
  // 1. バリデーション
  const validation = validateRingiInput(data);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }
  
  // 2. ドメインロジック（Result 型）
  const draftResult = DraftRingi.create(RingiId.generate(), validation.value);
  if (!draftResult.ok) {
    return { ok: false, error: { code: draftResult.error.code, message: draftResult.error.message } };
  }
  
  // 3. Command 実行（InfrastructureError は例外）
  try {
    const submitResult = await draftResult.value.submit(repository, systemClock);
    if (!submitResult.ok) {
      return { ok: false, error: { code: submitResult.error.code, message: submitResult.error.message } };
    }
    return { ok: true, data: submitResult.value };
  } catch (e) {
    // InfrastructureError は error.tsx で処理
    throw e;
  }
}

// クライアントでの使用
'use client'
function RingiForm() {
  const [state, formAction] = useActionState(submitRingi, null);
  
  return (
    <form action={formAction}>
      {state && !state.ok && (
        <div role="alert">{state.error.message}</div>
      )}
      {/* ... */}
    </form>
  );
}
```

### Spring Boot (Java/Kotlin)

| 本スキルのルール | Spring での適用 |
|-----------------|----------------|
| Repository | Spring Data Repository をそのまま使用 |
| DI | `@Autowired` / コンストラクタインジェクション |
| Transition | Record / data class で実装 |

---

## 13. アーキテクチャ別の適用

### モノリス

本スキルはモノリスアーキテクチャに最適化されている。そのまま適用せよ。

### マイクロサービス

| 本スキルのルール | マイクロサービスでの適用 |
|-----------------|------------------------|
| Repository/Store | サービス内の永続化に限定 |
| 外部サービス呼び出し | `Gateway` として分離（Repository とは別） |
| Pending Object Pattern | サービス内の状態遷移に適用 |
| サービス間の状態遷移 | Saga パターンを検討 |

**追加エラー分類:**

```typescript
// 外部サービスエラー
class ExternalServiceError extends InfrastructureError {
  readonly code = "EXTERNAL_SERVICE_ERROR";
  readonly retryable = true;
  readonly suggestedRetryAfterMs = 5000;
  
  constructor(
    readonly serviceName: string,
    cause: Error
  ) {
    super(`External service ${serviceName} failed`, cause);
  }
}
```

**サービス間通信のパターン:**

```typescript
// Gateway（外部サービス呼び出し用）
interface PaymentGateway {
  charge(amount: Money, cardToken: string): Promise<PaymentResult>;
}

// 使用（Command 内）
class ConfirmOrder {
  async execute(
    repository: OrderRepository,
    paymentGateway: PaymentGateway
  ): Promise<ConfirmedOrder> {
    const payment = await paymentGateway.charge(this.order.total, this.cardToken);
    if (!payment.ok) {
      throw new PaymentFailedError(payment.error);
    }
    const confirmed = this.order.confirm(payment.transactionId);
    await repository.save(confirmed);
    return confirmed;
  }
}
```

---

## クイックチェックリスト（20項目）

コードレビュー時に使用。詳細は各 Section を参照。

### 分類（Section 1）
- [ ] **4分類**: Command / Transition / Query / ReadModel のいずれかに分類されているか
- [ ] **副作用の分離**: Command のみ副作用あり、他は純粋関数か
- [ ] **境界層**: switch/if分岐はドメイン層ではなく境界層にあるか

### 設計（Section 2）
- [ ] **完全コンストラクタ**: 生成時点で有効な状態か
- [ ] **イミュータブル**: 変更時は新しいオブジェクトを返すか
- [ ] **依存注入**: External Resource / Clock はメソッド引数で受け取っているか

### コード品質（Section 3-5）
- [ ] **Early Return**: else 句なしでガード節を使っているか
- [ ] **単一責任**: メソッドは1つのことだけをしているか
- [ ] **引数**: 2個以下か（多い場合はオブジェクトにまとめる）

### 戻り値（Section 7.1）
- [ ] **名前付き戻り値**: 複数の値を返す場合、各値に名前があるか（生タプル禁止）
- [ ] **同型タプル禁止**: `[Date, Date]` のような同じ型のタプルを返していないか

### Polymorphism（Section 1.4, 1.8）
- [ ] **ポリモーフィズム判断**: 各分岐で異なる計算ロジック or 独立テストが必要な場合のみか
- [ ] **YAGNI**: 分岐2つ＆値選択のみなら if/else で十分か

### 命名（各 Section）
- [ ] **Command**: `{状態}{Entity}`（DraftRingi, PendingOrder）
- [ ] **Repository**: `{Entity}Repository`（Interface定義、単一キー検索）
- [ ] **エラー**: `{Entity}{原因}Error`（Exception禁止）

### エラー処理（Section 11）
- [ ] **DomainError**: 判別共用体（`_tag`, `code`, `message`）で定義されているか
- [ ] **Result型**: ドメインロジックは `Result<T, E>` を返しているか
- [ ] **InfrastructureError**: 外部ライブラリのエラーは `extends Error` で例外か
- [ ] **境界層**: InfrastructureError を catch して Result に変換しているか

### ディレクトリ（Section 10）
- [ ] **機能ベース**: 技術層ではなく機能でディレクトリを分けているか
- [ ] **5つルール**: 各ディレクトリの直接の子は5つ以下か

### テスト（Section 2.4, 2.4.1）
- [ ] **Pure Logic**: 依存クラス自体の単体テストがあるか（親でモック不要に）
- [ ] **テストデータ独立性**: 各テストが自身のデータを作成・クリーンアップしているか（Fixtures禁止）
- [ ] **Factory配置**: Test Data Factory がテストとコロケーションされているか
- [ ] **InMemory実装**: すべての Repository に InMemory 実装が存在するか
