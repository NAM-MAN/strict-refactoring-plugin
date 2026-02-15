# エラー処理パターン集

## Table of Contents
- [Result型の定義](#result型の定義)
- [DomainError 判別共用体](#domainerror-判別共用体)
- [InfrastructureError](#infrastructureerror)
- [エラー作成ヘルパー](#エラー作成ヘルパー)
- [どこで何を返すか](#どこで何を返すか)
- [バリデーション結果の集約](#バリデーション結果の集約)
- [HTTP ステータスコード対応](#http-ステータスコード対応)
- [Controller 実装パターン](#controller-実装パターン)
- [専用エラー型の作成基準](#専用エラー型の作成基準)
- [InfrastructureError リトライ戦略](#infrastructureerror-リトライ戦略)
- [既存プロジェクトの移行手順](#既存プロジェクトの移行手順)
- [interface vs type の使い分け](#interface-vs-type-の使い分け)

## Result型の定義

ドメインの失敗は `Result<T, E>` で返し、インフラ障害のみ例外にする。

```typescript
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Result = {
  ok: <T>(value: T): Result<T, never> => ({ ok: true, value }),
  err: <E>(error: E): Result<never, E> => ({ ok: false, error }),
};
```

推奨は `if` + Early Return（可読性優先）。

```typescript
const validation = validateRingiInput(req.body);
if (!validation.ok) return toDomainErrorResponse(validation.error);
const draft = DraftRingi.create(RingiId.generate(), validation.value);
if (!draft.ok) return toDomainErrorResponse(draft.error);
const submitted = await draft.value.submit(repository, clock);
```

## DomainError 判別共用体

DomainError は `Error` を継承しない。`_tag`（分類）と `code`（識別）を必須化。

```typescript
export type DomainErrorBase = {
  readonly _tag: string;
  readonly code: string;
  readonly message: string;
};

export type ValidationError = DomainErrorBase & {
  readonly _tag: 'ValidationError';
  readonly violations: ValidationViolation[];
};

export type NotFoundError = DomainErrorBase & {
  readonly _tag: 'NotFoundError';
  readonly resourceType: string;
  readonly resourceId: string;
};

export type ConflictError = DomainErrorBase & {
  readonly _tag: 'ConflictError';
  readonly existingId?: string;
};

export type AuthorizationError = DomainErrorBase & {
  readonly _tag: 'AuthorizationError';
  readonly requiredPermission: string;
};

export type BusinessRuleViolationError = DomainErrorBase & {
  readonly _tag: 'BusinessRuleViolationError';
};

export type DomainError =
  | ValidationError
  | NotFoundError
  | ConflictError
  | AuthorizationError
  | BusinessRuleViolationError;
```

## InfrastructureError

```typescript
export abstract class InfrastructureError extends Error {
  abstract readonly code: string;
  abstract readonly retryable: boolean;
  abstract readonly suggestedRetryAfterMs?: number;

  constructor(message: string, readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DatabaseConnectionError extends InfrastructureError {
  readonly code = 'DATABASE_CONNECTION_FAILED';
  readonly retryable = true;
  readonly suggestedRetryAfterMs = 1000;

  constructor(cause: Error) {
    super('データベース接続に失敗しました', cause);
  }
}
```

## エラー作成ヘルパー

共通エラーとエンティティ専用エラーはファクトリで生成する。

```typescript
export const DomainErrors = {
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
};

export type RingiAmountExceededError = BusinessRuleViolationError & {
  readonly code: 'RINGI_AMOUNT_EXCEEDED';
  readonly ringiId: RingiId;
  readonly amount: Money;
  readonly limit: Money;
};

export const RingiErrors = {
  amountExceeded: (ringiId: RingiId, amount: Money, limit: Money): RingiAmountExceededError => ({
    _tag: 'BusinessRuleViolationError',
    code: 'RINGI_AMOUNT_EXCEEDED',
    message: `稟議金額 ${amount.value} が上限 ${limit.value} を超えています`,
    ringiId,
    amount,
    limit,
  }),
};
```

## どこで何を返すか

| 場所 | 返却 |
|---|---|
| 静的ファクトリ | `Result<T, E>` |
| Command（ドメインエラーあり） | `Promise<Result<T, E>>` |
| Command（ドメインエラーなし） | `Promise<T>` |
| Repository実装 | `InfrastructureError` を throw |

```typescript
class TaxOn {
  private constructor(private readonly subtotal: Money) {}
  static create(subtotal: Money): Result<TaxOn, BusinessRuleViolationError> {
    if (subtotal.isNegative()) {
      return Result.err({
        _tag: 'BusinessRuleViolationError',
        code: 'TAX_SUBTOTAL_INVALID',
        message: `税計算の対象金額が不正です: ${subtotal.value}`,
      });
    }
    return Result.ok(new TaxOn(subtotal));
  }
  amount(): Money {
    return this.subtotal.multiply(0.1);
  }
}

class AwaitingApproval {
  async approve(repo: RingiRepository): Promise<Result<ApprovedRingi, ApprovalExpiredError>> {
    if (this.isExpired()) return Result.err(RingiErrors.approvalExpired(this.id));
    const approved = ApprovedRingi.from(this);
    await repo.save(approved);
    return Result.ok(approved);
  }
}

class DraftRingi {
  async submit(repo: RingiRepository, clock: Clock): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data, clock.now());
    await repo.save(submitted);
    return submitted;
  }
}
```

`Result<T, never>` は使わない。

## バリデーション結果の集約

```typescript
export type ValidationCode =
  | 'REQUIRED'
  | 'MAX_LENGTH'
  | 'MIN_LENGTH'
  | 'MIN_VALUE'
  | 'MAX_VALUE'
  | 'INVALID_FORMAT';

export class ValidationViolation {
  constructor(readonly field: string, readonly code: ValidationCode, readonly message: string) {}
}

type ValidationResult<T> = Result<T, ValidationError>;

function validateRingiInput(data: unknown): ValidationResult<ValidatedRingiInput> {
  const violations: ValidationViolation[] = [];
  if (typeof data !== 'object' || data === null) {
    return Result.err(DomainErrors.validation([
      new ValidationViolation('data', 'INVALID_FORMAT', '入力データが不正です'),
    ]));
  }

  const input = data as { title?: string; amount?: number };
  if (!input.title) violations.push(new ValidationViolation('title', 'REQUIRED', '件名は必須です'));
  if (input.amount === undefined) violations.push(new ValidationViolation('amount', 'REQUIRED', '金額は必須です'));
  if (input.amount !== undefined && input.amount < 0) {
    violations.push(new ValidationViolation('amount', 'MIN_VALUE', '金額は0以上です'));
  }
  if (violations.length > 0) return Result.err(DomainErrors.validation(violations));

  return Result.ok({
    title: input.title as string,
    amount: Money.of(input.amount as number),
  } as ValidatedRingiInput);
}
```

## HTTP ステータスコード対応

| Error `_tag` | HTTP |
|---|---|
| `ValidationError` | 400 |
| `AuthorizationError` | 403 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `BusinessRuleViolationError` | 422 |
| `InfrastructureError` retryable | 503 |
| `InfrastructureError` non-retryable | 500 |

```typescript
function toDomainErrorResponse(error: DomainError): Response {
  const statusMap: Record<DomainError['_tag'], number> = {
    ValidationError: 400,
    AuthorizationError: 403,
    NotFoundError: 404,
    ConflictError: 409,
    BusinessRuleViolationError: 422,
  };
  return Response.status(statusMap[error._tag]).json({
    type: 'domain_error',
    code: error.code,
    message: error.message,
  });
}
```

## Controller 実装パターン

```typescript
async function submitRingiHandler(req: Request): Promise<Response> {
  const validation = validateRingiInput(req.body);
  if (!validation.ok) return toDomainErrorResponse(validation.error);

  const draft = DraftRingi.create(RingiId.generate(), validation.value);
  if (!draft.ok) return toDomainErrorResponse(draft.error);

  try {
    const submitted = await draft.value.submit(ringiRepository, systemClock);
    return Response.created({ id: submitted.id.value });
  } catch (e) {
    if (e instanceof InfrastructureError) return toInfraErrorResponse(e);
    throw e;
  }
}

function toInfraErrorResponse(error: InfrastructureError): Response {
  const status = error.retryable ? 503 : 500;
  return Response.status(status).json({
    type: 'infrastructure_error',
    code: error.code,
    message: 'サービスが一時的に利用できません',
    retryable: error.retryable,
    retryAfterMs: error.suggestedRetryAfterMs,
  });
}
```

## 専用エラー型の作成基準

次のどれかが YES なら専用エラー型を作る。

1. 業務用語として定着している
2. 特別なリカバリー処理が必要
3. 400 以外の HTTP ステータスが必要
4. ログ/監視で分離したい

| ケース | 推奨 |
|---|---|
| タイトル未入力 | `ValidationViolation` |
| 金額上限超過 | 専用型 (`RINGI_AMOUNT_EXCEEDED`) |
| 承認ルート未設定 | 専用型 (`RINGI_APPROVAL_ROUTE_NOT_FOUND`) |

## InfrastructureError リトライ戦略

```typescript
class RateLimitExceededError extends InfrastructureError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly retryable = true;
  readonly suggestedRetryAfterMs = 3000;
  constructor(cause?: Error) {
    super('外部APIのレート制限に達しました', cause);
  }
}

class InvalidConfigurationError extends InfrastructureError {
  readonly code = 'INVALID_CONFIGURATION';
  readonly retryable = false;
  readonly suggestedRetryAfterMs = undefined;
  constructor(readonly configKey: string, message: string) {
    super(`設定エラー [${configKey}]: ${message}`);
  }
}
```

運用目安:
- `retryable=true`: 接続断、レート制限、タイムアウト
- `retryable=false`: 設定ミス、資格情報不正、設計不整合

## 既存プロジェクトの移行手順

### Step 1: 基盤追加
- `result.ts` に `Result<T, E>`
- `errors.ts` に `DomainError` 群と `InfrastructureError`

### Step 2: 既存例外を変換
- 既存の `LegacyDomainError` を `toDomainError` で判別共用体へ変換する
- 既知エラーは `RingiErrors` などの専用ファクトリへ集約する
- 不明エラーは `UNKNOWN_DOMAIN_ERROR` で包んで境界層へ返す

### Step 3: 境界層アダプター
- 例外ベースのサービス呼び出しを `withLegacyDomainResult` でラップする
- `LegacyDomainError` だけ `Result.err` に変換し、インフラ例外は再 throw する

### Step 4: モジュール単位で置換
- 新規機能は Result 型
- 既存修正は変更箇所から段階移行
- 1 PR 1 モジュールで進める

完了条件:
- Controller で Domain/Infrastructure を分離
- 新規ドメインエラーが判別共用体
- `InfrastructureError` 以外で `extends Error` していない

## interface vs type の使い分け

| 用途 | 推奨 |
|---|---|
| ADT / 判別共用体 | `type` |
| Union / Intersection 中心 | `type` |
| クラス契約 (`implements`) | `interface` |
| 単純オブジェクト形状 | 規約で統一 |

```typescript
type ErrorResult =
  | { ok: true; value: string }
  | { ok: false; error: DomainError };

interface RingiRepository {
  save(ringi: Ringi): Promise<void>;
  findById(id: RingiId): Promise<Ringi | null>;
}

class PostgresRingiRepository implements RingiRepository {
  async save(ringi: Ringi): Promise<void> {
    // ...
  }
  async findById(id: RingiId): Promise<Ringi | null> {
    // ...
    return null;
  }
}
```
