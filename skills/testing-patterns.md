# Testing Patterns

## Table of Contents
- [Test Naming Conventions](#test-naming-conventions)
- [Testing Strategy by Dependency Type](#testing-strategy-by-dependency-type)
- [Test Pyramid + Trophy Hybrid](#test-pyramid--trophy-hybrid)
- [Test Data Factory Pattern](#test-data-factory-pattern)
- [Test Data Strategy Priority](#test-data-strategy-priority)
- [InMemory Repository](#inmemory-repository)
- [DB Integration Guidelines](#db-integration-guidelines)
- [Test Isolation](#test-isolation)
- [External Service Testing](#external-service-testing)

---

## Test Naming Conventions

### Naming Patterns

| Type | Pattern | Example |
|------|---------|---------|
| **Unit (Happy)** | `{Subject} は {input} に対して {output} を返すべき` | `ConsumptionTaxOn は1000円に対して100円を返すべき` |
| **Unit (State)** | `{Subject} は {action} すると {state} になるべき` | `DraftRingi は申請すると申請済みになるべき` |
| **Unit (Error)** | `{Subject} は {condition} の場合 {error} を返すべき` | `TaxOn は負の金額の場合 ValidationError を返すべき` |
| **Unit (Boundary)** | `{Subject} は {boundary} でも {behavior} すべき` | `ExpenseReport は明細0件の場合 ValidationError を返すべき` |
| **Integration** | `{A} を {action} すると {result} として記録されるべき` | `起案稟議を申請すると申請済稟議として記録されるべき` |
| **E2E (Feature)** | `{User} が {action} すると {observable} が表示されるべき` | `営業担当者が経費精算を提出すると完了画面が表示されるべき` |
| **E2E (Perf)** | `{User} が {action} すると {metric} 以内に {result} すべき` | `営業担当者が一覧を開くと3秒以内に表示されるべき` |

### Prohibited
- `〜できるべき` (generic) → Use concrete verb-specific expressions
- `快適に〜` (subjective) → Use observable results
- Technical terms (Repository) → Use domain language

---

## Testing Strategy by Dependency Type

| Dependency | Testing Method |
|------------|----------------|
| Pure Logic | Unit test dependency class. Parent is integration |
| Configured | Test with different Config values |
| External Resource | Mock injection |
| Non-deterministic | Mock with fixed values |

### Pure Logic Test
```typescript
describe("ExpenseValidator", () => {
  it("ExpenseValidator は 金額が0以下の場合 拒否を返すべき", () => {
    const validator = new ExpenseValidator();
    expect(validator.isValid(new ExpenseItem({ amount: Money.of(-100) }))).toBe(false);
  });
});
```

### Non-deterministic Test (Fake)
```typescript
class FixedClock implements Clock {
  constructor(private readonly fixedTime: Date) {}
  now(): Date { return this.fixedTime; }
}
it("InvoiceFromOrder は Clockの時刻を使用して発行日時を設定するべき", () => {
  const clock = new FixedClock(new Date("2025-01-31T23:59:59+09:00"));
  const invoice = new InvoiceFromOrder(order).result(clock);
  expect(invoice.issuedAt).toEqual(clock.fixedTime);
});
```

---

## Test Pyramid + Trophy Hybrid

```
    [Static: TypeScript, ESLint]
              /\
             /E2E\          <- 10%（クリティカルパスのみ）
            /------\
           / 統合   \       <- 40%（Command + InMemory Repository）
          /----------\
         /   単体     \     <- 50%（Pure Logic）
        /--------------\
```

| Type | Ratio | Target | Mock |
|------|-------|--------|------|
| **Static** | - | Type checking, ESLint | - |
| **Unit** | 50% | Pure Logic | None |
| **Integration** | 40% | Command + InMemory Repository | InMemory only |
| **E2E** | 10% | Critical paths (payment, auth) | None (real env) |

---

## Test Data Factory Pattern

### Factory Design Rules

| Rule | Description |
|------|-------------|
| **Aggregate Root Unit** | 1 Factory = 1 Aggregate Root |
| **Method per State** | `draft()`, `submitted()`, `approved()` |
| **No Branching** | No if/switch in Factory |
| **Under 20 lines** | If over, Aggregate is too complex |
| **Explicit Dependencies** | Don't implicitly call other Factories |

### Example
```typescript
export class RingiTestFactory {
  private static readonly DEFAULTS = { title: 'テスト稟議', amount: Money.of(10000) };

  static draft(overrides?: Partial<RingiTestData>): DraftRingi {
    const id = RingiId.generate();
    const data = { ...RingiTestFactory.DEFAULTS, ...overrides };
    const result = DraftRingi.create(id, data as ValidatedRingiInput);
    if (!result.ok) throw new Error(`Test data creation failed: ${result.error.message}`);
    return result.value;
  }

  static async submitted(overrides?: Partial<RingiTestData>): Promise<SubmittedRingi> {
    const draft = RingiTestFactory.draft(overrides);
    return draft.submit(new InMemoryRingiRepository(), new FixedClock(new Date("2025-01-25")));
  }
}

it('承認できる', async () => {
  const ringi = await RingiTestFactory.submitted({ amount: Money.of(50000) });
  const result = await ringi.approve(new InMemoryRingiRepository());
  expect(result).toBeInstanceOf(ApprovedRingi);
});
```

---

## Test Data Strategy Priority

| Priority | Strategy | Use Case |
|:--------:|----------|----------|
| 1 | **Inline Literals** | Simple tests |
| 2 | **Test Data Factory** | Complex domain objects |
| 3 | **InMemory Repository** | Command tests |
| 4 | **Testcontainers** | ReadModel, SQL validation |
| 5 | ~~Shared Fixtures~~ | **Prohibited** |

---

## InMemory Repository

**All Repository Interfaces must have InMemory implementation.**

```typescript
interface RingiRepository {
  save(ringi: Ringi): Promise<void>;
  findById(id: RingiId): Promise<Ringi | null>;
}

class InMemoryRingiRepository implements RingiRepository {
  private ringis = new Map<string, Ringi>();
  async save(ringi: Ringi): Promise<void> { this.ringis.set(ringi.id.value, ringi); }
  async findById(id: RingiId): Promise<Ringi | null> { return this.ringis.get(id.value) ?? null; }
}

describe("DraftRingi", () => {
  it("DraftRingi を申請すると Repositoryに保存されるべき", async () => {
    const repository = new InMemoryRingiRepository();
    const clock = new FixedClock(new Date("2025-01-25"));
    const id = RingiId.generate();
    const validData: ValidatedRingiInput = { title: "テスト稟議", amount: Money.of(50000) };
    const ringi = await new DraftRingi(id, validData).submit(repository, clock);
    expect(await repository.findById(ringi.id)).toEqual(ringi);
  });
});
```

---

## DB Integration Guidelines

| Class Type | Recommended Test | DB Required? |
|------------|-----------------|:------------:|
| Pure | Pure unit test | ❌ |
| Command | InMemory Repository | ❌ |
| ReadModel | Testcontainers | ✅ |
| Repository Implementation | Testcontainers | ✅ |

**Principle**: Most tests don't need DB. Only ReadModel and Repository implementation tests use real DB.

---

## Test Isolation

Use transaction rollback for test isolation in DB integration tests.

```typescript
describe('RingiApproval', () => {
  let testDb: TestDatabase; let tx: Transaction;
  beforeAll(async () => { testDb = await TestDatabase.create(); });
  afterAll(async () => { await testDb.close(); });
  beforeEach(async () => { tx = await testDb.beginTransaction(); });
  afterEach(async () => { await tx.rollback(); });

  it('SubmittedRingi を承認すると ApprovedRingiとして取得できるべき', async () => {
    const ringi = await RingiTestFactory.insertSubmitted(tx, { amount: Money.of(50000) });
    const repository = new PostgresRingiRepository(tx);
    const approved = await ringi.approve(repository);
    expect(approved).toBeInstanceOf(ApprovedRingi);
  });
});
```

---

## External Service Testing

External services (S3, SendGrid, Stripe, etc.) must be abstracted with **Gateway pattern**.

### Gateway Pattern
```typescript
interface FileStorageGateway {
  upload(file: File): Promise<FileUrl>;
  download(url: FileUrl): Promise<File>;
  delete(url: FileUrl): Promise<void>;
}

class S3FileStorageGateway implements FileStorageGateway {
  constructor(private readonly s3Client: S3Client) {}
  async upload(file: File): Promise<FileUrl> {
    await this.s3Client.send(new PutObjectCommand({...}));
    return FileUrl.of(`s3://bucket/${file.name}`);
  }
}
```

### Test Double Selection Matrix

| Service Type | Examples | Unit Test | Integration Test |
|---------------|----------|-----------|------------------|
| **Stateful Storage** | S3, GCS, Azure Blob | **Fake** (InMemory) | LocalStack / Testcontainers |
| **Message Queue** | SQS, RabbitMQ, Kafka | **Fake** (InMemory) | LocalStack / Testcontainers |
| **Notification** | SendGrid, Twilio, FCM | **Mock** (call verification) | MailHog (optional) |
| **Payment** | Stripe, PayPal | **Stub** (fixed response) | Sandbox + Contract Test |
| **External API** | Weather, Maps | **Stub** (fixed response) | Contract Test |

**Criteria:** Fake (stateful, InMemory), Mock (call verification), Stub (fixed response)

### Fake Implementation
```typescript
export class InMemoryFileStorageGateway implements FileStorageGateway {
  private readonly files = new Map<string, Buffer>();
  async upload(file: File): Promise<FileUrl> {
    const url = FileUrl.of(`memory://${file.name}`);
    this.files.set(url.value, file.content);
    return url;
  }
  async download(url: FileUrl): Promise<File> {
    const content = this.files.get(url.value);
    if (!content) throw new FileNotFoundError(url);
    return new File(url.fileName, content);
  }
  clear(): void { this.files.clear(); }
}
```

### Mock Implementation
```typescript
export class MockEmailGateway implements EmailGateway {
  private readonly sentEmails: Email[] = [];
  async send(email: Email): Promise<void> { this.sentEmails.push(email); }
  wasSentTo(address: EmailAddress): boolean { return this.sentEmails.some(e => e.to.equals(address)); }
  sentCount(): number { return this.sentEmails.length; }
  clear(): void { this.sentEmails.length = 0; }
}

describe("OrderConfirmationService", () => {
  it("OrderConfirmationService は 注文確定時 に対して 確認メール送信結果 を返すべき", async () => {
    const emailGateway = new MockEmailGateway();
    const service = new OrderConfirmationService(emailGateway);
    await service.confirm(order);
    expect(emailGateway.wasSentTo(order.customer.email)).toBe(true);
  });
});
```

### Stub Implementation
```typescript
export class StubPaymentGateway implements PaymentGateway {
  private nextResponse: PaymentResult = PaymentResult.success("stub-charge-id");
  async charge(amount: Money, card: CardToken): Promise<PaymentResult> { return this.nextResponse; }
  willSucceed(chargeId: string = "stub-charge-id"): void { this.nextResponse = PaymentResult.success(chargeId); }
  willFail(reason: PaymentFailureReason): void { this.nextResponse = PaymentResult.failure(reason); }
}

describe("CheckoutService", () => {
  it("CheckoutService は 決済失敗時 に対して カード拒否エラー を返すべき", async () => {
    const paymentGateway = new StubPaymentGateway();
    paymentGateway.willFail(PaymentFailureReason.CARD_DECLINED);
    const service = new CheckoutService(paymentGateway);
    const result = await service.checkout(cart, card);
    expect(result.ok).toBe(false);
  });
});
```

### Test Double Placement (Colocation)
```
src/
├── documents/
│   ├── FileStorageGateway.ts
│   ├── S3FileStorageGateway.ts
│   └── __tests__/doubles/
│       └── InMemoryFileStorageGateway.ts
├── notifications/
│   ├── EmailGateway.ts
│   └── __tests__/doubles/
│       └── MockEmailGateway.ts
└── payments/
    ├── PaymentGateway.ts
    └── __tests__/doubles/
        └── StubPaymentGateway.ts
```

**Rules:** Test doubles in `__tests__/doubles/`. Shared doubles in common parent (`src/__tests__/doubles/`). Share only when used in 3+ places.

### Integration Test (Testcontainers)
```typescript
import { GenericContainer } from "testcontainers";

describe("S3FileStorageGateway Integration", () => {
  let container: StartedTestContainer; let gateway: S3FileStorageGateway;

  beforeAll(async () => {
    container = await new GenericContainer("localstack/localstack").withExposedPorts(4566).start();
    const s3Client = new S3Client({ endpoint: `http://localhost:${container.getMappedPort(4566)}` });
    gateway = new S3FileStorageGateway(s3Client);
  }, 60000);

  afterAll(async () => { await container.stop(); });

  it("S3FileStorageGateway は ファイルをアップロードして ダウンロード結果 を返すべき", async () => {
    const file = new File("test.txt", Buffer.from("hello"));
    const url = await gateway.upload(file);
    const downloaded = await gateway.download(url);
    expect(downloaded.content.toString()).toBe("hello");
  });
});
```

### Contract Test
```typescript
describe("StripePaymentGateway Contract", () => {
  const gateway = new StripePaymentGateway(process.env.STRIPE_TEST_KEY!);

  it("StripePaymentGateway は テストカード に対して 決済成功結果 を返すべき", async () => {
    const result = await gateway.charge(Money.of(1000, "JPY"), CardToken.of("tok_visa"));
    expect(result.ok).toBe(true);
  });

  it("StripePaymentGateway は 拒否カード に対して 決済失敗結果 を返すべき", async () => {
    const result = await gateway.charge(Money.of(1000, "JPY"), CardToken.of("tok_chargeDeclined"));
    expect(result.ok).toBe(false);
  });
});
```

### Test Execution Separation
```json
{
  "scripts": {
    "test": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:contract": "vitest run --config vitest.contract.config.ts"
  }
}
```
