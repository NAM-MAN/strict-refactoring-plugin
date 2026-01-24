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

1. **MECE分類に従え**: すべてのクラスは Command / Query / ReadModel のいずれかに分類せよ
2. **完全コンストラクタ**: オブジェクトは生成時点で完全に有効な状態にせよ
3. **ポリモーフィズム**: 複数ロジックは Interface + 実装クラスで表現せよ（enum + switch 禁止）
4. **イミュータブル優先**: 状態変更は最小限に、変更時は新しいオブジェクトを返す
5. **本スキルのルールを優先**: FWが構文レベルで強制する場合のみ例外を許容

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

## 1. クラス分類: Command / Query / ReadModel

すべてのクラスは以下の3つに分類される。

| 分類 | 定義 | 副作用 | 外部リソース |
|------|------|:------:|:------:|
| **Command** | 永続状態を変更する、または外部システムに作用する | あり | メソッド引数 |
| **Query** | 入力から出力を導出する（純粋計算） | なし | なし |
| **ReadModel** | 永続層から読み取り専用でデータを取得する | なし | メソッド引数 |

**なぜ3分類か:**
- Query は純粋計算（外部リソースなし）に限定することでテスト容易性を保証
- ReadModel は「読み取りのみ」という制約で Command と区別
- CQRS パターンとの整合性を持つ

### 1.1 Command（命令実行）

永続状態を変更する、または外部システムに作用するクラス。

#### Pending Object Pattern

状態遷移を型で表現する。クラス名と遷移メソッド名で意味の重複を避ける。

```
{状態}{Entity}(入力データ).{遷移}(依存) → {結果Entity}
```

#### Command の2種類

| 種類 | 定義 | 依存 | 例 |
|------|------|------|-----|
| **Effectful Command** | 永続化・外部通信を伴う | Store/Transport | `起案中稟議.submit(store)` |
| **Pure Transition** | 状態遷移のみ、副作用なし | Rules等 | `未検証経費.validate(rules)` |

**注意:** Pure Transition は副作用がないが、「状態遷移を型で表現する」という観点から Command に分類する。Query（計算）とは異なり、オブジェクトの「状態」を変換する意図を持つ。

**State vs Identity:** Pending Object Pattern は新しいオブジェクトを生成する。同一性（Identity）は維持しない。`起案中稟議` と `申請済稟議` は別のオブジェクトである。ID で紐づけたい場合は、生成されたオブジェクトに同じ ID を持たせる。

| 操作 | 種類 | クラス名パターン | メソッド | 例 |
|------|------|-----------------|---------|-----|
| 作成 | Effectful | `Draft{Entity}` / `Pending{Entity}` | `submit(store)` | `DraftRingi(data).submit(store)` |
| 承認 | Effectful | `Awaiting{Entity}` | `approve(store)` | `AwaitingApproval(ringi).approve(store)` |
| 変更 | Effectful | `{Entity}Change` | `apply(store)` | `ExpenseChange(current, diff).apply(store)` |
| 取消 | Effectful | `{Entity}Cancellation` | `execute(store)` | `InvoiceCancellation(target).execute(store)` |
| 検証 | Pure | `Unvalidated{Entity}` | `validate(rules)` | `UnvalidatedExpense(data).validate(rules)` |
| 送信 | Effectful | `Outgoing{Resource}` | `deliver(transport)` | `OutgoingNotification(to, message).deliver(slack)` |

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

#### 実装例

```typescript
// 稟議: Draft → submit → Submitted
class DraftRingi {
  constructor(private readonly data: RingiData) {
    if (!data.title) throw new Error("件名は必須です");
    if (!data.amount) throw new Error("金額は必須です");
  }

  async submit(store: RingiStore): Promise<SubmittedRingi> {
    const ringi = SubmittedRingi.fromDraft(this.data);
    await store.save(ringi);
    return ringi;
  }
}

// 使用
const submitted = await new DraftRingi(data).submit(ringiStore);
```

```typescript
// 経費精算: 変更申請
class ExpenseReportChange {
  constructor(
    private readonly current: ExpenseReport,
    private readonly newItems: ExpenseItem[]
  ) {}

  async apply(store: ExpenseReportStore): Promise<ExpenseReport> {
    const updated = this.current.withItems(this.newItems);
    await store.save(updated);
    return updated;
  }
}

// 使用
const updated = await new ExpenseReportChange(report, newItems).apply(store);
```

```typescript
// 検証: Unvalidated → validate → Validated (Pure Transition)
class UnvalidatedExpense {
  constructor(private readonly data: ExpenseData) {}

  validate(rules: ExpenseRules): ValidatedExpense {
    const errors = rules.check(this.data);
    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
    return new ValidatedExpense(this.data);
  }
}

// 使用
const validated = new UnvalidatedExpense(data).validate(companyRules);
```

#### Store 命名規則

「Repository」は技術用語。ドメイン寄りの命名を使え:

| 技術用語 | 推奨 | 例 |
|---------|------|-----|
| `Repository` | `Store` | `RingiStore`, `ExpenseStore` |
| `Gateway` | `Transport` / `Channel` | `SlackTransport`, `EmailChannel` |
| `Client` | `Connection` | `ApiConnection` |

#### Store 設計指針

Store は Interface で定義し、最小限のメソッドに絞れ。

```typescript
// Store Interface
interface RingiStore {
  save(ringi: Ringi): Promise<void>;
  findById(id: RingiId): Promise<Ringi | null>;
}

// 実装（技術詳細を隠蔽）
class PostgresRingiStore implements RingiStore {
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

**Store 設計の原則:**

| 原則 | 説明 |
|------|------|
| Interface で定義 | テスト時に InMemory 実装に差し替え可能にする |
| Aggregate Root 単位 | 1 Store = 1 Aggregate Root（下記参照） |
| 単一キー検索に絞る | 複雑なクエリは ReadModel に分離 |
| ドメインオブジェクトを返す | 生のデータ（Row, Record）を返さない |

#### Store に許容するメソッド

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

#### Aggregate Root と Store の関係

```
Aggregate Root = 整合性の境界を持つエンティティの集合のルート

稟議 Aggregate:
┌─────────────────────────────┐
│ Ringi (Aggregate Root)      │  ← RingiStore で永続化
│   ├── ApprovalStep[]        │  ← Ringi と一緒に保存
│   └── Attachment[]          │  ← Ringi と一緒に保存
└─────────────────────────────┘

経費精算 Aggregate:
┌─────────────────────────────┐
│ ExpenseReport (Aggregate Root) │  ← ExpenseReportStore で永続化
│   └── ExpenseItem[]            │  ← ExpenseReport と一緒に保存
└─────────────────────────────┘
```

**ルール:**
- Store は Aggregate Root に対してのみ作成
- 子エンティティ（ApprovalStep, ExpenseItem）は親と一緒に保存
- 子エンティティ単体の Store は作らない

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

Resolver は **Query の一種** として、条件に基づいて Strategy や実装を選択する。

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

**Resolver の位置づけ:**
- **分類**: Query（副作用なし）
- **メソッド名**: `resolve()`
- **役割**: 条件に基づいて適切な実装を選択
- **配置**: 境界層（Controller や UseCase から呼び出す）

### 1.6 境界層での条件分岐（許容）

#### 境界層とは

境界層は「外部世界とドメインロジックの接点」である。

```
┌─────────────────────────────────────────────────────┐
│                    外部世界                          │
│  (HTTP, CLI, Queue, External API, Database)         │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    境界層                            │
│  - Controller / Handler                             │
│  - Resolver (Strategy選択)                          │
│  - Mapper (外部形式 ↔ ドメイン型)                    │
│  - Store実装 (Row → Entity変換)                     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                 ドメインロジック                      │
│  - Command / Query / ReadModel                      │
│  - Entity / Value Object                            │
└─────────────────────────────────────────────────────┘
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

### 1.7 enum の使用ルール

enum 自体は使用可能。ただし enum を switch/match で分岐してロジックを実行するのは禁止。

| enum の使い方 | 可否 | 例 |
|--------------|:----:|-----|
| 状態の識別子 | ✅ | `OrderStatus.CONFIRMED` |
| 単一条件での比較 | ✅ | `if status == OrderStatus.CONFIRMED` |
| Resolver 内での分岐 | ✅ | 境界層での Strategy 選択 |
| switch/match + ロジック | ❌ | 分岐内でビジネスロジック実行 |

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
| 分岐が2つだけ | Polymorphism 不要。if/else で十分 |
| 分岐が将来増える見込みなし | Polymorphism 不要 |
| 1回しか使わない計算 | Query クラス化不要。インラインでOK |
| チーム全員が理解できない | 段階的に導入。一度に全部やらない |

**判断基準:** 「このクラスを作ることで、コードの変更が本当に楽になるか？」

```typescript
// ✅ 2分岐なら if/else で十分
const discount = member.isGold ? 0.2 : 0.1;

// ❌ 過剰: 2分岐のために4クラス作成
interface DiscountStrategy { ... }
class GoldDiscount implements DiscountStrategy { ... }
class StandardDiscount implements DiscountStrategy { ... }
class DiscountResolver { ... }
```

**拡張ポイント:** 3つ目の分岐が必要になった時点でリファクタリングせよ。

#### ドットチェーンは1つまで

```typescript
// ❌ Bad: ドット2つ以上
this.ringi.applicant.department.name

// ✅ Good: ドット1つまで
this.ringi.applicantDepartmentName()
```

#### 行数目安: 10行以内

Command/Query の分類に従えば自然と短くなる。10行を超えたら分割を検討せよ。

#### 行数 vs 引数のトレードオフ

| 優先 | 理由 |
|------|------|
| **引数を減らす** > 行数を減らす | 引数が多いとテストが困難になる |

```typescript
// ❌ Bad: 引数5つで行数は少ない
async function submitRingi(
  title: string,
  amount: number,
  reason: string,
  attachments: File[],
  urgent: boolean
): Promise<Ringi> {
  return new DraftRingi({ title, amount, reason, attachments, urgent }).submit(store);
}

// ✅ Good: 引数1つで行数は少し増えるが、テストしやすい
async function submitRingi(data: RingiData): Promise<Ringi> {
  return new DraftRingi(data).submit(store);
}
```

## 2. 完全コンストラクタと依存生成

### 2.1 完全コンストラクタの原則

**オブジェクトは生成された時点で完全に有効な状態にせよ。**

```typescript
// ❌ Bad: 不完全な状態を許容
class DraftRingi {
  constructor(private readonly data: RingiData | null) {
    // data が null かもしれない
  }
}

// ✅ Good: 完全コンストラクタ
class DraftRingi {
  constructor(private readonly data: RingiData) {
    if (!data) {
      throw new Error("稟議データは必須です");
    }
    if (!data.title) {
      throw new Error("件名は必須です");
    }
    if (data.amount.isNegative()) {
      throw new Error("金額は0以上である必要があります");
    }
    // data は常に有効
  }
}
```

### 2.2 依存の分類と生成方針

依存オブジェクトをコンストラクタ内で生成してよいかは、依存の種類で決まる。

#### 依存の4分類

| 分類 | 定義 | 例 | 生成方針 |
|------|------|-----|---------|
| **Pure Logic** | 外部リソース不使用、決定論的 | Validator, Calculator | ✅ コンストラクタ内生成 |
| **Configured Logic** | 設定値に依存する Pure Logic | TaxCalculator(rate) | ✅ Config経由で内部生成 |
| **External Resource** | 永続化、外部通信 | Store, Transport, API | ❌ メソッド引数で受け取る |
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
// InMemory Store（テスト用）
class InMemoryRingiStore implements RingiStore {
  private ringis = new Map<string, Ringi>();

  async save(ringi: Ringi): Promise<void> {
    this.ringis.set(ringi.id.value, ringi);
  }

  async findById(id: RingiId): Promise<Ringi | null> {
    return this.ringis.get(id.value) ?? null;
  }
}

// テスト
describe("DraftRingi", () => {
  it("申請後にStoreに保存される", async () => {
    const store = new InMemoryRingiStore();
    const ringi = await new DraftRingi(data).submit(store);

    expect(await store.findById(ringi.id)).toEqual(ringi);
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
      / 統合   \       <- Command のテスト（Store モック）
     /----------\
    /   単体     \     <- Pure Logic, Query のテスト
   /--------------\
```

| テスト種類 | 対象 | モック |
|-----------|------|--------|
| 単体 | Query, Pure Logic 依存 | なし |
| 統合 | Command | Store, Transport のみ |
| E2E | ユースケース全体 | なし（実環境） |

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
class DraftRingi {
  async submit(store: RingiStore): Promise<SubmittedRingi> {
    if (this.data.isValid()) {
      return this.doSubmit(store);
    } else {
      throw new ValidationError("稟議データが不正です");
    }
  }
}

// ✅ Good: ガード節
class DraftRingi {
  async submit(store: RingiStore): Promise<SubmittedRingi> {
    if (!this.data.isValid()) {
      throw new ValidationError("稟議データが不正です");
    }
    return this.doSubmit(store);
  }
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

**判断基準は「責務」であり「行数」ではない。**

| 判断基準 | 対応 | 例 |
|---------|------|-----|
| 値の選択のみ | 対称 else 許容 | 定数を返すだけ |
| 独立した責務がある | Polymorphism | 計算ロジックが異なる |
| 将来的に分岐が増える | Polymorphism | 3つ目が来そうな場合 |

```typescript
// ✅ 対称 else OK: 値の選択のみ（責務なし）
discountRate(): number {
  if (this.member.isGold()) {
    return 0.2;
  } else {
    return 0.1;
  }
}

// ✅ 三項演算子でも可
discountRate(): number {
  return this.member.isGold() ? 0.2 : 0.1;
}
```

```typescript
// ❌ 対称 else NG: 各分岐が独立した責務（計算ロジック）を持つ
calculateDiscount(expense: Expense): Money {
  if (this.employee.isManager()) {
    // 管理職: 交際費は満額、それ以外は80%
    return expense.category === ExpenseCategory.ENTERTAINMENT
      ? expense.amount
      : expense.amount.multiply(0.8);
  } else {
    // 一般社員: 一律70%
    return expense.amount.multiply(0.7);
  }
}

// ✅ Polymorphism で分離
interface ExpenseReimbursementRule {
  calculate(expense: Expense): Money;
}

class ManagerReimbursementRule implements ExpenseReimbursementRule { ... }
class StaffReimbursementRule implements ExpenseReimbursementRule { ... }
```

**チェック:** 「この分岐にテストを書くなら、別々のテストケースになるか？」→ Yes なら Polymorphism を検討。

## 5. 条件式の明確化

### 条件の種類に応じて抽出せよ

| 条件の種類 | 対応 |
|-----------|------|
| 自明な単一条件 | そのまま書いてよい |
| 意味が不明確な単一条件 | `is_xxx` 変数に抽出せよ |
| 複合条件（2つ以上） | Query クラスに抽出せよ |

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

---

## チェックリスト

### クラス分類
- [ ] Command / Query / ReadModel のいずれかに明確に分類されているか
- [ ] Command: Pending Object Pattern に従っているか
- [ ] Query: 純粋計算のみか（外部リソースなし）
- [ ] Query: 出力の意味に応じたメソッド名か（amount/count/rate/ok/text/result/resolve）
- [ ] ReadModel: 読み取り専用か（書き込みなし）
- [ ] 複数ロジック: ポリモーフィズムで実装されているか（enum + switch なし）
- [ ] 境界層以外で条件分岐していないか

### 命名
- [ ] Command: `{状態}{Entity}` 形式か（Draft, Pending, Awaiting, Unvalidated, Outgoing等）
- [ ] Query: `{計算内容}` 形式か
- [ ] ReadModel: `{取得内容}` 形式か
- [ ] Store: `{Entity}Store` 形式か（Repository は非推奨）
- [ ] Store: Interface で定義し、単一キー検索に絞っているか
- [ ] クラス名とメソッド名で意味が重複していないか

### 設計
- [ ] 完全コンストラクタか（生成時点で有効な状態か）
- [ ] イミュータブルか（変更時は新しいオブジェクトを返すか）
- [ ] 深いイミュータビリティが必要な箇所は対応しているか
- [ ] 継承を使っていないか（Interface + Composition か）
- [ ] 引数は1-2個か（引数優先、行数は二の次）
- [ ] 行数は10行以内か

### 依存生成
- [ ] Pure Logic はコンストラクタ内で生成しているか
- [ ] Configured Logic は Config 経由でコンストラクタ内生成しているか
- [ ] Config は変更頻度・ライフサイクルで適切に分割されているか
- [ ] External Resource（Store等）はメソッド引数で受け取っているか
- [ ] Non-deterministic（Clock, Random）はメソッド引数で受け取っているか
- [ ] 依存クラスの単体テストが存在するか（親クラスでモック不要にするため）

### コード品質
- [ ] else 句を使っていないか（Early Return か、対称パスは例外）
- [ ] 対称パスの判断は責務ベースか（行数ではない）
- [ ] 複合条件は Query クラスに抽出されているか
- [ ] プリミティブ型を直接使っていないか
- [ ] マジックナンバーは定数化されているか

### YAGNI チェック
- [ ] 分岐が2つだけなら Polymorphism を避けているか
- [ ] 1回しか使わない計算をクラス化していないか
- [ ] 過剰なクラス分割をしていないか

### ディレクトリ構造
- [ ] 技術的レイヤー名をディレクトリ名に使っていないか
- [ ] ディレクトリを見て「何のシステムか」分かるか
- [ ] 各ディレクトリの子は5つ以下か
