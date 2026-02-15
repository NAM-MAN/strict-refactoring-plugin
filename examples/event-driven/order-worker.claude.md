# CLAUDE.md - 注文処理ワーカー

ECサイトの注文処理を担当するバックグラウンドワーカー。注文キューからメッセージを受信し、在庫確保・決済・配送手配を実行する。

## Architecture Principles

**Base Skill**: `/strict-refactoring` を適用せよ。以下はプロジェクト固有の補足。

### System Classification

| 属性 | 値 |
|------|-----|
| Primary Type | Event-Driven / Message Consumer |
| Deployment | Kubernetes Worker Pod |
| State Complexity | Saga（分散トランザクション） |
| Multi-tenancy | Single-tenant（自社ECのみ） |
| Compliance | Standard |

### Class Classification (このプロジェクト)

| 分類 | 命名パターン | 責務 | 例 |
|------|-------------|------|-----|
| **Command** | `{状態}{Entity}` | 注文状態を変更 | `PendingOrder`, `ConfirmedOrder` |
| **Pure** | `{計算内容}` | 在庫計算等 | `InventoryAvailability`, `ShippingCostCalculation` |
| **ReadModel** | `{取得内容}ForXxx` | 読み取り専用 | `ShipmentTrackingForCustomer` |

### Polymorphism Preference

状態による振る舞いの分岐は switch/if-else ではなく Polymorphism で表現せよ。
enum は振る舞いを持たない識別子にのみ使用。

### Boundary Layer (このプロジェクト)

境界層は Command/Pure/ReadModel の分類外。外部世界とドメインの接点として扱う。

| 分類 | 命名パターン | 責務 | 例 |
|------|-------------|------|-----|
| **Handler** | `{Event}Handler` | イベント受信・ルーティング | `OrderCreatedHandler` |
| **Consumer** | `{Queue}Consumer` | キューからのメッセージ受信 | `OrderQueueConsumer` |
| **Publisher** | `{Event}Publisher` | イベント発行 | `OrderEventPublisher` |

## Directory Structure

```
src/
├── orders/                       # 注文処理
│   ├── lifecycle/               #   注文ライフサイクル
│   │   ├── PendingOrder.ts                # Command: 処理待ち
│   │   ├── ConfirmedOrder.ts              # Command: 確定済み
│   │   ├── ShippedOrder.ts                # Command: 出荷済み
│   │   ├── OrderStore.ts
│   │   └── OrderLifecycle.test.ts
│   ├── validation/              #   注文バリデーション
│   │   ├── OrderValidation.ts             # Pure
│   │   └── OrderValidation.test.ts
│   └── cancellation/            #   キャンセル
│       ├── OrderCancellation.ts           # Command
│       └── Cancellation.test.ts
│
├── inventory/                    # 在庫管理
│   ├── reservation/             #   在庫確保
│   │   ├── PendingReservation.ts          # Command
│   │   ├── ConfirmedReservation.ts
│   │   ├── ReservationStore.ts
│   │   └── Reservation.test.ts
│   ├── availability/            #   在庫確認
│   │   ├── InventoryAvailability.ts       # Pure
│   │   └── Availability.test.ts
│   └── release/                 #   在庫解放
│       ├── InventoryRelease.ts            # Command
│       └── Release.test.ts
│
├── payments/                     # 決済連携
│   ├── authorization/           #   オーソリ
│   │   ├── PendingPaymentAuth.ts          # Command
│   │   ├── AuthorizedPayment.ts
│   │   └── PaymentAuth.test.ts
│   ├── capture/                 #   売上確定
│   │   ├── PaymentCapture.ts              # Command
│   │   └── Capture.test.ts
│   └── refund/                  #   返金
│       ├── PaymentRefund.ts               # Command
│       └── Refund.test.ts
│
├── shipping/                     # 配送手配
│   ├── arrangement/             #   配送手配
│   │   ├── PendingShipment.ts             # Command
│   │   ├── ArrangedShipment.ts
│   │   ├── ShipmentStore.ts
│   │   └── Shipment.test.ts
│   ├── tracking/                #   追跡
│   │   ├── ShipmentTracking.ts            # ReadModel
│   │   └── Tracking.test.ts
│   └── cost/                    #   送料計算
│       ├── ShippingCostCalculation.ts     # Pure
│       └── ShippingCost.test.ts
│
├── saga/                         # Saga（分散トランザクション）
│   ├── order-fulfillment/       #   注文完了Saga
│   │   ├── OrderFulfillmentSaga.ts
│   │   ├── OrderFulfillmentState.ts
│   │   ├── SagaStore.ts
│   │   └── OrderFulfillmentSaga.test.ts
│   └── compensation/            #   補償処理
│       ├── InventoryCompensation.ts       # Command
│       ├── PaymentCompensation.ts         # Command
│       └── Compensation.test.ts
│
├── messaging/                    # メッセージング（境界層）
│   ├── handlers/                #   イベントハンドラ
│   │   ├── OrderCreatedHandler.ts
│   │   ├── PaymentCompletedHandler.ts
│   │   ├── ShipmentCompletedHandler.ts
│   │   └── handlers.test.ts
│   ├── consumer/                #   コンシューマ
│   │   ├── OrderQueueConsumer.ts
│   │   └── Consumer.test.ts
│   ├── publisher/               #   パブリッシャ
│   │   ├── EventPublisher.ts
│   │   └── Publisher.test.ts
│   └── serialization/           #   シリアライズ
│       ├── EventSerializer.ts
│       └── Serialization.test.ts
│
├── Money.ts                      # 全ドメインで使用 → src/ 直下
├── OrderId.ts
├── ProductId.ts
└── IdempotencyKey.ts
```

## Event Flow

### 注文完了 Saga

```
[OrderCreated]
      │
      ▼
┌─────────────────┐
│ 1. 在庫確保     │──失敗──→ [OrderFailed]
└─────────────────┘
      │成功
      ▼
┌─────────────────┐
│ 2. 決済オーソリ │──失敗──→ [在庫解放] → [OrderFailed]
└─────────────────┘
      │成功
      ▼
┌─────────────────┐
│ 3. 決済キャプチャ│──失敗──→ [在庫解放] → [OrderFailed]
└─────────────────┘
      │成功
      ▼
┌─────────────────┐
│ 4. 配送手配     │──失敗──→ [返金] → [在庫解放] → [OrderFailed]
└─────────────────┘
      │成功
      ▼
[OrderConfirmed]
```

### Saga 実装（イミュータブル設計）

**注意**: Saga の状態管理はイミュータブルに設計する。各ステップで新しい State を生成し、永続化する。

```typescript
// State はイミュータブル（readonly + withXxx パターン）
class OrderFulfillmentState {
  constructor(
    readonly orderId: OrderId,
    readonly items: OrderItem[],
    readonly amount: Money,
    readonly shippingAddress: Address,
    readonly reservationId: ReservationId | null = null,
    readonly transactionId: TransactionId | null = null,
    readonly trackingNumber: TrackingNumber | null = null,
    readonly status: SagaStatus = SagaStatus.InProgress,
    readonly errorMessage: string | null = null
  ) {}

  // 変更メソッドは新しいインスタンスを返す
  withInventoryReserved(reservationId: ReservationId): OrderFulfillmentState {
    return new OrderFulfillmentState(
      this.orderId, this.items, this.amount, this.shippingAddress,
      reservationId, this.transactionId, this.trackingNumber, this.status, this.errorMessage
    );
  }

  withPaymentAuthorized(transactionId: TransactionId): OrderFulfillmentState {
    return new OrderFulfillmentState(
      this.orderId, this.items, this.amount, this.shippingAddress,
      this.reservationId, transactionId, this.trackingNumber, this.status, this.errorMessage
    );
  }

  withPaymentCaptured(): OrderFulfillmentState {
    return new OrderFulfillmentState(
      this.orderId, this.items, this.amount, this.shippingAddress,
      this.reservationId, this.transactionId, this.trackingNumber, this.status, this.errorMessage
    );
  }

  withShipmentArranged(trackingNumber: TrackingNumber): OrderFulfillmentState {
    return new OrderFulfillmentState(
      this.orderId, this.items, this.amount, this.shippingAddress,
      this.reservationId, this.transactionId, trackingNumber, SagaStatus.Completed, this.errorMessage
    );
  }

  withFailed(errorMessage: string): OrderFulfillmentState {
    return new OrderFulfillmentState(
      this.orderId, this.items, this.amount, this.shippingAddress,
      this.reservationId, this.transactionId, this.trackingNumber, SagaStatus.Failed, errorMessage
    );
  }

  get inventoryReserved(): boolean { return this.reservationId !== null; }
  get paymentAuthorized(): boolean { return this.transactionId !== null; }
  get paymentCaptured(): boolean { return this.status === SagaStatus.Completed || this.trackingNumber !== null; }
  get shipmentArranged(): boolean { return this.trackingNumber !== null; }
}

// Saga 本体（状態を変更せず、新しい状態を返す）
class OrderFulfillmentSaga {
  constructor(private readonly state: OrderFulfillmentState) {}

  async execute(
    inventoryService: InventoryService,
    paymentService: PaymentService,
    shippingService: ShippingService,
    store: SagaStore
  ): Promise<SagaResult> {
    let currentState = this.state;

    try {
      // Step 1: 在庫確保
      if (!currentState.inventoryReserved) {
        const reservation = await new PendingReservation(currentState.orderId, currentState.items)
          .reserve(inventoryService);
        currentState = currentState.withInventoryReserved(reservation.id);
        await store.save(currentState);
      }

      // Step 2: 決済オーソリ
      if (!currentState.paymentAuthorized) {
        const auth = await new PendingPaymentAuth(currentState.orderId, currentState.amount)
          .authorize(paymentService);
        currentState = currentState.withPaymentAuthorized(auth.transactionId);
        await store.save(currentState);
      }

      // Step 3: 決済キャプチャ
      if (!currentState.paymentCaptured) {
        await new AuthorizedPayment(currentState.transactionId!)
          .capture(paymentService);
        currentState = currentState.withPaymentCaptured();
        await store.save(currentState);
      }

      // Step 4: 配送手配
      if (!currentState.shipmentArranged) {
        const shipment = await new PendingShipment(currentState.orderId, currentState.shippingAddress)
          .arrange(shippingService);
        currentState = currentState.withShipmentArranged(shipment.trackingNumber);
        await store.save(currentState);
      }

      return SagaResult.completed();

    } catch (error) {
      return await this.compensate(currentState, inventoryService, paymentService, store, error as Error);
    }
  }

  private async compensate(
    state: OrderFulfillmentState,
    inventoryService: InventoryService,
    paymentService: PaymentService,
    store: SagaStore,
    error: Error
  ): Promise<SagaResult> {
    // 逆順で補償処理
    if (state.paymentCaptured && state.transactionId) {
      await new PaymentCompensation(state.transactionId).refund(paymentService);
    }
    if (state.inventoryReserved && state.reservationId) {
      await new InventoryCompensation(state.reservationId).release(inventoryService);
    }

    const failedState = state.withFailed(error.message);
    await store.save(failedState);
    return SagaResult.failed(error);
  }
}
```

## Event Handling Patterns

### イベント形式 (CloudEvents)

```typescript
interface CloudEvent<T> {
  specversion: "1.0";
  type: string;           // "com.example.order.created"
  source: string;         // "/orders"
  id: string;             // UUID
  time: string;           // ISO 8601
  datacontenttype: string; // "application/json"
  data: T;
}

// 例
const event: CloudEvent<OrderCreatedData> = {
  specversion: "1.0",
  type: "com.example.order.created",
  source: "/orders",
  id: "550e8400-e29b-41d4-a716-446655440000",
  time: "2025-01-24T10:00:00Z",
  datacontenttype: "application/json",
  data: {
    orderId: "ord_123",
    customerId: "cus_456",
    items: [{ productId: "prod_789", quantity: 2 }],
    totalAmount: 5000,
  },
};
```

### 冪等性

```typescript
class OrderCreatedHandler {
  constructor(
    private readonly idempotencyStore: IdempotencyStore,
    private readonly saga: OrderFulfillmentSaga
  ) {}

  async handle(event: CloudEvent<OrderCreatedData>): Promise<void> {
    // 冪等性チェック
    const processed = await this.idempotencyStore.isProcessed(event.id);
    if (processed) {
      console.log(`Event ${event.id} already processed, skipping`);
      return;
    }

    try {
      await this.saga.execute(/* ... */);
      await this.idempotencyStore.markProcessed(event.id);
    } catch (error) {
      // リトライ可能なエラーは再throw（DLQへ）
      if (error instanceof RetryableError) {
        throw error;
      }
      // 非リトライエラーは処理済みとしてマーク
      await this.idempotencyStore.markProcessed(event.id, { error: error.message });
    }
  }
}
```

### Dead Letter Queue (DLQ)

```typescript
// リトライ上限を超えたメッセージはDLQへ
interface DlqMessage {
  originalEvent: CloudEvent<unknown>;
  error: string;
  retryCount: number;
  lastAttempt: Date;
}

class DlqHandler {
  async handle(message: DlqMessage): Promise<void> {
    // アラート送信
    await this.alertService.send({
      severity: "high",
      title: "Order processing failed",
      details: `Order ${message.originalEvent.data.orderId} failed after ${message.retryCount} retries`,
    });

    // 手動対応用にDBに保存
    await this.failedOrderStore.save(message);
  }
}
```

## Naming Conventions

### イベント名

| 日本語 | Event Type | データ |
|--------|-----------|--------|
| 注文作成 | `order.created` | `OrderCreatedData` |
| 在庫確保完了 | `inventory.reserved` | `InventoryReservedData` |
| 決済完了 | `payment.completed` | `PaymentCompletedData` |
| 配送完了 | `shipment.completed` | `ShipmentCompletedData` |
| 注文確定 | `order.confirmed` | `OrderConfirmedData` |
| 注文失敗 | `order.failed` | `OrderFailedData` |

### 状態名（Saga）

| 日本語 | English | 使用場面 |
|--------|---------|---------|
| 処理中 | `InProgress` | Saga実行中 |
| 完了 | `Completed` | 全ステップ成功 |
| 失敗 | `Failed` | 補償処理完了 |
| 補償中 | `Compensating` | 補償処理実行中 |

## Retry Policy

```typescript
interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 5,
  initialDelayMs: 1000,      // 1秒
  maxDelayMs: 60000,         // 1分
  backoffMultiplier: 2,      // 指数バックオフ
};

// リトライ間隔: 1s → 2s → 4s → 8s → 16s → DLQ
```

## Testing Conventions

### イベントハンドラのテスト

```typescript
describe("OrderCreatedHandler", () => {
  it("OrderCreatedイベントを正常に処理すると OrderConfirmedとして記録されるべき", async () => {
    const event = createOrderCreatedEvent({ orderId: "ord_123" });
    const publisher = new MockEventPublisher();

    await handler.handle(event);

    expect(publisher.publishedEvents).toContainEqual(
      expect.objectContaining({ type: "order.confirmed" })
    );
  });

  it("同じIdempotencyKeyのOrderCreatedイベントを2回処理すると 1回のみ実行として記録されるべき", async () => {
    const event = createOrderCreatedEvent({ orderId: "ord_123" });
    const saga = new SpySaga();

    await handler.handle(event);
    await handler.handle(event);

    expect(saga.executeCount).toBe(1);
  });

  it("在庫不足時にOrderCreatedイベントを処理すると 補償なしでOrderFailedとして記録されるべき", async () => {
    const event = createOrderCreatedEvent({ orderId: "ord_123" });
    inventoryService.setAvailability(false);

    await handler.handle(event);

    expect(publisher.publishedEvents).toContainEqual(
      expect.objectContaining({ type: "order.failed" })
    );
  });

  it("決済失敗時にOrderCreatedイベントを処理すると 在庫解放とOrderFailedとして記録されるべき", async () => {
    const event = createOrderCreatedEvent({ orderId: "ord_123" });
    paymentService.setAuthResult(false);

    await handler.handle(event);

    expect(inventoryService.releasedReservations).toContain("ord_123");
    expect(publisher.publishedEvents).toContainEqual(
      expect.objectContaining({ type: "order.failed" })
    );
  });
});
```

## Quick Commands

```bash
# Development
pnpm dev                    # Start worker (local)
pnpm test                   # Run all tests
pnpm test:unit              # Unit tests only
pnpm test:integration       # Integration tests (with queue)

# Quality
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript check

# Queue Management
pnpm queue:purge            # Purge dev queue
pnpm dlq:list               # List DLQ messages
pnpm dlq:replay             # Replay DLQ messages

# Monitoring
pnpm metrics                # Show processing metrics
```

## Checklist

### Coding Style

- [ ] else 句を使わず Early Return しているか
- [ ] 条件分岐は Polymorphism で表現しているか（switch/if-else より優先）

### 新規イベントハンドラ作成時

- [ ] CloudEvents形式に準拠しているか
- [ ] 冪等性を担保しているか（IdempotencyStore使用）
- [ ] リトライポリシーを設定しているか
- [ ] DLQ処理を考慮しているか

### Saga 変更時

- [ ] 全ステップの補償処理を実装したか
- [ ] 補償処理は逆順に実行されるか
- [ ] 中間状態が永続化されているか（クラッシュ対応）
- [ ] タイムアウト処理を考慮したか

### 外部サービス連携時

- [ ] サーキットブレーカーを設定したか
- [ ] タイムアウトを設定したか
- [ ] リトライ可能なエラーを識別しているか
