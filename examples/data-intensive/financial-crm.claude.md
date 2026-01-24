# CLAUDE.md - 金融機関向けCRM

金融機関の法人営業部門向けCRMシステム。顧客管理、案件管理、営業活動記録、コンプライアンス対応を統合する。

## Architecture Principles

**Base Skill**: `/strict-refactoring` を適用せよ。以下はプロジェクト固有の補足。

### System Classification

| 属性 | 値 |
|------|-----|
| Primary Type | Data-Intensive / CRUD Application |
| Deployment | Modular Monolith |
| State Complexity | Workflow（承認フロー、案件ステージ） |
| Multi-tenancy | Logical（支店・部署による論理分離） |
| Compliance | Regulated（FISC準拠、監査ログ必須） |

### Class Classification (このプロジェクト)

| 分類 | 命名パターン | 責務 | 例 |
|------|-------------|------|-----|
| **Command** | `{状態}{Entity}` | 状態変更を伴う操作 | `DraftDeal`, `PendingVisitReport` |
| **Query** | `{計算内容}` | 純粋計算、副作用なし | `DealScoreCalculation`, `CustomerRankEvaluation` |
| **ReadModel** | `{取得内容}ForXxx` | 読み取り専用データ取得 | `PendingDealsForApprover`, `CustomerSummaryForDashboard` |

### Polymorphism Preference

状態による振る舞いの分岐は switch/if-else ではなく Polymorphism で表現せよ。
enum は振る舞いを持たない識別子にのみ使用。

### Boundary Layer (このプロジェクト)

境界層は Command/Query/ReadModel の分類外。外部世界とドメインの接点として扱う。

| 分類 | 命名パターン | 責務 | 例 |
|------|-------------|------|-----|
| **Resolver** | `{対象}Resolver` | Strategy選択、ルーティング | `ApprovalRouteResolver`, `CustomerSegmentResolver` |
| **Controller** | `{Resource}Controller` | HTTPリクエスト処理 | `DealController`, `CustomerController` |
| **Mapper** | `{対象}Mapper` | 外部形式↔ドメイン変換 | `DealStatusMapper`, `CustomerDtoMapper` |

## Directory Structure

```
src/
├── customers/                    # 顧客管理
│   ├── registration/            #   顧客登録
│   │   ├── DraftCustomer.ts
│   │   ├── CustomerRegistrationStore.ts
│   │   └── CustomerRegistration.test.ts
│   ├── segmentation/            #   セグメント・ランク
│   │   ├── CustomerRankEvaluation.ts      # Query
│   │   ├── CustomerSegmentResolver.ts     # Boundary: Strategy選択
│   │   └── CustomerSegmentation.test.ts
│   ├── contacts/                #   担当者・連絡先
│   │   ├── Contact.ts
│   │   └── ContactStore.ts
│   └── history/                 #   接点履歴
│       ├── CustomerInteractionHistory.ts  # ReadModel
│       └── CustomerHistory.test.ts
│
├── deals/                        # 案件管理
│   ├── lifecycle/               #   案件ライフサイクル
│   │   ├── DraftDeal.ts                   # Command: 下書き作成
│   │   ├── PendingDeal.ts                 # Command: 承認待ち
│   │   ├── ActiveDeal.ts                  # Command: 進行中
│   │   ├── DealStore.ts
│   │   └── DealLifecycle.test.ts
│   ├── pipeline/                #   パイプライン
│   │   ├── DealPipelineForManager.ts      # ReadModel
│   │   └── DealPipeline.test.ts
│   ├── proposals/               #   提案書
│   │   ├── DraftProposal.ts
│   │   ├── ProposalStore.ts
│   │   └── Proposal.test.ts
│   └── forecasting/             #   売上予測
│       ├── QuarterlyForecast.ts           # Query
│       └── Forecasting.test.ts
│
├── activities/                   # 営業活動
│   ├── visits/                  #   訪問記録
│   │   ├── DraftVisitReport.ts            # Command: 下書き
│   │   ├── PendingVisitReport.ts          # Command: 承認待ち
│   │   ├── ApprovedVisitReport.ts
│   │   ├── VisitReportStore.ts
│   │   └── VisitReport.test.ts
│   ├── calls/                   #   電話・メール
│   │   ├── CallLog.ts
│   │   └── CallLogStore.ts
│   └── tasks/                   #   タスク
│       ├── Task.ts
│       └── TaskStore.ts
│
├── compliance/                   # コンプライアンス
│   ├── kyc/                     #   本人確認
│   │   ├── PendingKycCheck.ts             # Command
│   │   ├── KycCheckStore.ts
│   │   └── KycCheck.test.ts
│   ├── approvals/               #   承認ワークフロー
│   │   ├── ApprovalRouteResolver.ts       # Boundary: Strategy選択
│   │   ├── ApprovalRule.ts                # Interface
│   │   ├── ManagerApprovalRule.ts
│   │   ├── DirectorApprovalRule.ts
│   │   └── ApprovalWorkflow.test.ts
│   └── audit/                   #   監査ログ
│       ├── AuditLogWriter.ts              # Command
│       ├── AuditLogStore.ts
│       └── AuditLog.test.ts
│
├── reporting/                    # レポーティング
│   ├── dashboards/              #   ダッシュボード
│   │   ├── SalesDashboardData.ts          # ReadModel
│   │   └── Dashboard.test.ts
│   └── exports/                 #   帳票出力
│       ├── MonthlyReportExporter.ts       # Command
│       └── ReportExport.test.ts
│
├── Money.ts                      # 全ドメインで使用 → src/ 直下
├── DateRange.ts
├── Clock.ts                      # Non-deterministic依存
└── AuditContext.ts               # 監査コンテキスト
```

## State Transitions

### 案件 (Deal)

```
[Draft] ──register()──→ [Pending]
                            │
                    approve()│reject()
                            ↓        ↓
                       [Active]  [Rejected]
                            │
                 win()│lose()│
                      ↓      ↓
                  [Won]   [Lost]
```

**Command Classes**:

```typescript
// 下書き → 承認待ち
class DraftDeal {
  constructor(private readonly data: DealData) {
    if (!data.customerId) throw new Error("顧客は必須です");
    if (!data.estimatedAmount) throw new Error("見込金額は必須です");
  }

  async register(store: DealStore, clock: Clock): Promise<PendingDeal> {
    const deal = PendingDeal.fromDraft(this.data, clock.now());
    await store.save(deal);
    return deal;
  }
}

// 承認待ち → 進行中 or 却下
class PendingDeal {
  async approve(store: DealStore, approver: Employee): Promise<ActiveDeal> {
    const deal = ActiveDeal.fromPending(this, approver);
    await store.save(deal);
    return deal;
  }

  async reject(store: DealStore, reason: string): Promise<RejectedDeal> {
    const deal = RejectedDeal.fromPending(this, reason);
    await store.save(deal);
    return deal;
  }
}
```

### 訪問報告 (VisitReport)

```
[Draft] ──submit()──→ [Pending]
                          │
                  approve()│reject()
                          ↓        ↓
                   [Approved] [Rejected]
                                   │
                           revise()│
                                   ↓
                               [Draft]
```

## Naming Conventions

### Entity名（日英対応）

| 日本語 | English Class | Store |
|--------|---------------|-------|
| 顧客 | `Customer` | `CustomerStore` |
| 担当者 | `Contact` | `ContactStore` |
| 案件 | `Deal` | `DealStore` |
| 訪問報告 | `VisitReport` | `VisitReportStore` |
| 提案書 | `Proposal` | `ProposalStore` |
| 承認 | `Approval` | `ApprovalStore` |
| 監査ログ | `AuditLog` | `AuditLogStore` |

### 状態名（日英対応）

| 日本語 | English | 使用場面 |
|--------|---------|---------|
| 下書き | `Draft` | 編集中、未提出 |
| 申請中 | `Pending` | 承認待ち |
| 進行中 | `Active` | 承認済み、作業中 |
| 承認済 | `Approved` | 承認完了 |
| 却下 | `Rejected` | 承認却下 |
| 成約 | `Won` | 案件成約 |
| 失注 | `Lost` | 案件失注 |

## Data Model Conventions

### Audit Fields (全エンティティ必須)

```typescript
interface AuditFields {
  readonly createdAt: Date;
  readonly createdBy: EmployeeId;
  readonly updatedAt: Date;
  readonly updatedBy: EmployeeId;
}
```

### Soft Delete

```typescript
interface SoftDeletable {
  readonly deletedAt: Date | null;
  readonly deletedBy: EmployeeId | null;
}
```

### Tenant Isolation

```typescript
// 全エンティティに必須
interface TenantScoped {
  readonly branchId: BranchId;  // 支店
}

// Store は必ずテナントでフィルタ
interface DealStore {
  findById(id: DealId, branch: BranchId): Promise<Deal | null>;
  save(deal: Deal): Promise<void>;
}
```

## Compliance Requirements

### 監査ログ（必須）

以下の操作は必ず監査ログを記録:

| 操作 | ログ内容 |
|------|---------|
| 顧客情報の閲覧 | who, when, customerId |
| 案件の状態変更 | who, when, dealId, fromState, toState |
| 承認/却下 | who, when, targetId, action, reason |
| データエクスポート | who, when, exportType, recordCount |

```typescript
class AuditLogWriter {
  constructor(private readonly context: AuditContext) {}

  async write(store: AuditLogStore, event: AuditEvent): Promise<void> {
    const log = new AuditLog({
      ...event,
      actor: this.context.currentUser,
      timestamp: this.context.clock.now(),
      ipAddress: this.context.ipAddress,
    });
    await store.save(log);
  }
}
```

### KYC チェック

新規顧客登録時は必ずKYCチェックを実行:

```typescript
class DraftCustomer {
  async register(
    store: CustomerStore,
    kycService: KycCheckService
  ): Promise<Customer> {
    // KYCチェック必須
    const kycResult = await kycService.check(this.data);
    if (!kycResult.cleared) {
      throw new KycFailedError(kycResult.reason);
    }
    // ...
  }
}
```

## Testing Conventions

### テストファイル配置

```
src/deals/lifecycle/
├── DraftDeal.ts
├── DraftDeal.test.ts      # 同ディレクトリに配置
└── DealLifecycle.test.ts  # 統合テスト
```

### テスト種別

| 種別 | 対象 | モック |
|------|------|--------|
| 単体 | Query, Pure Logic | なし |
| 統合 | Command | Store (InMemory) |
| E2E | ユースケース全体 | なし（実環境） |

### テスト用 Fixture

```typescript
// _fixtures/DealFixtures.ts
export const DealFixtures = {
  draftDeal: (overrides?: Partial<DealData>) => new DraftDeal({
    customerId: CustomerId.of("C001"),
    title: "テスト案件",
    estimatedAmount: Money.of(1_000_000),
    ...overrides,
  }),

  pendingDeal: (overrides?: Partial<DealData>) => /* ... */,
};
```

## Quick Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm test                   # Run all tests
pnpm test:unit              # Unit tests only
pnpm test:integration       # Integration tests (with DB)

# Quality
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript check
pnpm format                 # Prettier

# Database
pnpm db:migrate             # Run migrations
pnpm db:seed                # Seed test data
pnpm db:reset               # Reset database

# Compliance
pnpm audit:log              # Check audit log coverage
pnpm security:scan          # Security vulnerability scan
```

## Checklist

### 新規クラス作成時

- [ ] Command / Query / ReadModel のいずれかに分類したか
- [ ] 日本語ドメイン用語を英語に正しく変換したか（上記対応表参照）
- [ ] 状態遷移がある場合、Pending Object Pattern を適用したか
- [ ] ディレクトリは概念ベース（customers/, deals/ 等）か
- [ ] テストファイルを同ディレクトリに作成したか

### Coding Style

- [ ] else 句を使わず Early Return しているか
- [ ] 条件分岐は Polymorphism で表現しているか（switch/if-else より優先）

### 案件 (Deal) 関連の変更時

- [ ] 状態遷移図と整合しているか
- [ ] 承認ワークフローを考慮したか
- [ ] 監査ログを出力しているか

### 顧客 (Customer) 関連の変更時

- [ ] KYCチェックが必要な操作か確認したか
- [ ] テナント分離（branchId）を適用しているか
- [ ] 個人情報の取り扱いは適切か

### データ変更時

- [ ] AuditFields (createdAt, updatedAt 等) を更新しているか
- [ ] SoftDelete を使用しているか（物理削除禁止）
- [ ] 監査ログを記録しているか
