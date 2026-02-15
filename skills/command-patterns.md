# Command/Pure/ReadModel Patterns

## Table of Contents

1. [3分類の判断フロー](#3分類の判断フロー)
2. [Command パターン](#command-パターン)
3. [Pure パターン](#pure-パターン)
4. [ReadModel パターン](#readmodel-パターン)
5. [Repository 設計指針](#repository-設計指針)
6. [ポリモーフィズムによる分岐排除](#ポリモーフィズムによる分岐排除)
7. [Resolver パターン](#resolver-パターン)
8. [境界層での許容分岐](#境界層での許容分岐)
9. [YAGNI/Polymorphism 判断基準](#yagnipolymorphism-判断基準)

---

## 3分類の判断フロー

| 分類 | 定義 | 副作用 | 外部依存 |
|------|------|:------:|:------:|
| **Command** | 永続状態を変更する、または外部システムに作用する | あり | あり |
| **Pure** | 型変換、計算、判定（純粋関数） | なし | なし |
| **ReadModel** | 永続層から読み取り専用でデータを取得 | なし | あり |

**判断フロー:** 永続化/外部通信 → YES+書き込み:Command, YES+読取:ReadModel, NO:Pure

---

## Command パターン

永続状態を変更する、または外部システムに作用するクラス。**必ず副作用を伴う。**

### Pending Object Pattern

```
{状態}{Entity}(入力データ).{遷移}(依存) → {結果Entity}
```

**操作:** `Draft{Entity}`→`submit`, `Awaiting{Entity}`→`approve`, `{Entity}Change`→`apply`, `{Entity}Cancellation`→`execute`

**状態名:** `Draft`（下書き）, `Pending`（処理待ち）, `Awaiting`（承認待ち）, `Unvalidated`（未検証）, `Outgoing`（送信予定）

### 実装例（正規例）

```typescript
class DraftRingi {
  private constructor(readonly id: RingiId, private readonly data: ValidatedRingiInput) {}

  static create(id: RingiId, data: ValidatedRingiInput): Result<DraftRingi, RingiAmountExceededError> {
    if (data.amount.isGreaterThan(Money.of(100_000_000))) {
      return Result.err(RingiErrors.amountExceeded(id, data.amount, Money.of(100_000_000)));
    }
    return Result.ok(new DraftRingi(id, data));
  }

  async submit(repository: RingiRepository, clock: Clock): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data, clock.now());
    await repository.save(submitted);
    return submitted;
  }
}

class ExpenseReportChange {
  private constructor(private readonly current: ExpenseReport, private readonly newItems: ExpenseItem[]) {}

  static create(current: ExpenseReport, newItems: ExpenseItem[]): Result<ExpenseReportChange, ValidationError> {
    if (newItems.length === 0) {
      return Result.err(DomainErrors.validation([
        new ValidationViolation('items', 'REQUIRED', '経費明細は1件以上必要です')
      ]));
    }
    return Result.ok(new ExpenseReportChange(current, newItems));
  }

  async apply(repository: ExpenseReportRepository): Promise<ExpenseReport> {
    const updated = this.current.withItems(this.newItems);
    await repository.save(updated);
    return updated;
  }
}
```

---

## Pure パターン

外部依存のない純粋関数クラス。**副作用なし、モック不要でテスト可能。**

**Pure が担う役割:**
- 型変換: `Unvalidated{Entity}` → `validate()`, `parse()`
- 計算: `{計算内容}On` → `amount()`, `rate()`
- 判定: `{Entity}Policy` → `ok()`, `satisfied()`

### 実装例

```typescript
class UnvalidatedExpense {
  constructor(private readonly data: ExpenseData) {}
  validate(rules: ExpenseRules): Result<ValidatedExpense, ValidationError> {
    const errors = rules.check(this.data);
    return errors.length > 0
      ? Result.err(DomainErrors.validation(errors))
      : Result.ok(new ValidatedExpense(this.data));
  }
}

class ConsumptionTaxOn {
  private static readonly RATE = 0.10;
  constructor(private readonly subtotal: Money) {}
  amount(): Money {
    return this.subtotal.multiply(ConsumptionTaxOn.RATE);
  }
}

class ExpensePolicyCompliance {
  constructor(private readonly expense: Expense, private readonly policy: ExpensePolicy) {}
  ok(): boolean {
    return this.expense.amount.isLessThanOrEqual(this.policy.maxAmount) &&
           this.policy.allowedCategories.includes(this.expense.category);
  }
}

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
}

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
```

---

## ReadModel パターン

永続層からデータを読み取るクラス。**読み取り専用、書き込みなし。**

```
{取得内容}(検索条件).fetch(conn): Promise<{結果}>
```

```typescript
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

class MonthlyExpenseSummary {
  constructor(private readonly department: Department, private readonly month: YearMonth) {}
  async fetch(conn: DatabaseConnection): Promise<ExpenseAggregate> {
    const row = await conn.queryOne(`
      SELECT SUM(amount) as total, COUNT(*) as count, category
      FROM expenses
      WHERE department_id = ? AND year_month = ? AND status = 'approved'
      GROUP BY category
    `, [this.department.id.value, this.month.value]);
    return new ExpenseAggregate(row);
  }
}
```

---

## Repository 設計指針

**原則:** Interface 定義, Aggregate Root 単位, 単一キー検索, ドメインオブジェクト返却

**許容:** `save(entity)`, `findById(id)`, `findByNaturalKey(key)`, `delete(id)`

**ReadModel に分離:** `findByCustomerAndDateRange(...)`, `searchByKeyword(keyword)`

```
Aggregate Root = 整合性の境界を持つエンティティの集合のルート
┌─────────────────────────────┐
│ Ringi (Aggregate Root)      │  ← RingiRepository
│   ├── ApprovalStep[]        │  ← Ringi と一緒に保存
│   └── Attachment[]          │
└─────────────────────────────┘
```

---

## ポリモーフィズムによる分岐排除

複数のロジックバリエーションがある場合、**Interface + 実装クラス**で表現せよ。

```typescript
// ❌ 禁止: enum + switch でビジネスロジック
class ApprovalProcessor {
  process(ringi: Ringi, approverRole: Role): void {
    switch (approverRole) {
      case Role.MANAGER:
        // 課長の承認ロジック...
        break;
    }
  }
}

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

interface ApprovalRouteStrategy {
  nextApprovers(ringi: Ringi): Employee[];
}

class StandardApprovalRoute implements ApprovalRouteStrategy {
  nextApprovers(ringi: Ringi): Employee[] {
    return [ringi.applicant.manager, ringi.applicant.director];
  }
}

class HighValueApprovalRoute implements ApprovalRouteStrategy {
  nextApprovers(ringi: Ringi): Employee[] {
    return [ringi.applicant.manager, ringi.applicant.director, ...this.executiveCommittee()];
  }
  private executiveCommittee(): Employee[] {}
}

class UrgentApprovalRoute implements ApprovalRouteStrategy {
  nextApprovers(ringi: Ringi): Employee[] {
    return [ringi.applicant.manager];
  }
}
```

---

## Resolver パターン

Resolver は **Factory パターンの一種** として、条件に基づいて Strategy や実装を選択する。境界層専用。

```typescript
class ApprovalRouteResolver {
  private static readonly HIGH_VALUE_THRESHOLD = Money.of(1_000_000);
  constructor(private readonly ringi: Ringi) {}

  resolve(): ApprovalRouteStrategy {
    if (this.ringi.isUrgent) {
      return new UrgentApprovalRoute();
    }
    if (this.ringi.amount.isGreaterThan(ApprovalRouteResolver.HIGH_VALUE_THRESHOLD)) {
      return new HighValueApprovalRoute();
    }
    return new StandardApprovalRoute();
  }
}

class ExpenseRuleResolver {
  constructor(private readonly expense: Expense) {}
  resolve(): ExpenseRule {
    switch (this.expense.category) {
      case ExpenseCategory.TRAVEL: return new TravelExpenseRule();
      case ExpenseCategory.ENTERTAINMENT: return new EntertainmentExpenseRule();
      default: return new GeneralExpenseRule();
    }
  }
}
```

---

## 境界層での許容分岐

| 層 | 責務 |
|---|------|
| **境界層** | 外部世界との接点（HTTP, DB, Queue） |
| **ドメイン層** | ビジネスルール、状態遷移 |

```typescript
// ✅ OK: 境界層での分岐（Mapper）
class RingiStatusMapper {
  static fromString(value: string): RingiStatus {
    switch (value) {
      case "draft": return RingiStatus.DRAFT;
      case "submitted": return RingiStatus.SUBMITTED;
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

---

## YAGNI/Polymorphism 判断基準

### いつ適用しないか

プロトタイプ/PoC, 分岐2つで値選択のみ, 将来増える見込みなし, 1回しか使わない計算 → 緩和

### Polymorphism の判断基準

```
1. 各分岐で異なる計算ロジックを持つか？ → YES: Polymorphism
2. 各分岐に独立したテストケースが必要か？ → YES: Polymorphism
3. 分岐が将来増える可能性が高いか？ → YES: Polymorphism
4. 上記すべて NO → if/else または三項演算子
```

| ケース | 判断 | 理由 |
|--------|:----:|------|
| 定数を返すだけ | if/else | 計算ロジックなし |
| 会員種別ごとに割引計算式が異なる | Polymorphism | 異なる計算ロジック |
| 状態によってバリデーションルールが異なる | Polymorphism | 独立したテストが必要 |

### コード例

```typescript
// ✅ if/else で十分: 値の選択のみ
const discount = member.isGold ? 0.2 : 0.1;

// ✅ Polymorphism: 各分岐で異なる計算ロジック
interface MemberDiscount {
  calculate(order: Order): Money;
}

class GoldMemberDiscount implements MemberDiscount {
  calculate(order: Order): Money {
    const base = order.subtotal.multiply(0.1);
    const bonus = order.subtotal.isGreaterThan(Money.of(10000))
      ? order.subtotal.multiply(0.05)
      : Money.ZERO;
    return base.add(bonus);
  }
}

class StandardMemberDiscount implements MemberDiscount {
  calculate(order: Order): Money {
    return order.subtotal.multiply(0.05);
  }
}
```

### Pending Object Pattern のスケーラビリティ

| 状態数 | 推奨アプローチ |
|--------|---------------|
| 2-4 | Pending Object Pattern |
| 5-7 | Pending Object Pattern または State パターン |
| 8+ | State パターン、または状態機械ライブラリ |

### ドットチェーンのルール

```typescript
// ❌ Bad: プロパティの深いアクセス
this.ringi.applicant.department.name

// ✅ Good: メソッドで隠蔽
this.ringi.applicantDepartmentName()

// ✅ OK: Fluent API
const ringi = RingiBuilder.create().withTitle("備品購入").withAmount(Money.of(50000)).build();

// ✅ OK: 関数型チェーン
const total = items
  .filter(item => item.isApproved)
  .map(item => item.amount)
  .reduce((sum, amount) => sum.add(amount), Money.ZERO);
```
