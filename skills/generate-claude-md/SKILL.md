---
name: generate-claude-md
description: プロジェクトの仕様書・READMEから strict-refactoring に準拠した CLAUDE.md を自動生成する
---

# Generate CLAUDE.md Skill

## 概要

プロジェクトの既存ファイル（README.md, Spec.md, package.json 等）を読み込み、`/strict-refactoring` スキルに完全準拠した CLAUDE.md を生成する。

## トリガー

以下のいずれかでスキルを起動:
- `CLAUDE.mdを生成して`
- `CLAUDE.md作って`
- `/generate-claude-md`

## ワークフロー

```
Step 1: ファイル収集
    ↓
Step 2: 情報抽出・推論
    ↓
Step 3: 確認（最大2問）
    ↓
Step 4: CLAUDE.md 生成
```

## Step 1: ファイル収集

以下のファイルを自動で読み込む（存在する場合）:

| 優先度 | ファイル | 抽出内容 |
|:------:|---------|---------|
| 1 | `README.md` | プロジェクト名、概要 |
| 2 | `docs/Spec.md`, `docs/spec.md`, `SPEC.md` | ドメイン構造、機能要件 |
| 3 | `docs/Architecture.md` | アーキテクチャ情報 |
| 4 | `package.json` / `pyproject.toml` / `Cargo.toml` | 技術スタック、scripts |
| 5 | 既存の `CLAUDE.md` | 参照（上書き確認） |

**ファイルが見つからない場合**:
```
仕様書のパスを教えてください。
または、プロジェクトの概要を直接入力してください。
```

## Step 2: 情報抽出・推論

### 2.1 システムタイプ推論

| 検出キーワード | 推論結果 |
|--------------|---------|
| API, REST, エンドポイント, OpenAPI | `request-response / rest-api` |
| GraphQL, Query, Mutation | `request-response / graphql-api` |
| CLI, コマンド, argv | `request-response / cli` |
| Lambda, Serverless, Edge | `request-response / serverless` |
| キュー, SQS, RabbitMQ, Kafka, Worker | `event-driven / message-consumer` |
| Webhook, callback | `event-driven / webhook-handler` |
| バッチ, 定期, cron, スケジュール | `event-driven / scheduled-job` |
| エディタ, Canvas, リアルタイム | `stateful / document-editor` |
| ワークフロービルダー, ノーコード | `stateful / workflow-builder` |
| ダッシュボード, 可視化, チャート | `stateful / dashboard` |
| ライブラリ, SDK, npm publish | `library / utility` |
| UI コンポーネント, Storybook | `library / ui-component` |
| 管理画面, CRUD, 一覧, 登録, マスタ | `data-intensive / crud-app` |
| ETL, パイプライン, 変換 | `data-intensive / etl-pipeline` |
| レポート, 集計, 帳票 | `data-intensive / reporting` |

### 2.2 副次元推論

| 検出キーワード | 推論結果 |
|--------------|---------|
| マイクロサービス, 分散 | `deployment: microservices` |
| モノリス, 単一 | `deployment: monolith` |
| Lambda, Vercel, Edge | `deployment: serverless` |
| 承認, ワークフロー, ステータス, 状態遷移 | `stateComplexity: workflow` |
| イベントソーシング, Event Store | `stateComplexity: event-sourced` |
| テナント, 組織, 支店, マルチ | `multiTenancy: logical` |
| 金融, 銀行, 証券, FISC | `complianceLevel: regulated` |
| 医療, HIPAA, 個人情報 | `complianceLevel: regulated` |
| 決済, PCI-DSS, カード | `complianceLevel: high-security` |

### 2.3 ドメイン抽出

仕様書の見出し（`##`, `###`）からドメインを抽出:

```markdown
## 顧客管理        → customers/
## 案件管理        → deals/
## 営業活動        → activities/
```

### 2.4 状態遷移抽出

以下のパターンを検出:
- `ステータス: A → B → C`
- `状態: 下書き, 申請中, 承認済み`
- Mermaid の stateDiagram

## Step 3: 確認

**確認は最大2問まで。それ以外はスマートデフォルトを使用。**

### 必ず確認する項目

| 条件 | 質問 |
|------|------|
| テナント分離の記述なし & CRUD系 | 「データの分離は必要ですか？（支店別、組織別など）」 |
| 監査/コンプラ記述なし & 金融/医療キーワードあり | 「監査ログは必要ですか？」 |

### デフォルト値

| 項目 | デフォルト |
|------|-----------|
| 技術スタック | TypeScript, pnpm |
| デプロイ | modular-monolith |
| マルチテナント | single-tenant |
| コンプライアンス | standard |
| 状態複雑度 | stateless（状態遷移の記述がなければ） |

## Step 4: CLAUDE.md 生成

### 出力テンプレート

```markdown
# CLAUDE.md - {プロジェクト名}

{プロジェクト説明（1文）}

## Architecture Principles

**Base Skill**: `/strict-refactoring` を適用せよ。以下はプロジェクト固有の補足。

### System Classification

| 属性 | 値 |
|------|-----|
| Primary Type | {systemType} / {systemSubType} |
| Deployment | {deployment} |
| State Complexity | {stateComplexity} |
| Multi-tenancy | {multiTenancy} |
| Compliance | {complianceLevel} |

### Class Classification (このプロジェクト)

| 分類 | 命名パターン | 責務 | 例 |
|------|-------------|------|-----|
| **Command** | `{状態}{Entity}` | 状態変更を伴う操作 | {commandExamples} |
| **Query** | `{計算内容}` | 純粋計算、副作用なし | {queryExamples} |
| **ReadModel** | `{取得内容}ForXxx` | 読み取り専用データ取得 | {readModelExamples} |

### Polymorphism Preference

状態による振る舞いの分岐は switch/if-else ではなく Polymorphism で表現せよ。
enum は振る舞いを持たない識別子にのみ使用。

### Boundary Layer (このプロジェクト)

境界層は Command/Query/ReadModel の分類外。外部世界とドメインの接点として扱う。

| 分類 | 命名パターン | 責務 | 例 |
|------|-------------|------|-----|
{boundaryLayerTable}

## Directory Structure

```
src/
{directoryStructure}
```

{stateTransitionsSection}

## Naming Conventions

### Entity名（日英対応）

| 日本語 | English Class | Repository |
|--------|---------------|-------|
{entityNamingTable}

### 状態名（日英対応）

| 日本語 | English | 使用場面 |
|--------|---------|---------|
{stateNamingTable}

{dataModelSection}

{securitySection}

{complianceSection}

## Testing Conventions

### テストファイル配置

同ディレクトリにテストを配置（colocation）:
```
src/{domain}/{subdomain}/
├── {Entity}.ts
└── {Entity}.test.ts
```

### テスト種別

| 種別 | 対象 | モック |
|------|------|--------|
| 単体 | Query, Pure Logic | なし |
| 統合 | Command | Repository (InMemory) |
| E2E | ユースケース全体 | なし（実環境） |

### Test Data Factory

Test Data Factory はテストと同じディレクトリに配置（colocation）:

```
src/{domain}/
├── Draft{Entity}.ts
├── Draft{Entity}.test.ts
└── {Entity}TestFactory.ts    ← テストと同じディレクトリ
```

```typescript
// {Entity}TestFactory.ts
export const {Entity}TestFactory = {
  draft: (overrides?: Partial<{Entity}Data>) => new Draft{Entity}({
    // デフォルト値
    ...overrides,
  }),
  
  pending: (overrides?: Partial<{Entity}Data>) => /* ... */,
};
```

### テストダブル（InMemory Repository）

```typescript
class InMemory{Entity}Repository implements {Entity}Repository {
  private entities = new Map<string, {Entity}>();

  async save(entity: {Entity}): Promise<void> {
    this.entities.set(entity.id.value, entity);
  }

  async findById(id: {Entity}Id): Promise<{Entity} | null> {
    return this.entities.get(id.value) ?? null;
  }
}
```

## Quick Commands

```bash
{quickCommands}
```

## Git Conventions

### ブランチ命名

```
feature/{issue-number}-{short-description}
fix/{issue-number}-{short-description}
refactor/{short-description}
```

### コミットメッセージ

```
{type}: {短い説明}

{詳細説明（必要な場合）}
```

| Type | 用途 |
|------|------|
| feat | 新機能 |
| fix | バグ修正 |
| refactor | リファクタリング |
| docs | ドキュメント |
| test | テスト |
| chore | その他 |

### PR 作成時

- タイトル: `{type}: {短い説明}`
- 本文: 変更内容の要約、関連Issue番号
- レビュー前にセルフチェック完了

## Checklist

### 新規クラス作成時

- [ ] Command / Query / ReadModel のいずれかに分類したか
- [ ] 日本語ドメイン用語を英語に正しく変換したか（上記対応表参照）
- [ ] 状態遷移がある場合、Pending Object Pattern を適用したか
- [ ] ディレクトリは概念ベース（{domainExamples}）か
- [ ] テストファイルを同ディレクトリに作成したか

### Coding Style

- [ ] else 句を使わず Early Return しているか
- [ ] 条件分岐は Polymorphism で表現しているか（switch/if-else より優先）

{customChecklist}
```

### システムタイプ別セクション

#### request-response の場合

```markdown
## API Design Conventions

### エンドポイント命名

```
{apiEndpoints}
```

### リクエスト/レスポンス形式

{requestResponseFormat}

### 冪等性

POST リクエストは `Idempotency-Key` ヘッダーを推奨。
```

#### event-driven の場合

```markdown
## Event Handling Patterns

### イベント形式 (CloudEvents)

```typescript
interface CloudEvent<T> {
  specversion: "1.0";
  type: string;           // "com.example.{domain}.{action}"
  source: string;         // "/{domain}"
  id: string;             // UUID
  time: string;           // ISO 8601
  datacontenttype: string; // "application/json"
  data: T;
}
```

### イベント名（日英対応）

| 日本語 | Event Type | データ |
|--------|-----------|--------|
{eventNamingTable}

### 冪等性

イベントハンドラは必ず冪等に実装:

```typescript
class {Event}Handler {
  async handle(event: CloudEvent<{Event}Data>): Promise<void> {
    const processed = await this.idempotencyStore.isProcessed(event.id);
    if (processed) return;

    try {
      await this.process(event);
      await this.idempotencyStore.markProcessed(event.id);
    } catch (error) {
      if (error instanceof RetryableError) throw error;
      await this.idempotencyStore.markProcessed(event.id, { error: error.message });
    }
  }
}
```

### Retry Policy

```typescript
const RETRY_POLICY = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};
// リトライ間隔: 1s → 2s → 4s → 8s → 16s → DLQ
```

### Dead Letter Queue (DLQ)

リトライ上限を超えたメッセージは DLQ へ移動し、アラートを発行。
```

#### event-driven (Saga がある場合)

```markdown
## Event Flow

### {Saga名}

```
[{TriggerEvent}]
      │
      ▼
┌─────────────────┐
│ 1. {Step1}      │──失敗──→ [{FailedEvent}]
└─────────────────┘
      │成功
      ▼
┌─────────────────┐
│ 2. {Step2}      │──失敗──→ [{補償1}] → [{FailedEvent}]
└─────────────────┘
      │成功
      ▼
[{SuccessEvent}]
```

### Saga 実装（イミュータブル設計）

State はイミュータブルに設計し、`withXxx()` パターンで状態を更新。

```typescript
class {Saga}State {
  constructor(
    readonly step1Completed: boolean = false,
    readonly step2Completed: boolean = false,
    // ...
  ) {}

  withStep1Completed(): {Saga}State {
    return new {Saga}State(true, this.step2Completed);
  }
}
```
```

#### library の場合

```markdown
## API Design

### Public API Surface

```typescript
// index.ts - 公開APIのみエクスポート
export { /* public types and functions */ };
// 内部実装はエクスポートしない
```

### Versioning & Compatibility

| 変更種別 | バージョン | 例 |
|---------|-----------|-----|
| Breaking Change | Major | 既存APIの削除、型変更 |
| 新機能追加 | Minor | 新しいメソッド追加 |
| バグ修正 | Patch | 既存機能の修正 |

### Breaking Change Policy

```typescript
// ❌ Breaking: 既存メソッドの削除
// v1: schema.parse(input)
// v2: schema.validate(input)  // parse削除はBreaking

// ✅ Non-breaking: 新メソッド追加
// v1: schema.parse(input)
// v2: schema.parse(input), schema.parseAsync(input)

// ✅ Non-breaking: オプショナル引数追加
// v1: schema.parse(input)
// v2: schema.parse(input, options?)
```

### Deprecation

```typescript
/**
 * @deprecated v2.0.0で削除予定。代わりに `newMethod` を使用してください。
 */
oldMethod(): void {
  console.warn("oldMethod is deprecated. Use newMethod instead.");
  // ...
}
```

## Documentation

### JSDoc 規約

全ての公開 API に JSDoc を記載:

```typescript
/**
 * {メソッドの説明}
 *
 * @param {paramName} - {説明}
 * @returns {説明}
 * @throws {ErrorType} {条件}
 *
 * @example
 * \`\`\`typescript
 * // 使用例
 * \`\`\`
 */
```
```

#### data-intensive (workflow) の場合

```markdown
## State Transitions

### {Entity名}

```
{stateTransitionDiagram}
```

**Command Classes**:

```typescript
{commandClassExamples}
```
```

### コンプライアンスセクション（regulated/high-security の場合）

```markdown
## Compliance Requirements

### 監査ログ（必須）

以下の操作は必ず監査ログを記録:

| 操作 | ログ内容 |
|------|---------|
{auditLogTable}

### データ保護

{dataProtectionRules}
```

## 生成ルール

### Boundary Layer 生成ルール

システムタイプに応じて境界層コンポーネントを選択:

| システムタイプ | 境界層コンポーネント |
|--------------|---------------------|
| request-response / rest-api | Controller, Middleware, Mapper, Resolver |
| request-response / graphql-api | Resolver, Mapper |
| request-response / cli | CommandHandler, ArgumentParser |
| event-driven / message-consumer | Handler, Consumer, Publisher |
| event-driven / webhook-handler | Handler, Mapper |
| event-driven / scheduled-job | JobHandler |
| library / * | (境界層セクションは省略し、代わりに API Design セクションを生成) |
| data-intensive / crud-app | Controller, Mapper, Resolver |
| data-intensive / etl-pipeline | Extractor, Transformer, Loader |
| data-intensive / reporting | ReportGenerator, Exporter |

### Data Model セクション生成ルール

以下の条件でセクションを生成:

**Audit Fields（監査フィールド）**:
- `complianceLevel: regulated` or `high-security` の場合に生成
- 生成内容:
```markdown
## Data Model Conventions

### Audit Fields (全エンティティ必須)

\`\`\`typescript
interface AuditFields {
  readonly createdAt: Date;
  readonly createdBy: {ActorId};
  readonly updatedAt: Date;
  readonly updatedBy: {ActorId};
}
\`\`\`
```

**Soft Delete**:
- `data-intensive / crud-app` の場合に生成
- 生成内容:
```markdown
### Soft Delete

\`\`\`typescript
interface SoftDeletable {
  readonly deletedAt: Date | null;
  readonly deletedBy: {ActorId} | null;
}
\`\`\`
```

**Tenant Isolation**:
- `multiTenancy: logical` or `physical` の場合に生成
- 生成内容:
```markdown
### Tenant Isolation

\`\`\`typescript
interface TenantScoped {
  readonly {tenantKey}: {TenantId};
}

// Repository は必ずテナントでフィルタ
interface {Entity}Repository {
  findById(id: {Entity}Id, tenant: {TenantId}): Promise<{Entity} | null>;
  save(entity: {Entity}): Promise<void>;
}
\`\`\`
```

### Security セクション生成ルール

以下の条件でセクションを生成:

**条件**: `complianceLevel: high-security` または `request-response / rest-api`

生成内容:
```markdown
## Security Requirements

### 認証

{認証パターン - システムタイプに応じて選択}

### レート制限

| エンドポイント | 制限 |
|--------------|------|
| POST /... | 100 req/min |
| GET /... | 1000 req/min |

### 機密データの取り扱い

- ログに機密情報を出力しない
- エラーメッセージに内部情報を含めない
```

### 状態名テーブル生成ルール

仕様書から状態を抽出し、日英対応テーブルを生成:

| 検出パターン | 日本語 | English |
|-------------|--------|---------|
| 下書き, ドラフト | 下書き | Draft |
| 申請中, 申請, 提出 | 申請中 | Pending / Submitted |
| 承認待ち, 審査中 | 承認待ち | Awaiting / PendingApproval |
| 承認済, 承認 | 承認済 | Approved |
| 却下, 拒否 | 却下 | Rejected |
| 進行中, アクティブ | 進行中 | Active / InProgress |
| 完了, 終了 | 完了 | Completed / Done |
| キャンセル, 取消 | 取消 | Cancelled / Voided |
| 成約, 受注 | 成約 | Won |
| 失注 | 失注 | Lost |

### ドメイン固有チェックリスト生成ルール

抽出したエンティティごとにチェックリストを生成:

```markdown
### {Entity名} 関連の変更時

- [ ] 状態遷移図と整合しているか
- [ ] {Entity}Repository の操作を使用しているか
- [ ] テストを更新したか
```

**Workflow がある場合**:
```markdown
- [ ] 承認ワークフローを考慮したか
```

**Compliance がある場合**:
```markdown
- [ ] 監査ログを記録しているか
```

### ディレクトリ構造生成

```
ドメインごとに:
├── {domain}/                    # {日本語名}
│   ├── {subdomain1}/           #   {サブドメイン説明}
│   │   ├── {Entity}.ts
│   │   ├── {Entity}Repository.ts
│   │   └── {Entity}.test.ts
│   └── {subdomain2}/
│       └── ...
```

### 状態遷移図生成

```
[{初期状態}] ──{action}()──→ [{次状態}]
                                │
                        {action}()│{action}()
                                ↓        ↓
                           [{状態A}]  [{状態B}]
```

### Command クラス例生成

```typescript
class {状態}{Entity} {
  constructor(private readonly data: {Entity}Data) {
    // バリデーション
  }

  async {action}(repository: {Entity}Repository): Promise<{次状態}{Entity}> {
    const entity = {次状態}{Entity}.from{状態}(this.data);
    await repository.save(entity);
    return entity;
  }
}
```

### Quick Commands 生成

package.json の scripts から抽出:
```bash
# Development
{pm} dev                    # 開発サーバー起動
{pm} test                   # テスト実行

# Quality
{pm} lint                   # ESLint
{pm} typecheck              # TypeScript check
```

## 出力

生成した CLAUDE.md を以下に保存:
- `./CLAUDE.md`（プロジェクトルート）

既存ファイルがある場合は上書き確認。

## 参照スキル

- `/strict-refactoring` - クラス分類、命名規則、設計原則の詳細

## 注意事項

1. **過剰な詳細を避ける**: 仕様書にない情報を推測で追加しない
2. **デフォルトを活用**: 不明な項目はスマートデフォルトを使用
3. **確認は最小限**: 質問は最大2問まで
4. **一貫性を保つ**: 日英対応、命名規則は全体で統一
