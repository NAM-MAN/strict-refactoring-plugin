# コード品質パターン集

## Table of Contents

- [完全コンストラクタ](#完全コンストラクタ)
- [入力バリデーションと完全コンストラクタの2フェーズアプローチ](#入力バリデーションと完全コンストラクタの2フェーズアプローチ)
- [依存の4分類と判断フロー](#依存の4分類と判断フロー)
- [Interface 優先パターン](#interface-優先パターン)
- [Early Return パターン](#early-return-パターン)
- [条件式の明確化](#条件式の明確化)
- [Primitive Obsession 回避](#primitive-obsession-回避)
- [Parameters と Return Values](#parameters-と-return-values)

---

## 完全コンストラクタ

オブジェクトは生成された時点で完全に有効な状態にせよ。

```typescript
// ❌ Bad
class Order { constructor(private readonly data: OrderData | null) {} }

// ✅ Good
class Order {
  constructor(private readonly data: OrderData) {
    if (!data) throw new Error("注文データは必須です");
    if (!data.customerId) throw new Error("顧客IDは必須です");
    if (data.items.length === 0) throw new Error("商品は1つ以上必要です");
  }
}
```

---

## 入力バリデーションと完全コンストラクタの2フェーズアプローチ

| フェーズ | 目的 | エラー処理 | 実行場所 |
|---------|------|-----------|---------|
| **入力バリデーション** | ユーザー入力の形式・値チェック | Result型で複数エラー集約 | 境界層 |
| **完全コンストラクタ** | ドメイン不変条件の保証 | 即座に例外（単一） | ドメイン層 |

---

## 依存の4分類と判断フロー

依存オブジェクトをコンストラクタ内で生成してよいかは、依存の種類で決まる。

| 分類 | 定義 | 例 | 生成方針 |
|------|------|-----|---------|
| **Pure Logic** | 外部リソース不使用、決定論的 | Validator, Calculator | ✅ コンストラクタ内生成 |
| **Configured Logic** | 設定値に依存する Pure Logic | TaxCalculator(rate) | ✅ Config経由で内部生成 |
| **External Resource** | 永続化、外部通信 | Repository, Gateway, API | ❌ メソッド引数で受け取る |
| **Non-deterministic** | 時間、乱数 | Clock, RandomGenerator | ❌ メソッド引数で受け取る |

**判断フローチャート:**

```
この依存は...
├─ 外部リソース（DB, HTTP, File, Queue）にアクセスする？ → メソッド引数
├─ 時間/乱数に依存する？ → メソッド引数
├─ 設定値が必要？ → Config経由でコンストラクタ内生成
└─ 上記いずれでもない（Pure Logic）？ → コンストラクタ内で直接生成
```

### Pure Logic: コンストラクタ内で生成

```typescript
class DraftExpenseReport {
  private readonly validator: ExpenseValidator;
  private readonly calculator: ExpenseTotalCalculator;
  constructor(private readonly items: ExpenseItem[]) {
    this.validator = new ExpenseValidator();
    this.calculator = new ExpenseTotalCalculator();
  }
}
```

### Configured Logic: Config経由で内部生成

```typescript
interface ExpenseConfig {
  readonly maxAmountPerItem: Money;
  readonly allowedCategories: ExpenseCategory[];
}

class DraftExpenseReport {
  private readonly policyChecker: ExpensePolicyChecker;
  constructor(private readonly items: ExpenseItem[], config: ExpenseConfig) {
    this.policyChecker = new ExpensePolicyChecker(config);
  }
}
```

**Config分割基準:** 変更頻度、ライフサイクル、利用コンテキストのいずれかが異なる場合は分割せよ。

### External Resource: メソッド引数で受け取る

```typescript
class PendingOrder {
  constructor(private readonly data: OrderData, config: OrderConfig) {
    this.validator = new OrderValidator(config.validationRules);
  }
  async confirm(repository: OrderRepository): Promise<Order> {
    this.validator.validate(this.data);
    const order = Order.fromData(this.data);
    await repository.save(order);
    return order;
  }
}
```

### Non-deterministic: メソッド引数で受け取る

```typescript
class TokenGenerator {
  generate(clock: Clock, random: RandomSource): Token {
    return new Token(clock.now(), random.nextBytes(16));
  }
}
// 本番: generator.generate(new SystemClock(), new SecureRandom())
// テスト: generator.generate(new FixedClock(knownTime), new FakeRandom(knownBytes))
```

---

## Interface 優先パターン

**Abstract Class / 継承は使うな。** Composition over Inheritance。

| 言語 | 推奨 | 禁止 |
|------|------|------|
| Java/TS/C# | Interface + 実装クラス | abstract class, extends |
| Kotlin | Interface + data class | open class継承 |
| Python | Protocol + class | ABC継承, class継承 |
| Swift | Protocol + struct | class継承 |
| Go | interface + struct | 埋め込みによる擬似継承 |
| Rust | Trait + struct | - |

---

## Early Return パターン

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

### 対称パス else の条件

以下の**すべて**を満たす場合のみ `else` を許容:
1. 両方が正常系である（片方がエラー処理ではない）
2. 両方の処理量がほぼ同じ（1-3行程度）
3. 両方が同じ型を返す
4. 論理的に排他的な2択である

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

**対称パス else と Polymorphism の境界:**

| ケース | 対応 |
|--------|------|
| 値の選択のみ（`isGold ? 0.2 : 0.1`） | 対称 else / 三項演算子 |
| 各分岐で異なる計算ロジック | Polymorphism |
| 各分岐に独立したテストケースが必要 | Polymorphism |

---

## 条件式の明確化

### 条件の抽出ルール

| 条件 | 使用箇所 | 対応 |
|------|---------|------|
| 自明な単一条件 | どこでも | そのまま |
| 不明確な単一条件 | どこでも | `isXxx` 変数に抽出 |
| 複合条件（2条件以上）| 1箇所のみ | `isXxx` 変数に抽出 |
| 複合条件（2条件以上）| **2箇所以上** | **Pure クラスに抽出** |

**判断フロー:**

```
この条件は...
├─ 自明か？（null/空/enum比較） → そのまま
├─ 単一条件か？ → isXxx 変数に抽出
└─ 複合条件（2条件以上）か？
    ├─ 1箇所のみで使用 → isXxx 変数に抽出
    └─ 2箇所以上で使用 → Pure クラスに抽出
```

```typescript
// ✅ OK: 自明な単一条件
if (order.status === OrderStatus.CONFIRMED) { /* ... */ }
if (!order) { throw new NotFoundError(); }

// ✅ Good: 意味が不明確 → 変数
const isEligible = customer.totalPurchases > DISCOUNT_THRESHOLD;
if (isEligible) { /* ... */ }

// ✅ Good: 複合条件 → Pure クラス
class ShippingEligibility {
  constructor(private readonly order: Order) {}
  ok(): boolean {
    return this.order.status === OrderStatus.CONFIRMED &&
      this.order.isPaid && !this.order.isCancelled;
  }
}
if (new ShippingEligibility(order).ok()) { /* ... */ }
```

### 「自明」の定義

**変数抽出不要（自明）:**
- null チェック: `x === null`, `!x`
- 空チェック: `x.length === 0`, `x.isEmpty()`
- 存在チェック: `collection.includes(x)`
- enum等値比較: `status === OrderStatus.CONFIRMED`
- 単純な数値比較: `count > 0`, `age >= 18`
- 真偽値そのもの: `isActive`, `!isDeleted`

**変数抽出必要（不明確）:**
- ビジネスルールを含む比較: `totalPurchases > 10000`
- 計算を含む比較: `order.total * 0.1 > shippingCost`
- ドメイン知識が必要な比較: `user.createdAt < thirtyDaysAgo`

---

## Primitive Obsession 回避

### 値オブジェクト作成基準

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
  constructor(readonly amount: number, readonly currency: Currency) {
    if (amount < 0) throw new Error("amount must be non-negative");
  }
}
function charge(money: Money): void { /* ... */ }
```

### マジックナンバー/文字列は名前付き定数にせよ

```typescript
// ❌ Bad
if (retryCount > 3) throw new TooManyRetriesError();
// ✅ Good
const MAX_RETRY_COUNT = 3;
if (retryCount > MAX_RETRY_COUNT) throw new TooManyRetriesError();
```

---

## Parameters と Return Values

### Parameter Object パターン

引数は原則1-2個にせよ。3つ以上は Parameter Object にまとめよ。

```typescript
// ❌ Bad: 引数が多い
function createReservation(customerId: string, date: Date, time: string,
  partySize: number, notes?: string): void { /* ... */ }

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

### 名前付き戻り値 vs タプル

戻り値が複数の値を含む場合、各値に名前を付けよ。生のタプルは原則禁止。

| パターン | 可否 | 理由 |
|---------|:----:|------|
| 単一の値 (`Money`) | ✅ | 名前付け不要 |
| 同種の配列 (`Employee[]`) | ✅ | 単一概念の集合 |
| 名前付きオブジェクト (`{ start: Date, end: Date }`) | ✅ | 各値に名前あり |
| 判別共用体 (`Result<T, E>`) | ✅ | `value`/`error` で名前付き |
| 生タプル (`[Date, Date]`) | ❌ | 順序を覚える必要あり |
| 生タプル (`[Money, string, boolean]`) | ❌ | 意味が不明確 |

**認知負荷の問題:**

| 戻り値の型 | 覚えるべきこと |
|-----------|---------------|
| `Money` | 1（型のみ） |
| `Employee[]` | 1（配列の要素型） |
| `[A, B]` | 3（型A, 型B, 順序） |
| `[A, B, C]` | 6（型A, 型B, 型C, 順序×3） |
| `{ a: A, b: B }` | 2（プロパティ名で自己文書化） |

**特に危険: 同じ型のタプル**

```typescript
// ❌ 禁止: どちらが start でどちらが end か不明
function getDateRange(): [Date, Date]
// ✅ 必須: 名前で明確化
function getDateRange(): { start: Date; end: Date }
```

**許容される例外:**

| 例外 | 理由 | 例 |
|------|------|-----|
| 言語イディオム | 「Go での緩和ルール」で定義済み | Go の `(T, error)` |
| フレームワークAPI（境界層） | 外部APIの消費 | React hooks `[state, setState]` |
| 内部実装 | 即時分解、private メソッド | `const [a, b] = line.split(',')` |

**境界層での例外:** フレームワークが返すタプルの**消費**は許容。**作成**は禁止。

```typescript
// ✅ OK: フレームワークAPIの消費（境界層）
const [state, formAction] = useActionState(submitRingi, null);
// ❌ NG: 自作APIでタプルを返す
function useRingiForm(): [RingiState, (data: RingiData) => void] { /* ... */ }
// ✅ Good: 自作APIは名前付きオブジェクトを返す
function useRingiForm(): { state: RingiState; submit: (data: RingiData) => void } { /* ... */ }
```

**内部実装での例外:** private メソッドや即時分解は許容。ただし、public API には適用しない。

```typescript
// ✅ OK: 内部での即時分解（外部に露出しない）
private parseRow(line: string): void {
  const [date, amount, description] = line.split(',');
}
// ❌ NG: public メソッドでタプルを返す
public parseRow(line: string): [Date, Money, string] { /* ... */ }
// ✅ Good: public メソッドは名前付き型を返す
public parseRow(line: string): ParsedTransaction {
  const [date, amount, description] = line.split(',');
  return new ParsedTransaction(LocalDate.parse(date), Money.of(Number(amount)), description.trim());
}
```

**Result型は例外として許容:** `Result<T, E>` は「名前付き」の判別共用体であるため許容される。

```typescript
type Result<T, E> =
  | { ok: true; value: T }   // ← "value" という名前
  | { ok: false; error: E }; // ← "error" という名前
```

**言語別の緩和:**

| 言語 | 緩和ルール |
|------|-----------|
| Go | `(T, error)` パターンは許容（「Go での緩和ルール」で定義済み） |
| Python | `tuple[A, B]` より `NamedTuple` または `dataclass` を推奨 |
| Rust | `(A, B)` より `struct` を推奨。ただし `Result<T, E>` は標準 |
| TypeScript | 生タプル禁止。`interface` または `type` で名前付け |
