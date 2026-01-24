# CLAUDE.md - 決済API

EC事業者向け決済代行APIサービス。クレジットカード決済、コンビニ決済、銀行振込を統合したREST APIを提供する。

## Architecture Principles

**Base Skill**: `/strict-refactoring` を適用せよ。以下はプロジェクト固有の補足。

### System Classification

| 属性 | 値 |
|------|-----|
| Primary Type | Request-Response / REST API |
| Deployment | Microservices (決済種別ごとに分離) |
| State Complexity | Workflow（決済ステータス遷移） |
| Multi-tenancy | Logical（加盟店ごとのAPI Key） |
| Compliance | High-security（PCI-DSS準拠） |

### Class Classification (このプロジェクト)

| 分類 | 命名パターン | 責務 | 例 |
|------|-------------|------|-----|
| **Command** | `{状態}{Entity}` | 決済状態を変更 | `PendingPayment`, `AuthorizedPayment` |
| **Query** | `{計算内容}` | 手数料計算等 | `TransactionFeeCalculation`, `RefundAmountCalculation` |
| **ReadModel** | `{取得内容}ForXxx` | 取引履歴等 | `TransactionHistoryForMerchant` |

### Polymorphism Preference

状態による振る舞いの分岐は switch/if-else ではなく Polymorphism で表現せよ。
enum は振る舞いを持たない識別子にのみ使用。

### Boundary Layer (このプロジェクト)

境界層は Command/Query/ReadModel の分類外。外部世界とドメインの接点として扱う。
`api/` ディレクトリ配下は全て境界層。

| 分類 | 命名パターン | 責務 | 例 |
|------|-------------|------|-----|
| **Controller** | `{Resource}Controller` | HTTPリクエスト処理 | `PaymentController`, `RefundController` |
| **Middleware** | `{機能}Middleware` | 横断的関心事 | `AuthenticationMiddleware`, `RateLimitMiddleware` |
| **Mapper** | `{対象}Mapper` | DTO↔ドメイン変換 | `PaymentRequestMapper`, `PaymentResponseMapper` |
| **Resolver** | `{対象}Resolver` | Strategy選択 | `CardPaymentResolver` |

## Directory Structure

```
src/
├── payments/                     # 決済コア
│   ├── authorization/           #   オーソリ（与信確保）
│   │   ├── PendingAuthorization.ts        # Command: オーソリ要求
│   │   ├── AuthorizedPayment.ts           # Command: オーソリ完了
│   │   ├── AuthorizationStore.ts
│   │   └── Authorization.test.ts
│   ├── capture/                 #   キャプチャ（売上確定）
│   │   ├── PendingCapture.ts              # Command
│   │   ├── CapturedPayment.ts
│   │   ├── CaptureStore.ts
│   │   └── Capture.test.ts
│   ├── refunds/                 #   返金
│   │   ├── PendingRefund.ts               # Command
│   │   ├── CompletedRefund.ts
│   │   ├── RefundAmountCalculation.ts     # Query
│   │   ├── RefundStore.ts
│   │   └── Refund.test.ts
│   └── cancellation/            #   取消
│       ├── PaymentCancellation.ts         # Command
│       └── Cancellation.test.ts
│
├── methods/                      # 決済手段
│   ├── credit-card/             #   クレジットカード
│   │   ├── CreditCardPaymentGateway.ts    # Interface
│   │   ├── StripeGateway.ts               # 実装
│   │   ├── GmoGateway.ts                  # 実装
│   │   ├── CardPaymentResolver.ts         # Query: Gateway選択
│   │   └── CreditCard.test.ts
│   ├── convenience-store/       #   コンビニ決済
│   │   ├── ConvenienceStorePaymentGateway.ts
│   │   ├── FamilyMartGateway.ts
│   │   ├── SevenElevenGateway.ts
│   │   └── ConvenienceStore.test.ts
│   └── bank-transfer/           #   銀行振込
│       ├── BankTransferGateway.ts
│       └── BankTransfer.test.ts
│
├── merchants/                    # 加盟店管理
│   ├── registration/            #   加盟店登録
│   │   ├── PendingMerchant.ts             # Command: 審査中
│   │   ├── ActiveMerchant.ts              # Command: 有効
│   │   ├── MerchantStore.ts
│   │   └── MerchantRegistration.test.ts
│   ├── api-keys/                #   APIキー管理
│   │   ├── ApiKey.ts
│   │   ├── ApiKeyStore.ts
│   │   └── ApiKey.test.ts
│   └── contracts/               #   契約・手数料
│       ├── MerchantContract.ts
│       ├── TransactionFeeCalculation.ts   # Query
│       └── Contract.test.ts
│
├── transactions/                 # 取引履歴
│   ├── history/                 #   履歴照会
│   │   ├── TransactionHistoryForMerchant.ts  # ReadModel
│   │   └── TransactionHistory.test.ts
│   └── reconciliation/          #   精算
│       ├── DailyReconciliation.ts         # Query
│       └── Reconciliation.test.ts
│
├── webhooks/                     # Webhook配信
│   ├── delivery/                #   配信処理
│   │   ├── PendingWebhook.ts              # Command
│   │   ├── DeliveredWebhook.ts
│   │   ├── WebhookStore.ts
│   │   └── WebhookDelivery.test.ts
│   └── retry/                   #   リトライ
│       ├── WebhookRetryPolicy.ts          # Query
│       └── Retry.test.ts
│
├── api/                          # API層（境界層）
│   ├── controllers/             #   コントローラ
│   │   ├── PaymentController.ts
│   │   ├── RefundController.ts
│   │   └── WebhookController.ts
│   ├── middleware/              #   ミドルウェア
│   │   ├── AuthenticationMiddleware.ts
│   │   ├── RateLimitMiddleware.ts
│   │   └── IdempotencyMiddleware.ts
│   └── mappers/                 #   リクエスト/レスポンス変換
│       ├── PaymentRequestMapper.ts
│       └── PaymentResponseMapper.ts
│
└── value-objects/                # 値オブジェクト・共通型
    ├── Money.ts
    ├── Currency.ts
    ├── IdempotencyKey.ts
    └── MerchantId.ts
```

## State Transitions

### 決済 (Payment)

```
[PendingAuthorization] ──authorize()──→ [Authorized]
                                             │
                                     capture()│void()
                                             ↓       ↓
                                      [Captured] [Voided]
                                             │
                                       refund()│
                                             ↓
                                      [Refunded] (partial or full)
```

**Command Classes**:

```typescript
// オーソリ要求 → オーソリ完了
class PendingAuthorization {
  constructor(
    private readonly merchantId: MerchantId,
    private readonly amount: Money,
    private readonly cardToken: CardToken,
    private readonly idempotencyKey: IdempotencyKey
  ) {
    if (amount.isNegative()) throw new Error("金額は正の値である必要があります");
  }

  async authorize(
    gateway: CreditCardPaymentGateway,
    store: AuthorizationStore
  ): Promise<AuthorizedPayment> {
    // 冪等性チェック
    const existing = await store.findByIdempotencyKey(this.idempotencyKey);
    if (existing) return existing;

    const result = await gateway.authorize(this.cardToken, this.amount);
    const payment = AuthorizedPayment.from(this, result);
    await store.save(payment);
    return payment;
  }
}

// オーソリ完了 → キャプチャ or 取消
class AuthorizedPayment {
  async capture(
    gateway: CreditCardPaymentGateway,
    store: CaptureStore,
    amount?: Money  // 部分キャプチャ対応
  ): Promise<CapturedPayment> {
    const captureAmount = amount ?? this.authorizedAmount;
    const result = await gateway.capture(this.transactionId, captureAmount);
    const payment = CapturedPayment.from(this, result);
    await store.save(payment);
    return payment;
  }

  async void(
    gateway: CreditCardPaymentGateway,
    store: AuthorizationStore
  ): Promise<VoidedPayment> {
    await gateway.void(this.transactionId);
    const payment = VoidedPayment.from(this);
    await store.save(payment);
    return payment;
  }
}
```

### Webhook配信

```
[Pending] ──deliver()──→ [Delivered]
    │                        
    │ (失敗時)               
    ↓                        
[Failed] ──retry()──→ [Pending]
    │
    │ (リトライ上限)
    ↓
[Abandoned]
```

## Naming Conventions

### Entity名（日英対応）

| 日本語 | English Class | Store |
|--------|---------------|-------|
| 決済 | `Payment` | `PaymentStore` |
| オーソリ | `Authorization` | `AuthorizationStore` |
| キャプチャ | `Capture` | `CaptureStore` |
| 返金 | `Refund` | `RefundStore` |
| 加盟店 | `Merchant` | `MerchantStore` |
| 取引 | `Transaction` | `TransactionStore` |
| Webhook | `Webhook` | `WebhookStore` |

### 状態名（日英対応）

| 日本語 | English | 使用場面 |
|--------|---------|---------|
| 処理中 | `Pending` | 処理待ち |
| オーソリ済 | `Authorized` | 与信確保完了 |
| 売上確定 | `Captured` | キャプチャ完了 |
| 取消済 | `Voided` | オーソリ取消 |
| 返金済 | `Refunded` | 返金完了 |
| 失敗 | `Failed` | 処理失敗 |

## API Design Conventions

### エンドポイント命名

```
POST   /v1/payments              # 決済作成（オーソリ）
GET    /v1/payments/{id}         # 決済取得
POST   /v1/payments/{id}/capture # キャプチャ
POST   /v1/payments/{id}/void    # 取消
POST   /v1/payments/{id}/refund  # 返金

GET    /v1/transactions          # 取引一覧
GET    /v1/transactions/{id}     # 取引詳細
```

### リクエスト/レスポンス形式

```typescript
// リクエスト
interface CreatePaymentRequest {
  amount: number;
  currency: string;
  card_token: string;
  description?: string;
  metadata?: Record<string, string>;
  idempotency_key: string;  // 必須
}

// レスポンス
interface PaymentResponse {
  id: string;
  status: "authorized" | "captured" | "voided" | "refunded";
  amount: number;
  currency: string;
  created_at: string;
  captured_at?: string;
}

// エラーレスポンス (RFC 7807)
interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
}
```

### 冪等性

全ての POST リクエストは `Idempotency-Key` ヘッダーを必須とする:

```typescript
class IdempotencyMiddleware {
  async handle(req: Request, next: NextFunction): Promise<Response> {
    const key = req.headers["idempotency-key"];
    if (!key) {
      throw new BadRequestError("Idempotency-Key header is required");
    }

    const cached = await this.cache.get(key);
    if (cached) {
      return cached.response;
    }

    const response = await next(req);
    await this.cache.set(key, { response }, TTL_24_HOURS);
    return response;
  }
}
```

## Security Requirements

### 認証

```typescript
// API Key認証
class AuthenticationMiddleware {
  async handle(req: Request, next: NextFunction): Promise<Response> {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      throw new UnauthorizedError("API key is required");
    }

    const merchant = await this.merchantStore.findByApiKey(apiKey);
    if (!merchant || !merchant.isActive()) {
      throw new UnauthorizedError("Invalid API key");
    }

    req.merchant = merchant;
    return next(req);
  }
}
```

### レート制限

| エンドポイント | 制限 |
|--------------|------|
| POST /payments | 100 req/min per merchant |
| GET /transactions | 1000 req/min per merchant |
| Webhook配信 | 10 req/sec per endpoint |

### カード情報の取り扱い

- カード番号は**絶対にログに出力しない**
- トークン化されたカード情報のみ扱う
- PAN（カード番号）の保存は禁止

```typescript
// ❌ 禁止
console.log(`Processing card: ${cardNumber}`);

// ✅ トークンのみ
console.log(`Processing card token: ${cardToken}`);
```

## Testing Conventions

### テストダブル

```typescript
// Gateway のモック
class MockCreditCardGateway implements CreditCardPaymentGateway {
  private responses: Map<string, AuthorizationResult> = new Map();

  setResponse(token: string, result: AuthorizationResult): void {
    this.responses.set(token, result);
  }

  async authorize(token: CardToken, amount: Money): Promise<AuthorizationResult> {
    return this.responses.get(token.value) ?? AuthorizationResult.declined();
  }
}
```

### テストシナリオ

```typescript
describe("PendingAuthorization", () => {
  it("成功時にAuthorizedPaymentを返す", async () => {
    const gateway = new MockCreditCardGateway();
    gateway.setResponse("tok_123", AuthorizationResult.approved("txn_456"));

    const pending = new PendingAuthorization(
      MerchantId.of("m_001"),
      Money.of(1000, Currency.JPY),
      CardToken.of("tok_123"),
      IdempotencyKey.of("idem_789")
    );

    const result = await pending.authorize(gateway, store);

    expect(result.status).toBe("authorized");
    expect(result.transactionId.value).toBe("txn_456");
  });

  it("同じIdempotencyKeyで2回呼んでも1回しか課金されない", async () => {
    // 冪等性テスト
  });
});
```

## Quick Commands

```bash
# Development
pnpm dev                    # Start API server
pnpm test                   # Run all tests
pnpm test:unit              # Unit tests only
pnpm test:integration       # Integration tests

# Quality
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript check
pnpm security:scan          # OWASP dependency check

# Database
pnpm db:migrate             # Run migrations

# API Documentation
pnpm openapi:generate       # Generate OpenAPI spec
pnpm openapi:validate       # Validate OpenAPI spec
```

## Checklist

### Coding Style

- [ ] else 句を使わず Early Return しているか
- [ ] 条件分岐は Polymorphism で表現しているか（switch/if-else より優先）

### 新規エンドポイント作成時

- [ ] 冪等性キーを必須にしているか
- [ ] レート制限を設定しているか
- [ ] 認証ミドルウェアを適用しているか
- [ ] OpenAPI仕様を更新したか

### 決済処理変更時

- [ ] 状態遷移図と整合しているか
- [ ] 冪等性を担保しているか
- [ ] ロールバック/補償処理を考慮したか
- [ ] Webhook配信を実装したか

### セキュリティ

- [ ] カード情報をログに出力していないか
- [ ] トークン化されたデータのみ使用しているか
- [ ] エラーメッセージに機密情報を含めていないか
