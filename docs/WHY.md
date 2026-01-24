# WHY: Strict Refactoring Skill 解説書

> **対象読者:** プログラミング経験1000時間程度のエンジニア
> **目的:** 各ルールの「なぜ」を理解し、違和感なく適用できるようになること

---

# Part 0: 前提知識

## 0.1 なぜ設計ルールが必要か

### 「動くコード」と「良いコード」の違い

プログラミングを始めたばかりの頃は「動くコード」を書くことに集中します。しかし経験を積むと、3ヶ月前の自分のコードが読めなくなる経験をします。

**動くコード**と**良いコード**の違いは、**変更のしやすさ**です：

| 観点 | 動くコード | 良いコード |
|------|-----------|-----------|
| 初回開発 | 速い | やや遅い |
| バグ修正 | 困難 | 容易 |
| 機能追加 | 困難 | 容易 |
| チーム開発 | 困難 | 容易 |

### 設計ルールの価値

設計ルールは「制約」ではなく「ガードレール」です：

1. **判断の負荷が減る** - 「このケースはどう書くべきか？」に即答できる
2. **コードレビューが楽になる** - 「ルールに沿っているか」で判断できる
3. **チームの共通言語ができる** - 「これはCommandだから...」で通じる

---

## 0.2 この文書で使う記法

本文書のコード例はTypeScriptで記述しています。以下の記法を使用します：

| 記法 | 意味 |
|------|------|
| `readonly` | 一度設定したら変更できないプロパティ |
| `async/await` | 非同期処理（DBアクセス等、完了を待つ必要がある処理） |
| `Promise<T>` | 非同期処理の結果を表す型 |
| `interface` | クラスが実装すべきメソッドの定義（契約） |
| `T | E` | Union型（TまたはEのどちらか） |
| `<T, E>` | ジェネリクス（型を引数として受け取る） |

---

## 0.3 OOP と関数型の基礎（復習）

### 純粋関数

**純粋関数**は以下を満たす関数：
1. 同じ入力には常に同じ出力
2. 副作用がない（外部の状態を変更しない）

```typescript
// ✅ 純粋関数: 何度呼んでも同じ結果
function add(a: number, b: number): number {
  return a + b;  // add(1, 2) は常に 3
}

// ❌ 純粋でない: 呼ぶたびに結果が変わる
let total = 0;
function addToTotal(amount: number): number {
  total += amount;  // 外部変数を変更
  return total;     // 呼ぶたびに結果が増える
}
```

**純粋関数の価値:** テスト結果が常に同じ、デバッグが容易（入力と出力だけ見ればいい）。

### 副作用

**副作用**とは関数の外部に影響を与えること。

**具体例:**
| 副作用 | なぜ問題か |
|--------|-----------|
| DBに保存する | 関数を呼ぶたびにDBの中身が変わる |
| ファイルに書き込む | ファイルの内容が変わる |
| メールを送信する | 取り消せない操作が実行される |
| 現在時刻を取得する | 呼ぶたびに結果が変わる |

副作用がある関数は「同じ引数で呼んでも結果が変わる可能性がある」ため、テストが難しくなります。

**本スキルのアプローチ:** 副作用を「Command」に集約し、副作用のない処理を「Query」「Transition」として分離する。

### イミュータビリティ

**イミュータビリティ**とは、一度作ったオブジェクトを変更しないこと。変更が必要な場合は新しいオブジェクトを返す。

```typescript
// ✅ イミュータブル
class User {
  constructor(readonly name: string, readonly age: number) {}
  
  birthday(): User {
    return new User(this.name, this.age + 1);  // 新しいインスタンス
  }
}
```

**イミュータビリティの価値:** 状態追跡が不要、安全に共有できる、並列処理で競合なし。

---

## 0.4 本スキルの哲学

### OOP主軸 + 関数型の良いとこ取り

| 取り入れた概念 | 出典 | 説明 |
|--------------|------|------|
| クラスによる責務の明確化 | OOP | データと振る舞いをまとめる |
| インターフェースによる抽象化 | OOP | 実装を差し替え可能にする |
| 純粋関数（Query, Transition） | FP | 副作用のない計算を分離 |
| イミュータビリティ | FP | オブジェクトを変更せず新しいものを返す |
| Result型 | FP | 成功/失敗を戻り値の型で表現（Part 4で詳述） |

### ルールの優先順位

```
1. 言語/フレームワークの構文制約（変えられない）
2. 本スキルのルール（原則従う）
3. プロジェクト固有のルール（チーム合意）
4. 個人の好み（最も低い）
```

---

# Part 1: 4分類（Command / Transition / Query / ReadModel）

## 1.1 なぜ分類が必要か

### 問題: 「何でもできるクラス」

```typescript
// ❌ 典型的な問題
class OrderService {
  async processOrder(orderId: string, userId: string): Promise<Order> {
    const order = await this.db.query(...);           // 読み取り
    if (user.role !== 'admin') throw new Error();     // 判定
    const stock = await this.inventoryApi.getStock(); // 外部API
    await this.paymentGateway.charge(...);            // 決済（副作用）
    await this.db.execute('UPDATE ...');              // 書き込み（副作用）
    await this.emailService.send(...);                // 通知（副作用）
    return order;
  }
}
```

**問題点:**
- テスト困難（4つの外部依存をモック必要）
- 責務不明確（変更の影響範囲が不明）
- トランザクション管理困難
- 再利用不可能

### 解決: 4分類

| 分類 | 定義 | 状態変更 | 外部リソース |
|------|------|:------:|:------:|
| **Command** | 永続状態を変更、外部に作用 | あり | メソッド引数 |
| **Transition** | 型 A → 型 B への変換（バリデーション等） | なし | なし |
| **Query** | 値の計算・導出 | なし | なし |
| **ReadModel** | 読み取り専用でデータ取得（状態を変更しない） | なし | メソッド引数 |

### 判断フロー

```
このクラスは...
├─ 永続化/外部通信を行う？
│   ├─ YES + 書き込み → Command
│   │   例: DraftRingi.submit(repository)
│   └─ YES + 読み取りのみ → ReadModel
│       例: RingisForApprover.execute(repository)
└─ NO（純粋関数）
    ├─ 入力型と出力型が異なる？ → Transition
    │   例: UnvalidatedInput → ValidatedInput
    └─ 同じ概念の計算・変換？ → Query
        例: Price + TaxRate → TaxAmount
```

---

## 1.2 代替アプローチ比較

| アプローチ | 長所 | 短所 | 採用 |
|-----------|------|------|:----:|
| **本スキル: 4分類** | 責務明確、テスト容易 | 学習コスト | ✅ |
| CQS (2分類) | シンプル | Transition/ReadModelの区別なし | △ |
| Clean Architecture | 層の分離が明確 | 過剰な抽象化 | △ |
| 分類なし | 柔軟 | 一貫性なし | ❌ |

**なぜCQSでは不十分か:** 
CQS（Command Query Separation）は「書き込み」と「読み取り」を分ける考え方です。しかしCQSでは「DBから読み取る」と「計算する」を同じQueryとして扱います。

- DBから読み取る → テストにモック（偽物）が必要
- 計算する → モック不要で直接テスト可能

テスト方法が全く異なるため、本スキルではこれをReadModelとQueryに分離します。

---

## 1.3 Command

永続状態を変更する、または外部システムに作用するクラス。**必ず副作用を伴う。**

### Pending Object Pattern

状態遷移を型で表現する：

```typescript
class DraftRingi {
  async submit(repository: RingiRepository): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data);
    await repository.save(submitted);
    return submitted;
  }
}
```

**なぜこのパターンか:**
- 状態が型で表現される（`DraftRingi`と`SubmittedRingi`は別の型）
- 無効な遷移がコンパイルエラー（`DraftRingi.approve()`は存在しない）
- 各状態のクラスを個別にテスト可能

---

## 1.4 Transition

型 A → 型 B への変換を行う純粋関数クラス。**副作用なし。**

```typescript
class RingiInputValidation {
  constructor(private readonly input: UnvalidatedRingiInput) {}
  
  execute(): Result<ValidatedRingiInput, ValidationError> {
    // バリデーションロジック
  }
}
```

**なぜCommandと分離するか:**
- テストにモックが不要
- 責務が明確（「入力が正しいか」vs「ドメインルールを満たすか」）
- 再利用可能

---

## 1.5 Query

値の計算・導出を行う純粋関数クラス。**副作用なし。**

```typescript
class TaxOn {
  constructor(private readonly price: Money, private readonly rate: TaxRate) {}
  
  get amount(): Money {
    return this.price.multiply(this.rate.value);
  }
}
```

**なぜクラスにするか:**
- 関連する計算がグループ化される
- 同じ引数を何度も渡さなくていい
- 名前空間として機能

---

## 1.6 ReadModel

永続層から読み取り専用でデータを取得するクラス。**書き込みは行わない。**

```typescript
class RingisForApprover {
  constructor(private readonly repository: RingiRepository) {}
  
  async execute(approverId: ApproverId): Promise<readonly RingiSummary[]> {
    return this.repository.findPendingByApprover(approverId);
  }
}
```

**なぜQueryと分離するか:** テスト戦略が異なる。QueryはモックなしでテストできるがReadModelはRepositoryのモックが必要。

---

# Part 2: 完全コンストラクタと依存生成

## 2.1 完全コンストラクタ

**完全コンストラクタ**とは、コンストラクタを抜けた時点でオブジェクトが完全に有効な状態であること。

### 問題: 不完全なオブジェクト

```typescript
// ❌ 不完全なオブジェクトが作れる
class User {
  id: string;
  name: string;
  setId(id: string) { this.id = id; }
  setName(name: string) { this.name = name; }
}

const user = new User();
user.setName("田中");
// id が未設定のまま使われる可能性
```

### 解決

```typescript
// ✅ 完全コンストラクタ
class User {
  constructor(
    readonly id: UserId,
    readonly name: UserName
  ) {}
}
```

| アプローチ | 長所 | 短所 | 採用 |
|-----------|------|------|:----:|
| **完全コンストラクタ** | 不完全な状態が存在しない | 引数が多くなる可能性 | ✅ |
| Setter注入 | 柔軟 | 不完全な状態が存在 | ❌ |
| Builderパターン | 可読性が高い | build()まで不完全、記述量増加 | △ |

---

## 2.2 依存の4分類と生成方針

| 分類 | 定義 | 生成方法 |
|------|------|---------|
| **Pure Logic** | 外部リソース不要、決定的 | コンストラクタ内で生成 |
| **Configured Logic** | 設定値に依存、決定的 | Config経由で内部生成 |
| **External Resource** | 外部リソースにアクセス | メソッド引数で受け取る |
| **Non-deterministic** | 実行ごとに結果が変わる | メソッド引数で受け取る |

**なぜメソッド引数で受け取るか:** テスト時にモックやスタブを注入できる。

```typescript
class DraftRingi {
  // External Resource と Non-deterministic はメソッド引数
  async submit(
    repository: RingiRepository,  // External Resource
    clock: Clock                   // Non-deterministic
  ): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data, clock.now());
    await repository.save(submitted);
    return submitted;
  }
}
```

---

# Part 3: Polymorphism（多態性）

## 3.1 なぜ switch を禁止するか

### 問題: switch の増殖

```typescript
// ❌ 同じ enum に対する switch が増殖
class PaymentProcessor {
  process(method: PaymentMethod, amount: Money) {
    switch (method) { /* 50行 */ }
  }
  refund(method: PaymentMethod, transactionId: string) {
    switch (method) { /* また同じ分岐 */ }
  }
  getStatus(method: PaymentMethod, transactionId: string) {
    switch (method) { /* また同じ分岐 */ }
  }
}
```

**問題点:**
- 新しい決済方法追加時、複数のswitchを全て修正（Shotgun Surgery）
- 各caseが長くなりメソッドが巨大化
- テストが困難

### 解決: Polymorphism

```typescript
// ✅ Interface + 実装クラス
interface PaymentGateway {
  process(amount: Money): Promise<PaymentResult>;
  refund(transactionId: string): Promise<RefundResult>;
}

class CreditCardPayment implements PaymentGateway { ... }
class BankTransferPayment implements PaymentGateway { ... }
```

| アプローチ | 長所 | 短所 | 採用 |
|-----------|------|------|:----:|
| **Polymorphism** | 新しい種類を追加しても既存コードを変更不要、テスト容易 | クラス数増加 | ✅ |
| switch文 | シンプル | 変更に弱い、巨大化 | ❌ |

---

## 3.2 いつ switch を許容するか

以下の3つ全てがNOの場合、switchで可：

1. 各分岐で**異なる計算ロジック**がある？
2. 各分岐を**独立してテスト**したい？
3. 今後、分岐が**追加される可能性**がある？

**許容される例:**
- 分岐が2つで値選択のみ: `flag ? valueA : valueB`
- 境界層での変換: `errorCode → HTTPステータス`
- enumが振る舞いを持たない単なる識別子

---

# Part 4: エラー処理

## 4.1 Result 型 vs 例外

### 問題: 例外の型安全性欠如

```typescript
// ❌ 例外ベース
async function submit(data: RingiData): Promise<SubmittedRingi> {
  // どこで例外が投げられるか型では分からない
}

try {
  await submit(data);
} catch (e) {
  // e は何の型？どう処理する？
}
```

### 解決: Result 型

```typescript
// ✅ Result 型
type Result<T, E> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

function create(data: ValidatedInput): Result<DraftRingi, AmountExceededError> {
  if (data.amount.isGreaterThan(MAX)) {
    return Result.err(new AmountExceededError(...));
  }
  return Result.ok(new DraftRingi(data));
}
```

| アプローチ | 長所 | 短所 | 採用 |
|-----------|------|------|:----:|
| **Result型** | 型安全、明示的 | 記述量増加 | ✅ ドメインエラー |
| 例外 | シンプル | 型安全性なし | △ インフラエラー |

---

## 4.2 エラーの分類

| 分類 | 定義 | 処理方法 | 例 |
|------|------|---------|-----|
| **DomainError** | ビジネスルール違反 | Result型で返す | 金額上限超過 |
| **InfrastructureError** | 技術的障害 | 例外でthrow | DB接続失敗 |

**なぜ分けるか:** DomainErrorはユーザーが対処可能（入力を修正）、InfrastructureErrorはユーザーには対処不可能（リトライを促す）。

---

# Part 5: 設計ルール集

## 5.1 Interface 優先、継承禁止

### 問題: 継承の脆さ

```typescript
// ❌ ペンギンは鳥だが飛べない
class Bird { fly() { ... } }
class Penguin extends Bird {
  fly() { throw new Error("飛べません"); }  // リスコフ違反
}
```

### 解決: Interface + Composition

```typescript
// ✅ 必要な振る舞いのみ実装
interface Swimmer { swim(): void; }
class Penguin implements Swimmer { ... }
```

**継承の問題点:**
- 脆い基底クラス問題（親変更で全子クラスが影響）
- 多重継承不可
- is-a関係の誤用

---

## 5.2 Early Return Only

### 問題: ネストの深い条件分岐

```typescript
// ❌ 深いネスト
if (order !== null) {
  if (user !== null) {
    if (user.isActive) {
      // 本題の処理
    } else { return error; }
  } else { return error; }
} else { return error; }
```

### 解決: Early Return

```typescript
// ✅ ガード節で先に抜ける
if (order === null) return { error: "注文が必要" };
if (user === null) return { error: "ユーザーが必要" };
if (!user.isActive) return { error: "無効なユーザー" };

// 本題の処理（ネストなし）
```

**else許容の例外:** 両方正常系で同じ型を返す対称的なパス。

---

## 5.3 Primitive Obsession の回避

### 問題: 型が同じで意味が違う

```typescript
// ❌ 順番を間違えても型エラーにならない
function createUser(name: string, email: string, phone: string) { ... }
createUser("tanaka@example.com", "田中", "1234567");  // 逆！
```

### 解決: 値オブジェクト

```typescript
// ✅ 型が違うので間違えられない
function createUser(name: UserName, email: Email, phone: PhoneNumber) { ... }
```

**値オブジェクトを作成すべき場合:**
- フォーマット制約がある（Email, PhoneNumber）
- 範囲制約がある（Age, Percentage）
- ドメイン固有の意味がある（UserId, OrderId）

---

## 5.4 Parameters: Max 1-2

引数が3個以上になったらオブジェクトにまとめる。

```typescript
// ❌ 引数が多すぎる
function createOrder(customerId, productId, quantity, shippingAddress, ...) { ... }

// ✅ オブジェクトにまとめる
function createOrder(input: CreateOrderInput) { ... }
```

---

## 5.5 Named Return Values（タプル禁止）

```typescript
// ❌ どっちが start でどっちが end？
function getDateRange(): [Date, Date] { ... }

// ✅ 名前で明確
function getDateRange(): { start: Date; end: Date } { ... }
```

---

# Part 6: アーキテクチャ

## 6.1 Screaming Architecture

### 問題: 何のシステムか分からない

```
❌ 技術レイヤーで分割
src/
├── controllers/
├── services/
├── repositories/
└── entities/
```

### 解決: 機能/ドメインで分割

```
✅ 何のシステムか一目で分かる
src/
├── catalog/      # 商品カタログ
├── ordering/     # 注文管理
├── customers/    # 顧客管理
└── payments/     # 決済
```

**React/Next.js での適用例:**

```
❌ 技術レイヤー
src/
├── components/
├── hooks/
├── utils/
└── services/

✅ 機能ベース
src/
├── catalog/
│   ├── ProductList.tsx
│   ├── useProducts.ts
│   └── productApi.ts
├── cart/
└── checkout/
```

※ Next.jsの `pages/` や `app/` はフレームワーク規約のため例外

**Robert C. Martin:** 「アーキテクチャは何のシステムかを叫ぶべきだ」

---

## 6.2 禁止: 技術レイヤー名のディレクトリ

**ディレクトリ名**に使うな：
```
❌ domain/ infrastructure/ application/ services/ repositories/ controllers/ utils/ common/ shared/
```

**ファイル名・クラス名**はOK：
```
✅ RingiRepository.ts, RingiController.ts
```

---

## 6.3 MECE Tree と Rule of 5

- **MECE:** 各概念は1つのディレクトリにのみ属する（重複なし、漏れなし）
- **Rule of 5:** 各ディレクトリの直接の子は5つ以下

---

## 6.4 Colocation

関連するファイルを同じディレクトリに配置：

```
✅ テストはソースと同居
src/ringis/
├── DraftRingi.ts
├── DraftRingi.test.ts
└── RingiTestFactory.ts
```

**なぜ:** ファイル探しが楽、リファクタリング時に1箇所のみ修正。

---

# Part 7: テスト戦略

## 7.1 依存分類別のテスト方法

| 分類 | テスト方法 | モック |
|------|-----------|:------:|
| Pure Logic | 入力→出力を直接テスト | 不要 |
| Configured Logic | 設定を変えてテスト | 不要 |
| External Resource | InMemory実装を使用 | 必要 |
| Non-deterministic | 固定値を注入 | 必要 |

---

## 7.2 Test Data Factory

### 問題: 共有フィクスチャ

```typescript
// ❌ テスト間で状態が共有される
export const testUsers = { admin: new User(...) };
```

### 解決: Factory で毎回生成

```typescript
// ✅ 毎回新しいインスタンス
export const UserTestFactory = {
  admin: (overrides?: Partial<UserData>) => new User({
    id: UserId.generate(),
    name: 'Test Admin',
    ...overrides,
  }),
};
```

---

## 7.3 InMemory Repository

全てのRepositoryにInMemory実装を用意し、単体テストで使用。

```typescript
class InMemoryRingiRepository implements RingiRepository {
  private storage = new Map<string, Ringi>();
  
  async save(ringi: Ringi): Promise<void> {
    this.storage.set(ringi.id.value, ringi);
  }
  
  async findById(id: RingiId): Promise<Ringi | null> {
    return this.storage.get(id.value) ?? null;
  }
}
```

**なぜ必要か:** 単体テストが高速、テストの独立性確保、本番DBへの依存排除。

---

## 7.4 Gateway パターン

外部サービスをInterfaceで抽象化：

```typescript
interface PaymentGateway {
  charge(amount: Money): Promise<PaymentResult>;
}

// 本番: StripePaymentGateway
// テスト: StubPaymentGateway（常に成功）
```

---

# Appendix: クイックリファレンス

## 判断フロー

### 4分類

```
外部リソースにアクセス？
├─ YES + 書き込み → Command
├─ YES + 読み取りのみ → ReadModel
└─ NO → 型が変わる？ → YES: Transition / NO: Query
```

### Polymorphism vs switch

```
各分岐で異なる計算ロジック？ YES → Polymorphism
各分岐を独立テストしたい？ YES → Polymorphism
今後分岐が追加される？ YES → Polymorphism
全て NO → switch OK
```

### 依存の生成

```
外部リソースにアクセス？ → メソッド引数
実行ごとに結果が変わる？ → メソッド引数
設定値に依存？ → Config経由でコンストラクタ内生成
上記全てNO → コンストラクタ内で new
```

---

## チェックリスト

### 新規クラス作成時
- [ ] 4分類のいずれかに分類したか
- [ ] 完全コンストラクタになっているか
- [ ] 継承を使っていないか
- [ ] 引数は2個以下か

### コードレビュー時
- [ ] else を使っていないか
- [ ] switch で振る舞いを分岐していないか
- [ ] プリミティブ型を乱用していないか
- [ ] ディレクトリ名が技術レイヤー名ではないか

### テスト作成時
- [ ] Pure Logic は直接テストしているか
- [ ] External Resource には InMemory 実装を使用しているか
- [ ] 共有フィクスチャを使っていないか

---

## 用語集

| 用語 | 意味 |
|------|------|
| Command | 永続状態を変更するクラス |
| Query | 純粋な計算を行うクラス |
| Transition | 型変換を行うクラス |
| ReadModel | 読み取り専用でデータを取得するクラス |
| 完全コンストラクタ | 生成時点でオブジェクトが完全に有効 |
| Pending Object Pattern | 状態遷移を型で表現するパターン |
| Result型 | 成功/失敗を型で表現する仕組み |
| DomainError | ビジネスルール違反のエラー |
| InfrastructureError | 技術的障害のエラー |
| Screaming Architecture | ディレクトリ構造がシステムの意図を叫ぶ |
| Colocation | 関連ファイルを同じディレクトリに配置 |
| Test Data Factory | テストデータを生成するファクトリ関数 |
| InMemory Repository | メモリ上で動作するテスト用 Repository |
| Gateway | 外部サービスを抽象化するインターフェース |
