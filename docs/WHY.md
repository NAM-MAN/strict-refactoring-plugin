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

## 0.5 凝集度と結合度（Cohesion and Coupling）

### なぜこれが最も重要な概念なのか

**凝集度**と**結合度**は、ソフトウェア設計における最も基礎的な品質指標です。1974年にLarry ConstantineとEdward Yourdonが提唱して以来、50年間変わらず設計の根幹を成しています。

**ミノ駆動本（成瀬允宣『良いコード/悪いコードで学ぶ設計入門』）** でも、凝集度と結合度は全ルールの根拠として繰り返し登場します。

| 指標 | 定義 | 良い状態 | 悪い状態 |
|------|------|---------|---------|
| **凝集度（Cohesion）** | クラス内の要素がどれだけ密接に関連しているか | 高凝集（High Cohesion） | 低凝集（Low Cohesion） |
| **結合度（Coupling）** | クラス間がどれだけ依存し合っているか | 低結合（Loose Coupling） | 高結合（Tight Coupling） |

**目標は「高凝集・低結合」です。**

### 高凝集（High Cohesion）

**高凝集**とは、「1つのクラスが1つの責務に集中している」状態です。

```typescript
// ❌ 低凝集: 複数の責務が混在
class UserManager {
  validateEmail(email: string): boolean { /* ... */ }
  hashPassword(password: string): string { /* ... */ }
  sendWelcomeEmail(user: User): void { /* ... */ }
  calculateLoyaltyPoints(user: User): number { /* ... */ }
  generateReport(users: User[]): string { /* ... */ }
}

// ✅ 高凝集: 各クラスが1つの責務に集中
class EmailValidator { validate(email: string): boolean { /* ... */ } }
class PasswordHasher { hash(password: string): string { /* ... */ } }
class WelcomeEmailSender { send(user: User): void { /* ... */ } }
class LoyaltyPointsCalculator { calculate(user: User): number { /* ... */ } }
class UserReportGenerator { generate(users: User[]): string { /* ... */ } }
```

**なぜ高凝集が良いのか:**
- 変更理由が1つ → 変更時に他の機能に影響しない
- クラス名を見れば何をするか分かる
- テストが書きやすい（責務が明確）

### 低結合（Loose Coupling）

**低結合**とは、「クラス間の依存が最小限」な状態です。

```typescript
// ❌ 高結合: OrderService が MySQL の内部実装に依存
class OrderService {
  constructor(private mysqlConnection: MySQLConnection) {}
  
  save(order: Order): void {
    // MySQL 固有の SQL を直接実行
    this.mysqlConnection.query(`INSERT INTO orders VALUES (...)`)
  }
}

// ✅ 低結合: インターフェースに依存
interface OrderRepository {
  save(order: Order): Promise<void>
}

class OrderService {
  save(order: Order, repository: OrderRepository): Promise<void> {
    return repository.save(order)
  }
}
```

**なぜ低結合が良いのか:**
- 依存先を差し替えられる（MySQL → PostgreSQL）
- テスト時にモックを注入できる
- 変更の影響範囲が限定される

### 本スキルの4分類と凝集度の関係

本スキルの4分類（Command / Transition / Query / ReadModel）は、**凝集度を最大化する設計パターン**です：

| 分類 | 責務 | 凝集度への貢献 |
|------|------|--------------|
| **Command** | 副作用を実行する | 副作用を1箇所に集約（他のクラスは副作用を持たない） |
| **Transition** | 状態遷移ロジック | ビジネスロジックを1箇所に集約 |
| **Query** | 純粋な計算 | 入力→出力の変換に集中 |
| **ReadModel** | 読み取り専用データ | 表示用データの保持に集中 |

**従来のアプローチ（Service層に全部入れる）との比較:**

```typescript
// ❌ 低凝集: Service に全責務が集中
class OrderService {
  create(dto: OrderDTO): Order { /* 生成ロジック */ }
  validate(order: Order): boolean { /* 検証ロジック */ }
  save(order: Order): void { /* DB保存 */ }
  calculateTotal(order: Order): number { /* 計算ロジック */ }
  sendConfirmation(order: Order): void { /* メール送信 */ }
}

// ✅ 高凝集: 責務ごとに分離（4分類）
class OrderCreator { create(dto: OrderDTO): Order { /* Transition */ } }
class OrderValidator { validate(order: Order): boolean { /* Query */ } }
class OrderSaver { save(order: Order, repo: OrderRepository): void { /* Command */ } }
class OrderTotalCalculator { calculate(order: Order): number { /* Query */ } }
class OrderConfirmationSender { send(order: Order, mailer: Mailer): void { /* Command */ } }
```

### 凝集度の7段階（Larry Constantine）

歴史的に、凝集度は7段階で分類されます（上ほど良い）：

| レベル | 名称 | 説明 | 本スキルとの関係 |
|--------|------|------|----------------|
| 1（最高） | 機能的凝集 | 1つの機能のみを実行 | ✅ 4分類の各クラス |
| 2 | 順序的凝集 | 順番に実行される処理をまとめる | △ Commandで許容 |
| 3 | 通信的凝集 | 同じデータを扱う処理をまとめる | △ 注意が必要 |
| 4 | 手続き的凝集 | 実行順序でまとめる | ❌ 避けるべき |
| 5 | 時間的凝集 | 同時に実行される処理をまとめる | ❌ 避けるべき |
| 6 | 論理的凝集 | 論理的に似た処理をまとめる | ❌ 避けるべき |
| 7（最低） | 偶発的凝集 | たまたま一緒にあるだけ | ❌ 最悪 |

**本スキルの目標:** すべてのクラスを「機能的凝集（レベル1）」にする。

---

## 0.6 SOLID原則

**SOLID原則**は、Robert C. Martin（Uncle Bob）が2000年代にまとめたオブジェクト指向設計の5原則です。本スキルの多くのルールは、SOLID原則を具体化したものです。

### S: Single Responsibility Principle（単一責任原則）

> **「クラスを変更する理由は1つだけであるべき」**

**重要:** SRPは「1クラス1メソッド」という意味ではありません。「変更理由が1つ」という意味です。

```typescript
// ❌ 複数の変更理由がある
class Employee {
  calculatePay(): Money { /* 給与計算ルールが変わったら変更 */ }
  reportHours(): string { /* レポート形式が変わったら変更 */ }
  save(): void { /* DB設計が変わったら変更 */ }
}

// ✅ 変更理由が1つずつ
class PayCalculator { calculate(employee: Employee): Money { /* ... */ } }
class HourReporter { report(employee: Employee): string { /* ... */ } }
class EmployeeSaver { save(employee: Employee, repo: EmployeeRepository): void { /* ... */ } }
```

**本スキルとの関係:**
- 4分類（Command/Transition/Query/ReadModel）は、責務を明確に分離する
- 「1クラス1パブリックメソッド」ルールは、SRPを徹底したもの

### O: Open/Closed Principle（開放閉鎖原則）

> **「拡張に対して開いており、修正に対して閉じているべき」**

新しい機能を追加するとき、既存のコードを変更せずに拡張できるべきです。

```typescript
// ❌ 新しい支払い方法を追加するたびに既存コードを修正
class PaymentProcessor {
  process(payment: Payment): void {
    switch (payment.type) {
      case 'credit': /* ... */ break
      case 'debit': /* ... */ break
      case 'crypto': /* ... */ break  // ← 新規追加のたびに修正
    }
  }
}

// ✅ 新しい支払い方法を追加しても既存コードは変更不要
interface PaymentMethod {
  process(amount: Money): Promise<void>
}

class CreditCardPayment implements PaymentMethod { /* ... */ }
class DebitCardPayment implements PaymentMethod { /* ... */ }
class CryptoPayment implements PaymentMethod { /* ... */ }  // ← 追加するだけ

class PaymentProcessor {
  process(payment: PaymentMethod, amount: Money): Promise<void> {
    return payment.process(amount)  // ← 変更不要
  }
}
```

**本スキルとの関係:**
- 「Polymorphism over Switch」ルールは、OCPを実現する具体的手段
- インターフェースを使った設計が、拡張性を保証する

### L: Liskov Substitution Principle（リスコフ置換原則）

> **「派生クラスは、基底クラスと置換可能であるべき」**

親クラスを使っているコードで、子クラスに差し替えても正しく動くべきです。

```typescript
// ❌ LSP違反: Square は Rectangle と置換できない
class Rectangle {
  constructor(protected width: number, protected height: number) {}
  setWidth(w: number) { this.width = w }
  setHeight(h: number) { this.height = h }
  area(): number { return this.width * this.height }
}

class Square extends Rectangle {
  setWidth(w: number) { this.width = w; this.height = w }  // ← 予期しない動作
  setHeight(h: number) { this.width = h; this.height = h }
}

// 問題: Rectangle を期待するコードで Square を渡すと壊れる
function doubleWidth(rect: Rectangle) {
  const originalArea = rect.area()
  rect.setWidth(rect.width * 2)
  // Rectangle なら面積は2倍になるはず
  // Square だと4倍になってしまう！
}
```

**本スキルとの関係:**
- **「継承禁止」ルールは、LSP違反を根本から防ぐ**
- 継承の代わりにインターフェースを使うことで、この問題を回避

### I: Interface Segregation Principle（インターフェース分離原則）

> **「クライアントが使わないメソッドへの依存を強制すべきではない」**

```typescript
// ❌ 太いインターフェース: 全員が全メソッドを実装する必要がある
interface Worker {
  work(): void
  eat(): void
  sleep(): void
}

class Robot implements Worker {
  work(): void { /* OK */ }
  eat(): void { throw new Error('ロボットは食べない') }  // ← 無意味
  sleep(): void { throw new Error('ロボットは寝ない') }  // ← 無意味
}

// ✅ 分離されたインターフェース
interface Workable { work(): void }
interface Eatable { eat(): void }
interface Sleepable { sleep(): void }

class Robot implements Workable {
  work(): void { /* OK */ }
}

class Human implements Workable, Eatable, Sleepable {
  work(): void { /* ... */ }
  eat(): void { /* ... */ }
  sleep(): void { /* ... */ }
}
```

**本スキルとの関係:**
- 「1クラス1パブリックメソッド」は、ISPを極限まで適用したもの
- 小さなインターフェースを複数実装する方が、大きなインターフェースより良い

### D: Dependency Inversion Principle（依存性逆転原則）

> **「上位モジュールは下位モジュールに依存すべきではない。両者は抽象に依存すべき」**

```typescript
// ❌ DIP違反: 上位（OrderService）が下位（MySQLRepository）に直接依存
class MySQLOrderRepository { /* MySQL固有の実装 */ }

class OrderService {
  private repository = new MySQLOrderRepository()  // ← 具象に依存
  
  createOrder(data: OrderData): Order {
    // ...
    this.repository.save(order)
    return order
  }
}

// ✅ DIP遵守: 両者が抽象（インターフェース）に依存
interface OrderRepository {
  save(order: Order): Promise<void>
}

class MySQLOrderRepository implements OrderRepository { /* ... */ }
class InMemoryOrderRepository implements OrderRepository { /* ... */ }

class OrderService {
  createOrder(data: OrderData, repository: OrderRepository): Order {
    // ...
    repository.save(order)
    return order
  }
}
```

**本スキルとの関係:**
- **「メソッド引数でRepositoryを受け取る」**ルールは、DIPを実現する具体的手段
- コンストラクタインジェクションではなくメソッドインジェクションを推奨する理由

### SOLID原則の要約と本スキルとの対応

| 原則 | 要約 | 本スキルの対応ルール |
|------|------|-------------------|
| **SRP** | 変更理由は1つ | 4分類、1クラス1パブリックメソッド |
| **OCP** | 拡張に開き、修正に閉じる | Polymorphism over Switch |
| **LSP** | 置換可能性 | 継承禁止 |
| **ISP** | 小さなインターフェース | 1クラス1パブリックメソッド |
| **DIP** | 抽象に依存 | メソッド引数で依存を受け取る |

---

## 0.7 Code Smells（コードの不吉な臭い）

**Code Smells**は、Martin Fowlerの『Refactoring』（1999年）で体系化された「設計上の問題を示唆する兆候」です。「臭い」という表現は、「必ずしもバグではないが、何かおかしい」ことを示します。

### 本スキルが解決するCode Smells

| Code Smell | 説明 | 本スキルの対応 |
|-----------|------|--------------|
| **Long Method** | 長すぎるメソッド | 「10行以内」ルール |
| **Long Class** | 巨大なクラス | 4分類で責務分離 |
| **Feature Envy** | 他クラスのデータばかり使う | Tell, Don't Ask（5.6） |
| **Data Class** | データだけでロジックがない | Rich Domain Model |
| **Shotgun Surgery** | 1変更が多くのクラスに影響 | Polymorphismで解決 |
| **Primitive Obsession** | プリミティブ型の乱用 | 値オブジェクト（5.3） |
| **Switch Statements** | switch文の乱用 | Polymorphism over Switch |
| **Parallel Inheritance** | 継承階層が並行して増える | 継承禁止 |
| **Speculative Generality** | 「いつか使うかも」の汎用化 | YAGNI |
| **Middle Man** | 委譲するだけのクラス | 直接呼び出し |

### Long Method（長いメソッド）

```typescript
// ❌ Long Method: 何をしているか把握困難
function processOrder(order: Order): void {
  // 50行の検証ロジック...
  // 30行の計算ロジック...
  // 40行の保存ロジック...
  // 20行の通知ロジック...
}

// ✅ 分割: 各メソッドが1つのことをする
class OrderProcessor {
  process(order: Order, deps: Dependencies): void {
    const validated = new OrderValidator().validate(order)
    const calculated = new OrderCalculator().calculate(validated)
    new OrderSaver().save(calculated, deps.repository)
    new OrderNotifier().notify(calculated, deps.mailer)
  }
}
```

**本スキルのルール:** メソッドは10行以内。超える場合は責務を分割。

### Feature Envy（他クラスへの羨望）

```typescript
// ❌ Feature Envy: Customer のデータばかり使っている
class OrderPricer {
  calculateDiscount(order: Order): Money {
    const customer = order.customer
    if (customer.loyaltyPoints > 1000 &&
        customer.membershipYears > 5 &&
        customer.totalPurchases > 10000) {
      return order.total.multiply(0.2)
    }
    return Money.zero()
  }
}

// ✅ ロジックをデータがある場所に移動
class Customer {
  isVIP(): boolean {
    return this.loyaltyPoints > 1000 &&
           this.membershipYears > 5 &&
           this.totalPurchases > 10000
  }
}

class OrderPricer {
  calculateDiscount(order: Order): Money {
    if (order.customer.isVIP()) {
      return order.total.multiply(0.2)
    }
    return Money.zero()
  }
}
```

**本スキルのルール:** 詳細は「5.6 Tell, Don't Ask」で解説。

### Data Class（データクラス）/ Anemic Domain Model（貧血ドメインモデル）

```typescript
// ❌ Data Class: データだけでロジックがない（貧血ドメインモデル）
class Order {
  items: OrderItem[]
  status: string
  createdAt: Date
}

// 計算ロジックは外部の Service にある
class OrderService {
  calculateTotal(order: Order): Money { /* ... */ }
  canBeCancelled(order: Order): boolean { /* ... */ }
  addItem(order: Order, item: OrderItem): void { /* ... */ }
}

// ✅ Rich Domain Model: データとロジックが一緒
class Order {
  constructor(
    private readonly items: OrderItem[],
    private readonly status: OrderStatus,
    private readonly createdAt: Date
  ) {}
  
  total(): Money {
    return this.items.reduce((sum, item) => sum.add(item.subtotal()), Money.zero())
  }
  
  canBeCancelled(): boolean {
    return this.status.allowsCancellation() &&
           this.createdAt.isWithinLast(24, 'hours')
  }
  
  withItem(item: OrderItem): Order {
    return new Order([...this.items, item], this.status, this.createdAt)
  }
}
```

**本スキルのルール:**
- Transition クラスにはロジックを持たせる
- 「データだけ持っている」クラスは ReadModel のみ

### Shotgun Surgery（散弾銃手術）

```typescript
// ❌ Shotgun Surgery: 新しい支払い方法を追加すると複数箇所を修正
// 1. PaymentProcessor.ts
switch (payment.type) {
  case 'credit': ...
  case 'paypal': ...
  case 'crypto': ...  // ← 追加
}

// 2. PaymentValidator.ts
switch (payment.type) {
  case 'credit': ...
  case 'paypal': ...
  case 'crypto': ...  // ← 追加
}

// 3. PaymentReporter.ts
switch (payment.type) {
  case 'credit': ...
  case 'paypal': ...
  case 'crypto': ...  // ← 追加
}

// ✅ Polymorphism: 1箇所に集約
interface PaymentMethod {
  process(): Promise<void>
  validate(): ValidationResult
  report(): PaymentReport
}

class CryptoPayment implements PaymentMethod {
  process(): Promise<void> { /* ... */ }
  validate(): ValidationResult { /* ... */ }
  report(): PaymentReport { /* ... */ }
}
```

**本スキルのルール:** 「Polymorphism over Switch」で1箇所にまとめる。

### Primitive Obsession（プリミティブ型への執着）

```typescript
// ❌ Primitive Obsession: string や number を直接使う
function createUser(
  email: string,      // メールアドレス
  phone: string,      // 電話番号
  age: number,        // 年齢
  zipCode: string     // 郵便番号
): User {
  // email の形式チェックはどこで？
  // age が負の数だったら？
  // 呼び出し側で email と phone を逆に渡したら？
}

// ✅ 値オブジェクトで意味と制約を表現
function createUser(
  email: Email,
  phone: PhoneNumber,
  age: Age,
  zipCode: ZipCode
): User {
  // 各値オブジェクトが自身の検証を持つ
  // 型が違うので引数の順序を間違えるとコンパイルエラー
}

class Email {
  private constructor(private readonly value: string) {}
  
  static create(value: string): Email | ValidationError {
    if (!value.includes('@')) {
      return new ValidationError('Invalid email format')
    }
    return new Email(value)
  }
}
```

**本スキルのルール:** 詳細は「5.3 Primitive Obsession の回避」で解説。

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

### なぜ Pending Object Pattern なのか — 4つの代替案との比較

状態遷移をどう表現するか。これには4つの方法があります：

| 方法 | 概要 | 採用 |
|------|------|:----:|
| **① 単一クラス + status フィールド** | `ringi.status = 'submitted'` で状態変更 | ❌ |
| **② State Machine ライブラリ** | XState等で状態遷移を定義 | ❌ |
| **③ Event Sourcing** | イベントの列として状態を表現 | ❌ |
| **④ Pending Object Pattern** | 状態ごとに別クラス（`DraftRingi` → `SubmittedRingi`） | ✅ |

---

#### ❌ 案① 単一クラス + status フィールドを採用しなかった理由

```typescript
// 単一クラス方式
class Ringi {
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: EmployeeId;
  rejectedAt?: Date;
  rejectedReason?: string;
  
  submit() {
    if (this.status !== 'draft') throw new Error('Invalid state');
    this.status = 'submitted';
    this.submittedAt = new Date();
  }
  
  approve(approver: EmployeeId) {
    if (this.status !== 'submitted') throw new Error('Invalid state');
    this.status = 'approved';
    this.approvedAt = new Date();
    this.approvedBy = approver;
  }
}
```

**問題1: 不正な状態がコンパイルを通る**

```typescript
// ❌ 型システムが守ってくれない
const ringi = new Ringi();
ringi.status = 'approved';
ringi.approvedAt = undefined;  // 承認済みなのに approvedAt がない！
// → コンパイルエラーにならない。実行時に初めて気づく
```

**問題2: nullable 地獄**

```typescript
// ❌ 「この状態ではnullのはず」を全部覚えていないといけない
if (ringi.status === 'approved') {
  console.log(ringi.approvedAt!);  // ! が必要。本当に存在する？
  console.log(ringi.approvedBy!);  // ! が必要。本当に存在する？
  console.log(ringi.rejectedReason);  // これはnullのはず...たぶん...
}
```

**問題3: switchの増殖**

```typescript
// ❌ 状態が増えるたびに全switchを修正
function getRingiLabel(ringi: Ringi): string {
  switch (ringi.status) {
    case 'draft': return '下書き';
    case 'submitted': return '申請中';
    case 'approved': return '承認済';
    case 'rejected': return '却下';
    // 新しい状態 'pending_resubmit' を追加 → このswitch忘れて本番でクラッシュ
  }
}
```

**出典: bloc library (Flutter) の公式ドキュメント**
> "Concrete Class and Status Enum: Not Type Safe. Possible to emit a malformed state, leading to bugs."

---

#### ❌ 案② State Machine ライブラリ（XState等）を採用しなかった理由

```typescript
// XState での状態遷移定義
const ringiMachine = createMachine({
  id: 'ringi',
  initial: 'draft',
  states: {
    draft: {
      on: { SUBMIT: 'submitted' }
    },
    submitted: {
      on: { APPROVE: 'approved', REJECT: 'rejected' }
    },
    approved: { type: 'final' },
    rejected: { type: 'final' }
  }
});
```

**問題1: 学習コストが高い**

XState は強力だが、チーム全員が習得するには時間がかかる。

**出典: Medium記事 "Don't use XState (at least, not with React)"**
> "XState actively works against React's natural data flow, leading to confusing code."

**問題2: 単純なケースには過剰**

```typescript
// ❌ 4状態の稟議フローにこれは大げさ
const ringiMachine = createMachine({
  // 50行の設定...
});

// ✅ 4つのクラスで十分
class DraftRingi { }
class SubmittedRingi { }
class ApprovedRingi { }
class RejectedRingi { }
```

**出典: GitHub Discussion "Need suggestions on migrating away from XState"**
> "XState is way too sophisticated for our relatively simple customer onboarding application. The complexity is not justified."

**問題3: デバッグが複雑**

状態遷移図は美しいが、実際にどのイベントでどう遷移したかを追跡するのが難しい。

**いつXStateを検討すべきか:**
- 状態が10個以上ある
- 状態遷移が複雑な分岐を持つ（条件付き遷移、ガード条件多数）
- UIの状態管理（loading, error, success, retrying, ...）

---

#### ❌ 案③ Event Sourcing を採用しなかった理由

```typescript
// Event Sourcing 方式
interface RingiEvent {
  type: 'Created' | 'Submitted' | 'Approved' | 'Rejected';
  timestamp: Date;
  payload: unknown;
}

class Ringi {
  private events: RingiEvent[] = [];
  
  submit() {
    this.events.push({ type: 'Submitted', timestamp: new Date(), payload: {} });
  }
  
  // 現在の状態は events を再生して計算
  get status(): string {
    return this.events.reduce((state, event) => {
      switch (event.type) {
        case 'Submitted': return 'submitted';
        case 'Approved': return 'approved';
        // ...
      }
    }, 'draft');
  }
}
```

**問題1: 「本で読んだら完璧に見えた。本番は悪夢だった」**

**出典: Medium記事 "Event Sourcing Looked Perfect in the Book. Production Was a Nightmare."**
> "Initial appeal of immutable events, audit trails, and CQRS quickly dissolved into distributed debugging hell."

**問題2: Eventual Consistency バグ**

```typescript
// ❌ よくあるバグ：注文直後に確認画面で「注文がありません」
// 理由：Read Model が Event Store に追いついていない

async function submitOrder(order: Order) {
  await eventStore.append(new OrderSubmittedEvent(order));
  // ↑ イベント保存完了
  
  // ユーザーをリダイレクト
  redirect('/orders/' + order.id);
  // ↓ しかし Read Model はまだ更新されていない！
}
```

**問題3: デバッグが考古学になる**

「なぜこの稟議が却下されたか」を調べるために、イベント100万件を再生することになる。

**問題4: スキーマ変更が永遠に残る**

イベントは不変。フィールドを追加したら、過去イベントとの互換性コードが永遠に必要。

```typescript
// ❌ 2年前のイベントとの互換性コード
function handleSubmittedEvent(event: SubmittedEvent) {
  // v1: applicantId が string だった
  // v2: applicantId を EmployeeId に変更
  // v3: applicantId を廃止、applicant オブジェクトに変更
  const applicant = event.version === 1 
    ? EmployeeId.fromString(event.applicantId as string)
    : event.version === 2
    ? event.applicantId
    : event.applicant.id;
  // このコードは永遠に消せない
}
```

**問題5: インフラコストが4倍**

Event Store + 複数 Read Model + Message Queue = 通常アーキテクチャの4倍のコスト。

**いつ Event Sourcing を検討すべきか:**
- 監査ログが法的要件として必須
- 「任意の過去時点の状態を再現」が必要
- 金融・医療など、変更履歴の完全性が最重要

---

#### ✅ 案④ Pending Object Pattern を採用した理由

```typescript
class DraftRingi {
  constructor(readonly id: RingiId, readonly data: RingiData) {}
  
  async submit(repository: RingiRepository): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data, new Date());
    await repository.save(submitted);
    return submitted;
  }
  
  // approve() メソッドは存在しない！
  // → コンパイルエラーで不正な遷移を防ぐ
}

class SubmittedRingi {
  constructor(
    readonly id: RingiId,
    readonly data: RingiData,
    readonly submittedAt: Date  // 必須！nullにならない
  ) {}
  
  async approve(repository: RingiRepository, approver: Employee): Promise<ApprovedRingi> {
    // ...
  }
  
  // submit() メソッドは存在しない！
}

class ApprovedRingi {
  constructor(
    readonly id: RingiId,
    readonly data: RingiData,
    readonly submittedAt: Date,
    readonly approvedAt: Date,      // 必須！
    readonly approvedBy: EmployeeId // 必須！
  ) {}
  
  // submit() も approve() も存在しない！
}
```

| メリット | 説明 |
|---------|------|
| **コンパイル時に不正遷移を検出** | `DraftRingi` に `approve()` がないのでコンパイルエラー |
| **nullable がない** | `ApprovedRingi.approvedAt` は必須。`?` も `!` も不要 |
| **各状態が独立してテスト可能** | `DraftRingi` のテストと `SubmittedRingi` のテストを分離 |
| **Event Sourcing の複雑さなし** | インフラは通常のDB、追加コストなし |

**唯一のデメリット: クラス数が増える**

状態が5つなら5クラス。これは「状態遷移の複雑さを明示的にした」結果であり、複雑さ自体は元からあったものです。

**「なぜ Pending という名前か」:**
`DraftRingi` は「まだ申請されていない＝保留中（Pending）の稟議」を表します。`submit()` を呼ぶと `SubmittedRingi` になる＝「保留」が解除される、というイメージです。

---

### 状態数が増えたらどうするか

| 状態数 | 推奨アプローチ |
|--------|---------------|
| 2-4 | Pending Object Pattern（本スキル） |
| 5-7 | Pending Object Pattern、または State パターン（GoF）を検討 |
| 8以上 | State Machine ライブラリ（XState等）を検討 |

8状態を超えたら、クラス数の管理が大変になるので、専用ライブラリの学習コストを払う価値があります

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

### なぜ完全コンストラクタなのか — 5つの代替案との比較

オブジェクト生成には5つの方法があります：

| 方法 | 概要 | 採用 |
|------|------|:----:|
| **① Setter注入** | `new User()` → `user.setName(...)` | ❌ |
| **② Builder パターン** | `UserBuilder().name(...).email(...).build()` | ❌ |
| **③ Factory Class** | `UserFactory.create(data)` | ❌ |
| **④ Two-phase initialization** | `new User()` → `user.init(data)` | ❌ |
| **⑤ 完全コンストラクタ + Static Factory** | `new User(id, name, email)` または `User.create(data)` | ✅ |

---

#### ❌ 案① Setter注入を採用しなかった理由

```typescript
class User {
  id?: UserId;
  name?: UserName;
  email?: Email;
  
  setId(id: UserId) { this.id = id; }
  setName(name: UserName) { this.name = name; }
  setEmail(email: Email) { this.email = email; }
}
```

**問題1: 不完全なオブジェクトが存在できる**

```typescript
const user = new User();
user.setName(UserName.of("田中"));
// user.id = undefined, user.email = undefined
saveToDatabase(user);  // 💥 実行時エラー
```

**問題2: 「設定済みか」を常に考える必要がある**

```typescript
function sendWelcomeEmail(user: User) {
  // email は設定されている？ id は？ 確認が必要...
  if (!user.email) throw new Error('Email not set');
  if (!user.id) throw new Error('ID not set');
  // やっと処理できる
}
```

---

#### ❌ 案② Builder パターンを採用しなかった理由

```typescript
class UserBuilder {
  private id?: UserId;
  private name?: UserName;
  private email?: Email;
  
  withId(id: UserId) { this.id = id; return this; }
  withName(name: UserName) { this.name = name; return this; }
  withEmail(email: Email) { this.email = email; return this; }
  
  build(): User {
    return new User(this.id!, this.name!, this.email!);  // ! で強制
  }
}
```

**問題1: `build()` を呼ぶまで不完全**

```typescript
const builder = new UserBuilder().withName(UserName.of("田中"));
// builder は不完全な状態。build() を呼ぶまで分からない
```

**問題2: 必須項目を忘れてもコンパイル通る**

```typescript
const user = new UserBuilder()
  .withName(UserName.of("田中"))
  // id と email を忘れた！
  .build();  // コンパイルエラーにならない。実行時に💥
```

**問題3: 「型安全なBuilder」は作れるが複雑**

型安全なBuilderを作ることは可能ですが、TypeScriptでは非常に複雑になります：

```typescript
// 型安全なBuilder（複雑すぎる例）
type BuilderState = { id: boolean; name: boolean; email: boolean };
class UserBuilder<S extends BuilderState> {
  // 複雑な型定義が続く...
}
```

**Builderを許容する場合:** 引数が10個以上あり、多くがオプショナルの場合は Builder の方が読みやすいこともあります。ただし、それは「引数が多すぎる」というシグナルかもしれません。

---

#### ❌ 案③ Factory Class を採用しなかった理由

```typescript
class UserFactory {
  static create(data: UserData): User {
    // バリデーションロジック
    if (!data.email.includes('@')) throw new Error('Invalid email');
    
    return new User(
      UserId.generate(),
      UserName.of(data.name),
      Email.of(data.email)
    );
  }
}
```

**問題1: ビジネスルールが分散する**

```typescript
// ❌ User のルールがどこにある？
class User {
  // 一部のルールがここに...
}

class UserFactory {
  // 一部のルールがここに...
}

class UserValidator {
  // さらに別のルールがここに...
}

// 「User のビジネスルール全部見せて」→ 3ファイル開く必要
```

**問題2: Factory が「神クラス」になりがち**

```typescript
class UserFactory {
  static create(data: UserData): User { }
  static createFromOAuth(profile: OAuthProfile): User { }
  static createAdmin(data: AdminData): User { }
  static createGuest(): User { }
  static createFromCsv(row: string[]): User { }
  // どんどん膨らむ...
}
```

**Factory Class を許容する場合:**
- 複数の Aggregate を協調して生成する必要がある場合
- 外部リソース（ID生成サービス等）が必要で、DIコンテナで管理したい場合

---

#### ❌ 案④ Two-phase initialization を採用しなかった理由

```typescript
class User {
  private id?: UserId;
  private name?: UserName;
  private email?: Email;
  private initialized = false;
  
  constructor() {}  // 空のコンストラクタ
  
  init(data: UserData) {
    if (this.initialized) throw new Error('Already initialized');
    this.id = UserId.generate();
    this.name = UserName.of(data.name);
    this.email = Email.of(data.email);
    this.initialized = true;
  }
  
  getName(): UserName {
    if (!this.initialized) throw new Error('Not initialized');
    return this.name!;
  }
}
```

**問題1: 初期化忘れ**

```typescript
const user = new User();
// init() を呼び忘れた！
user.getName();  // 💥 実行時エラー
```

**問題2: 全メソッドでチェックが必要**

```typescript
// ❌ 全メソッドに initialized チェックが入る
getName(): UserName {
  if (!this.initialized) throw new Error('Not initialized');
  return this.name!;
}

getEmail(): Email {
  if (!this.initialized) throw new Error('Not initialized');
  return this.email!;
}
// コピペ地獄
```

---

#### ✅ 案⑤ 完全コンストラクタ + Static Factory を採用した理由

```typescript
class User {
  private constructor(
    readonly id: UserId,
    readonly name: UserName,
    readonly email: Email
  ) {}
  
  // 単純な生成
  static create(data: ValidatedUserData): User {
    return new User(
      UserId.generate(),
      UserName.of(data.name),
      Email.of(data.email)
    );
  }
  
  // バリデーション付き生成（失敗する可能性がある）
  static createFromInput(
    input: UnvalidatedUserInput
  ): Result<User, ValidationError> {
    const validation = new UserInputValidation(input).execute();
    if (!validation.ok) return validation;
    
    return Result.ok(User.create(validation.value));
  }
}
```

| メリット | 説明 |
|---------|------|
| **不完全なオブジェクトが存在しない** | コンストラクタで全フィールド必須 |
| **コンパイル時にチェック** | 引数忘れはコンパイルエラー |
| **ビジネスルールが1箇所** | User のルールは User クラスにある |
| **失敗する生成を型で表現** | `createFromInput` は `Result` を返す |

**private constructor + static factory の組み合わせ:**

```typescript
// ❌ public constructor だと、バリデーションをスキップできる
const user = new User(id, name, email);  // 誰でも呼べる

// ✅ private constructor + static factory
class User {
  private constructor(...) {}  // 外から呼べない
  
  static create(data: ValidatedData): User {
    // ここを通らないと User は作れない
    return new User(...);
  }
}
```

**完全コンストラクタの唯一のデメリット: 引数が多くなる**

```typescript
// 引数が多い場合
new User(id, name, email, phone, address, role, createdAt, ...);
```

これには2つの対処法があります：

1. **オブジェクトにまとめる**
```typescript
new User({
  id,
  name,
  email,
  phone,
  address,
  role,
  createdAt,
});
```

2. **クラスを分割する（推奨）**
引数が多いのは「責務が多すぎる」サインかもしれません

---

## 2.2 依存の4分類と生成方針

クラスが使う「依存」（他のクラスやリソース）は4種類に分類できます：

| 分類 | 定義 | 例 | 生成方法 |
|------|------|-----|---------|
| **Pure Logic** | 外部リソース不要、常に同じ結果 | TaxCalculator | コンストラクタ内で `new` |
| **Configured Logic** | 設定値に依存、常に同じ結果 | RateCalculator(rate: 0.1) | Config経由で内部生成 |
| **External Resource** | 外部リソースにアクセス | Repository, API Client | メソッド引数で受け取る |
| **Non-deterministic** | 実行ごとに結果が変わる | Clock（現在時刻）, Random | メソッド引数で受け取る |

### なぜ「メソッド引数で受け取る」なのか — 4つの代替案との比較

External Resource（Repository等）をどうやってクラスに渡すか。これには4つの方法があります：

| 方法 | 概要 | 採用 |
|------|------|:----:|
| **① DIコンテナ（コンストラクタ注入）** | NestJS/Spring方式。コンテナがnew時に自動注入 | ❌ |
| **② Factoryパターン** | `RingiFactory.create(data, repository)` で生成時に渡す | ❌ |
| **③ Service Locator** | `ServiceLocator.get(RingiRepository)` でグローバルに取得 | ❌ |
| **④ メソッド引数** | `draft.submit(repository)` で使う時に渡す | ✅ |

---

#### ❌ 案① DIコンテナ（コンストラクタ注入）を採用しなかった理由

**NestJS や Spring で標準的なアプローチ:**
```typescript
// NestJS スタイル
@Injectable()
class RingiService {
  constructor(private readonly repository: RingiRepository) {}
  
  async submit(data: RingiData): Promise<SubmittedRingi> {
    const draft = new DraftRingi(data);
    await this.repository.save(draft);
    // ...
  }
}
```

**問題1: ドメインオブジェクトはDIコンテナの外で生まれる**

`DraftRingi` は `new DraftRingi(data)` で生成されます。DIコンテナは `@Injectable()` が付いたクラスしか管理しません。

```typescript
// ❌ これはできない — DraftRingi は手動で new する
const draft = container.resolve(DraftRingi);  // DraftRingi は Entity、DIで管理しない
```

DIコンテナは「サービス層」のオブジェクト（`RingiService`）を管理するもので、「ドメインオブジェクト」（`DraftRingi`）は管理対象外です。

**問題2: Anemic Domain Model（貧血ドメインモデル）を誘発する**

DIコンテナを使うと、ロジックが「サービス」に流出しがちです：

```typescript
// ❌ DIコンテナ方式 → ロジックがサービスに集中
class RingiService {
  constructor(private readonly repository: RingiRepository) {}
  
  async submit(draft: DraftRingi): Promise<SubmittedRingi> {
    // ビジネスロジックがここに書かれる
    if (draft.amount.isGreaterThan(MAX)) throw new Error('上限超過');
    const submitted = new SubmittedRingi(draft.id, draft.data, new Date());
    await this.repository.save(submitted);
    return submitted;
  }
}

// DraftRingi は単なるデータ入れ物になる（貧血）
class DraftRingi {
  constructor(readonly id: RingiId, readonly data: RingiData) {}
  // メソッドがない！
}
```

本スキルが目指すのは「ドメインオブジェクト自身がロジックを持つ」Rich Domain Model です：

```typescript
// ✅ メソッド引数方式 → ロジックがドメインオブジェクトに
class DraftRingi {
  async submit(repository: RingiRepository, clock: Clock): Promise<SubmittedRingi> {
    // ビジネスロジックがここにある
    const submitted = new SubmittedRingi(this.id, this.data, clock.now());
    await repository.save(submitted);
    return submitted;
  }
}
```

**問題3: テストで「使わない依存」も全部渡す必要がある**

```typescript
// ❌ DIコンテナ方式：10メソッドあるサービス
class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly emailService: EmailService,
    private readonly inventoryApi: InventoryApi,
    private readonly auditLogger: AuditLogger,
  ) {}
  
  async calculateTotal(order: Order): Money { /* repository使わない */ }
  async validateItems(order: Order): boolean { /* repository使わない */ }
  // ...
}

// テスト：calculateTotal だけテストしたいのに5つ全部モックする
const service = new OrderService(
  mockOrderRepository,    // 使わないのにモック必要
  mockPaymentGateway,     // 使わないのにモック必要
  mockEmailService,       // 使わないのにモック必要
  mockInventoryApi,       // 使わないのにモック必要
  mockAuditLogger,        // 使わないのにモック必要
);
service.calculateTotal(order);  // 結局1つも使わなかった
```

メソッド引数なら、そのメソッドが使うものだけ渡せばいい：

```typescript
// ✅ メソッド引数方式：必要なものだけ
order.calculateTotal();  // 引数なし、モック不要
order.submit(repository, clock);  // 使うものだけ
```

---

#### ❌ 案② Factoryパターンを採用しなかった理由

```typescript
// Factory パターン
class RingiFactory {
  constructor(private readonly repository: RingiRepository) {}
  
  async createAndSubmit(data: RingiData): Promise<SubmittedRingi> {
    const draft = new DraftRingi(data);
    // ...submit ロジック...
    await this.repository.save(submitted);
    return submitted;
  }
}
```

**問題1: ビジネスルールが分散する**

「稟議の上限チェック」はどこにある？`DraftRingi`？`RingiFactory`？両方見ないと分からない。

```typescript
// ❌ 知識が分散
class DraftRingi {
  // ここにも一部のルールが...
}

class RingiFactory {
  // ここにも別のルールが...
}

// 「稟議のビジネスルール全部見せて」→ 2ファイル開く必要
```

**問題2: Factoryが「神クラス」になりがち**

```typescript
// ❌ 時間が経つと...
class RingiFactory {
  createDraft(data) { }
  createFromTemplate(template) { }
  createCopy(original) { }
  createAndSubmit(data) { }
  createForBulkImport(csv) { }
  // どんどん膨らむ
}
```

---

#### ❌ 案③ Service Locatorを採用しなかった理由

```typescript
// Service Locator パターン
class DraftRingi {
  async submit(): Promise<SubmittedRingi> {
    const repository = ServiceLocator.get(RingiRepository);  // グローバルに取得
    const clock = ServiceLocator.get(Clock);
    // ...
  }
}
```

**問題1: 依存が隠れる**

メソッドシグネチャを見ても、何に依存しているか分からない：

```typescript
// ❌ シグネチャから依存が見えない
async submit(): Promise<SubmittedRingi>  // 中で何使ってる？

// ✅ シグネチャに依存が明示される
async submit(repository: RingiRepository, clock: Clock): Promise<SubmittedRingi>
```

**問題2: テストでグローバル状態を操作する必要がある**

```typescript
// ❌ テスト前にグローバル状態をセットアップ
beforeEach(() => {
  ServiceLocator.register(RingiRepository, new InMemoryRingiRepository());
  ServiceLocator.register(Clock, new FixedClock(...));
});

afterEach(() => {
  ServiceLocator.reset();  // 忘れると次のテストに影響
});
```

**問題3: 並列テストで壊れる**

グローバル状態を共有するため、テストを並列実行すると競合が発生します。

---

#### ✅ 案④ メソッド引数を採用した理由

```typescript
class DraftRingi {
  async submit(repository: RingiRepository, clock: Clock): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data, clock.now());
    await repository.save(submitted);
    return submitted;
  }
}
```

| メリット | 説明 |
|---------|------|
| **依存が明示的** | シグネチャを見れば何が必要か分かる |
| **テストが簡単** | 使うものだけモックすればいい |
| **Rich Domain Model** | ロジックがドメインオブジェクト自身にある |
| **並列テスト可能** | グローバル状態がないので競合しない |

**唯一のデメリット: 引数が増える**

```typescript
// 引数が多くなることがある
await draft.submit(repository, clock, notificationService, auditLogger);
```

これは「このメソッドが多くのことをやりすぎている」というシグナルです。責務を分割すべきサインとして受け入れます。

---

### なぜ4分類なのか — 3分類や5分類ではなく

| 分類数 | 問題 |
|--------|------|
| **2分類**（Pure / Impure） | 「設定値に依存」と「DBに依存」の区別がつかない |
| **3分類**（Pure / Config / External） | 「時刻」「乱数」が External に混ざる。テスト方法が違うのに同じ扱いになる |
| **4分類**（本スキル） | 生成方法とテスト方法が完全に対応する |
| **5分類以上** | 複雑すぎて判断に時間がかかる |

**判断フロー:**
```
この依存は...
├─ 外部リソース（DB, HTTP, File）にアクセスする？
│   └─ YES → External Resource → メソッド引数
├─ 時刻や乱数に依存する？
│   └─ YES → Non-deterministic → メソッド引数
├─ 設定値（税率、上限額等）が必要？
│   └─ YES → Configured Logic → Config経由でコンストラクタ内生成
└─ 上記すべてNO？
    └─ YES → Pure Logic → コンストラクタ内で直接 new
```

---

### Clock の扱い — なぜメソッド引数なのか

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
    await repository.save(submitted);
    return submitted;
  }
}

// テスト時
const fixedClock = new FixedClock(new Date('2024-01-15T10:00:00Z'));
await draft.submit(repository, fixedClock);
// submitted.submittedAt が 2024-01-15T10:00:00Z であることを検証できる
```

**なぜ `Date.now()` をモックしないのか:**

```typescript
// ❌ グローバルモック — 他のテストに影響する可能性
jest.spyOn(Date, 'now').mockReturnValue(1234567890);

// ✅ 引数で渡す — 影響範囲が明確
await draft.submit(repository, new FixedClock(...));
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

### なぜ Result 型なのか — 5つの代替案との比較

エラー処理には5つの方法があります：

| 方法 | 概要 | 採用 |
|------|------|:----:|
| **① 例外（throw/catch）** | `throw new Error()` で中断 | △ 条件付き |
| **② null/undefined** | 失敗時に `null` を返す | ❌ |
| **③ Go スタイル（タプル）** | `[value, error]` を返す | ❌ |
| **④ Either/Maybe モナド** | 関数型プログラミング由来 | ❌ |
| **⑤ Result 型** | `{ ok, value/error }` を返す | ✅ |

---

#### △ 案① 例外（throw/catch）— 条件付きで採用

```typescript
// 例外方式
async function submit(data: RingiData): Promise<SubmittedRingi> {
  if (data.amount > MAX) throw new AmountExceededError();
  // ...
}

try {
  await submit(data);
} catch (e) {
  // e は unknown 型
}
```

**問題1: 型シグネチャにエラーが表れない**

```typescript
// ❌ 何が投げられるか分からない
async function submit(data: RingiData): Promise<SubmittedRingi>
// ↑ この関数が ValidationError? AmountExceededError? DatabaseError? 
// 型を見ても分からない。実装を読まないと分からない。
```

**問題2: catch 忘れても動く**

```typescript
// ❌ catch を忘れても TypeScript は警告しない
await submit(data);
// ↑ 例外が投げられる可能性があるのに、catch がない
// コンパイルは通る。本番で初めてクラッシュ。
```

**問題3: catch の e は unknown 型**

```typescript
try {
  await submit(data);
} catch (e) {
  // e は unknown 型。何のエラーか分からない
  if (e instanceof ValidationError) { ... }
  else if (e instanceof AmountExceededError) { ... }
  else { ... }  // これ全部覚えていられる？
}
```

**出典: Medium記事 "How Rust Made Me Ditch Go's Error Hell"**
> "The Result type makes errors visible in the type signature. You cannot ignore them."

**例外を許容する場合（InfrastructureError）:**
本スキルでは、**ユーザーが対処できないエラー**は例外で throw します：

```typescript
// ✅ InfrastructureError は例外OK
class PostgresRingiRepository {
  async save(ringi: Ringi): Promise<void> {
    try {
      await this.db.execute(...);
    } catch (e) {
      // DB接続失敗、ネットワークエラーなど
      throw new InfrastructureError('Database error', e);
    }
  }
}
```

理由: DB障害でユーザーにできることは「しばらく待って再試行」だけ。Result で返しても意味がない。

---

#### ❌ 案② null/undefined を採用しなかった理由

```typescript
// null 方式
function findUser(id: string): User | null {
  if (!exists) return null;
  if (!hasPermission) return null;
  return user;
}
```

**問題1: エラーの理由が分からない**

```typescript
const user = findUser(id);
if (user === null) {
  // なぜ null？
  // - ユーザーが存在しない？
  // - 権限がない？
  // - DB接続に失敗した？
  // 分からない！
}
```

**問題2: null チェック忘れ**

```typescript
// ❌ TypeScript の strictNullChecks を有効にしていても...
const user = findUser(id);
console.log(user.name);  // 💥 user が null かも

// 毎回 null チェックが必要
if (user) {
  console.log(user.name);  // ようやく安全
}
```

---

#### ❌ 案③ Go スタイル（タプル）を採用しなかった理由

```typescript
// Go スタイル
function findUser(id: string): [User | null, Error | null] {
  if (!exists) return [null, new NotFoundError(id)];
  return [user, null];
}

const [user, err] = findUser(id);
if (err) {
  // エラー処理
}
```

**問題1: 両方 null のケースを防げない**

```typescript
// ❌ 不正な状態が型として許容される
return [null, null];  // どっちも null！コンパイル通る
return [user, new Error()];  // 両方ある！コンパイル通る
```

**問題2: TypeScript の型推論と相性が悪い**

```typescript
const [user, err] = findUser(id);
if (err) return;

// ↓ この時点で user は null じゃないはずなのに...
console.log(user.name);  // TypeScript: "user は null かもしれません"
// 型が絞り込まれない
```

Result 型なら型が絞り込まれる：

```typescript
// ✅ Result 型
const result = findUser(id);
if (!result.ok) return;

console.log(result.value.name);  // OK! value は User 型
```

---

#### ❌ 案④ Either/Maybe モナドを採用しなかった理由

```typescript
// Either モナド（fp-ts 等）
import { Either, left, right, chain } from 'fp-ts/Either';

function findUser(id: string): Either<Error, User> {
  if (!exists) return left(new NotFoundError(id));
  return right(user);
}

// 使う側
pipe(
  findUser(id),
  chain(validatePermission),
  chain(loadProfile),
  fold(
    (error) => handleError(error),
    (user) => showUser(user)
  )
);
```

**問題1: 学習コストが高すぎる**

`pipe`, `chain`, `fold`, `map`, `flatMap`, `ap`, `sequenceT` ...

チーム全員がこれを理解できる？新メンバーが入ってきたら？

**問題2: 既存のエコシステムとの相性**

```typescript
// ❌ async/await と組み合わせが面倒
async function submit(): Promise<Either<Error, Ringi>> {
  // Either と Promise の組み合わせ = TaskEither
  // さらに複雑に...
}
```

**問題3: エラーメッセージが分かりにくい**

fp-ts のエラーメッセージは TypeScript 初心者には暗号に見えます。

**Either を許容する場合:**
- チーム全員が関数型プログラミングに精通している
- 既存コードベースが fp-ts を使っている

---

#### ✅ 案⑤ Result 型を採用した理由

```typescript
// Result 型
type Result<T, E> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

function findUser(id: string): Result<User, NotFoundError | PermissionError> {
  if (!exists) return { ok: false, error: new NotFoundError(id) };
  if (!hasPermission) return { ok: false, error: new PermissionError(id) };
  return { ok: true, value: user };
}

// 使う側
const result = findUser(id);
if (!result.ok) {
  // result.error は NotFoundError | PermissionError 型
  console.log(result.error.message);
  return;
}
// result.value は User 型
console.log(result.value.name);
```

| メリット | 説明 |
|---------|------|
| **エラーが型に表れる** | `Result<User, NotFoundError>` で何が起きるか分かる |
| **エラー処理を強制** | `if (!result.ok)` を書かないと value にアクセスできない |
| **型が絞り込まれる** | `if (!result.ok) return;` の後、`result.value` は User 型 |
| **学習コストが低い** | `if/else` が分かれば使える |

---

### Result 型の欠点と対処法

**欠点1: 冗長になることがある**

```typescript
// ❌ 毎回 if チェック
const result1 = step1();
if (!result1.ok) return result1;

const result2 = step2(result1.value);
if (!result2.ok) return result2;

const result3 = step3(result2.value);
if (!result3.ok) return result3;
// 繰り返し...
```

**対処: ヘルパー関数**

```typescript
// ✅ andThen でチェーン
const finalResult = result1
  .andThen(step2)
  .andThen(step3);
```

**欠点2: async との組み合わせ**

```typescript
// ❌ Promise<Result<T, E>> の扱いが面倒
const result = await asyncStep1();
if (!result.ok) return result;
// ...
```

**対処: AsyncResult ヘルパー**

```typescript
// ✅ AsyncResult
const result = await AsyncResult
  .from(asyncStep1())
  .andThen(asyncStep2)
  .andThen(asyncStep3);
```

---

## 4.2 エラーの2分類

| 分類 | 定義 | 処理方法 | 例 |
|------|------|---------|-----|
| **DomainError** | ビジネスルール違反 | Result型で返す | 金額上限超過、在庫不足 |
| **InfrastructureError** | 技術的な障害 | 例外でthrow | DB接続失敗、ネットワークエラー |

**なぜ分けるか:**

| エラー種類 | ユーザーが対処可能？ | 例 |
|-----------|:----------------:|-----|
| DomainError | ✅ | 「金額を100万円以下に修正してください」 |
| InfrastructureError | ❌ | 「しばらく待ってから再試行してください」 |

DomainError は「こうすれば成功する」が分かるので、Result で返してユーザーに伝えます。
InfrastructureError は「どうしようもない」ので、例外で上位に伝搬させてシステム全体で処理します。

**判断フロー:**
```
このエラーは...
├─ ユーザーが入力を修正すれば成功する？
│   └─ YES → DomainError → Result 型
└─ NO（システム障害、ネットワーク障害）
    └─ InfrastructureError → 例外 throw
```

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

## 5.6 Tell, Don't Ask

### 原則

> **「オブジェクトにデータを問い合わせて判断するな。判断を依頼せよ」**

「Tell, Don't Ask」は、Pragmatic Programmers の Andy Hunt と Dave Thomas が提唱した原則です。オブジェクト指向設計の核心を突いています。

```typescript
// ❌ Ask（問い合わせて判断）
function canShip(order: Order): boolean {
  // Order のデータを取り出して、外部で判断している
  if (order.getStatus() === 'paid' &&
      order.getStock() > 0 &&
      order.getShippingAddress() !== null) {
    return true
  }
  return false
}

// ✅ Tell（判断を依頼）
function canShip(order: Order): boolean {
  // Order 自身に判断を任せる
  return order.canShip()
}

class Order {
  canShip(): boolean {
    return this.status === 'paid' &&
           this.stock > 0 &&
           this.shippingAddress !== null
  }
}
```

### なぜ Ask がダメなのか

**Feature Envy（他クラスへの羨望）** を引き起こします：

```typescript
// ❌ Ask: Customer のデータばかり使っている（Feature Envy）
class DiscountCalculator {
  calculate(customer: Customer): number {
    // Customer の内部データを取り出している
    const years = customer.getMembershipYears()
    const points = customer.getLoyaltyPoints()
    const purchases = customer.getTotalPurchases()
    
    if (years > 5 && points > 1000 && purchases > 50000) {
      return 0.2  // 20% OFF
    } else if (years > 3 && points > 500) {
      return 0.1  // 10% OFF
    }
    return 0
  }
}
```

**問題点:**
1. **凝集度が低い** — 判断ロジックがデータから離れている
2. **変更に弱い** — Customer の構造が変わると DiscountCalculator も変更
3. **再利用できない** — 同じ判断が必要な別の場所でコピペ発生
4. **カプセル化違反** — Customer の内部構造を外部が知りすぎている

### Tell の実装パターン

```typescript
// ✅ Tell: ロジックをデータがある場所に移動
class Customer {
  private readonly membershipYears: number
  private readonly loyaltyPoints: number
  private readonly totalPurchases: number
  
  // 判断ロジックはデータと一緒にある
  discountRate(): number {
    if (this.isVIP()) {
      return 0.2
    } else if (this.isRegular()) {
      return 0.1
    }
    return 0
  }
  
  private isVIP(): boolean {
    return this.membershipYears > 5 &&
           this.loyaltyPoints > 1000 &&
           this.totalPurchases > 50000
  }
  
  private isRegular(): boolean {
    return this.membershipYears > 3 &&
           this.loyaltyPoints > 500
  }
}

// 使う側はシンプル
class DiscountCalculator {
  calculate(customer: Customer): number {
    return customer.discountRate()  // Tell!
  }
}
```

### Anemic Domain Model（貧血ドメインモデル）

「Ask」パターンを多用すると、**貧血ドメインモデル**になります：

| 貧血ドメインモデル | Rich Domain Model |
|------------------|-------------------|
| データだけ持つクラス | データ + ロジック |
| Service がロジックを持つ | ドメインオブジェクトがロジックを持つ |
| getter だらけ | 意味のあるメソッド |
| 手続き型の設計 | オブジェクト指向の設計 |

```typescript
// ❌ 貧血ドメインモデル
class Order {
  status: string
  items: OrderItem[]
  shippingAddress: Address | null
}

class OrderService {
  canShip(order: Order): boolean { /* ... */ }
  calculateTotal(order: Order): Money { /* ... */ }
  addItem(order: Order, item: OrderItem): void { /* ... */ }
}

// ✅ Rich Domain Model
class Order {
  constructor(
    private readonly status: OrderStatus,
    private readonly items: OrderItem[],
    private readonly shippingAddress: Address | null
  ) {}
  
  canShip(): boolean { /* ... */ }
  total(): Money { /* ... */ }
  withItem(item: OrderItem): Order { /* ... */ }
}
```

### 本スキルとの関係

| 本スキルのルール | Tell, Don't Ask との関係 |
|----------------|-------------------------|
| **Transition クラス** | ロジックをドメインオブジェクトに持たせる |
| **getter 禁止** | Ask を強制的に防ぐ |
| **1クラス1パブリックメソッド** | 意味のある操作だけを公開 |
| **4分類** | Service 層の肥大化（貧血モデル）を防ぐ |

---

## 5.7 Law of Demeter（デメテルの法則）

### 原則

> **「直接の友達とだけ話せ」**

Law of Demeter（デメテルの法則）は、1987年にノースイースタン大学の Demeter プロジェクトで提唱された設計原則です。「最小知識の原則（Principle of Least Knowledge）」とも呼ばれます。

**正式な定義:**
メソッド M が呼び出せるのは、以下のオブジェクトのメソッドだけ：
1. M を持つオブジェクト自身（`this`）
2. M の引数として渡されたオブジェクト
3. M 内で生成されたオブジェクト
4. M を持つオブジェクトのフィールド

```typescript
// ❌ デメテルの法則違反: 「友達の友達」と話している
class OrderProcessor {
  process(order: Order): void {
    // order.getCustomer().getAddress().getCity() — 3段階のドットチェーン
    const city = order.getCustomer().getAddress().getCity()
    // Order の内部構造を知りすぎている
  }
}

// ✅ デメテルの法則遵守: 直接の友達（order）とだけ話す
class OrderProcessor {
  process(order: Order): void {
    const city = order.shippingCity()  // Order に聞く
  }
}

class Order {
  shippingCity(): string {
    return this.customer.shippingCity()  // Customer に委譲
  }
}

class Customer {
  shippingCity(): string {
    return this.address.city  // Address のフィールドを返す
  }
}
```

### なぜドットチェーンがダメなのか

**結合度が高くなる:**

```typescript
// ❌ order.getCustomer().getAddress().getCity()
// 問題: OrderProcessor は Order, Customer, Address の3つに依存している

// Address の構造が変わったら？
// - Address.city → Address.location.cityName に変更
// - OrderProcessor も修正が必要！（本来関係ないのに）
```

**カプセル化違反:**

```typescript
// ❌ 内部構造を知りすぎている
order.getCustomer().getWallet().getBalance().isGreaterThan(price)

// 問題:
// 1. Order が Customer を持つことを知っている
// 2. Customer が Wallet を持つことを知っている
// 3. Wallet が Balance を持つことを知っている
// 4. Balance に isGreaterThan があることを知っている
// → 4つのクラスの内部構造に依存！
```

### ドットチェーンのルール（SKILL.md より）

本スキルでは、ドットチェーンについて以下のルールを設けています：

| ケース | 許容 | 理由 |
|--------|:----:|------|
| `order.customer.address.city` | ❌ | 他オブジェクトの内部構造を知りすぎ |
| `order.items.filter(...).map(...)` | ✅ | 同一コレクションの fluent interface |
| `result.map(...).flatMap(...)` | ✅ | 同一型のモナドチェーン |
| `builder.setA(...).setB(...).build()` | ✅ | Builder パターン |

### 解決策: 委譲メソッドを作る

```typescript
// ❌ 違反
const total = order.getItems().reduce((sum, item) => 
  sum + item.getProduct().getPrice() * item.getQuantity(), 0)

// ✅ 遵守
const total = order.total()

class Order {
  total(): Money {
    return this.items.reduce((sum, item) => sum.add(item.subtotal()), Money.zero())
  }
}

class OrderItem {
  subtotal(): Money {
    return this.product.price.multiply(this.quantity)
  }
}
```

### デメテルの法則と Tell, Don't Ask の関係

両者は同じ問題を異なる角度から見ています：

| 原則 | 視点 | 禁止すること |
|------|------|------------|
| **Tell, Don't Ask** | 「何を」 | データを取り出して外部で判断すること |
| **Law of Demeter** | 「誰と」 | 直接の友達以外と会話すること |

```typescript
// 両方違反している例
function isEligibleForDiscount(order: Order): boolean {
  // Law of Demeter 違反: order → customer → loyalty → points
  // Tell, Don't Ask 違反: データを取り出して外部で判断
  return order.getCustomer().getLoyalty().getPoints() > 1000
}

// 両方遵守している例
function isEligibleForDiscount(order: Order): boolean {
  return order.customerIsEligibleForDiscount()  // Tell + 直接の友達
}
```

### 本スキルとの関係

| 本スキルのルール | Law of Demeter との関係 |
|----------------|------------------------|
| **ドットチェーンのルール** | デメテルの法則を具体化 |
| **getter 禁止** | ドットチェーンを構造的に防ぐ |
| **委譲メソッド** | 違反を解消する手段 |
| **Rich Domain Model** | 必要な操作をオブジェクトに持たせる |

### 例外: Fluent Interface

メソッドチェーンでも、**同じ型を返し続ける**場合は許容されます：

```typescript
// ✅ 許容: 同じ型（Stream）を返し続ける
users
  .filter(u => u.isActive)
  .map(u => u.email)
  .filter(e => e.endsWith('@company.com'))

// ✅ 許容: Builder パターン
new OrderBuilder()
  .withCustomer(customer)
  .withItems(items)
  .withShipping(address)
  .build()

// ✅ 許容: Result チェーン
parseInput(raw)
  .flatMap(validate)
  .map(transform)
  .unwrapOr(defaultValue)
```

**なぜ許容されるか:**
- 各メソッドが同じ型（または同じインターフェース）を返す
- 内部構造の詳細を暴露していない
- 変更があっても影響範囲が限定される

---

# Part 6: アーキテクチャ

## 6.1 Screaming Architecture

**Screaming Architecture**とは、「ディレクトリ構造を見れば何のシステムか分かる」設計です。

### なぜ Screaming Architecture なのか — 4つの代替案との比較

ディレクトリ構造には4つの設計方法があります：

| 方法 | 概要 | 採用 |
|------|------|:----:|
| **① 技術レイヤー分割** | `controllers/`, `services/`, `repositories/` | ❌ |
| **② 機能ベース分割（Screaming）** | `catalog/`, `ordering/`, `payments/` | ✅ |
| **③ Hexagonal Architecture** | `adapters/`, `ports/`, `domain/` | △ 条件付き |
| **④ Clean Architecture（4層）** | `entities/`, `use-cases/`, `interface-adapters/`, `frameworks/` | ❌ |

---

#### ❌ 案① 技術レイヤー分割を採用しなかった理由

```
技術レイヤー分割
src/
├── controllers/     # コントローラー？何の？
├── services/        # サービス？何の？
├── repositories/    # リポジトリ？何の？
└── entities/        # エンティティ？何の？
```

**問題1: 何のシステムか分からない**

このディレクトリ構造を見て、ECサイトなのか、社内システムなのか、SNSなのか分かりますか？

**問題2: 1機能修正で5フォルダ開く**

**出典: "6 Months with Feature-Based Folder Structure — Why I'm Not Going Back"**
> "Editing one feature required opening 5+ folders. Structure became difficult for maintenance."

```
「稟議機能を修正」するために開くフォルダ：
1. controllers/RingiController.ts
2. services/RingiService.ts
3. repositories/RingiRepository.ts
4. entities/Ringi.ts
5. dto/RingiDto.ts
6. validators/RingiValidator.ts
→ 6ファイルが6箇所に散らばっている
```

**問題3: 機能削除で漏れが発生**

```
「稟議機能を削除」したとき：
✅ controllers/RingiController.ts    削除した
✅ services/RingiService.ts          削除した
❌ repositories/RingiRepository.ts   忘れた！
❌ entities/Ringi.ts                 忘れた！
→ 死んだコードが残る
```

**問題4: オンボーディングが遅い**

新メンバー：「稟議機能のコードどこですか？」
回答：「えーと、controllers と services と repositories と entities と dto と validators を見て...」

---

#### △ 案③ Hexagonal Architecture — 条件付きで採用

```
Hexagonal（ポート＆アダプター）
src/
├── adapters/
│   ├── web/
│   ├── persistence/
│   └── messaging/
├── ports/
│   ├── inbound/
│   └── outbound/
└── domain/
```

**利点:** 外部システムとの接点（アダプター）が明確に分離される。

**問題: 小〜中規模には過剰**

```
「稟議機能を追加」するファイル数：
- domain/ringi/Ringi.ts
- domain/ringi/RingiService.ts
- ports/inbound/RingiUseCase.ts
- ports/outbound/RingiRepository.ts
- adapters/web/RingiController.ts
- adapters/persistence/PostgresRingiRepository.ts
→ 6ファイル以上、3階層

シンプルなCRUDアプリには重すぎる
```

**Hexagonal を許容する場合:**
- 複数の入力チャネル（Web, CLI, Queue, gRPC）がある
- 複数の永続化先（PostgreSQL, MongoDB, 外部API）がある
- マイクロサービスで境界が重要

---

#### ❌ 案④ Clean Architecture（4層）を採用しなかった理由

```
Clean Architecture
src/
├── entities/           # Enterprise Business Rules
├── use-cases/          # Application Business Rules
├── interface-adapters/ # Controllers, Presenters, Gateways
└── frameworks/         # Web, DB, External
```

**問題1: 過剰な層分け**

「稟議を申請する」だけで4ファイル以上：

```
entities/Ringi.ts
use-cases/SubmitRingiUseCase.ts
interface-adapters/RingiController.ts
interface-adapters/RingiPresenter.ts
frameworks/web/ExpressRingiRouter.ts
frameworks/persistence/PostgresRingiRepository.ts
```

**問題2: 「どの層に置くか」で延々と議論**

「このロジックは Entity？UseCase？Adapter？」

**Clean Architecture を許容する場合:**
- 大規模エンタープライズシステム
- 複数チームが同一コードベースで作業
- フレームワーク乗り換えが予定されている

---

#### ✅ 案② Screaming Architecture を採用した理由

```
Screaming Architecture（機能ベース）
src/
├── catalog/      # 商品カタログ
├── ordering/     # 注文管理
├── customers/    # 顧客管理
└── payments/     # 決済
```

| メリット | 説明 |
|---------|------|
| **何のシステムか一目で分かる** | ECサイトだ！稟議システムだ！ |
| **1機能 = 1フォルダ** | 関連ファイルが1箇所にまとまる |
| **削除が簡単** | フォルダごと削除すれば完了 |
| **オンボーディングが速い** | 「稟議は `src/ringis/` を見て」 |

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

### Screaming Architecture の欠点と対処法

**欠点1: 共通コードどこに置く？**

```
src/
├── catalog/
├── ordering/
└── shared/     # 共通コード → ここが肥大化しがち
```

**対処:** `shared/` は「2つ以上の機能で使われることが確定したもの」だけ。最初から共通化しない。

**欠点2: 機能間の依存が見えにくい**

```typescript
// ❌ catalog が ordering に依存していることに気づきにくい
import { OrderItem } from '../ordering/OrderItem';
```

**対処:** インポート時に明示的な依存を意識。循環依存は禁止。

**出典: "Layered Architecture vs Feature Folders"**
> "While Layered Architecture is safe and predictable, it led to slower delivery and higher cognitive load. After six months, onboarding became painful."

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

## 7.1 なぜ InMemory 実装なのか — 4つの代替案との比較

外部リソース（Repository等）のテストには4つの方法があります：

| 方法 | 概要 | 採用 |
|------|------|:----:|
| **① Mock ライブラリ** | `jest.mock()`, `mockito` で振る舞いを定義 | ❌ |
| **② Stub オブジェクト** | 固定値を返すだけの実装 | △ 限定的 |
| **③ InMemory 実装** | メモリ上で動作する完全な実装 | ✅ |
| **④ Test Containers** | Docker で本物のDBを起動 | △ 統合テスト用 |

---

#### ❌ 案① Mock ライブラリを採用しなかった理由

```typescript
// Mock ライブラリ方式
test('稟議を申請できる', async () => {
  const mockRepository = {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
  };
  
  const draft = new DraftRingi(id, data);
  await draft.submit(mockRepository, clock);
  
  expect(mockRepository.save).toHaveBeenCalledWith(/* ... */);
});
```

**問題1: 実装の詳細に依存する**

```typescript
// ❌ リファクタリングするとテストが壊れる
// Before: save を1回呼んでいた
expect(mockRepository.save).toHaveBeenCalledTimes(1);

// After: 内部でバッチ処理に変更 → save を2回呼ぶように
// テストは失敗するが、ビジネスロジックは正しい
```

**問題2: モックの設定漏れ**

```typescript
// ❌ findById をモック忘れ
const mockRepository = {
  save: jest.fn(),
  // findById: ... 忘れた！
};

// 実行すると undefined.then is not a function みたいなエラー
```

**問題3: モックが複雑になる**

```typescript
// ❌ 条件付きの返り値を設定
mockRepository.findById
  .mockResolvedValueOnce(ringi1)  // 1回目
  .mockResolvedValueOnce(ringi2)  // 2回目
  .mockResolvedValueOnce(null);   // 3回目
// 順番を覚えていないといけない
```

---

#### △ 案② Stub オブジェクト — 限定的に採用

```typescript
// Stub: 固定値を返すだけ
class StubRingiRepository implements RingiRepository {
  async save(ringi: Ringi): Promise<void> {
    // 何もしない
  }
  
  async findById(id: RingiId): Promise<Ringi | null> {
    return null;  // 常に null
  }
}
```

**利点:** シンプル

**問題: 柔軟性がない**

```typescript
// ❌ テストによって返り値を変えたい場合
// → Stub を複数作る必要がある

class StubReturnsRingi implements RingiRepository { ... }
class StubReturnsNull implements RingiRepository { ... }
class StubThrowsError implements RingiRepository { ... }
// Stub が増殖する
```

**Stub を許容する場合:**
- 成功ケースのみテストする場合
- Gateway（外部API）のテストで「常に成功」「常に失敗」を切り替えるだけの場合

---

#### ✅ 案③ InMemory 実装を採用した理由

```typescript
// InMemory: 本物と同じ振る舞いをメモリ上で
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
  
  count(): number {
    return this.storage.size;
  }
}
```

| メリット | 説明 |
|---------|------|
| **本物と同じ振る舞い** | save したものを findById で取得できる |
| **実装詳細に依存しない** | 内部でどう呼んでいるかは関係ない |
| **柔軟** | テストデータを自由にセットアップできる |
| **高速** | DBアクセスなし |

```typescript
// ✅ InMemory を使ったテスト
test('稟議を申請できる', async () => {
  const repository = new InMemoryRingiRepository();
  const draft = new DraftRingi(id, data);
  
  const submitted = await draft.submit(repository, clock);
  
  // 実際に保存されたことを確認
  const saved = await repository.findById(id);
  expect(saved).not.toBeNull();
  expect(saved.status).toBe('submitted');
});
```

---

#### △ 案④ Test Containers — 統合テスト用

```typescript
// Test Containers: Docker で本物のDBを起動
import { PostgreSqlContainer } from 'testcontainers';

let container: PostgreSqlContainer;
let repository: PostgresRingiRepository;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  repository = new PostgresRingiRepository(container.getConnectionUri());
});

afterAll(async () => {
  await container.stop();
});
```

**利点:** 本物のDBで動作確認

**問題:**
- **遅い**: コンテナ起動に数秒〜十数秒
- **環境依存**: Docker が必要
- **並列テスト困難**: ポート競合

**Test Containers を許容する場合:**
- 統合テスト・E2Eテスト
- 複雑なSQLクエリの検証
- DB固有機能（トランザクション分離レベル等）のテスト

---

### テスト種別と推奨アプローチ

| テスト種別 | Repository | Gateway | 推奨理由 |
|-----------|------------|---------|---------|
| **Unit Test** | InMemory | Stub | 高速、独立 |
| **Integration Test** | Test Containers | Sandbox環境 | 本物の振る舞い確認 |
| **E2E Test** | 本番相当DB | 本番相当API | 最終確認 |

---

## 7.2 テスト形状の議論 — Pyramid vs Trophy vs Honeycomb vs Ice Cream

テストをどのような「形」で構成すべきか。これは20年以上議論されているトピックです。

### 4つの主要なモデル

| モデル | 提唱者 | 形状 | 推奨比率 |
|--------|--------|------|---------|
| **① Test Pyramid** | Mike Cohn (2009) | △ ピラミッド | Unit 70% / Integration 20% / E2E 10% |
| **② Testing Trophy** | Kent C. Dodds (2018) | 🏆 トロフィー | Static < Unit < Integration > E2E |
| **③ Testing Honeycomb** | Spotify (2018) | 🍯 蜂の巣 | Implementation > Integration > Integrated |
| **④ Ice Cream Cone** | アンチパターン | 🍦 逆ピラミッド | E2E多い / Unit少ない（やってはいけない） |

---

### ① Test Pyramid（Mike Cohn, 2009）

```
        /\
       /E2E\        ← 少数（遅い、脆い）
      /------\
     /Integra-\     ← 中程度
    /---tion---\
   /-----------\
  /    Unit     \   ← 大量（速い、安定）
 /---------------\
```

**出典: "Succeeding with Agile" (Mike Cohn, 2009)**

**主張:**
- Unit テストを最も多く書け
- 上に行くほどテストは遅く、脆く、高コスト
- E2E は必要最低限に

**この考え方が生まれた背景:**
- 2009年当時、E2E テストは Selenium が主流で非常に遅かった
- CI/CD がまだ一般的ではなく、テスト時間が大きな問題だった

**批判（2018年以降）:**
- 「Unit テストばかり書いても、統合時に壊れる」
- 「Mockだらけのテストは実装詳細に依存しすぎ」

---

### ② Testing Trophy（Kent C. Dodds, 2018）

```
         🏆
        /  \
       / E2E \       ← 少数（重要なフロー）
      /--------\
     /          \
    / Integration \  ← 最も多く（自信を与える）
   /--------------\
  /                \
 /      Unit        \  ← 中程度（複雑なロジック）
/--------------------\
|      Static        |  ← 最初に（型、lint）
+--------------------+
```

**出典: Kent C. Dodds "Write tests. Not too many. Mostly integration."**

**主張:**
- Integration テストが最も「自信（confidence）」を与える
- Unit テストは「複雑なビジネスロジック」にのみ書く
- Mock を減らし、本物に近い環境でテスト

**具体例（React Testing Library）:**
```typescript
// ❌ Implementation detail（Kent C. Dodds が批判するスタイル）
test('ボタンクリックで state が変わる', () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);  // 内部 state をテスト
});

// ✅ Testing behavior（Kent C. Dodds が推奨するスタイル）
test('ボタンクリックでカウントが表示される', () => {
  render(<Counter />);
  fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
  // ユーザーが見るものをテスト
});
```

**批判:**
- 「Integration テストは遅い。CI が長くなる」
- 「バックエンドでは Unit テストの方が効率的なことが多い」

---

### ③ Testing Honeycomb（Spotify, 2018）

```
    +-------------------+
    |    Integrated     |  ← 全システム結合（少数）
    +-------------------+
    |                   |
    |   Integration     |  ← サービス間（中程度）
    |                   |
    +-------------------+
    |                   |
    |                   |
    |  Implementation   |  ← 単一サービス内（大量）
    |    (Unit-ish)     |
    |                   |
    +-------------------+
```

**出典: Spotify Engineering Blog "Testing of Microservices"**

**主張:**
- マイクロサービスでは「サービス間の契約」が重要
- 単体テストよりも「サービス内結合テスト」を重視
- Contract Testing（Pact等）でサービス間を検証

**特徴:**
- 「Unit Test」という言葉を避け「Implementation Test」と呼ぶ
- モノリスには適用しにくい

---

### ④ Ice Cream Cone（アンチパターン）

```
   \_______________/
    \   Manual    /   ← 手動テスト多い
     \___________/
      \  E2E   /      ← E2E 多い（遅い、脆い）
       \_______/
        \Int./        ← Integration 少ない
         \__/
          \/          ← Unit ほぼなし
```

**なぜアンチパターンか:**
- E2E は遅い → CI が30分、1時間かかる
- E2E は脆い → 無関係な変更で壊れる（flaky test）
- 手動テストは再現性がない
- バグの原因特定が困難（どこで壊れた？）

**こうなる原因:**
- 「とりあえず動くことを確認」でE2Eから書き始める
- Unit テストの書き方を知らない
- 「Unit テストは実装詳細のテストだから無駄」という誤解

---

### 本スキルの立場: Pyramid + Trophy のハイブリッド

| テスト種別 | 比率 | 対象 |
|-----------|------|------|
| **Static** | - | TypeScript 型チェック、ESLint |
| **Unit** | 50% | Pure Logic（Query, Transition）、複雑な計算 |
| **Integration** | 40% | Command + InMemory Repository |
| **E2E** | 10% | クリティカルパス（決済、認証）のみ |

**なぜこの比率か:**

1. **Unit 50%**: 本スキルは「Pure Logic を分離」するため、Unit テストが書きやすい
2. **Integration 40%**: InMemory 実装により高速な Integration テストが可能
3. **E2E 10%**: Playwright 等で重要フローのみ

```typescript
// Unit（50%）: Pure Logic
test('税額を計算できる', () => {
  const tax = new TaxOn(Money.of(1000), TaxRate.of(0.1));
  expect(tax.amount.value).toBe(100);
});

// Integration（40%）: Command + InMemory
test('稟議を申請できる', async () => {
  const repository = new InMemoryRingiRepository();
  const draft = new DraftRingi(id, data);
  
  await draft.submit(repository, clock);
  
  expect(await repository.findById(id)).not.toBeNull();
});

// E2E（10%）: クリティカルパスのみ
test('ユーザーが注文を完了できる', async ({ page }) => {
  await page.goto('/products');
  await page.click('text=カートに追加');
  await page.click('text=購入手続き');
  // ...
});
```

---

## 7.3 テストサイズ分類 — Google 方式 vs 従来方式

### 従来の分類: Unit / Integration / E2E

| 名称 | 定義 |
|------|------|
| Unit | 単一クラス/関数のテスト |
| Integration | 複数コンポーネントの結合テスト |
| E2E | システム全体のテスト |

**問題:** 定義が曖昧
- 「Unit」の範囲は？クラス1つ？モジュール1つ？
- 「Integration」でDBは使う？InMemory？

---

### Google Test Sizes: Small / Medium / Large

**出典: Google Testing Blog "Test Sizes"**

| Size | 制約 | 実行時間 | 外部リソース |
|------|------|---------|-------------|
| **Small** | 単一プロセス、単一スレッド | < 60秒 | ❌ 禁止 |
| **Medium** | 単一マシン | < 300秒 | localhost のみ |
| **Large** | 制限なし | 制限なし | 制限なし |

**Small Test の制約:**
- ネットワークアクセス禁止
- ファイルI/O禁止（または /tmp のみ）
- データベース禁止
- Sleep 禁止

**なぜこの分類が優れているか:**
- 「何をテストするか」ではなく「どういう制約か」で分類
- 明確な基準（曖昧さがない）
- CI での並列実行が容易（Small は完全並列可能）

---

### t-wada 流の解釈

**出典: t-wada（和田卓人）氏の講演・ブログ**

| Google | 実質的な意味 | 本スキルとの対応 |
|--------|-------------|-----------------|
| Small | 外部リソースなし、純粋なロジック | Query, Transition のテスト |
| Medium | localhost のDB、InMemory | Command + InMemory Repository |
| Large | 本物の外部サービス | E2E、Contract Test |

**t-wada 氏の主張:**
> 「テストのサイズは実行速度と信頼性のトレードオフ。Small を多く、Large を少なく」

---

### 本スキルでの適用

```typescript
// Small Test: 外部リソースなし
// Query, Transition は全て Small
test('税額計算', () => {
  expect(new TaxOn(Money.of(1000), TaxRate.of(0.1)).amount.value).toBe(100);
});

// Medium Test: InMemory Repository
// Command は Medium（localhost の「メモリDB」相当）
test('稟議申請', async () => {
  const repository = new InMemoryRingiRepository();
  await draft.submit(repository, clock);
  expect(await repository.findById(id)).not.toBeNull();
});

// Large Test: 本物のDB、外部API
// E2E、Testcontainers を使う統合テスト
test('決済フロー', async () => {
  const container = await new PostgreSqlContainer().start();
  // ...
});
```

---

## 7.4 TDD のスタイル — London School vs Detroit/Chicago School

### 2つの流派

| 流派 | 別名 | アプローチ | Mock の使い方 |
|------|------|-----------|--------------|
| **London School** | Mockist | Outside-in（外から内へ） | 積極的に使う |
| **Detroit/Chicago School** | Classicist | Inside-out（内から外へ） | 最小限に抑える |

---

### London School（Mockist）

**代表: Steve Freeman, Nat Pryce — "Growing Object-Oriented Software, Guided by Tests" (GOOS)**

**アプローチ:**
1. 外側（API/UI）から設計を始める
2. 内側のコンポーネントは Mock で代替
3. 徐々に内側を実装

```typescript
// London School: Repository を Mock
test('稟議を申請できる', async () => {
  const mockRepository = {
    save: jest.fn().mockResolvedValue(undefined),
  };
  
  const draft = new DraftRingi(id, data);
  await draft.submit(mockRepository, clock);
  
  expect(mockRepository.save).toHaveBeenCalledWith(
    expect.objectContaining({ id, status: 'submitted' })
  );
});
```

**長所:**
- 設計が API ファーストになる（使いやすいインターフェース）
- テストが高速（外部依存なし）
- 依存関係が明確になる

**短所:**
- Mock の設定が複雑になりがち
- 実装詳細（`save` が呼ばれたか）に依存
- リファクタリングでテストが壊れやすい

---

### Detroit/Chicago School（Classicist）

**代表: Kent Beck — "Test-Driven Development: By Example"**

**アプローチ:**
1. 内側（ドメインロジック）から設計を始める
2. 可能な限り本物のオブジェクトを使う
3. Mock は外部システム（DB、API）にのみ使う

```typescript
// Detroit School: InMemory Repository を使う
test('稟議を申請できる', async () => {
  const repository = new InMemoryRingiRepository();
  const draft = new DraftRingi(id, data);
  
  await draft.submit(repository, clock);
  
  const saved = await repository.findById(id);
  expect(saved).not.toBeNull();
  expect(saved!.status).toBe('submitted');
});
```

**長所:**
- テストが実装詳細に依存しない
- リファクタリングしてもテストが壊れにくい
- 「本当に保存された」ことを確認できる

**短所:**
- 設計が内部ロジックに引きずられる可能性
- 大きな結合テストになりがち

---

### 本スキルの立場: Detroit School + Pending Object の組み合わせ

**本スキルは Detroit School 寄り:**
- InMemory 実装を使う（Mock より本物に近い）
- 実装詳細（`save` が呼ばれたか）ではなく結果（保存された）を検証

**ただし Pending Object Pattern との相性で修正:**
- Outside-in の考え方も取り入れる（型で設計を駆動）
- `DraftRingi` → `SubmittedRingi` という型遷移がテストを導く

```typescript
// 本スキルのスタイル: Detroit + 型駆動
test('下書き稟議を申請すると、申請済み稟議が返る', async () => {
  const repository = new InMemoryRingiRepository();
  const draft = new DraftRingi(id, data);
  
  // 戻り値の型が SubmittedRingi であることがテストの本質
  const submitted: SubmittedRingi = await draft.submit(repository, clock);
  
  expect(submitted.submittedAt).toEqual(clock.now());
  expect(await repository.findById(id)).toEqual(submitted);
});
```

---

## 7.5 TDD 自体の是非 — "TDD is Dead" 論争

### 論争の経緯

**2014年: DHH（Ruby on Rails 作者）が "TDD is dead. Long live testing." を発表**

**出典: DHH's blog "TDD is dead. Long live testing." (2014)**

DHH の主張:
> "Test-first fundamentalism is like abstinence-only sex education: An unrealistic, ineffective morality campaign for self-loathing and shaming."

> "テストファースト原理主義は、禁欲主義のセックス教育のようなもの。非現実的で効果がなく、自己嫌悪と恥辱のキャンペーンだ"

---

### 主要な論点

#### DHH の批判

| 批判 | 説明 |
|------|------|
| **Test-induced design damage** | テストのために不自然な設計を強いられる |
| **過剰なモック** | モックだらけのテストは実装詳細に依存 |
| **遅いフィードバック** | テストを先に書くと開発が遅くなる |
| **教条主義** | 「TDD しないと悪い開発者」という空気 |

**DHH の代替案:**
- テストは書く。ただし「テストファースト」にこだわらない
- 統合テストを重視（Rails のシステムテスト）
- 設計はテストのためではなく、ドメインのために

---

#### Kent Beck の反論

**出典: Kent Beck, DHH, Martin Fowler による "Is TDD Dead?" 対談シリーズ (2014)**

Kent Beck の立場:
> "I practice TDD. I don't recommend TDD to others. It's like asking 'do you recommend tai chi?'"

> "私は TDD を実践する。他人に TDD を勧めはしない。『太極拳を勧めますか？』と聞かれているようなものだ"

**Beck の主張:**
- TDD は「スキル」であり「宗教」ではない
- 効果は個人差がある
- 強制すべきではないが、学ぶ価値はある

---

#### Martin Fowler の中立的見解

**Martin Fowler:**
> "The problem is not TDD itself, but TDD done poorly."

> "問題は TDD 自体ではなく、下手な TDD だ"

**Fowler が指摘する「下手な TDD」:**
- 実装詳細をテストする（Mock の乱用）
- テストのためだけに設計を歪める
- カバレッジ数値を目的化する

---

### "Test-induced design damage" とは

DHH が指摘する「テストが設計を壊す」例:

```ruby
# ❌ テストのために不自然な依存注入
class OrderProcessor
  def initialize(payment_gateway, email_service, inventory_checker)
    @payment_gateway = payment_gateway
    @email_service = email_service
    @inventory_checker = inventory_checker
  end
  
  def process(order)
    @inventory_checker.check(order)
    @payment_gateway.charge(order)
    @email_service.send_confirmation(order)
  end
end

# DHH の主張: 「これはテストのためだけの設計。実際のRailsアプリでは
# PaymentGateway.charge(order) と直接呼べばいい」
```

**反論（本スキルの立場）:**
- 依存注入は「テストのため」ではなく「変更容易性のため」
- ただし、フレームワークの流儀に従うことは許容する（NestJS の DI など）

---

### 本スキルの立場

| 観点 | 本スキルの立場 |
|------|---------------|
| **TDD 必須か** | ❌ 強制しない。ただし「テストを書く」は必須 |
| **テストファースト** | △ 推奨するが、後から書いても良い |
| **Mock の使用** | △ 最小限に。InMemory 実装を優先 |
| **カバレッジ目標** | △ 数値目標より「重要なロジックのカバー」を重視 |

**なぜ TDD を強制しないか:**

1. **スキルレベルの差**: TDD は習熟に時間がかかる。強制すると質が下がる
2. **探索的開発**: 新しい領域を探索するときは、先にコードを書いた方が早いことがある
3. **DHH の指摘は一理ある**: テストのために設計を歪めるのは本末転倒

**ただし以下は守る:**
- テストは必ず書く（後からでも）
- Pure Logic（Query, Transition）は Unit テストが容易なので書く
- Command は InMemory Repository で Integration テストを書く

---

## 7.6 依存分類別のテスト方法

| 分類 | テスト方法 | モック | 例 |
|------|-----------|:------:|-----|
| Pure Logic | 入力→出力を直接テスト | 不要 | TaxCalculator |
| Configured Logic | 設定を変えてテスト | 不要 | RateCalculator(rate: 0.1) |
| External Resource | InMemory実装を使用 | 必要 | Repository |
| Non-deterministic | 固定値を注入 | 必要 | Clock |

---

## 7.7 Test Data Factory

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

## 7.8 InMemory Repository

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

## 7.9 Gateway パターン

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

# Part 8: 適用判断ガイド — いつ何を使うべきか

## 8.1 CQRS — 90%のバックエンドには過剰

### CQRS とは

**CQRS（Command Query Responsibility Segregation）**とは、読み取り（Query）と書き込み（Command）を完全に分離するアーキテクチャです。

```
従来:
┌─────────────────┐
│   同じ Model    │ ← 読み書き両方
└─────────────────┘

CQRS:
┌─────────────────┐     ┌─────────────────┐
│  Write Model    │     │   Read Model    │
│  (Command側)    │     │   (Query側)     │
└─────────────────┘     └─────────────────┘
        ↓                       ↓
┌─────────────────┐     ┌─────────────────┐
│   Write DB      │ ──→ │    Read DB      │
│  (正規化)       │ sync│  (非正規化)     │
└─────────────────┘     └─────────────────┘
```

---

### なぜ CQRS が魅力的に見えるか

| 主張 | 説明 |
|------|------|
| **スケーラビリティ** | 読み取りと書き込みを独立してスケール |
| **最適化** | 読み取り用に非正規化した高速なモデル |
| **複雑なクエリ** | 集計・検索に特化したモデルを持てる |

---

### なぜ 90% のバックエンドには過剰か

**出典: Udi Dahan "CQRS – but different"**
> "CQRS is not a top-level architecture. It is a pattern that applies to a very specific slice of your system."

> "CQRS はトップレベルのアーキテクチャではない。システムの非常に特定の部分に適用されるパターンだ"

**問題1: 複雑さの爆発**

```
単純なCRUD（CQRSなし）:
- User モデル: 1つ
- Repository: 1つ
- テーブル: 1つ

CQRS適用後:
- UserWriteModel: 書き込み用
- UserReadModel: 読み取り用
- UserCommandRepository: 書き込み用
- UserQueryRepository: 読み取り用
- 同期処理: Write → Read の反映
- 2つのテーブル、または2つのDB
```

**問題2: Eventual Consistency の罠**

```typescript
// ❌ よくある問題: ユーザー登録直後に「ユーザーが見つからない」
async function registerUser(data: UserData) {
  await commandService.createUser(data);  // Write DB に保存
  
  redirect('/users/' + data.id);  // Read DB を参照
  // → "User not found" — 同期がまだ完了していない！
}
```

**出典: Martin Fowler "CQRS"**
> "For some situations, this kind of complexity is fine. For others, it's a significant burden that isn't worth the overhead."

> "状況によってはこの複雑さは問題ない。しかし他の多くの場合、オーバーヘッドに見合わない重大な負担になる"

**問題3: デバッグの困難**

「なぜ Read Model のデータが古い？」
- イベントが失われた？
- 同期が遅延している？
- バグ？

---

### CQRS を採用すべき場合

| 状況 | 採用推奨度 |
|------|:--------:|
| 読み取りと書き込みのスケールが10倍以上違う | ✅ |
| 複雑な検索・集計が頻繁にある（BIダッシュボード等） | ✅ |
| イベントソーシングを既に採用している | ✅ |
| 通常の CRUD アプリ | ❌ |
| チームが CQRS 未経験 | ❌ |
| MVP / プロトタイプ | ❌ |

---

### 本スキルとの関係

本スキルの「4分類」は **CQRS ではない**:

| 本スキル | CQRS |
|---------|------|
| 同じ Repository を使う | 別々の Repository（Write/Read） |
| 同じ DB | 別々の DB（または別テーブル） |
| 即時一貫性 | Eventual Consistency |
| 責務の分類 | データストアの分離 |

本スキルの Command/Query は「責務の明確化」であり、CQRSのような「物理的分離」ではありません。

---

## 8.2 DDD — 5% の複雑なアプリ向け

### DDD とは

**DDD（Domain-Driven Design）**とは、Eric Evans が2003年に提唱した、複雑なビジネスドメインに対処するための設計手法です。

**主要な概念:**
- Ubiquitous Language（ユビキタス言語）
- Bounded Context（境界づけられたコンテキスト）
- Aggregate（集約）
- Entity / Value Object
- Domain Event
- Repository

---

### なぜ DDD が魅力的に見えるか

| 主張 | 説明 |
|------|------|
| **ビジネスとコードの一致** | ドメインエキスパートと同じ言葉で話せる |
| **複雑さの管理** | Bounded Context で複雑さを分割 |
| **変更への強さ** | ビジネスルールがコードに明示される |

---

### なぜ 95% のアプリには過剰か

**出典: Nick Tune "DDD is Overrated"**
> "Most systems are simple CRUD apps where DDD adds unnecessary complexity. Reserve DDD for genuinely complex domains."

> "ほとんどのシステムは単純な CRUD アプリであり、DDD は不必要な複雑さを追加する。DDD は本当に複雑なドメインのために取っておけ"

**問題1: 「ドメインエキスパート」がいない**

```
DDD の前提:
- ドメインエキスパートがいる
- エキスパートと開発者が頻繁に対話する
- ユビキタス言語を一緒に作る

現実の多くのプロジェクト:
- ドメインエキスパート = 忙しい営業部長（週1回30分だけ）
- 要件 = Excel の仕様書
- 「ユビキタス言語」を作る時間がない
```

**問題2: CRUD で十分なケースが多い**

```typescript
// ❌ DDD で設計すると...
class User extends AggregateRoot {
  private constructor(
    private readonly id: UserId,
    private readonly email: Email,
    private readonly profile: UserProfile
  ) {
    super();
  }
  
  static create(command: CreateUserCommand): User {
    const user = new User(
      UserId.generate(),
      Email.of(command.email),
      UserProfile.empty()
    );
    user.addDomainEvent(new UserCreatedEvent(user));
    return user;
  }
  
  updateProfile(command: UpdateProfileCommand): void {
    this.profile.update(command);
    this.addDomainEvent(new ProfileUpdatedEvent(this));
  }
}

// ✅ CRUD で十分なケース
class User {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly name: string
  ) {}
}

await db.users.insert({ id, email, name });
```

**問題3: Aggregate 設計の罠**

「Aggregate の境界はどこ？」という議論で1週間が過ぎる。

```typescript
// Order と OrderItem は同じ Aggregate？
// User と Order の関係は？
// Payment は Order の一部？別 Aggregate？

// → 正解がない。チームで延々と議論になる
```

---

### DDD を採用すべき場合

| 状況 | 採用推奨度 |
|------|:--------:|
| ドメインエキスパートと頻繁に対話できる | ✅ |
| ビジネスルールが複雑（金融、保険、医療） | ✅ |
| 長期運用（5年以上）が確定している | ✅ |
| 単純な CRUD（管理画面、ブログ等） | ❌ |
| MVP / プロトタイプ | ❌ |
| チームが DDD 未経験 | △ （学習コストを覚悟） |

---

### 本スキルとの関係

本スキルは **DDD の一部を取り入れている**:

| 概念 | 本スキル | 完全な DDD |
|------|---------|-----------|
| Value Object | ✅ 採用 | ✅ |
| Entity | △ 部分的（Pending Object） | ✅ |
| Repository | ✅ 採用 | ✅ |
| Aggregate | ❌ 不採用 | ✅ |
| Bounded Context | ❌ 不採用 | ✅ |
| Domain Event | ❌ 不採用 | ✅ |
| Ubiquitous Language | △ 意識するが厳密ではない | ✅ |

**本スキルの立場:** DDD の「良いとこ取り」。Value Object と Repository は汎用的に有用。Aggregate や Bounded Context は「本当に必要な時だけ」。

---

## 8.3 Microservices vs Monolith vs Modular Monolith

### 3つのアーキテクチャ

| アーキテクチャ | 概要 | デプロイ単位 |
|--------------|------|-------------|
| **Monolith** | 単一のコードベース、単一のデプロイ | 1つ |
| **Microservices** | 機能ごとに独立したサービス | 多数 |
| **Modular Monolith** | 単一デプロイだが内部はモジュール分離 | 1つ |

---

### なぜ Microservices が魅力的に見えるか

| 主張 | 説明 |
|------|------|
| **独立デプロイ** | 1つのサービスだけ更新できる |
| **技術選択の自由** | サービスごとに言語・DBを選べる |
| **スケーラビリティ** | 必要なサービスだけスケール |
| **障害分離** | 1つが落ちても全体は動く |

---

### なぜ多くのケースで失敗するか

**出典: Amazon Prime Video "Scaling up the Prime Video audio/video monitoring service" (2023)**

> "Microservices architecture wasn't delivering the cost savings we expected. Moving to a monolith reduced our infrastructure cost by over 90%."

> "マイクロサービスアーキテクチャは期待したコスト削減を達成できなかった。モノリスに移行することで、インフラコストを90%以上削減できた"

**Prime Video の事例:**
- マイクロサービスで構築 → AWS Step Functions + Lambda
- コストが高すぎた（サービス間通信、オーケストレーション）
- モノリスに統合 → コスト 90% 削減

**出典: Istio (Google) "Istio's move to a monolithic architecture"**

> "The original microservices architecture, while theoretically pure, created operational complexity that slowed down development."

> "元のマイクロサービスアーキテクチャは理論的には純粋だったが、開発を遅くする運用上の複雑さを生み出した"

---

### Microservices の隠れたコスト

| コスト | 説明 |
|--------|------|
| **分散システムの複雑さ** | ネットワーク遅延、部分障害、冪等性 |
| **データ一貫性** | 分散トランザクション、Saga パターン |
| **運用負荷** | サービスごとに監視、ログ、デプロイパイプライン |
| **テストの複雑さ** | サービス間の結合テスト、Contract Testing |
| **チーム調整** | サービス間 API の変更調整 |

```
❌ よくある失敗パターン:

1. 「マイクロサービスにしよう！」
2. 5人のチームで10個のサービスを作る
3. 1人が2サービス担当 → 「独立したチーム」の利点なし
4. サービス間の調整に時間を取られる
5. 結局モノリスより遅い
```

---

### Modular Monolith という選択肢

**出典: Shopify Engineering "Deconstructing the Monolith"**

> "We didn't go microservices. We modularized our monolith. Each module has clear boundaries and can be extracted to a service if needed."

> "マイクロサービスにはしなかった。モノリスをモジュール化した。各モジュールは明確な境界を持ち、必要に応じてサービスとして抽出できる"

```
Modular Monolith:
┌─────────────────────────────────────┐
│            単一アプリケーション        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │ Catalog │ │ Orders  │ │Payments │ │
│  │ Module  │ │ Module  │ │ Module  │ │
│  └─────────┘ └─────────┘ └─────────┘ │
│       ↓           ↓           ↓      │
│  ┌─────────────────────────────────┐ │
│  │         共有 Database           │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘

モジュール間は明確なインターフェースで通信
必要になったら Module → Service に抽出可能
```

---

### 採用判断ガイド

| 状況 | 推奨アーキテクチャ |
|------|------------------|
| スタートアップ、MVP | Monolith |
| チーム5人以下 | Monolith |
| チーム10-50人、複数ドメイン | Modular Monolith |
| チーム50人以上、独立したプロダクト | Microservices |
| 特定機能だけ別スケールが必要 | Monolith + 一部 Service 分離 |
| 「Microservices がトレンドだから」 | ❌ Monolith で始めろ |

---

### 本スキルとの関係

本スキルの Screaming Architecture は **Modular Monolith と相性が良い**:

```
✅ 本スキルの推奨構造（Screaming Architecture）
src/
├── catalog/      # 将来 Service に分離可能
├── ordering/     # 将来 Service に分離可能
├── payments/     # 将来 Service に分離可能
└── shared/       # 共通コード（分離しない）
```

最初から「分離可能な構造」で作っておけば、本当に必要になった時だけ Microservices に移行できます。

---

## 8.4 コメント vs 自己文書化コード

### 2つの考え方

| 考え方 | 主張 |
|--------|------|
| **自己文書化コード派** | 良いコードはコメント不要。コメントは「コードの失敗」 |
| **コメント重視派** | WHY は常にコメントで書くべき |

---

### Uncle Bob の主張

**出典: Robert C. Martin "Clean Code" (2008)**

> "Comments are always failures. We must have them because we cannot always figure out how to express ourselves without them, but their use is not a cause for celebration."

> "コメントは常に失敗である。コメントなしで自分を表現する方法が分からないときに使わざるを得ないが、その使用は祝福すべきことではない"

**Uncle Bob の立場:**
- 良い名前を付ければコメントは不要
- コメントは嘘をつく（コードと乖離する）
- コメントは保守されない

```java
// ❌ コメントで説明（Uncle Bob が批判するスタイル）
// Check if the user is eligible for the discount
if (user.purchaseCount > 10 && user.memberSince.isBefore(oneYearAgo)) {
  applyDiscount();
}

// ✅ 自己文書化（Uncle Bob が推奨するスタイル）
if (user.isEligibleForLoyaltyDiscount()) {
  applyDiscount();
}
```

---

### 批判と反論

**問題: WHY は名前だけでは表現できない**

```typescript
// ✅ これは自己文書化できる（WHAT）
function calculateTax(price: Money, rate: TaxRate): Money {
  return price.multiply(rate.value);
}

// ❌ これは自己文書化では表現できない（WHY）
// なぜ 1.08 ではなく 1.1 なのか？
// → 2024年の法改正で税率が変わったから
// → この情報はメソッド名では表現できない
```

**出典: Jeff Atwood "Coding Horror" - "Code Tells You How, Comments Tell You Why"**

> "Code can only tell you HOW the program works. Comments can tell you WHY."

> "コードは HOW（どう動くか）しか伝えられない。コメントは WHY（なぜそうするか）を伝えられる"

---

### 本スキルの立場

| 種類 | コメント | 理由 |
|------|:------:|------|
| **WHAT（何をしているか）** | ❌ 不要 | コード自体で表現すべき |
| **HOW（どう動くか）** | ❌ 不要 | コード自体で表現すべき |
| **WHY（なぜそうするか）** | ✅ 必要 | コードでは表現できない |
| **WARNING（注意事項）** | ✅ 必要 | 落とし穴の警告 |
| **TODO** | △ 一時的 | Issue に移行すべき |

---

### 良いコメントの例

```typescript
// ✅ WHY: ビジネス上の理由
// 2024年4月の法改正により、消費税率が10%から11%に変更
// 施行日: 2024-04-01
// 参照: https://example.com/tax-law-2024
const TAX_RATE = 0.11;

// ✅ WARNING: 落とし穴の警告
// ⚠️ この API は1秒あたり10リクエストの制限がある
// 制限を超えると 429 が返る
// 参照: https://api.example.com/docs/rate-limits
await externalApi.fetch(data);

// ✅ WHY: 非自明な設計判断
// なぜ Redis ではなく PostgreSQL をキャッシュに使うのか:
// 1. 既存インフラで Redis がない
// 2. キャッシュ更新頻度が低い（1日1回）
// 3. PostgreSQL の UNLOGGED TABLE で十分な性能
class PostgresCacheRepository implements CacheRepository {
  // ...
}
```

---

### 悪いコメントの例

```typescript
// ❌ WHAT: コードを読めば分かる
// ユーザーを取得する
const user = await userRepository.findById(id);

// ❌ 嘘のコメント（コードと乖離）
// 税率10%で計算
const tax = price * 0.11;  // 実際は11%

// ❌ コメントアウトされたコード
// function oldCalculation() {
//   return price * 0.08;
// }

// ❌ 意味のないコメント
// ----------------
// User Class
// ----------------
class User {
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
