# WHY: Strict Refactoring Skill 解説書

> **対象読者:** プログラミング経験1000時間程度のエンジニア
> **目的:** 各ルールの「なぜ」を理解し、違和感なく適用できるようになること

---

# Part 0: 前提知識

## 0.1 なぜ設計ルールが必要か

### 「動くコード」と「良いコード」の違い

プログラミングを始めたばかりの頃は「動くコード」を書くことに集中します。テストが通れば成功、画面に表示されれば完成。これは正しいスタートです。

しかし、実務で経験を積むと必ずこんな場面に遭遇します：

- 「3ヶ月前に自分が書いたコードが読めない」
- 「1箇所直したら別の場所が壊れた」
- 「このコードを書いた人が退職して、誰も触れない」

**動くコード**と**良いコード**の違いは、**変更のしやすさ**です：

| 観点 | 動くコード | 良いコード |
|------|-----------|-----------|
| 初回開発 | 速い | やや遅い |
| バグ修正 | 困難（どこを直せばいいか分からない） | 容易（影響範囲が明確） |
| 機能追加 | 困難（既存コードを壊しそう） | 容易（拡張ポイントが明確） |
| チーム開発 | 困難（人によって書き方がバラバラ） | 容易（共通ルールがある） |
| 引き継ぎ | 困難（書いた本人しか分からない） | 容易（構造が予測可能） |

### 設計ルールの価値

設計ルールは「制約」ではなく「ガードレール」です。

**ガードレール**とは、道路の端に設置された防護柵のこと。運転手の自由を奪うためではなく、崖から落ちないようにするためにあります。設計ルールも同じで、「悪い設計」という崖から落ちないためのものです。

設計ルールがあると：
1. **判断の負荷が減る** - 「このケースはどう書くべきか？」に即答できる
2. **コードレビューが楽になる** - 「ルールに沿っているか」で判断できる
3. **チームの共通言語ができる** - 「これはCommandだから...」で通じる

---

## 0.2 この文書で使う用語と記法

### プログラミング基礎用語

| 用語 | 意味 | 例 |
|------|------|-----|
| **クラス** | データと処理をまとめた設計図 | `class User { ... }` |
| **インスタンス** | クラスから作った実体 | `new User()` |
| **メソッド** | クラスに属する関数 | `user.save()` |
| **コンストラクタ** | インスタンス作成時に呼ばれる特別なメソッド | `constructor(name) { ... }` |
| **インターフェース** | 「このメソッドを持っていること」という契約 | `interface Savable { save(): void }` |
| **継承** | 親クラスの機能を子クラスが引き継ぐ | `class Dog extends Animal` |

### TypeScript 記法

本文書のコード例はTypeScriptで記述しています：

| 記法 | 意味 | 例 |
|------|------|-----|
| `readonly` | 一度設定したら変更できない | `readonly name: string` |
| `async/await` | 完了を待つ必要がある処理 | `await db.save(user)` |
| `Promise<T>` | 「後でTが届く」という約束 | `Promise<User>` |
| `T \| E` | TまたはEのどちらか | `string \| null` |
| `interface` | メソッドの契約を定義 | `interface Repository { ... }` |

### テスト用語

| 用語 | 意味 |
|------|------|
| **モック（Mock）** | テスト用の偽物。本物のDBやAPIの代わりに使う |
| **スタブ（Stub）** | 決まった値を返すだけの偽物 |
| **フィクスチャ** | テストで使うサンプルデータ |

---

## 0.3 OOP と関数型の基礎

### 純粋関数

**純粋関数**とは、以下の2つを満たす関数です：
1. **同じ入力には常に同じ出力** - 10回呼んでも100回呼んでも同じ結果
2. **副作用がない** - 関数の外の世界に影響を与えない

```typescript
// ✅ 純粋関数: 何度呼んでも同じ結果
function add(a: number, b: number): number {
  return a + b;  // add(1, 2) は常に 3
}

// ❌ 純粋でない: 呼ぶたびに結果が変わる
let total = 0;
function addToTotal(amount: number): number {
  total += amount;  // 外部変数を変更している
  return total;     // 1回目は100、2回目は200...
}
```

**なぜ純粋関数が良いのか:**
- テストが簡単（入力を与えて出力を確認するだけ）
- バグが見つけやすい（入力と出力だけ見ればいい）
- 安全に再利用できる（他の場所に影響しない）

### 副作用

**副作用**とは、関数の外部に影響を与えることです。

| 副作用の例 | なぜ問題か |
|-----------|-----------|
| DBに保存する | 関数を呼ぶたびにDBの中身が変わる |
| ファイルに書き込む | ファイルの内容が変わる |
| メールを送信する | 取り消せない操作が実行される |
| 現在時刻を取得する | 呼ぶたびに結果が変わる |
| ランダムな値を生成する | 呼ぶたびに結果が変わる |

副作用がある関数は「同じ引数で呼んでも結果が変わる可能性がある」ため、テストが難しくなります。

**本スキルのアプローチ:** 副作用を「Command」というカテゴリに集約し、副作用のない処理を「Query」「Transition」として分離する。これにより、テストしやすい部分とテストが難しい部分を明確に分けます。

### イミュータビリティ（不変性）

**イミュータビリティ**とは、一度作ったオブジェクトを変更しないことです。変更が必要な場合は、新しいオブジェクトを作って返します。

```typescript
// ❌ ミュータブル（変更可能）: オブジェクト自体を変更
class User {
  age: number;
  birthday() {
    this.age++;  // 自分自身を変更
  }
}

// ✅ イミュータブル（不変）: 新しいオブジェクトを返す
class User {
  constructor(readonly name: string, readonly age: number) {}
  
  birthday(): User {
    return new User(this.name, this.age + 1);  // 新しいインスタンスを返す
  }
}
```

**なぜイミュータブルが良いのか:**
- 「いつ変わったか」を追跡しなくていい
- 複数の場所で共有しても安全
- バグの原因を特定しやすい

**なぜミュータブルを避けるのか:**
- オブジェクトAを関数に渡したら、中で変更されていた、というバグが起きる
- 「この値はいつ変わった？」が分からなくなる

---

## 0.4 本スキルの哲学

### OOP主軸 + 関数型の良いとこ取り

本スキルは、純粋なオブジェクト指向でも純粋な関数型でもありません。両方の良いところを取り入れています：

| 取り入れた概念 | 出典 | 説明 | なぜ取り入れたか |
|--------------|------|------|----------------|
| クラス | OOP | データと振る舞いをまとめる | 責務を明確にできる |
| インターフェース | OOP | 実装を差し替え可能にする | テストしやすくなる |
| 純粋関数 | 関数型 | 副作用のない計算 | テストが簡単になる |
| イミュータビリティ | 関数型 | オブジェクトを変更しない | バグが減る |
| Result型 | 関数型 | 成功/失敗を型で表現 | エラー処理が明確になる |

**取り入れなかったもの:**
| 概念 | なぜ取り入れなかったか |
|------|---------------------|
| 継承 | 親クラスを変更すると子クラスが壊れやすい |
| モナド変換子 | 学習コストが高すぎる |
| 高度な型レベルプログラミング | チーム全員が理解できる範囲に留める |

### ルールの優先順位

```
1. 言語/フレームワークの構文制約（変えられない）
2. 本スキルのルール（原則従う）
3. プロジェクト固有のルール（チーム合意）
4. 個人の好み（最も低い）
```

例：NestJSでは「DIコンテナ」という仕組みでRepositoryを注入するのが標準です。本スキルでは「メソッド引数で受け取る」が原則ですが、NestJSを使う場合はフレームワークの流儀に従います。

---

# Part 1: 4分類（Command / Transition / Query / ReadModel）

## 1.1 なぜ分類が必要か

### 問題: 「何でもできるクラス」

多くのプロジェクトでは、こんなクラスを見かけます：

```typescript
// ❌ 典型的な「何でもできる」クラス
class OrderService {
  async processOrder(orderId: string, userId: string): Promise<Order> {
    // 1. DBから読み取り
    const order = await this.db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    
    // 2. 権限チェック（計算）
    const user = await this.db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (user.role !== 'admin' && order.userId !== userId) {
      throw new Error('権限がありません');
    }
    
    // 3. 在庫チェック（外部API呼び出し）
    const stock = await this.inventoryApi.getStock(order.productId);
    if (stock < order.quantity) {
      throw new Error('在庫不足');
    }
    
    // 4. 決済（外部への書き込み）
    await this.paymentGateway.charge(order.amount, order.paymentMethod);
    
    // 5. DB更新（書き込み）
    await this.db.execute('UPDATE orders SET status = ? WHERE id = ?', ['paid', orderId]);
    
    // 6. メール送信（外部への書き込み）
    await this.emailService.send(user.email, '注文確定', '...');
    
    return order;
  }
}
```

**このコードの問題点:**

| 問題 | 具体的に何が困るか |
|------|------------------|
| **テスト困難** | DB、外部API、決済、メールの4つをモックしないとテストできない |
| **責務不明確** | 「在庫ロジックを変えたい」→どこを変える？全体を読まないと分からない |
| **再利用不可能** | 「在庫チェックだけ使いたい」→できない、コピペするしかない |
| **変更が怖い** | 1行変えたら何が壊れるか分からない |

### なぜ「分類」で解決できるのか

問題の根本原因は「副作用のある処理」と「副作用のない処理」が混在していることです。

これを分類して分離すると：
- 副作用のない部分（計算）→ テストが簡単
- 副作用のある部分（DB操作等）→ モックが必要だが、範囲が限定される

### 解決: 4分類

| 分類 | 定義 | 状態変更 | 外部リソース | テストのしやすさ |
|------|------|:------:|:------:|:------:|
| **Command** | 永続状態を変更、外部に作用 | あり | メソッド引数 | △ モック必要 |
| **Transition** | 型 A → 型 B への変換 | なし | なし | ◎ モック不要 |
| **Query** | 値の計算・導出 | なし | なし | ◎ モック不要 |
| **ReadModel** | 読み取り専用でデータ取得 | なし | メソッド引数 | △ モック必要 |

**なぜ4つなのか（3つでも5つでもなく）:**

| 分類数 | 問題 |
|--------|------|
| 2つ（CQS: Command/Query） | 「DBから読む」と「計算する」が区別できない |
| 3つ（Command/Query/ReadModel） | 「バリデーション」と「計算」が区別できない |
| **4つ（本スキル）** | 副作用の有無 × 読み書きの組み合わせを網羅 |
| 5つ以上 | 複雑すぎて判断が難しい |

### 判断フロー

```
このクラスは...
├─ 永続化/外部通信を行う？
│   ├─ YES + 書き込み → Command
│   │   例: 稟議を申請する、注文を確定する
│   └─ YES + 読み取りのみ → ReadModel
│       例: 承認待ち稟議の一覧を取得する
└─ NO（純粋な計算だけ）
    ├─ 入力型と出力型が異なる？ → Transition
    │   例: 「未検証の入力」→「検証済みの入力」
    └─ 同じ概念の計算？ → Query
        例: 「価格」と「税率」→「税額」を計算
```

---

## 1.2 代替アプローチ比較

| アプローチ | 説明 | 長所 | 短所 | 採用 |
|-----------|------|------|------|:----:|
| **本スキル: 4分類** | Command/Transition/Query/ReadModel | 責務明確、テスト容易 | 学習コスト | ✅ |
| **CQS（2分類）** | 書き込み(Command)と読み取り(Query)だけ分ける | シンプル | 「DB読み取り」と「計算」の区別なし | △ |
| **クリーンアーキテクチャ** | UseCase/Entity/Gateway等の層で分ける | 層の分離が明確 | 小規模には過剰、ファイル数が多い | △ |
| **分類なし** | 自由に設計 | 柔軟 | 一貫性なし、レビュー困難 | ❌ |

**なぜCQSでは不十分か:**

CQS（Command Query Separation）は「書き込み」と「読み取り」を分ける古典的な考え方です。しかし：

```typescript
// CQSでは両方「Query」になるが...
class TaxCalculator {
  calculate(price: number, rate: number): number {
    return price * rate;  // 純粋な計算 → モック不要でテスト可能
  }
}

class OrderFinder {
  async findById(id: string): Promise<Order> {
    return this.db.query(...);  // DB読み取り → DBのモックが必要
  }
}
```

テスト方法が全く異なるのに同じ「Query」扱いでは、どこがテストしやすくてどこが難しいか分かりません。本スキルでは前者をQuery、後者をReadModelと区別します。

---

## 1.3 Command

**Command**は、永続状態を変更する、または外部システムに作用するクラスです。

**例:** 稟議を申請する、注文を確定する、メールを送信する

### Pending Object Pattern

「状態遷移」を「型」で表現するパターンです。

```typescript
// 「下書き稟議」→「申請済み稟議」という状態遷移を型で表現
class DraftRingi {
  async submit(repository: RingiRepository): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data);
    await repository.save(submitted);
    return submitted;
  }
}

class SubmittedRingi {
  async approve(repository: RingiRepository): Promise<ApprovedRingi> {
    // ...
  }
}
```

**なぜ「Pending（保留中）」という名前か:**
`DraftRingi`は「まだ申請されていない＝保留中の稟議」を表します。`submit()`を呼ぶと`SubmittedRingi`になる＝「保留」が解除される、というイメージです。

**なぜこのパターンを使うのか:**

| 従来の方法 | Pending Object Pattern |
|-----------|----------------------|
| `ringi.status = 'submitted'` で状態変更 | `DraftRingi` → `SubmittedRingi` で型が変わる |
| 間違った状態遷移もコンパイル通る | 間違った遷移はコンパイルエラー |
| 例: `ApprovedRingi.submit()` が呼べてしまう | `ApprovedRingi` に `submit()` メソッドがない |

**なぜ他のアプローチではないのか:**

| アプローチ | 問題 |
|-----------|------|
| 1つのクラスで全状態を管理 | 無効な状態遷移を防げない |
| enum + switch | 新しい状態追加時に全switchを修正 |
| State パターン（GoF） | 本パターンとほぼ同じだが、命名が分かりにくい |

---

## 1.4 Transition

**Transition**は、型 A → 型 B への変換を行う純粋関数クラスです。副作用はありません。

**例:** 未検証の入力 → 検証済みの入力、文字列 → 日付オブジェクト

```typescript
// 「未検証の稟議入力」→「検証済みの稟議入力」への変換
class RingiInputValidation {
  constructor(private readonly input: UnvalidatedRingiInput) {}
  
  execute(): Result<ValidatedRingiInput, ValidationError> {
    if (!this.input.title || this.input.title.length === 0) {
      return Result.err(new ValidationError('タイトルは必須です'));
    }
    if (this.input.amount < 0) {
      return Result.err(new ValidationError('金額は0以上です'));
    }
    
    return Result.ok({
      title: this.input.title.trim(),
      amount: this.input.amount,
    });
  }
}
```

**なぜCommandと分離するか:**

| 観点 | Command | Transition |
|------|---------|------------|
| テスト | DBモックが必要 | モック不要、入力→出力を確認するだけ |
| 再利用 | 副作用があるので再利用しにくい | どこでも安全に再利用可能 |
| 責務 | 「保存する」「送信する」 | 「検証する」「変換する」 |

---

## 1.5 Query

**Query**は、値の計算・導出を行う純粋関数クラスです。副作用はありません。

**例:** 税額計算、割引適用、判定ロジック

```typescript
// 税額を計算する
class TaxOn {
  constructor(
    private readonly price: Money,
    private readonly rate: TaxRate
  ) {}
  
  get amount(): Money {
    return this.price.multiply(this.rate.value);
  }
  
  get priceWithTax(): Money {
    return this.price.add(this.amount);
  }
}

// 使用例
const tax = new TaxOn(Money.of(1000), TaxRate.of(0.1));
console.log(tax.amount);      // 100円
console.log(tax.priceWithTax); // 1100円
```

**なぜクラスにするのか（関数ではなく）:**

| 関数の場合 | クラスの場合 |
|-----------|-------------|
| `calculateTax(price, rate)` | `new TaxOn(price, rate).amount` |
| `calculatePriceWithTax(price, rate)` | `new TaxOn(price, rate).priceWithTax` |
| 同じ引数を何度も渡す | 一度渡せば複数の計算ができる |
| 関連する計算がバラバラ | 関連する計算がまとまる |

**なぜTransitionではなくQueryか:**
- Transition: 型が変わる（`UnvalidatedInput` → `ValidatedInput`）
- Query: 型は変わらない（`Money` → `Money`）、同じ概念の別の表現

---

## 1.6 ReadModel

**ReadModel**は、永続層から読み取り専用でデータを取得するクラスです。書き込みは行いません。

**例:** 一覧取得、検索、集計

```typescript
// 承認者の稟議一覧を取得する
class RingisForApprover {
  constructor(private readonly repository: RingiRepository) {}
  
  async execute(approverId: ApproverId): Promise<readonly RingiSummary[]> {
    return this.repository.findPendingByApprover(approverId);
  }
}
```

**Repository（リポジトリ）とは:**
データの保存・取得を担当するクラスです。「データがどこに保存されているか（DB、ファイル、API）」を隠蔽し、「〇〇を保存する」「〇〇を取得する」というシンプルなインターフェースを提供します。

**なぜQueryと分離するか:**

| 観点 | Query | ReadModel |
|------|-------|-----------|
| 外部リソース | 使わない | Repository を使う |
| テスト | モック不要 | Repository のモックが必要 |
| 例 | 税額計算 | 稟議一覧取得 |

---

# Part 2: 完全コンストラクタと依存生成

## 2.1 完全コンストラクタ

**完全コンストラクタ**とは、コンストラクタを抜けた時点でオブジェクトが完全に有効な状態であることです。

### 問題: 不完全なオブジェクト

```typescript
// ❌ 不完全なオブジェクトが作れてしまう
class User {
  id: string;
  name: string;
  email: string;
  
  setId(id: string) { this.id = id; }
  setName(name: string) { this.name = name; }
  setEmail(email: string) { this.email = email; }
}

// 問題: 必要な値が設定されていないまま使われる
const user = new User();
user.setName("田中");
// id と email が undefined のまま！
saveToDatabase(user);  // 💥 エラーまたは不正なデータ
```

### 解決: コンストラクタで全て受け取る

```typescript
// ✅ 完全コンストラクタ: 作った時点で完全
class User {
  constructor(
    readonly id: UserId,
    readonly name: UserName,
    readonly email: Email
  ) {}
}

// 必要な値が全てないと作れない
const user = new User(
  UserId.generate(),
  UserName.of("田中"),
  Email.of("tanaka@example.com")
);
```

**なぜ完全コンストラクタを使うのか:**

| 観点 | Setter注入 | 完全コンストラクタ |
|------|-----------|-----------------|
| 不完全なオブジェクト | 存在しうる | 存在しない |
| 必須項目の確認 | 実行時にチェック | コンパイル時にチェック |
| 「この項目は設定済み？」 | 常に考える必要がある | 考える必要がない |

**なぜBuilderパターンではないのか:**

| アプローチ | 問題 |
|-----------|------|
| Builderパターン | `build()` を呼ぶまで不完全な状態。必須項目を忘れても `build()` できてしまう実装が多い |
| 完全コンストラクタ | コンストラクタの引数に全て渡さないとコンパイルエラー |

---

## 2.2 依存の4分類と生成方針

クラスが使う「依存」（他のクラスやリソース）は4種類に分類できます：

| 分類 | 定義 | 例 | 生成方法 |
|------|------|-----|---------|
| **Pure Logic** | 外部リソース不要、常に同じ結果 | TaxCalculator | コンストラクタ内で `new` |
| **Configured Logic** | 設定値に依存、常に同じ結果 | RateCalculator(rate: 0.1) | Config経由で内部生成 |
| **External Resource** | 外部リソースにアクセス | Repository, API Client | メソッド引数で受け取る |
| **Non-deterministic** | 実行ごとに結果が変わる | Clock（現在時刻）, Random | メソッド引数で受け取る |

**なぜメソッド引数で受け取るのか（External Resource / Non-deterministic）:**

```typescript
// ❌ コンストラクタで受け取ると、テスト時に差し替えが難しい
class DraftRingi {
  constructor(private repository: RingiRepository) {}  // 固定されてしまう
  
  async submit(): Promise<SubmittedRingi> {
    // ...
    await this.repository.save(submitted);
  }
}

// ✅ メソッド引数で受け取ると、テスト時に偽物を渡せる
class DraftRingi {
  async submit(repository: RingiRepository): Promise<SubmittedRingi> {
    // ...
    await repository.save(submitted);
  }
}

// テスト時
const fakeRepository = new InMemoryRingiRepository();  // 偽物
await draft.submit(fakeRepository);
```

**なぜNon-deterministicも引数で受け取るのか:**

```typescript
// ❌ 現在時刻を直接取得すると、テスト結果が毎回変わる
class DraftRingi {
  async submit(repository: RingiRepository): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, new Date());  // 毎回違う値
    // テストで「申請日時が正しいか」を検証できない
  }
}

// ✅ Clockを引数で受け取ると、テスト時に固定できる
interface Clock {
  now(): Date;
}

class FixedClock implements Clock {
  constructor(private readonly fixed: Date) {}
  now(): Date { return this.fixed; }
}

class DraftRingi {
  async submit(repository: RingiRepository, clock: Clock): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, clock.now());
  }
}

// テスト時
const fixedClock = new FixedClock(new Date('2024-01-15T10:00:00Z'));
await draft.submit(repository, fixedClock);
// submitted.submittedAt が 2024-01-15T10:00:00Z であることを検証できる
```

---

# Part 3: Polymorphism（多態性）

## 3.1 用語説明

**Polymorphism（ポリモーフィズム、多態性）**とは、「同じインターフェースを持つ異なる実装を、同じように扱える」ことです。

```typescript
// PaymentGateway というインターフェース（契約）
interface PaymentGateway {
  charge(amount: Money): Promise<PaymentResult>;
}

// 異なる実装
class CreditCardPayment implements PaymentGateway {
  async charge(amount: Money): Promise<PaymentResult> {
    // クレジットカードで決済
  }
}

class BankTransferPayment implements PaymentGateway {
  async charge(amount: Money): Promise<PaymentResult> {
    // 銀行振込で決済
  }
}

// 使う側は「どの決済方法か」を知らなくていい
function processPayment(gateway: PaymentGateway, amount: Money) {
  return gateway.charge(amount);  // どちらの実装でも同じコードで呼べる
}
```

**enum（イーナム）**とは、「決まった選択肢」を表す型です：

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
}
```

---

## 3.2 なぜ switch を禁止するか

### 問題: switch の増殖

```typescript
// ❌ enum + switch で振る舞いを分岐
class PaymentProcessor {
  // 決済処理
  async process(method: PaymentMethod, amount: Money) {
    switch (method) {
      case PaymentMethod.CREDIT_CARD:
        // クレジットカード決済のロジック（50行）
        break;
      case PaymentMethod.BANK_TRANSFER:
        // 銀行振込のロジック（40行）
        break;
    }
  }
  
  // 返金処理：また同じ switch
  async refund(method: PaymentMethod, transactionId: string) {
    switch (method) {
      case PaymentMethod.CREDIT_CARD:
        // クレジットカード返金のロジック
        break;
      case PaymentMethod.BANK_TRANSFER:
        // 銀行振込返金のロジック
        break;
    }
  }
  
  // ステータス確認：また同じ switch
  async getStatus(method: PaymentMethod, transactionId: string) {
    switch (method) { /* ... */ }
  }
}
```

**問題点:**
- **Shotgun Surgery（散弾銃手術）**: 新しい決済方法を追加するとき、全ての switch を修正する必要がある
- **巨大化**: 各 case が長くなり、メソッドが数百行になる
- **テスト困難**: 全ての分岐を1つのクラスでテストする必要がある

### 解決: Polymorphism

```typescript
// ✅ Interface + 実装クラス
interface PaymentGateway {
  process(amount: Money): Promise<PaymentResult>;
  refund(transactionId: string): Promise<RefundResult>;
  getStatus(transactionId: string): Promise<PaymentStatus>;
}

class CreditCardPayment implements PaymentGateway {
  async process(amount: Money) { /* クレカの処理 */ }
  async refund(transactionId: string) { /* クレカの返金 */ }
  async getStatus(transactionId: string) { /* クレカのステータス */ }
}

class BankTransferPayment implements PaymentGateway {
  async process(amount: Money) { /* 振込の処理 */ }
  async refund(transactionId: string) { /* 振込の返金 */ }
  async getStatus(transactionId: string) { /* 振込のステータス */ }
}
```

**メリット:**
- 新しい決済方法を追加 → 新しいクラスを追加するだけ、既存コードは変更不要
- 各クラスを個別にテスト可能
- 関連するロジックが1つのクラスにまとまる

---

## 3.3 なぜ他のアプローチではないのか

| アプローチ | 問題 |
|-----------|------|
| **switch文** | 新しい種類追加時に全 switch を修正、巨大化 |
| **Map/辞書** | `{ 'credit_card': handler }` のような形。型安全性が低い、網羅性チェックがない |
| **if-else チェーン** | switch と同じ問題 |

---

## 3.4 いつ switch を許容するか

以下の3つ**全て**が NO の場合、switch で可：

1. 各分岐で**異なる計算ロジック**がある？
2. 各分岐を**独立してテスト**したい？
3. 今後、分岐が**追加される可能性**がある？

**許容される例:**

```typescript
// ✅ 値の選択だけ（ロジックなし）
const label = status === 'active' ? '有効' : '無効';

// ✅ 境界層でのエラーコード変換（拡張されにくい）
switch (error.code) {
  case 'NOT_FOUND': return 404;
  case 'UNAUTHORIZED': return 401;
  default: return 500;
}

// ✅ enumが単なる識別子（振る舞いがない）
enum Color { RED, GREEN, BLUE }
```

---

# Part 4: エラー処理

## 4.1 Result 型とは

**Result型**とは、「成功」または「失敗」を戻り値の型で表現する仕組みです。

```typescript
// Result型の定義
type Result<T, E> = 
  | { ok: true; value: T }   // 成功時: ok が true で value に結果
  | { ok: false; error: E }; // 失敗時: ok が false で error にエラー情報
```

**使用例:**

```typescript
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return { ok: false, error: 'ゼロで割ることはできません' };
  }
  return { ok: true, value: a / b };
}

// 使う側
const result = divide(10, 2);
if (result.ok) {
  console.log(result.value);  // 5
} else {
  console.log(result.error);  // エラーメッセージ
}
```

---

## 4.2 なぜ例外ではなく Result 型か

### 問題: 例外の型安全性欠如

```typescript
// ❌ 例外ベース: どこで何が投げられるか分からない
async function submit(data: RingiData): Promise<SubmittedRingi> {
  // この中で ValidationError? AmountExceededError? DatabaseError?
  // 型を見ても分からない
}

try {
  await submit(data);
} catch (e) {
  // e は any 型。何のエラーか分からない
  if (e instanceof ValidationError) { ... }
  else if (e instanceof AmountExceededError) { ... }
  else { ... }
}
```

### 解決: Result 型

```typescript
// ✅ Result型: エラーの型が明示的
function create(data: ValidatedInput): Result<DraftRingi, AmountExceededError> {
  if (data.amount.isGreaterThan(MAX)) {
    return { ok: false, error: new AmountExceededError(data.amount, MAX) };
  }
  return { ok: true, value: new DraftRingi(data) };
}

// 使う側: エラー処理を強制される
const result = create(data);
if (!result.ok) {
  // result.error は AmountExceededError 型と分かっている
  console.log(`金額 ${result.error.actual} は上限 ${result.error.max} を超えています`);
  return;
}
// result.value は DraftRingi 型
```

**比較:**

| 観点 | 例外 | Result型 |
|------|------|---------|
| エラーの型 | 不明（any） | 明示的 |
| エラー処理の強制 | なし（忘れても動く） | あり（ifで分岐必須） |
| 複数種類のエラー | catchで型チェック | Union型で表現 |

---

## 4.3 なぜ null を返すのではないのか

```typescript
// ❌ null を返す: エラーの理由が分からない
function findUser(id: string): User | null {
  // null の理由は？存在しない？権限がない？DBエラー？
  return null;
}

// ✅ Result型: エラーの理由が分かる
function findUser(id: string): Result<User, NotFoundError | PermissionError> {
  if (!exists) return { ok: false, error: new NotFoundError(id) };
  if (!hasPermission) return { ok: false, error: new PermissionError(id) };
  return { ok: true, value: user };
}
```

---

## 4.4 エラーの分類

| 分類 | 定義 | 処理方法 | 例 |
|------|------|---------|-----|
| **DomainError** | ビジネスルール違反 | Result型で返す | 金額上限超過、在庫不足 |
| **InfrastructureError** | 技術的な障害 | 例外でthrow | DB接続失敗、ネットワークエラー |

**なぜ分けるか:**
- **DomainError**: ユーザーが対処可能（入力を修正する等）
- **InfrastructureError**: ユーザーには対処不可能（「しばらく待ってから再試行してください」としか言えない）

---

# Part 5: 設計ルール集

## 5.1 Interface 優先、継承禁止

### 継承の問題

```typescript
// ❌ 継承の問題: ペンギンは鳥だが飛べない
class Bird {
  fly() { console.log("飛ぶ"); }
}

class Penguin extends Bird {
  fly() { throw new Error("飛べません"); }  // 親の契約を破っている
}
```

これは**リスコフの置換原則（LSP）**違反です。LSPとは「子クラスは親クラスの代わりに使えるべき」という原則。`Bird`を期待するコードに`Penguin`を渡すと壊れます。

**継承の他の問題:**
- **脆い基底クラス問題**: 親クラスを変更すると、全ての子クラスが影響を受ける
- **多重継承不可**: 多くの言語で1つの親しか持てない

### 解決: Interface + Composition

**Composition（コンポジション）**とは、継承の代わりに「持つ」関係で表現することです。

```typescript
// ✅ Interface: 必要な振る舞いだけ定義
interface Flyer { fly(): void; }
interface Swimmer { swim(): void; }

// ペンギンは泳げるが飛べない
class Penguin implements Swimmer {
  swim() { console.log("泳ぐ"); }
}

// カモは飛べるし泳げる
class Duck implements Flyer, Swimmer {
  fly() { console.log("飛ぶ"); }
  swim() { console.log("泳ぐ"); }
}
```

---

## 5.2 Early Return Only（else禁止）

### 問題: ネストの深い条件分岐

```typescript
// ❌ else でネストが深くなる
function processOrder(order, user) {
  if (order !== null) {
    if (user !== null) {
      if (user.isActive) {
        if (order.items.length > 0) {
          // ここでやっと本題の処理（インデント4段）
        } else {
          return { error: "商品がありません" };
        }
      } else {
        return { error: "無効なユーザー" };
      }
    } else {
      return { error: "ユーザーが必要" };
    }
  } else {
    return { error: "注文が必要" };
  }
}
```

### 解決: Early Return（ガード節）

**ガード節**とは、異常系を先にチェックして早期に return することです。

```typescript
// ✅ Early Return で平坦に
function processOrder(order, user) {
  // 異常系を先に処理
  if (order === null) return { error: "注文が必要" };
  if (user === null) return { error: "ユーザーが必要" };
  if (!user.isActive) return { error: "無効なユーザー" };
  if (order.items.length === 0) return { error: "商品がありません" };
  
  // 本題の処理（ネストなし）
  return processPayment(order);
}
```

**else を許容する例外:** 両方とも正常系で、同じ型を返す場合

```typescript
// ✅ 両方正常系なので else OK
function getDisplayName(user: User): string {
  if (user.nickname) {
    return user.nickname;
  } else {
    return user.fullName;
  }
}
```

---

## 5.3 Primitive Obsession の回避

**Primitive Obsession（プリミティブ型への執着）**とは、`string`や`number`などの基本型を使いすぎる問題です。

### 問題: 型が同じで意味が違う

```typescript
// ❌ 全部 string なので間違えても気づかない
function createUser(name: string, email: string, phone: string) { ... }

// 引数の順番を間違えた！でもコンパイルエラーにならない
createUser("tanaka@example.com", "田中太郎", "090-1234-5678");
```

### 解決: 値オブジェクト

**値オブジェクト**とは、意味のある単位で型を作ることです。

```typescript
// ✅ 型が違うので間違えられない
function createUser(name: UserName, email: Email, phone: PhoneNumber) { ... }

// コンパイルエラー！Email型のところに string を渡している
createUser(Email.of("tanaka@example.com"), UserName.of("田中"), ...);
```

**値オブジェクトを作るべき場合:**
- フォーマット制約がある（Email, PhoneNumber）
- 範囲制約がある（Age: 0-150, Percentage: 0-100）
- ドメイン固有の意味がある（UserId, OrderId）
- 同じ型の値が複数あって混同しやすい（StartDate, EndDate）

---

## 5.4 Parameters: Max 1-2

引数が3個以上になったら、オブジェクトにまとめます。

```typescript
// ❌ 引数が多すぎる、順番を間違えやすい
function createOrder(
  customerId: string,
  productId: string,
  quantity: number,
  shippingAddress: string,
  billingAddress: string,
  paymentMethod: string
) { ... }

// ✅ オブジェクトにまとめる
interface CreateOrderInput {
  customerId: CustomerId;
  productId: ProductId;
  quantity: Quantity;
  shipping: Address;
  billing: Address;
  paymentMethod: PaymentMethod;
}

function createOrder(input: CreateOrderInput) { ... }
```

---

## 5.5 Named Return Values（タプル禁止）

**タプル**とは `[Date, Date]` のように複数の値を配列で返すことです。

```typescript
// ❌ タプル: どっちが start でどっちが end？
function getDateRange(): [Date, Date] {
  return [startDate, endDate];  // または [endDate, startDate]?
}

const [a, b] = getDateRange();
// a が startDate? endDate? 分からない

// ✅ 名前付きオブジェクト
function getDateRange(): { start: Date; end: Date } {
  return { start: startDate, end: endDate };
}

const range = getDateRange();
console.log(range.start, range.end);  // 明確
```

---

# Part 6: アーキテクチャ

## 6.1 Screaming Architecture

**Screaming Architecture**とは、「ディレクトリ構造を見れば何のシステムか分かる」設計です。

### 問題: 何のシステムか分からない

```
❌ 技術レイヤーで分割
src/
├── controllers/     # コントローラー？何の？
├── services/        # サービス？何の？
├── repositories/    # リポジトリ？何の？
└── entities/        # エンティティ？何の？
```

このディレクトリ構造を見て、ECサイトなのか、社内システムなのか、SNSなのか分かりますか？

### 解決: 機能/ドメインで分割

```
✅ 何のシステムか一目で分かる（ECサイトだ！）
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
├── components/   # コンポーネント？何の？
├── hooks/        # フック？何の？
├── utils/        # ユーティリティ？何の？
└── services/     # サービス？何の？

✅ 機能ベース
src/
├── catalog/
│   ├── ProductList.tsx
│   ├── useProducts.ts
│   └── productApi.ts
├── cart/
│   ├── CartView.tsx
│   └── useCart.ts
└── checkout/
    └── ...
```

---

## 6.2 禁止: 技術レイヤー名のディレクトリ

**ディレクトリ名**に以下を使わない：

```
❌ domain/ infrastructure/ application/ 
❌ services/ repositories/ controllers/
❌ utils/ helpers/ common/ shared/
```

**ファイル名・クラス名**には使ってOK：

```
✅ RingiRepository.ts （ファイル名）
✅ class RingiController （クラス名）
❌ repositories/RingiRepository.ts （ディレクトリ名はNG）
```

---

## 6.3 MECE Tree と Rule of 5

**MECE（ミーシー）**とは、「Mutually Exclusive, Collectively Exhaustive」の略で、「重複なく、漏れなく」という意味です。

- 各ファイル/クラスは1つのディレクトリにのみ属する（重複なし）
- 全てのファイル/クラスがいずれかのディレクトリに属する（漏れなし）

**Rule of 5**: 各ディレクトリの直接の子は5つ以下に。超えたら階層化を検討。

```
❌ 多すぎる
src/
├── users/
├── products/
├── orders/
├── payments/
├── shipping/
├── reviews/
├── wishlists/
├── coupons/
├── notifications/
└── ... (10個以上)

✅ 階層化で整理
src/
├── commerce/           # ECコア機能
│   ├── catalog/
│   ├── ordering/
│   └── payments/
├── customer-experience/ # 顧客体験
│   ├── reviews/
│   ├── wishlists/
│   └── notifications/
└── operations/         # 運用機能
    └── ...
```

---

## 6.4 Colocation

**Colocation（コロケーション）**とは、関連するファイルを同じディレクトリに配置することです。

```
✅ テストはソースと同居
src/ringis/
├── DraftRingi.ts          # 本体
├── DraftRingi.test.ts     # テスト（隣に）
├── SubmittedRingi.ts
├── SubmittedRingi.test.ts
└── RingiTestFactory.ts    # テストデータ生成

❌ テストが別ディレクトリ
src/
└── ringis/
    ├── DraftRingi.ts
    └── SubmittedRingi.ts
tests/
└── ringis/
    ├── DraftRingi.test.ts   # 離れた場所に
    └── SubmittedRingi.test.ts
```

**なぜ同居させるか:**
- ファイル探しが楽（同じディレクトリにある）
- リファクタリング時に1箇所だけ修正すればいい
- 削除時にテストも一緒に削除される（忘れない）

---

# Part 7: テスト戦略

## 7.1 依存分類別のテスト方法

| 分類 | テスト方法 | モック | 例 |
|------|-----------|:------:|-----|
| Pure Logic | 入力→出力を直接テスト | 不要 | TaxCalculator |
| Configured Logic | 設定を変えてテスト | 不要 | RateCalculator(rate: 0.1) |
| External Resource | InMemory実装を使用 | 必要 | Repository |
| Non-deterministic | 固定値を注入 | 必要 | Clock |

---

## 7.2 Test Data Factory

### 問題: 共有フィクスチャ

```typescript
// ❌ 共有フィクスチャ: テスト間で状態が共有される
// fixtures/users.ts
export const testUsers = {
  admin: new User('admin', 'admin@example.com', Role.ADMIN),
  normalUser: new User('user1', 'user@example.com', Role.USER),
};

// テストA
test('管理者はアクセスできる', () => {
  expect(canAccess(testUsers.admin)).toBe(true);
});

// テストB
test('ユーザー名を変更できる', () => {
  testUsers.admin.name = 'changed';  // 💥 共有データを変更！
  // テストAに影響を与える可能性
});
```

### 解決: Factory で毎回生成

```typescript
// ✅ Test Data Factory: 毎回新しいインスタンス
export const UserTestFactory = {
  admin: (overrides?: Partial<UserData>) => new User({
    id: UserId.generate(),
    name: 'Test Admin',
    email: 'admin@example.com',
    role: Role.ADMIN,
    ...overrides,  // 必要な部分だけ上書き可能
  }),
  
  normalUser: (overrides?: Partial<UserData>) => new User({
    id: UserId.generate(),
    name: 'Test User',
    email: 'user@example.com',
    role: Role.USER,
    ...overrides,
  }),
};

// テストA
test('管理者はアクセスできる', () => {
  const admin = UserTestFactory.admin();  // 新しいインスタンス
  expect(canAccess(admin)).toBe(true);
});

// テストB
test('特定の名前のユーザーを検索できる', () => {
  const user = UserTestFactory.normalUser({ name: 'Tanaka' });  // カスタマイズ
  // ...
});
```

---

## 7.3 InMemory Repository

**InMemory Repository**とは、メモリ上で動作するテスト用のRepository実装です。

```typescript
// 本番用: 実際のDBにアクセス
class PostgresRingiRepository implements RingiRepository {
  async save(ringi: Ringi): Promise<void> {
    await this.db.query('INSERT INTO ringis ...', [ringi]);
  }
  async findById(id: RingiId): Promise<Ringi | null> {
    return this.db.query('SELECT * FROM ringis WHERE id = ?', [id]);
  }
}

// テスト用: メモリ上のMapを使う
class InMemoryRingiRepository implements RingiRepository {
  private storage = new Map<string, Ringi>();
  
  async save(ringi: Ringi): Promise<void> {
    this.storage.set(ringi.id.value, ringi);
  }
  
  async findById(id: RingiId): Promise<Ringi | null> {
    return this.storage.get(id.value) ?? null;
  }
  
  // テスト用ヘルパー
  clear(): void {
    this.storage.clear();
  }
}
```

**なぜ必要か:**
- 単体テストが高速（DBアクセスなし）
- テスト間で状態が共有されない（独立性）
- 本番DBに依存しない

---

## 7.4 Gateway パターン

外部サービス（Stripe、SendGrid、S3など）をInterfaceで抽象化し、テスト時に差し替え可能にします。

```typescript
// Interface定義
interface PaymentGateway {
  charge(amount: Money): Promise<PaymentResult>;
}

// 本番用実装
class StripePaymentGateway implements PaymentGateway {
  async charge(amount: Money): Promise<PaymentResult> {
    // 実際にStripe APIを呼ぶ
  }
}

// テスト用実装（常に成功）
class StubPaymentGateway implements PaymentGateway {
  async charge(amount: Money): Promise<PaymentResult> {
    return { success: true, transactionId: 'test-123' };
  }
}

// テスト用実装（常に失敗）
class FailingPaymentGateway implements PaymentGateway {
  async charge(amount: Money): Promise<PaymentResult> {
    return { success: false, error: 'カードが拒否されました' };
  }
}
```

---

# Appendix: クイックリファレンス

## 判断フロー

### 4分類

```
このクラスは外部リソース（DB、API等）にアクセスする？
├─ YES → 書き込みがある？
│   ├─ YES → Command
│   └─ NO → ReadModel
└─ NO → 型が変わる？（入力型 ≠ 出力型）
    ├─ YES → Transition
    └─ NO → Query
```

### Polymorphism vs switch

```
以下の質問に1つでも YES があれば Polymorphism を使う

1. 各分岐で異なる計算ロジックがある？
2. 各分岐を独立してテストしたい？
3. 今後、分岐が追加される可能性がある？

全て NO → switch OK
```

### 依存の生成方法

```
この依存は...
├─ 外部リソースにアクセスする？ → メソッド引数で受け取る
├─ 実行するたびに結果が変わる？ → メソッド引数で受け取る
├─ 設定値に依存する？ → Config経由でコンストラクタ内生成
└─ 上記全てNO → コンストラクタ内で new
```

---

## チェックリスト

### 新規クラス作成時
- [ ] Command / Transition / Query / ReadModel のいずれかに分類したか
- [ ] 完全コンストラクタになっているか（全フィールドがコンストラクタで設定）
- [ ] 継承を使っていないか（Interface + Composition を使用）
- [ ] 引数は2個以下か（多い場合はオブジェクトにまとめる）

### コードレビュー時
- [ ] else を使っていないか（Early Return を使用）
- [ ] switch で振る舞いを分岐していないか（Polymorphism を検討）
- [ ] string/number を乱用していないか（値オブジェクトを検討）
- [ ] ディレクトリ名が技術レイヤー名ではないか

### テスト作成時
- [ ] Pure Logic は直接テストしているか（モック不要）
- [ ] External Resource には InMemory 実装を使用しているか
- [ ] 共有フィクスチャを使っていないか（Factory を使用）
- [ ] テストファイルがソースと同居しているか

---

## 用語集

| 用語 | 意味 |
|------|------|
| **Command** | 永続状態を変更するクラス。副作用あり。例: 稟議を申請する |
| **Transition** | 型変換を行う純粋関数クラス。例: バリデーション |
| **Query** | 計算を行う純粋関数クラス。例: 税額計算 |
| **ReadModel** | 読み取り専用でデータを取得するクラス。例: 一覧取得 |
| **完全コンストラクタ** | コンストラクタを抜けた時点でオブジェクトが完全に有効 |
| **Pending Object Pattern** | 状態遷移を型で表現するパターン |
| **Result型** | 成功/失敗を戻り値の型で表現する仕組み |
| **DomainError** | ビジネスルール違反。ユーザーが対処可能 |
| **InfrastructureError** | 技術的障害。ユーザーには対処不可能 |
| **Polymorphism** | 同じインターフェースで異なる実装を扱う |
| **値オブジェクト** | 意味のある単位で型を作ること（Email, UserId等） |
| **Early Return** | 異常系を先にチェックして早期にreturn |
| **Screaming Architecture** | ディレクトリ構造がシステムの意図を示す |
| **Colocation** | 関連ファイルを同じディレクトリに配置 |
| **Test Data Factory** | テストデータを毎回新しく生成する関数 |
| **InMemory Repository** | メモリ上で動作するテスト用Repository |
| **Gateway** | 外部サービスを抽象化するインターフェース |
| **モック** | テスト用の偽物。呼び出しを検証する |
| **スタブ** | テスト用の偽物。決まった値を返す |
