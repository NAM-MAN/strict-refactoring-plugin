# Language Guides

- [言語別の適用度合い](#言語別の適用度合い)
- [Go での緩和ルール](#go-での緩和ルール)
- [言語間の構文対応表](#言語間の構文対応表)
- [ディレクトリ構造: 概念ベースMECE](#ディレクトリ構造-概念ベースmece)
- [パフォーマンス考慮](#パフォーマンス考慮)
- [既存プロジェクトへの適用](#既存プロジェクトへの適用)
- [フレームワーク別ガイダンス](#フレームワーク別ガイダンス)
  - [NestJS](#nestjs)
  - [Next.js (App Router)](#nextjs-app-router)
  - [Spring Boot (Java/Kotlin)](#spring-boot-javakotlin)
- [アーキテクチャ別の適用](#アーキテクチャ別の適用)
  - [モノリス](#モノリス)
  - [マイクロサービス](#マイクロサービス)

---

## 言語別の適用度合い

本スキルの対象言語は、OOP を主軸とし、部分的に関数型の考えを導入している言語です。

**対象言語:**
- Java, Kotlin, Scala
- C#, F#
- TypeScript, JavaScript
- Python
- Swift
- Go
- Rust

**純粋関数型言語（Haskell, Elixir, Clojure等）は対象外。**

| 言語 | 適用度 | 注意点 |
|------|--------|--------|
| Java/Kotlin/C# | 高 | 本スキルに最も適合 |
| TypeScript/Python | 高 | 型チェッカー（mypy等）の導入を推奨 |
| Swift | 高 | struct優先 |
| Go | 中 | 下記「Go での緩和ルール」参照 |
| Rust | 中 | 所有権システムとの兼ね合いで柔軟に適用。match式は許容 |

---

## Go での緩和ルール

Go はシンプルさを重視する文化を持つ。以下のルールを緩和せよ:

| 本スキルのルール | Go での扱い |
|------------------|-------------|
| 条件式の変数抽出 | `if err != nil` は抽出不要。そのまま書いてよい |
| interface 優先 | 先行定義不要。2つ以上の実装が必要になった時点で抽出せよ |
| 小さな struct 分割 | 過度な分割より、明快な関数を優先してよい |
| ドットチェーン制限 | receiver methods のチェーンは許容 |
| Polymorphism | 単純な type switch は許容（interface が過剰な場合） |
| Command/Pure/ReadModel 分類 | struct + receiver method で表現。Pending Object Pattern は適用 |

### Go での Command/Pure 実装例

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

func (p *PendingReservation) Confirm(repo ReservationRepository) (*Reservation, error) {
    reservation := NewReservation(p.data)
    if err := repo.Save(reservation); err != nil {
        return nil, err
    }
    return reservation, nil
}

// Pure: struct + receiver method
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

---

## 言語間の構文対応表

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

---

## ディレクトリ構造: 概念ベースMECE

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

### 共通コードの配置（コロケーションルールの適用）

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

---

## パフォーマンス考慮

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

---

## 既存プロジェクトへの適用

一度に全て変更するな。以下の順序で段階的に適用せよ:

1. **新規コード:** 本スキルに従って書け
2. **変更するコード:** 変更箇所のみリファクタリングせよ
3. **大規模リファクタ:** チームで合意後、モジュール単位で実施せよ

---

## フレームワーク別ガイダンス

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

    // submit はドメインエラーがないので Promise<SubmittedRingi> を返す
    // InfrastructureError は throw される（Controller でキャッチ）
    const submitted = await draftResult.value.submit(this.repository, this.clock);
    return Result.ok(submitted);
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
| Command/Pure/ReadModel 分類 | Server Actions = Command, RSC = ReadModel |
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

  // 3. Command 実行
  // submit はドメインエラーがないので Promise<SubmittedRingi> を返す
  // InfrastructureError は throw されるので error.tsx で処理
  const submitted = await draftResult.value.submit(repository, systemClock);
  return { ok: true, data: submitted };
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
| Pure | Record / data class で実装 |

---

## アーキテクチャ別の適用

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
