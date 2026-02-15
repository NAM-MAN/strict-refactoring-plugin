# CLAUDE.md - バリデーションライブラリ

TypeScript向けの型安全なバリデーションライブラリ。Zodライクな宣言的APIでスキーマを定義し、型推論とランタイムバリデーションを提供する。

## Architecture Principles

**Base Skill**: `/strict-refactoring` を適用せよ。以下はプロジェクト固有の補足。

### System Classification

| 属性 | 値 |
|------|-----|
| Primary Type | Library / Utility Library |
| Deployment | npm package |
| State Complexity | Stateless |
| Multi-tenancy | N/A |
| Compliance | Standard |

### Class Classification (このプロジェクト)

| 分類 | 命名パターン | 責務 | 例 |
|------|-------------|------|-----|
| **Schema** | `{Type}Schema` | 型定義とバリデーションルール | `StringSchema`, `ObjectSchema` |
| **Validator** | `{Rule}Validator` | 個別のバリデーションルール | `MinLengthValidator`, `EmailValidator` |
| **Parser** | `{Type}Parser` | 入力のパースと変換 | `DateParser`, `NumberParser` |

**注**: ライブラリは状態を持たないため、Command/ReadModel は不要。Pure（純粋計算）の原則を適用。

### Polymorphism Preference

型による振る舞いの分岐は switch/if-else ではなく Polymorphism で表現せよ。
enum は振る舞いを持たない識別子にのみ使用。

## Directory Structure

```
src/
├── schemas/                      # スキーマ定義
│   ├── primitives/              #   プリミティブ型
│   │   ├── StringSchema.ts
│   │   ├── NumberSchema.ts
│   │   ├── BooleanSchema.ts
│   │   ├── DateSchema.ts
│   │   └── primitives.test.ts
│   ├── collections/             #   コレクション型
│   │   ├── ArraySchema.ts
│   │   ├── ObjectSchema.ts
│   │   ├── RecordSchema.ts
│   │   └── collections.test.ts
│   ├── composites/              #   合成型
│   │   ├── UnionSchema.ts
│   │   ├── IntersectionSchema.ts
│   │   ├── OptionalSchema.ts
│   │   ├── NullableSchema.ts
│   │   └── composites.test.ts
│   └── core/                    #   コア定義
│       ├── Schema.ts                      # Interface
│       ├── AbstractSchema.ts              # 共通実装
│       └── SchemaResult.ts                # Result型
│
├── validators/                   # バリデータ
│   ├── string/                  #   文字列バリデータ
│   │   ├── MinLengthValidator.ts
│   │   ├── MaxLengthValidator.ts
│   │   ├── PatternValidator.ts
│   │   ├── EmailValidator.ts
│   │   ├── UrlValidator.ts
│   │   └── string-validators.test.ts
│   ├── number/                  #   数値バリデータ
│   │   ├── MinValidator.ts
│   │   ├── MaxValidator.ts
│   │   ├── IntegerValidator.ts
│   │   ├── PositiveValidator.ts
│   │   └── number-validators.test.ts
│   ├── array/                   #   配列バリデータ
│   │   ├── MinItemsValidator.ts
│   │   ├── MaxItemsValidator.ts
│   │   ├── UniqueValidator.ts
│   │   └── array-validators.test.ts
│   └── core/                    #   コア定義
│       ├── Validator.ts                   # Interface
│       └── ValidationError.ts
│
├── parsers/                      # パーサー
│   ├── DateParser.ts
│   ├── NumberParser.ts
│   ├── BooleanParser.ts
│   └── parsers.test.ts
│
├── inference/                    # 型推論
│   ├── Infer.ts                           # 型推論ユーティリティ
│   ├── InferInput.ts
│   ├── InferOutput.ts
│   └── inference.test.ts
│
├── errors/                       # エラー
│   ├── ValidationError.ts
│   ├── ParseError.ts
│   ├── SchemaError.ts
│   └── ErrorFormatter.ts
│
└── index.ts                      # Public API エクスポート
```

## API Design

### Public API Surface

```typescript
// index.ts - 公開APIのみエクスポート
export { v } from "./builder";           // スキーマビルダー
export { Schema } from "./schemas/core/Schema";
export { ValidationError } from "./errors/ValidationError";
export { Infer, InferInput, InferOutput } from "./inference/Infer";

// 内部実装はエクスポートしない
// ❌ export { MinLengthValidator } from "./validators/string/MinLengthValidator";
```

### Schema Interface (Pure として設計)

```typescript
// 全てのSchemaは純粋関数として設計（副作用なし）
interface Schema<TInput, TOutput> {
  // パースと検証（成功時は値、失敗時はエラー）
  safeParse(input: unknown): ParseResult<TOutput>;
  
  // パースと検証（失敗時は例外）
  parse(input: unknown): TOutput;
  
  // 検証のみ（型ガード）
  is(input: unknown): input is TOutput;
  
  // スキーマの合成（新しいSchemaを返す - イミュータブル）
  optional(): Schema<TInput | undefined, TOutput | undefined>;
  nullable(): Schema<TInput | null, TOutput | null>;
  default(value: TOutput): Schema<TInput | undefined, TOutput>;
}

// Result型
type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };
```

### Builder Pattern（メソッドチェーン）

```typescript
// ドットチェーン制限の例外: Builderパターンは許容
// 各メソッドは新しいSchemaインスタンスを返す（イミュータブル）

const userSchema = v.object({
  name: v.string().min(1).max(100),
  email: v.string().email(),
  age: v.number().int().min(0).max(150).optional(),
  tags: v.array(v.string()).min(1).max(10),
});

// 型推論
type User = Infer<typeof userSchema>;
// => { name: string; email: string; age?: number; tags: string[] }
```

### Validator Interface

```typescript
// 個別のバリデーションルール
interface Validator<T> {
  validate(value: T): ValidationResult;
}

type ValidationResult =
  | { valid: true }
  | { valid: false; message: string };

// 実装例
class MinLengthValidator implements Validator<string> {
  constructor(private readonly min: number) {}

  validate(value: string): ValidationResult {
    if (value.length < this.min) {
      return {
        valid: false,
        message: `文字列は${this.min}文字以上である必要があります`,
      };
    }
    return { valid: true };
  }
}
```

### 拡張ポイント（カスタムバリデーション）

```typescript
// ユーザーがカスタムバリデーションを追加できる
const positiveEvenSchema = v.number()
  .refine(
    (n) => n > 0 && n % 2 === 0,
    "正の偶数である必要があります"
  );

// カスタムスキーマの作成
const jpPhoneSchema = v.string().refine(
  (s) => /^0\d{9,10}$/.test(s),
  "日本の電話番号形式である必要があります"
);
```

## Versioning & Compatibility

### Semantic Versioning

| 変更種別 | バージョン | 例 |
|---------|-----------|-----|
| Breaking Change | Major | 既存APIの削除、型変更 |
| 新機能追加 | Minor | 新しいValidator追加 |
| バグ修正 | Patch | 既存機能の修正 |

### Breaking Change Policy

```typescript
// ❌ Breaking: 既存メソッドの削除
// v1: schema.parse(input)
// v2: schema.validate(input)  // parse削除はBreaking

// ✅ Non-breaking: 新メソッド追加
// v1: schema.parse(input)
// v2: schema.parse(input), schema.parseAsync(input)  // 追加はOK

// ✅ Non-breaking: オプショナル引数追加
// v1: schema.parse(input)
// v2: schema.parse(input, options?)  // オプショナル追加はOK
```

### Deprecation

```typescript
/**
 * @deprecated v2.0.0で削除予定。代わりに `safeParse` を使用してください。
 */
tryParse(input: unknown): TOutput | undefined {
  console.warn("tryParse is deprecated. Use safeParse instead.");
  const result = this.safeParse(input);
  return result.success ? result.data : undefined;
}
```

## Error Messages

### ローカライゼーション対応

```typescript
// エラーメッセージはキーで管理
interface ErrorMessages {
  "string.min": (params: { min: number }) => string;
  "string.max": (params: { max: number }) => string;
  "string.email": () => string;
  "number.min": (params: { min: number }) => string;
  // ...
}

// デフォルト（日本語）
const jaMessages: ErrorMessages = {
  "string.min": ({ min }) => `${min}文字以上で入力してください`,
  "string.max": ({ max }) => `${max}文字以下で入力してください`,
  "string.email": () => "有効なメールアドレスを入力してください",
  "number.min": ({ min }) => `${min}以上の値を入力してください`,
};

// 英語
const enMessages: ErrorMessages = {
  "string.min": ({ min }) => `Must be at least ${min} characters`,
  "string.max": ({ max }) => `Must be at most ${max} characters`,
  "string.email": () => "Must be a valid email address",
  "number.min": ({ min }) => `Must be at least ${min}`,
};

// 使用
const schema = v.string().min(3).locale(enMessages);
```

### エラーパス

```typescript
// ネストしたオブジェクトのエラーパスを提供
const schema = v.object({
  user: v.object({
    contacts: v.array(v.object({
      email: v.string().email(),
    })),
  }),
});

const result = schema.safeParse({
  user: { contacts: [{ email: "invalid" }] }
});

// result.error.issues:
// [{ path: ["user", "contacts", 0, "email"], message: "有効なメールアドレスを..." }]
```

## Testing Conventions

### プロパティベーステスト

```typescript
import fc from "fast-check";

describe("StringSchema", () => {
  it("StringSchema は 任意の文字列 に対して パース成功結果 を返すべき", () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const result = v.string().safeParse(str);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(str);
        }
      })
    );
  });

  it("StringSchema は 長さがminLength以上の文字列 に対して パース成功結果 を返すべき", () => {
    fc.assert(
      fc.property(
        fc.integer({ min:1, max: 100 }),
        fc.string(),
        (minLength, str) => {
          const schema = v.string().min(minLength);
          const result = schema.safeParse(str);

          if (str.length >= minLength) {
            expect(result.success).toBe(true);
          } else {
            expect(result.success).toBe(false);
          }
        }
      )
    );
  });
});
```

### エッジケーステスト

```typescript
describe("NumberSchema", () => {
  it.each([
    [0, true],
    [-0, true],
    [NaN, false],
    [Infinity, false],
    [-Infinity, false],
    [Number.MAX_SAFE_INTEGER, true],
    [Number.MIN_SAFE_INTEGER, true],
  ])("NumberSchema は %p に対して success=%p を返すべき", (input, expected) => {
    const result = v.number().safeParse(input);
    expect(result.success).toBe(expected);
  });
});
```

### 型テスト

```typescript
// 型推論が正しく動作することをテスト
import { expectType } from "tsd";

const schema = v.object({
  name: v.string(),
  age: v.number().optional(),
});

type Result = Infer<typeof schema>;

expectType<{ name: string; age?: number }>({} as Result);
```

## Documentation

### JSDoc 規約

```typescript
/**
 * 文字列の最小長を検証するスキーマを返します。
 *
 * @param min - 最小文字数（含む）
 * @returns 最小長制約が追加された新しいスキーマ
 * @throws {Error} minが負の数の場合
 *
 * @example
 * ```typescript
 * const schema = v.string().min(3);
 * schema.parse("ab");     // throws ValidationError
 * schema.parse("abc");    // "abc"
 * schema.parse("abcd");   // "abcd"
 * ```
 */
min(min: number): StringSchema {
  if (min < 0) {
    throw new Error("min must be non-negative");
  }
  return this.addValidator(new MinLengthValidator(min));
}
```

### README 構成

```markdown
# @myorg/validator

型安全なバリデーションライブラリ

## インストール
## クイックスタート
## API リファレンス
### 基本型
### オブジェクト
### 配列
### 合成型
### カスタムバリデーション
## 型推論
## エラーハンドリング
## ローカライゼーション
## マイグレーションガイド
## 貢献ガイド
```

## Quick Commands

```bash
# Development
pnpm dev                    # Watch mode
pnpm test                   # Run all tests
pnpm test:unit              # Unit tests only
pnpm test:types             # Type tests (tsd)
pnpm test:property          # Property-based tests

# Quality
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript check
pnpm format                 # Prettier

# Build
pnpm build                  # Build for production
pnpm size                   # Check bundle size

# Release
pnpm changeset              # Create changeset
pnpm version                # Update versions
pnpm publish                # Publish to npm

# Documentation
pnpm docs:build             # Build API docs
pnpm docs:serve             # Serve docs locally
```

## Checklist

### Coding Style

- [ ] else 句を使わず Early Return しているか
- [ ] 条件分岐は Polymorphism で表現しているか（switch/if-else より優先）

### 新規 Schema/Validator 作成時

- [ ] Interface（Schema or Validator）を実装しているか
- [ ] 純粋関数として設計されているか（副作用なし）
- [ ] イミュータブルか（メソッドは新しいインスタンスを返す）
- [ ] JSDocを記載したか（@example含む）
- [ ] プロパティベーステストを書いたか
- [ ] エッジケーステストを書いたか

### Public API 変更時

- [ ] index.tsのエクスポートを更新したか
- [ ] Breaking Changeではないか確認したか
- [ ] Deprecation警告を追加したか（Breaking Changeの場合）
- [ ] CHANGELOGを更新したか
- [ ] 型テストを更新したか

### リリース前

- [ ] 全テストがパスするか
- [ ] 型チェックがパスするか
- [ ] バンドルサイズが許容範囲か
- [ ] ドキュメントを更新したか
