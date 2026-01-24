# WHY: Strict Refactoring Skill 解説書

> **対象読者:** プログラミング経験1000時間程度のエンジニア
> **目的:** 各ルールの「なぜ」を理解し、違和感なく適用できるようになること

---

## 登場人物

本書では、設計判断の議論を分かりやすくするため、以下の架空の人物が登場します。

| キャラクター | 役割 | 主張する立場 |
|-------------|------|-------------|
| **ミノ駆動さん** | DDD/設計の権威 | 「もっと厳格に」派 |
| **プラグマティック田中** | 実務派シニア | 「現実的に」派 |
| **関数型山田** | FP推進派 | 「関数型で解決」派 |
| **レガシー佐藤** | 保守派 | 「今のままで」派 |
| **新人の鈴木** | 学習中のエンジニア | 質問役 |

---

# Part 0: 前提知識

## 0.1 なぜ設計ルールが必要か

### 0.1.1 「動くコード」と「良いコード」の違い

プログラミングを始めたばかりの頃、私たちは「動くコード」を書くことに集中します。
そして、動けば成功です。これは正しいアプローチです。

しかし、ある程度経験を積むと、こんな場面に遭遇します：

```typescript
// 3ヶ月前に自分が書いたコード
function processOrder(order, user, settings, flags) {
  if (flags.isSpecial) {
    if (user.isPremium) {
      if (settings.allowDiscount) {
        // ... 50行のネストしたロジック
      } else {
        // ... 30行の別のロジック
      }
    } else {
      // ... さらに30行
    }
  } else {
    // ... 100行
  }
}
```

「これ、どこを直せばいいんだっけ...？」

**動くコード**と**良いコード**の違いは、**変更のしやすさ**にあります。

| 観点 | 動くコード | 良いコード |
|------|-----------|-----------|
| 初回開発 | 速い | やや遅い |
| バグ修正 | 困難（影響範囲不明） | 容易（責務が明確） |
| 機能追加 | 困難（どこに追加すべきか不明） | 容易（拡張ポイントが明確） |
| チーム開発 | 困難（各自が独自スタイル） | 容易（共通ルールがある） |
| 引き継ぎ | 困難（書いた本人にしか分からない） | 容易（構造が予測可能） |

### 0.1.2 技術的負債とは

**技術的負債（Technical Debt）**とは、「今は楽だけど、後で苦労する」選択の積み重ねです。

借金と同じで、少額なら問題ありませんが、積み重なると返済（リファクタリング）が困難になります。

**技術的負債の具体例：**

| 負債の種類 | 今の楽さ | 後の苦労 |
|-----------|---------|---------|
| コピペコード | すぐ動く | 同じ修正を複数箇所に適用 |
| マジックナンバー | 説明不要で書ける | 「86400って何？」 |
| 巨大クラス | 分割を考えなくていい | 変更の影響範囲が不明 |
| テストなし | 開発速度が速い | リファクタリング不可能 |
| ドキュメントなし | 書く時間節約 | オンボーディングに1ヶ月 |

### 0.1.3 設計ルールの価値

設計ルールは「制約」ではなく「ガードレール」です。

```
❌ 「ルールがあると自由に書けない」
✅ 「ルールがあるから迷わず書ける」
```

**設計ルールがあると：**

1. **判断の負荷が減る** - 「このケースはどう書くべきか？」に即答できる
2. **コードレビューが楽になる** - 「ルールに沿っているか」で判断できる
3. **チームの共通言語ができる** - 「これはCommandだから...」で通じる
4. **新メンバーがキャッチアップしやすい** - 予測可能なコードベース

### 🎭 架空対話: 「ルールなんて窮屈では？」

**新人の鈴木:** 「設計ルールって、自由な発想を制限しませんか？」

**プラグマティック田中:** 「いい質問だね。逆に聞くけど、交通ルールがなかったらどうなる？」

**新人の鈴木:** 「めちゃくちゃになりますね...」

**プラグマティック田中:** 「そう。でも交通ルールがあっても、どこへ行くかは自由だよね。設計ルールも同じ。『どう書くか』は決まるけど、『何を作るか』は自由なんだ。」

**ミノ駆動さん:** 「むしろ、ルールがあるからこそ『どう書くか』に時間を使わず、『何を作るか』に集中できます。」

**関数型山田:** 「Haskellなんて、型システムという強力なルールがあるからこそ、安全にプログラミングできるんですよ。」

---

## 0.2 OOP の基礎概念（復習）

### 0.2.1 クラスとは

**クラス**は「データ」と「そのデータを操作する振る舞い」をまとめたものです。

```typescript
// ❌ データと振る舞いが分離
const userData = { name: "田中", age: 30 };
function isAdult(user) { return user.age >= 20; }
function greet(user) { return `こんにちは、${user.name}さん`; }

// ✅ データと振る舞いが一体
class User {
  constructor(readonly name: string, readonly age: number) {}
  
  isAdult(): boolean { return this.age >= 20; }
  greet(): string { return `こんにちは、${this.name}さん`; }
}
```

**なぜクラスにまとめるのか：**

| 分離した場合 | まとめた場合 |
|-------------|-------------|
| `userData`を変更 → どの関数が壊れる？ | `User`クラスを見れば全て分かる |
| 関数が増えると管理困難 | クラスにメソッドを追加するだけ |
| 「これはUserに関する関数？」が不明確 | `user.メソッド()`で明確 |

### 0.2.2 インターフェースとは

**インターフェース**は「契約」です。「このメソッドを持っていること」を保証します。

```typescript
// インターフェース = 契約
interface PaymentMethod {
  pay(amount: Money): Promise<PaymentResult>;
}

// 契約を守る実装クラスたち
class CreditCard implements PaymentMethod {
  async pay(amount: Money): Promise<PaymentResult> {
    // クレジットカード決済の実装
  }
}

class BankTransfer implements PaymentMethod {
  async pay(amount: Money): Promise<PaymentResult> {
    // 銀行振込の実装
  }
}

// 使う側は「契約」だけ知っていればいい
class Checkout {
  async complete(payment: PaymentMethod, amount: Money) {
    return payment.pay(amount);  // どの実装かは知らない
  }
}
```

**インターフェースの価値：**

1. **実装の詳細を隠せる** - 使う側は「pay()が呼べる」だけ知っていればいい
2. **実装を差し替えられる** - テスト時はモック、本番は本物
3. **新しい実装を追加できる** - 既存コードを変更せずに拡張

### 0.2.3 継承とは（そしてなぜ避けるべきか）

**継承**は「親クラスの機能を子クラスが引き継ぐ」仕組みです。

```typescript
// 継承の例
class Animal {
  eat() { console.log("食べる"); }
}

class Dog extends Animal {
  bark() { console.log("ワン"); }
}

const dog = new Dog();
dog.eat();  // 親のメソッドが使える
dog.bark(); // 自分のメソッド
```

**継承の問題点：**

```typescript
// 問題: ペンギンは鳥だが飛べない
class Bird {
  fly() { console.log("飛ぶ"); }
}

class Penguin extends Bird {
  fly() { throw new Error("ペンギンは飛べません"); }  // 😱
}
```

| 継承の問題 | 説明 |
|-----------|------|
| **脆い基底クラス問題** | 親を変更すると全ての子が壊れる可能性 |
| **is-a関係の誤用** | 「ペンギンは鳥」でも「飛ぶ」は継承できない |
| **多重継承の禁止** | 多くの言語で1つの親しか持てない |
| **実装の強制** | 親のprivateメソッドを使った実装に依存してしまう |

**本スキルでは「継承禁止、インターフェース優先」を採用します。**
（詳細は Part 6 で解説）

### 0.2.4 カプセル化とは

**カプセル化**は「内部の詳細を隠し、公開するものを制限する」ことです。

```typescript
// ❌ カプセル化なし: 外部から直接変更できてしまう
class BankAccount {
  balance = 0;  // publicなので外部から変更可能
}

const account = new BankAccount();
account.balance = -1000000;  // 不正な状態に！

// ✅ カプセル化あり: 変更は制御されたメソッド経由
class BankAccount {
  private _balance = 0;
  
  get balance(): number { return this._balance; }
  
  withdraw(amount: number): void {
    if (amount > this._balance) {
      throw new Error("残高不足");
    }
    this._balance -= amount;
  }
}
```

**カプセル化の価値：**

1. **不正な状態を防げる** - 残高がマイナスにならない
2. **変更の影響を限定できる** - 内部実装を変えても外部に影響なし
3. **テストしやすい** - 公開メソッドだけテストすればいい

### 0.2.5 依存性注入（DI）とは

**依存性注入**は「クラスが必要とするもの（依存）を外部から渡す」ことです。

```typescript
// ❌ 依存が内部で生成される（テスト困難）
class OrderService {
  private db = new PostgresDatabase();  // 内部で生成
  
  async getOrder(id: string) {
    return this.db.query("SELECT * FROM orders WHERE id = ?", [id]);
  }
}
// テスト時も本物のDBに接続してしまう！

// ✅ 依存を外部から注入（テスト容易）
class OrderService {
  constructor(private db: Database) {}  // 外部から渡される
  
  async getOrder(id: string) {
    return this.db.query("SELECT * FROM orders WHERE id = ?", [id]);
  }
}

// 本番
const service = new OrderService(new PostgresDatabase());

// テスト
const mockDb = { query: jest.fn().mockResolvedValue([...]) };
const service = new OrderService(mockDb);
```

**DIの価値：**

| 内部生成 | 外部注入 |
|---------|---------|
| テストで本物のDBが必要 | テストでモックを使える |
| 実装を変更するとクラスを修正 | 実装を変更しても注入するだけ |
| 依存が隠れている | 依存が明示的 |

---

## 0.3 関数型プログラミングの基礎

### 0.3.1 純粋関数とは

**純粋関数**は以下の2つの条件を満たす関数です：

1. **同じ入力には常に同じ出力** - ランダム性や外部状態に依存しない
2. **副作用がない** - 外部の状態を変更しない

```typescript
// ✅ 純粋関数の例
function add(a: number, b: number): number {
  return a + b;  // 常に同じ結果、何も変更しない
}

function calculateTax(price: number, rate: number): number {
  return price * rate;  // 常に同じ結果、何も変更しない
}

// ❌ 純粋でない関数の例
let total = 0;
function addToTotal(amount: number): number {
  total += amount;  // 外部変数を変更（副作用）
  return total;
}

function getRandomPrice(): number {
  return Math.random() * 100;  // 同じ入力でも結果が違う
}

function logAndReturn(value: number): number {
  console.log(value);  // 副作用（画面出力）
  return value;
}
```

**純粋関数の価値：**

| 純粋でない関数 | 純粋関数 |
|--------------|---------|
| テスト結果が不安定 | テスト結果が常に同じ |
| 呼び出し順序が重要 | どの順番で呼んでもOK |
| 並列実行が危険 | 安全に並列実行できる |
| デバッグ困難 | 入力→出力を見るだけ |

### 0.3.2 副作用とは

**副作用**とは、関数の外部に影響を与えることです。

| 副作用の種類 | 例 |
|------------|-----|
| **変数の変更** | グローバル変数を書き換える |
| **I/O操作** | ファイル読み書き、画面出力 |
| **DB操作** | データの読み取り/書き込み |
| **ネットワーク** | API呼び出し、メール送信 |
| **時間依存** | 現在時刻の取得 |
| **乱数** | ランダム値の生成 |

**副作用の問題点：**

```typescript
// この関数は何をする？
async function processOrder(orderId: string) {
  const order = await db.getOrder(orderId);      // 副作用: DB読み取り
  order.status = "processing";                    // 副作用: 状態変更
  await db.saveOrder(order);                      // 副作用: DB書き込み
  await emailService.send(order.customerEmail);   // 副作用: メール送信
  console.log("Order processed:", orderId);       // 副作用: ログ出力
  return order;
}

// テストするには:
// - DBのモックが必要
// - メールサービスのモックが必要
// - console.logを抑制する必要
// - 実行するたびにDBの状態が変わる
```

**本スキルのアプローチ:**
- 副作用を「Command」に集約する
- 副作用のない処理は「Query」「Transition」として分離する
- テストしやすく、理解しやすいコードになる

### 0.3.3 イミュータビリティとは

**イミュータビリティ（不変性）**とは、一度作ったオブジェクトを変更しないことです。

```typescript
// ❌ ミュータブル（可変）: オブジェクトを直接変更
class MutableUser {
  name: string;
  age: number;
  
  birthday() {
    this.age++;  // 自分自身を変更
  }
}

const user = new MutableUser("田中", 30);
user.birthday();  // userが変わってしまった！

// ✅ イミュータブル（不変）: 新しいオブジェクトを返す
class ImmutableUser {
  constructor(readonly name: string, readonly age: number) {}
  
  birthday(): ImmutableUser {
    return new ImmutableUser(this.name, this.age + 1);  // 新しいインスタンス
  }
}

const user = new ImmutableUser("田中", 30);
const olderUser = user.birthday();  // userは変わらない、新しいオブジェクトができる
```

**イミュータビリティの価値：**

| ミュータブル | イミュータブル |
|------------|--------------|
| 「いつ変わったか」が追跡困難 | 変わらないので追跡不要 |
| 複数箇所で共有すると危険 | 安全に共有できる |
| 履歴を残すには工夫が必要 | 自然と履歴が残る |
| 並列処理で競合の可能性 | 競合なし |

### 🎭 架空対話: 「毎回新しいオブジェクトを作るのは無駄では？」

**レガシー佐藤:** 「毎回newするとメモリがもったいないのでは？」

**関数型山田:** 「現代のガベージコレクタは優秀です。ほとんどの場合、心配無用ですよ。」

**プラグマティック田中:** 「確かに、ホットパス（大量にループする箇所）では注意が必要だけど、それは計測してから最適化すればいい。まずは正しく書くことが大事。」

**ミノ駆動さん:** 「むしろ、ミュータブルなコードのバグ調査にかかる時間の方が、CPU時間より遥かに高コストです。」

---

## 0.4 本スキルの哲学

### 0.4.1 「OOP主軸 + 関数型の良いとこ取り」

本スキルは、純粋なOOPでも純粋な関数型でもありません。

**両方の良いところを取り入れています：**

| 取り入れた概念 | 出典 | 本スキルでの適用 |
|--------------|------|-----------------|
| クラスによる責務の明確化 | OOP | 4分類（Command/Query/...） |
| インターフェースによる抽象化 | OOP | 継承禁止、Interface優先 |
| 純粋関数 | FP | Query, Transitionは純粋関数 |
| イミュータビリティ | FP | 変更時は新しいオブジェクトを返す |
| Result型 | FP (Rust, Haskell) | エラー処理 |

**取り入れなかった概念：**

| 取り入れなかった概念 | 理由 |
|-------------------|------|
| 継承 | 脆い基底クラス問題、テスト困難 |
| モナド変換子 | 学習コストが高すぎる |
| 高度な型レベルプログラミング | TypeScriptの限界、チーム理解度 |

### 0.4.2 対象言語と非対象言語

**対象言語:**
- Java, Kotlin, Scala
- C#, F#
- TypeScript, JavaScript
- Python
- Swift
- Go
- Rust

**非対象言語（純粋関数型言語）:**
- Haskell
- Elixir
- Clojure
- Erlang

**なぜ純粋関数型言語は対象外か：**

純粋関数型言語では、本スキルの多くのルールが「そもそも言語仕様で強制される」か「全く異なるアプローチが適切」だからです。

```haskell
-- Haskell: そもそも変数は変更できない（言語レベルでイミュータブル）
-- Haskell: 副作用は型で明示される（IOモナド）
-- Haskell: パターンマッチが標準（switchとは別物）
```

### 0.4.3 ルールの優先順位

本スキルのルールは「絶対」ではありません。以下の優先順位があります：

```
1. 言語/フレームワークの構文制約
   ↓ （これを変えることはできない）
2. 本スキルのルール
   ↓ （原則として従う）
3. プロジェクト固有のルール
   ↓ （チームで合意したもの）
4. 個人の好み
   （最も優先度が低い）
```

**フレームワーク制約の例（NestJS）:**

```typescript
// 本スキルのルール: Repositoryはメソッド引数で受け取る
class DraftRingi {
  submit(repository: RingiRepository) { ... }
}

// NestJSの制約: @Injectable()でDIを使う
// → 本スキルでは「NestJSを使う場合はDIを許容」と明記
@Injectable()
class SubmitRingiUseCase {
  constructor(private readonly repository: RingiRepository) {}  // OK
}
```

### 0.4.4 「いつ適用しないか」の重要性

**本スキルは「いつ適用しないか」も明記しています。**

盲目的にルールに従うのではなく、「なぜこのルールがあるか」を理解し、適用すべきでない場面を見極めることが重要です。

| ルール | 適用しない場面 |
|-------|--------------|
| Polymorphism | 分岐が2つで、値の選択のみの場合 |
| 完全コンストラクタ | DTOや設定オブジェクト |
| Result型 | インフラ層のエラー（例外で伝播） |
| クラス分類 | 数行の単純なユーティリティ関数 |

### 🎭 架空対話: 「ルールを破っていいの？」

**新人の鈴木:** 「『適用しない場面』があるなら、ルールの意味がないのでは？」

**ミノ駆動さん:** 「良い質問です。ルールを『知った上で破る』のと『知らずに破る』のは全く違います。」

**プラグマティック田中:** 「例えば、交通ルールでも緊急車両は赤信号を通過できる。でもそれは『ルールを理解した上で、正当な理由がある場合』だよね。」

**関数型山田:** 「プログラミングでも同じです。『なぜこのルールがあるか』を理解していれば、『この場面では適用しない方が良い』と判断できます。」

**本スキル:** 「だからこそ、本書では各ルールの『なぜ』を詳しく説明しています。理解した上で適用してください。」

---

## 0.5 本書の読み方

### 各セクションの構成

本書の各セクションは、以下の構成で統一されています：

```
## X.X [ルール名]

### 📚 前提知識
このセクションを読む前に理解しておくべきこと

### 問題提起
このルールがないとどうなるか（具体的な問題）

### 代替アプローチ比較
| アプローチ | 長所 | 短所 | 本スキルでの扱い |
|-----------|------|------|-----------------|

### 🎭 架空対話
異なる立場からの議論

### なぜこの選択か
採用理由の詳細

### いつ例外を許容するか
適用しない場面

### 実装例
具体的なコード
```

### 推奨する読み順

**初学者（プログラミング1000時間程度）:**
1. Part 0（本章）を通読
2. Part 1（4分類）をじっくり読む
3. 以降は必要に応じて参照

**中級者（設計パターンを学び始めた方）:**
1. Part 0 を軽く復習
2. Part 1-3 を重点的に
3. Part 5（エラー処理）を実践

**上級者（設計経験豊富な方）:**
1. 代替アプローチ比較表を中心に確認
2. 自分の知っているパターンとの違いを理解
3. 「いつ例外を許容するか」を確認

---

# Part 1: 4分類（Command / Transition / Query / ReadModel）

## 📚 前提知識

**必須:**
- クラスとメソッドの基本
- 「副作用」の意味（0.3.2節で解説済み）

**推奨:**
- CQS（Command Query Separation）の概念
- 単体テストの経験

---

## 1.1 なぜ分類が必要か

### 問題提起: 「何でもできるクラス」の末路

以下は、実際のプロジェクトでよく見かけるコードです：

```typescript
// ❌ 典型的な「何でもできる」クラス
class OrderService {
  constructor(
    private db: Database,
    private emailService: EmailService,
    private inventoryApi: InventoryApi,
    private paymentGateway: PaymentGateway
  ) {}

  async processOrder(orderId: string, userId: string): Promise<Order> {
    // 1. DBから注文を取得（ReadModel的）
    const order = await this.db.query(
      'SELECT * FROM orders WHERE id = ?', 
      [orderId]
    );
    
    // 2. ユーザー権限チェック（Query的）
    const user = await this.db.query(
      'SELECT * FROM users WHERE id = ?', 
      [userId]
    );
    if (user.role !== 'admin' && order.userId !== userId) {
      throw new Error('権限がありません');
    }
    
    // 3. 在庫チェック（外部API呼び出し）
    for (const item of order.items) {
      const stock = await this.inventoryApi.getStock(item.productId);
      if (stock.quantity < item.quantity) {
        throw new Error(`在庫不足: ${item.productId}`);
      }
    }
    
    // 4. 支払い処理（外部API呼び出し + 副作用）
    const paymentResult = await this.paymentGateway.charge(
      order.totalAmount,
      order.paymentMethod
    );
    if (!paymentResult.success) {
      throw new Error('決済失敗');
    }
    
    // 5. 注文確定（Command的）
    await this.db.execute(
      'UPDATE orders SET status = ?, payment_id = ? WHERE id = ?',
      ['confirmed', paymentResult.transactionId, orderId]
    );
    
    // 6. 在庫減算（外部API呼び出し + 副作用）
    for (const item of order.items) {
      await this.inventoryApi.decreaseStock(item.productId, item.quantity);
    }
    
    // 7. メール送信（副作用）
    await this.emailService.send(
      user.email,
      '注文確定のお知らせ',
      `注文番号 ${orderId} が確定しました`
    );
    
    return order;
  }
  
  // さらに多くのメソッドが続く...
  async cancelOrder(orderId: string) { /* 100行 */ }
  async refundOrder(orderId: string) { /* 80行 */ }
  async getOrderHistory(userId: string) { /* 50行 */ }
  async generateInvoice(orderId: string) { /* 60行 */ }
}
```

**このコードの問題点を整理すると：**

| 問題 | 詳細 | 影響 |
|------|------|------|
| **責務の混在** | 認証、在庫、決済、通知が1メソッドに | 変更の影響範囲が不明 |
| **テスト困難** | 4つの外部依存をモックする必要 | テストが複雑で脆い |
| **トランザクション曖昧** | どこからどこまでが1トランザクション？ | データ不整合のリスク |
| **エラーハンドリング不明確** | 途中で失敗したらどうなる？ | 補償処理の漏れ |
| **再利用不可能** | 「在庫チェックだけ」使いたい場合は？ | コピペの誘発 |
| **命名の曖昧さ** | `processOrder`は何をする？ | 読む人によって解釈が違う |

### 1.1.1 問題の根本原因

上記のコードがなぜ問題なのか、より深く考えてみましょう。

**根本原因: 「副作用の有無」が混在している**

```typescript
async processOrder(orderId: string, userId: string): Promise<Order> {
  // 読み取り（副作用なし）
  const order = await this.db.query(...);
  const user = await this.db.query(...);
  
  // 計算・判定（副作用なし）
  if (user.role !== 'admin' && order.userId !== userId) { ... }
  
  // 読み取り（副作用なし）
  const stock = await this.inventoryApi.getStock(...);
  
  // 計算・判定（副作用なし）
  if (stock.quantity < item.quantity) { ... }
  
  // 書き込み（副作用あり！）
  await this.paymentGateway.charge(...);
  await this.db.execute('UPDATE ...');
  await this.inventoryApi.decreaseStock(...);
  await this.emailService.send(...);
}
```

「副作用なし」と「副作用あり」が交互に現れるため：

1. **テスト時**: 副作用のある部分をモックする必要があるが、どこをモックすべきか分からない
2. **リトライ時**: 副作用のある部分は重複実行すると問題（二重決済など）
3. **ロールバック時**: 副作用のある部分だけ取り消したいが、どこまで実行されたか不明

### 1.1.2 解決策: 4分類による責務の分離

本スキルでは、すべてのクラスを以下の4つに**排他的に**分類します：

| 分類 | 定義 | 副作用 | 外部リソース |
|------|------|:------:|:------:|
| **Command** | 永続状態を変更する、または外部システムに作用する | あり | メソッド引数 |
| **Transition** | 型 A → 型 B への変換（純粋関数） | なし | なし |
| **Query** | 値の計算・導出（純粋関数） | なし | なし |
| **ReadModel** | 永続層から読み取り専用でデータを取得 | なし | メソッド引数 |

**判断フロー:**

```
このクラスは...
├─ 永続化/外部通信を行う？
│   ├─ YES + 書き込み → Command
│   └─ YES + 読み取りのみ → ReadModel
│
└─ NO（純粋関数）
    ├─ 入力型と出力型が異なる？ → Transition
    └─ 同じ概念の別表現？ → Query
```

---

## 1.2 代替アプローチ比較

### 比較表

| アプローチ | 概要 | 長所 | 短所 | 本スキルでの扱い |
|-----------|------|------|------|-----------------|
| **本スキル: 4分類** | Command/Transition/Query/ReadModel | 責務明確、テスト容易、判断基準が明確 | 学習コスト、クラス数増加 | ✅ 採用 |
| **CQS (2分類)** | Command/Query のみ | シンプル、広く知られている | Transition/ReadModel の区別なし | △ 基礎として参考 |
| **Clean Architecture** | UseCase/Entity/Gateway/Presenter | 層の分離が明確、FW非依存 | 過剰な抽象化、小規模には重い | △ 部分採用 |
| **Hexagonal (Ports & Adapters)** | Port/Adapter | 外部依存の分離が明確 | 学習コスト高、用語が難解 | △ 概念は参考 |
| **Transaction Script** | 手続き的に処理を記述 | シンプル、学習コスト低 | スケールしない、テスト困難 | ❌ 却下 |
| **分類なし** | 自由に設計 | 柔軟、初期開発が速い | 一貫性なし、レビュー困難 | ❌ 却下 |

### 各アプローチの詳細

#### CQS (Command Query Separation)

**Bertrand Meyer** が提唱した原則：

> 「すべてのメソッドは、アクションを実行するコマンドか、データを返すクエリかのどちらかであるべきで、両方であってはならない」

```typescript
// CQS の例
class Stack<T> {
  // Command: 状態を変更、何も返さない
  push(item: T): void { ... }
  pop(): void { ... }
  
  // Query: 状態を変更しない、値を返す
  peek(): T { ... }
  isEmpty(): boolean { ... }
}
```

**CQS の限界:**

```typescript
// この分類はどっち？
class OrderQuery {
  getOrderById(id: string): Order { ... }  // DBから読む = 外部リソースアクセス
}

class TaxCalculator {
  calculate(price: number, rate: number): number { ... }  // 純粋計算
}
```

CQS では両方とも「Query」になってしまいますが、テスト方法は全く異なります。
本スキルでは、前者を **ReadModel**、後者を **Query** と区別します。

#### Clean Architecture

**Robert C. Martin (Uncle Bob)** が提唱したアーキテクチャ：

```
┌─────────────────────────────────────┐
│         Frameworks & Drivers        │  ← 外側
├─────────────────────────────────────┤
│        Interface Adapters           │
├─────────────────────────────────────┤
│        Application Business Rules   │
├─────────────────────────────────────┤
│        Enterprise Business Rules    │  ← 内側
└─────────────────────────────────────┘
```

**Clean Architecture の問題点:**

1. **層が多すぎる** - 小規模プロジェクトでは過剰
2. **用語が抽象的** - 「UseCase」「Presenter」の具体的な実装が分かりにくい
3. **TypeScriptとの相性** - Javaほどインターフェースが強制されない

本スキルでは、Clean Architecture の「依存の方向」の考え方は採用しつつ、より実践的な4分類を採用しています。

### 🎭 架空対話: 「CQSで十分では？」

**プラグマティック田中:** 「CQSはシンプルでいいよね。Command と Query の2つだけ覚えればいい。」

**ミノ駆動さん:** 「でも、『DBから読み取る』と『計算する』を同じ Query として扱うのは問題です。テスト方法が全く違いますから。」

**新人の鈴木:** 「どう違うんですか？」

**ミノ駆動さん:** 「『税金を計算する』はモック不要でテストできます。でも『注文をDBから取得する』はDBのモックが必要です。この違いを分類に反映したのが ReadModel です。」

**関数型山田:** 「関数型的に言えば、Query は『純粋関数』、ReadModel は『副作用を伴う読み取り』ですね。」

**プラグマティック田中:** 「なるほど。テストのしやすさを考えると、確かに分けた方がいいね。」

---

## 1.3 Command の詳細

### 定義

**Command** は、永続状態を変更する、または外部システムに作用するクラスです。

**必ず副作用を伴います。**

### パターン

```typescript
class {状態}{Entity} {
  constructor(private readonly data: {Data}) {}
  
  async {遷移動詞}(repository: {Entity}Repository): Promise<{次状態}{Entity}> {
    // 1. 次の状態のオブジェクトを生成
    // 2. 永続化
    // 3. 新しい状態を返す
  }
}
```

### 命名規則

| 操作 | クラス名パターン | メソッド名 | 例 |
|------|-----------------|-----------|-----|
| 作成 | `Draft{Entity}` | `submit()` | `DraftRingi.submit()` |
| 承認 | `Awaiting{Entity}` | `approve()` | `AwaitingApproval.approve()` |
| 変更 | `{Entity}Change` | `apply()` | `ExpenseChange.apply()` |
| 取消 | `{Entity}Cancellation` | `execute()` | `InvoiceCancellation.execute()` |
| 送信 | `Outgoing{Resource}` | `deliver()` | `OutgoingNotification.deliver()` |

### 実装例

```typescript
// 稟議: Draft → submit → Submitted
class DraftRingi {
  private constructor(
    readonly id: RingiId,
    private readonly data: ValidatedRingiInput
  ) {}

  // 静的ファクトリ: ドメインエラーがある場合は Result を返す
  static create(
    id: RingiId,
    data: ValidatedRingiInput
  ): Result<DraftRingi, RingiAmountExceededError> {
    if (data.amount.isGreaterThan(Money.of(100_000_000))) {
      return Result.err(
        RingiErrors.amountExceeded(id, data.amount, Money.of(100_000_000))
      );
    }
    return Result.ok(new DraftRingi(id, data));
  }

  // Command: 副作用を伴う操作
  async submit(
    repository: RingiRepository, 
    clock: Clock
  ): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data, clock.now());
    await repository.save(submitted);
    return submitted;
  }
}

class SubmittedRingi {
  constructor(
    readonly id: RingiId,
    readonly data: ValidatedRingiInput,
    readonly submittedAt: Date
  ) {}
  
  async approve(
    repository: RingiRepository,
    approver: Approver,
    clock: Clock
  ): Promise<ApprovedRingi> {
    const approved = new ApprovedRingi(
      this.id, 
      this.data, 
      this.submittedAt,
      approver,
      clock.now()
    );
    await repository.save(approved);
    return approved;
  }
}
```

### なぜこのパターンか

**代替案との比較:**

| アプローチ | コード例 | 問題点 |
|-----------|---------|--------|
| **本スキル** | `DraftRingi.submit(repo)` | - |
| Service層 | `RingiService.submit(ringiData)` | 責務が曖昧、巨大化しやすい |
| Entityに全て | `Ringi.submit(); Ringi.approve()` | 状態遷移が型で表現されない |
| 関数ベース | `submitRingi(data, repo)` | データと振る舞いが分離 |

**Pending Object Pattern の利点:**

1. **状態が型で表現される** - `DraftRingi` と `SubmittedRingi` は別の型
2. **無効な遷移がコンパイルエラー** - `DraftRingi.approve()` は存在しない
3. **テストしやすい** - 各状態のクラスを個別にテスト可能

### 🎭 架空対話: 「Serviceクラスじゃダメなの？」

**レガシー佐藤:** 「うちのプロジェクトは全部 `XxxService` クラスだけど、何か問題ある？」

**ミノ駆動さん:** 「その `RingiService` を見せてください。」

**レガシー佐藤:** 「これだけど...」
```typescript
class RingiService {
  createDraft(data) { ... }
  submitDraft(id) { ... }
  approveRingi(id, approverId) { ... }
  rejectRingi(id, reason) { ... }
  cancelRingi(id) { ... }
  getById(id) { ... }
  getByApprover(approverId) { ... }
  generateReport(from, to) { ... }
  // ... 30メソッド続く
}
```

**ミノ駆動さん:** 「典型的な God Class ですね。このクラスの責務を一言で説明できますか？」

**レガシー佐藤:** 「稟議に関すること全部...」

**プラグマティック田中:** 「それが問題なんだよ。『全部』ってことは、責務が分離されていないってこと。」

**新人の鈴木:** 「でも、分けるとクラス数が増えませんか？」

**ミノ駆動さん:** 「はい、増えます。でも、各クラスは小さく、テストしやすくなります。30メソッドのクラスを1つテストするより、5メソッドのクラスを6つテストする方が楽です。」

---

## 1.4 Transition の詳細

### 定義

**Transition** は、型 A → 型 B への変換を行う純粋関数クラスです。

**副作用はありません。外部リソースにもアクセスしません。**

### Command との違い

| 観点 | Command | Transition |
|------|---------|------------|
| 副作用 | あり（DB書き込み等） | なし |
| 外部リソース | メソッド引数で受け取る | 使わない |
| 主な用途 | 状態変更の実行 | バリデーション、パース、変換 |
| テスト | Repositoryのモックが必要 | モック不要 |

### パターン

```typescript
// 入力型 → 出力型 の変換
class {変換内容} {
  constructor(private readonly input: InputType) {}
  
  // Result型で成功/失敗を表現
  execute(): Result<OutputType, ValidationError> {
    // バリデーション
    // 変換
    // 成功時は Result.ok、失敗時は Result.err
  }
}
```

### 実装例

```typescript
// バリデーション: UnvalidatedInput → ValidatedInput
class RingiInputValidation {
  constructor(private readonly input: UnvalidatedRingiInput) {}
  
  execute(): Result<ValidatedRingiInput, ValidationError> {
    const errors: ValidationViolation[] = [];
    
    // タイトルのバリデーション
    if (!this.input.title || this.input.title.trim() === '') {
      errors.push({ field: 'title', message: 'タイトルは必須です' });
    } else if (this.input.title.length > 100) {
      errors.push({ field: 'title', message: 'タイトルは100文字以内です' });
    }
    
    // 金額のバリデーション
    if (this.input.amount === undefined || this.input.amount === null) {
      errors.push({ field: 'amount', message: '金額は必須です' });
    } else if (this.input.amount < 0) {
      errors.push({ field: 'amount', message: '金額は0以上です' });
    }
    
    if (errors.length > 0) {
      return Result.err(ValidationError.of(errors));
    }
    
    return Result.ok({
      title: this.input.title.trim(),
      amount: Money.of(this.input.amount),
      description: this.input.description?.trim() ?? '',
    });
  }
}

// パース: string → Domain Object
class MoneyParser {
  constructor(private readonly input: string) {}
  
  execute(): Result<Money, ParseError> {
    const cleaned = this.input.replace(/,/g, '').trim();
    const value = Number(cleaned);
    
    if (isNaN(value)) {
      return Result.err(ParseError.invalidNumber(this.input));
    }
    
    if (value < 0) {
      return Result.err(ParseError.negativeAmount(value));
    }
    
    return Result.ok(Money.of(value));
  }
}
```

### なぜ Transition を分離するか

**分離しない場合の問題:**

```typescript
// ❌ バリデーションが Command に混在
class DraftRingi {
  static create(input: UnvalidatedRingiInput): Result<DraftRingi, Error> {
    // バリデーション（Transition的）
    if (!input.title) { return Result.err(...); }
    if (input.amount < 0) { return Result.err(...); }
    
    // ドメインルール（Command的）
    if (input.amount > 100_000_000) { return Result.err(...); }
    
    return Result.ok(new DraftRingi(...));
  }
}
```

**問題点:**

1. **責務の混在** - 「入力が正しいか」と「ドメインルールを満たすか」が混ざる
2. **テストの粒度** - バリデーションだけテストしたい時に DraftRingi を作る必要
3. **再利用性** - 同じバリデーションを別の場所で使いたい時にコピペ

**分離した場合:**

```typescript
// ✅ Transition と Command を分離
// Step 1: バリデーション（Transition）
const validation = new RingiInputValidation(input).execute();
if (!validation.ok) {
  return Response.badRequest(validation.error);
}

// Step 2: ドメインオブジェクト作成（Command の前段）
const draftResult = DraftRingi.create(RingiId.generate(), validation.value);
if (!draftResult.ok) {
  return Response.conflict(draftResult.error);
}

// Step 3: 永続化（Command）
const submitted = await draftResult.value.submit(repository, clock);
```

---

## 1.5 Query の詳細

### 定義

**Query** は、値の計算・導出を行う純粋関数クラスです。

**入力から出力を「計算」するだけで、外部リソースにはアクセスしません。**

### Transition との違い

| 観点 | Transition | Query |
|------|------------|-------|
| 入出力の関係 | 型が変わる（A → B） | 同じ概念の別表現 |
| 主な用途 | バリデーション、パース | 計算、判定、集計 |
| 例 | `string → Money` | `Money → number` |

**境界が曖昧な例:**

```typescript
// これは Transition? Query?
class TaxCalculation {
  constructor(private readonly price: Money) {}
  
  get amount(): Money {  // Money → Money なので Query?
    return this.price.multiply(0.1);
  }
}
```

**判断基準:** 「入力と出力が同じ概念のバリエーションか」

- `TaxCalculation`: 価格 → 税額（別概念）→ どちらでもよいが、本スキルでは Query
- `MoneyParser`: 文字列 → Money（型変換）→ Transition

### パターン

```typescript
class {計算内容} {
  constructor(private readonly input: InputType) {}
  
  // getter または execute() で結果を返す
  get result(): OutputType {
    // 純粋な計算
  }
}
```

### 実装例

```typescript
// 税計算
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

// 判定
class ApprovalRequirementCheck {
  constructor(
    private readonly amount: Money,
    private readonly threshold: Money
  ) {}
  
  get requiresApproval(): boolean {
    return this.amount.isGreaterThan(this.threshold);
  }
  
  get approvalLevel(): ApprovalLevel {
    if (this.amount.isGreaterThan(Money.of(10_000_000))) {
      return ApprovalLevel.DIRECTOR;
    }
    if (this.amount.isGreaterThan(Money.of(1_000_000))) {
      return ApprovalLevel.MANAGER;
    }
    return ApprovalLevel.NONE;
  }
}

// 集計
class MonthlyExpenseTotal {
  constructor(private readonly expenses: readonly Expense[]) {}
  
  get total(): Money {
    return this.expenses.reduce(
      (sum, expense) => sum.add(expense.amount),
      Money.zero()
    );
  }
  
  get count(): number {
    return this.expenses.length;
  }
  
  get average(): Money {
    if (this.count === 0) return Money.zero();
    return this.total.divide(this.count);
  }
}
```

### 🎭 架空対話: 「関数じゃダメなの？」

**関数型山田:** 「純粋関数なら、わざわざクラスにしなくても関数でいいのでは？」

```typescript
// 関数で書いた場合
function calculateTax(price: Money, rate: TaxRate): Money {
  return price.multiply(rate.value);
}

function calculatePriceWithTax(price: Money, rate: TaxRate): Money {
  const tax = calculateTax(price, rate);
  return price.add(tax);
}
```

**ミノ駆動さん:** 「関数でも動きますが、問題があります。」

1. **関連する計算がバラバラ** - `calculateTax` と `calculatePriceWithTax` の関連が見えにくい
2. **同じ引数を何度も渡す** - `price, rate` を毎回渡す
3. **名前空間がない** - `calculateTax` だけだと何の税か分からない

**プラグマティック田中:** 「クラスにすると、関連する計算がグループ化されるんだよね。」

```typescript
// クラスで書いた場合
const tax = new TaxOn(price, rate);
tax.amount;       // 税額
tax.priceWithTax; // 税込価格
```

**関数型山田:** 「確かに、凝集度は高くなりますね。でも、本当にシンプルな計算なら関数でいいのでは？」

**本スキル:** 「はい。本スキルでは『クラス分類』を推奨しますが、数行の単純なユーティリティ関数まで強制はしません。判断基準は『関連する複数の計算があるか』『再利用されるか』です。」

---

## 1.6 ReadModel の詳細

### 定義

**ReadModel** は、永続層から読み取り専用でデータを取得するクラスです。

**書き込みは行いません。読み取りのみです。**

### Query との違い

| 観点 | Query | ReadModel |
|------|-------|-----------|
| 外部リソース | なし | あり（DB、API等） |
| 副作用 | なし | なし（読み取りのみ） |
| テスト | モック不要 | Repositoryのモックが必要 |
| キャッシュ可能性 | 入力が同じなら常に同じ | 外部の状態に依存 |

### パターン

```typescript
class {取得内容}For{用途} {
  constructor(private readonly repository: {Entity}Repository) {}
  
  async execute(params: QueryParams): Promise<ResultType> {
    // 読み取り専用のクエリ
  }
}
```

### 実装例

```typescript
// 一覧取得
class RingisForApprover {
  constructor(private readonly repository: RingiRepository) {}
  
  async execute(approverId: ApproverId): Promise<readonly RingiSummary[]> {
    return this.repository.findPendingByApprover(approverId);
  }
}

// 検索
class RingiSearchForDashboard {
  constructor(private readonly repository: RingiRepository) {}
  
  async execute(criteria: RingiSearchCriteria): Promise<RingiSearchResult> {
    const items = await this.repository.search(criteria);
    const total = await this.repository.count(criteria);
    
    return {
      items,
      total,
      page: criteria.page,
      pageSize: criteria.pageSize,
    };
  }
}

// 集計（DBで集計）
class MonthlyRingiStatsForReport {
  constructor(private readonly repository: RingiRepository) {}
  
  async execute(month: YearMonth): Promise<MonthlyStats> {
    return this.repository.aggregateByMonth(month);
  }
}
```

### なぜ Query と分けるか

**テスト戦略が異なるからです。**

```typescript
// Query: モック不要、純粋なテスト
describe('TaxOn', () => {
  it('税額を計算できる', () => {
    const tax = new TaxOn(Money.of(1000), TaxRate.of(0.1));
    expect(tax.amount.value).toBe(100);
  });
});

// ReadModel: Repositoryのモックが必要
describe('RingisForApprover', () => {
  it('承認待ちの稟議を取得できる', async () => {
    const mockRepository = {
      findPendingByApprover: jest.fn().mockResolvedValue([
        { id: '1', title: 'テスト稟議' },
      ]),
    };
    
    const readModel = new RingisForApprover(mockRepository);
    const result = await readModel.execute(ApproverId.of('approver-1'));
    
    expect(result).toHaveLength(1);
    expect(mockRepository.findPendingByApprover).toHaveBeenCalledWith(
      ApproverId.of('approver-1')
    );
  });
});
```

---

## 1.7 境界層での分岐（許容）

### 境界層とは

**境界層**は、外部世界（HTTP、CLI、メッセージキュー等）とドメインロジックの接点です。

```
┌─────────────────┐
│  外部世界       │  HTTP Request, CLI Args, Message Queue
├─────────────────┤
│  境界層         │  Controller, Handler, Resolver
├─────────────────┤
│  ドメイン層     │  Command, Query, Transition, ReadModel
├─────────────────┤
│  インフラ層     │  Repository実装, 外部API Client
└─────────────────┘
```

### 境界層で許容される分岐

**ドメイン層では Polymorphism を推奨しますが、境界層では条件分岐を許容します。**

```typescript
// ✅ 境界層（Controller）での分岐は許容
@Controller('ringis')
class RingiController {
  @Post()
  async create(@Body() dto: CreateRingiDto) {
    const result = await this.useCase.execute(dto);
    
    // 境界層での分岐: Result → HTTP Response
    if (!result.ok) {
      switch (result.error._tag) {
        case 'ValidationError':
          throw new BadRequestException(result.error);
        case 'AmountExceededError':
          throw new ConflictException(result.error);
        default:
          throw new InternalServerErrorException();
      }
    }
    
    return { id: result.value.id.value };
  }
}
```

**なぜ許容するか:**

1. **HTTP ステータスコードへの変換** - ドメインエラー → HTTP 4xx/5xx
2. **リクエストパラメータの分岐** - `?format=json` vs `?format=csv`
3. **認証・認可のチェック** - ミドルウェアでの分岐

**ドメイン層との違い:**

| 層 | 分岐の許容 | 理由 |
|----|-----------|------|
| ドメイン層 | Polymorphism推奨 | ビジネスロジックの拡張性 |
| 境界層 | switch/if許容 | プロトコル変換は拡張されにくい |

---

## 1.8 4分類のまとめ

### 判断フローチャート

```
新しいクラスを作る時...

Q1: このクラスは外部リソース（DB、API、ファイル等）にアクセスする？
├─ YES
│   Q2: 書き込み（変更・削除・作成）を行う？
│   ├─ YES → Command
│   └─ NO（読み取りのみ）→ ReadModel
│
└─ NO（純粋関数）
    Q3: 入力型と出力型が異なる？（型変換、バリデーション）
    ├─ YES → Transition
    └─ NO（計算、判定、集計）→ Query
```

### テスト戦略との対応

| 分類 | テスト方法 | モックの必要性 |
|------|-----------|--------------|
| Command | Repository/外部サービスをモック | 必要 |
| Transition | 入力→出力を直接テスト | 不要 |
| Query | 入力→出力を直接テスト | 不要 |
| ReadModel | Repositoryをモック | 必要 |

### いつ4分類を適用しないか

| 場面 | 対応 |
|------|------|
| 数行のユーティリティ関数 | 関数のままでよい |
| フレームワークが強制する構造 | フレームワークに従う |
| プロトタイプ/PoC | 動くことを優先 |
| レガシーコードの一部修正 | 修正箇所のみ適用 |

---

# Part 2: 完全コンストラクタと依存生成

## 📚 前提知識

**必須:**
- クラスとコンストラクタの基本
- 依存性注入（DI）の概念（0.2.5節で解説済み）

**推奨:**
- バリデーションの実装経験
- テストダブル（モック、スタブ）の経験

---

## 2.1 完全コンストラクタの原則

### 問題提起: 「不完全なオブジェクト」の危険性

以下のコードを見てください：

```typescript
// ❌ 不完全なオブジェクトが作れてしまう
class User {
  id: string;
  name: string;
  email: string;
  
  constructor() {
    // 何も設定しない
  }
  
  setId(id: string) { this.id = id; }
  setName(name: string) { this.name = name; }
  setEmail(email: string) { this.email = email; }
}

// 使用例
const user = new User();
user.setName("田中");
// id と email が設定されていない！
saveUser(user);  // 💥 DBエラーや予期しない動作
```

**問題点:**

1. **不完全な状態が存在できる** - `id`, `email` が未設定
2. **どこで完全になるか不明** - コードを追跡しないと分からない
3. **nullチェックが必要** - 使う側が毎回チェック

### 完全コンストラクタとは

**完全コンストラクタ**とは、「コンストラクタを抜けた時点で、オブジェクトが完全に有効な状態である」ことを保証する設計です。

```typescript
// ✅ 完全コンストラクタ
class User {
  constructor(
    readonly id: UserId,
    readonly name: UserName,
    readonly email: Email
  ) {
    // コンストラクタを抜けた時点で、全てのフィールドが設定済み
  }
}

// 使用例
const user = new User(
  UserId.generate(),
  UserName.of("田中"),
  Email.of("tanaka@example.com")
);
// この時点で user は完全に有効
```

### 代替アプローチ比較

| アプローチ | 概要 | 長所 | 短所 | 本スキルでの扱い |
|-----------|------|------|------|-----------------|
| **完全コンストラクタ** | 全フィールドをコンストラクタで設定 | 不完全な状態が存在しない | 引数が多くなる可能性 | ✅ 採用 |
| **Setter注入** | 後からsetterで設定 | 柔軟 | 不完全な状態が存在 | ❌ 却下 |
| **Builder パターン** | Builderで段階的に構築 | 可読性が高い | 不完全な状態がありうる | △ 条件付き許容 |
| **Named Constructor** | 静的ファクトリメソッド | 用途別に名前が付けられる | 本質は同じ | ✅ 併用 |

### Builder パターンの注意点

Builder パターンは「可読性のため」に使われますが、不完全な状態を許容してしまうことがあります。

```typescript
// ❌ 危険なBuilder: 不完全なまま build() できる
class UserBuilder {
  private id?: string;
  private name?: string;
  private email?: string;
  
  setId(id: string) { this.id = id; return this; }
  setName(name: string) { this.name = name; return this; }
  setEmail(email: string) { this.email = email; return this; }
  
  build(): User {
    return new User(this.id!, this.name!, this.email!);  // 💥 ! で強制
  }
}

// ✅ 安全なBuilder: 必須フィールドはコンストラクタで
class UserBuilder {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly email: string
  ) {}
  
  // オプションフィールドのみ後から設定
  private nickname?: string;
  withNickname(nickname: string) { 
    this.nickname = nickname; 
    return this; 
  }
  
  build(): User {
    return new User(this.id, this.name, this.email, this.nickname);
  }
}
```

---

## 2.2 依存の分類と生成方針

### 依存の4分類

クラスが「依存するもの」は、以下の4種類に分類できます：

| 分類 | 定義 | 例 | 生成方法 |
|------|------|-----|---------|
| **Pure Logic** | 外部リソース不要、決定的 | TaxCalculator, Validator | コンストラクタ内で生成 |
| **Configured Logic** | 設定値に依存、決定的 | RateCalculator(rate: 0.1) | Config経由で内部生成 |
| **External Resource** | 外部リソースにアクセス | Repository, API Client | メソッド引数で受け取る |
| **Non-deterministic** | 実行ごとに結果が変わる | Clock, RandomGenerator | メソッド引数で受け取る |

### 判断フローチャート

```
この依存は...

Q1: 外部リソース（DB、API、ファイル等）にアクセスする？
├─ YES → External Resource
└─ NO
    Q2: 実行するたびに結果が変わる？（時刻、乱数等）
    ├─ YES → Non-deterministic
    └─ NO
        Q3: 設定値に依存する？
        ├─ YES → Configured Logic
        └─ NO → Pure Logic
```

### 各分類の生成ルール

| 分類 | 生成方法 | 理由 |
|------|---------|------|
| Pure Logic | コンストラクタ内で生成 | テストでもそのまま使える |
| Configured Logic | Config経由で内部生成 | 設定を外部から注入 |
| External Resource | メソッド引数で受け取る | テストでモック注入 |
| Non-deterministic | メソッド引数で受け取る | テストで固定値注入 |

---

## 2.3 各分類の実装例

### Pure Logic: コンストラクタ内で生成

```typescript
class OrderProcessor {
  // Pure Logic: コンストラクタ内で生成
  private readonly taxCalculator = new TaxCalculator();
  private readonly validator = new OrderValidator();
  
  process(order: Order): ProcessedOrder {
    this.validator.validate(order);
    const tax = this.taxCalculator.calculate(order.subtotal);
    return new ProcessedOrder(order, tax);
  }
}

// テスト: モック不要
describe('OrderProcessor', () => {
  it('注文を処理できる', () => {
    const processor = new OrderProcessor();  // そのまま使える
    const result = processor.process(order);
    expect(result.total).toBe(...);
  });
});
```

### Configured Logic: Config経由で内部生成

```typescript
interface TaxConfig {
  readonly standardRate: number;
  readonly reducedRate: number;
}

class TaxCalculator {
  constructor(private readonly config: TaxConfig) {}
  
  calculateStandard(price: Money): Money {
    return price.multiply(this.config.standardRate);
  }
  
  calculateReduced(price: Money): Money {
    return price.multiply(this.config.reducedRate);
  }
}

// 使用時
const config: TaxConfig = { standardRate: 0.1, reducedRate: 0.08 };
const calculator = new TaxCalculator(config);

// テスト: 設定を変えてテスト
describe('TaxCalculator', () => {
  it('標準税率で計算できる', () => {
    const calculator = new TaxCalculator({ 
      standardRate: 0.1, 
      reducedRate: 0.08 
    });
    expect(calculator.calculateStandard(Money.of(1000)).value).toBe(100);
  });
});
```

### External Resource: メソッド引数で受け取る

```typescript
class DraftRingi {
  constructor(readonly id: RingiId, readonly data: RingiData) {}
  
  // External Resource: メソッド引数で受け取る
  async submit(repository: RingiRepository): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data, new Date());
    await repository.save(submitted);
    return submitted;
  }
}

// テスト: InMemory実装を注入
describe('DraftRingi', () => {
  it('申請できる', async () => {
    const repository = new InMemoryRingiRepository();  // テスト用実装
    const draft = new DraftRingi(RingiId.of('1'), ringiData);
    
    const submitted = await draft.submit(repository);
    
    expect(submitted.id.value).toBe('1');
    expect(await repository.findById(submitted.id)).not.toBeNull();
  });
});
```

### Non-deterministic: メソッド引数で受け取る

```typescript
interface Clock {
  now(): Date;
}

class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

class FixedClock implements Clock {
  constructor(private readonly fixedTime: Date) {}
  now(): Date {
    return this.fixedTime;
  }
}

class DraftRingi {
  // Non-deterministic: メソッド引数で受け取る
  async submit(
    repository: RingiRepository, 
    clock: Clock  // 時刻は外部から
  ): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data, clock.now());
    await repository.save(submitted);
    return submitted;
  }
}

// テスト: 固定時刻を注入
describe('DraftRingi', () => {
  it('申請日時が記録される', async () => {
    const fixedTime = new Date('2024-01-15T10:00:00Z');
    const clock = new FixedClock(fixedTime);
    const repository = new InMemoryRingiRepository();
    
    const submitted = await draft.submit(repository, clock);
    
    expect(submitted.submittedAt).toEqual(fixedTime);
  });
});
```

---

## 2.4 入力バリデーションと完全コンストラクタの関係

### フロー図

```
[外部入力]           [バリデーション]         [ドメインオブジェクト]
 (信頼できない)        (Transition)            (信頼できる)
     │                    │                       │
     │  UnvalidatedInput  │   ValidatedInput      │
     ├───────────────────►├──────────────────────►│
     │                    │                       │
     │                    │  バリデーション失敗    │
     │                    │  → Result.err         │
     │                    │                       │
     │                    │  バリデーション成功    │
     │                    │  → Result.ok          │
     │                    │  → 完全コンストラクタ  │
```

### 実装例

```typescript
// Step 1: 外部入力（信頼できない）
interface UnvalidatedRingiInput {
  title: unknown;
  amount: unknown;
  description: unknown;
}

// Step 2: バリデーション済み入力（型は保証されるが、ドメインルールは未検証）
interface ValidatedRingiInput {
  title: string;
  amount: Money;
  description: string;
}

// Step 3: バリデーション（Transition）
class RingiInputValidation {
  constructor(private readonly input: UnvalidatedRingiInput) {}
  
  execute(): Result<ValidatedRingiInput, ValidationError> {
    // 型チェック、必須チェック、フォーマットチェック
    // ...
    return Result.ok(validated);
  }
}

// Step 4: ドメインオブジェクト（完全コンストラクタ）
class DraftRingi {
  private constructor(
    readonly id: RingiId,
    readonly data: ValidatedRingiInput  // 必ず検証済みデータを受け取る
  ) {}
  
  // 静的ファクトリ: ドメインルールを検証
  static create(
    id: RingiId, 
    data: ValidatedRingiInput
  ): Result<DraftRingi, RingiAmountExceededError> {
    // ドメインルール: 金額上限チェック
    if (data.amount.isGreaterThan(Money.of(100_000_000))) {
      return Result.err(RingiErrors.amountExceeded(...));
    }
    return Result.ok(new DraftRingi(id, data));
  }
}
```

### なぜこの2段階か

| 段階 | 責務 | エラーの種類 | 誰が対処 |
|------|------|------------|---------|
| バリデーション | 入力形式の検証 | ValidationError | ユーザー（入力を修正） |
| ドメインルール | ビジネスルールの検証 | DomainError | システム（または管理者） |

```typescript
// 使用例（Controller）
async createRingi(input: UnvalidatedRingiInput) {
  // Step 1: バリデーション
  const validation = new RingiInputValidation(input).execute();
  if (!validation.ok) {
    // 400 Bad Request: ユーザーに入力修正を促す
    return Response.badRequest({ errors: validation.error.violations });
  }
  
  // Step 2: ドメインオブジェクト作成
  const draftResult = DraftRingi.create(RingiId.generate(), validation.value);
  if (!draftResult.ok) {
    // 409 Conflict: ドメインルール違反
    return Response.conflict({ error: draftResult.error });
  }
  
  // Step 3: 永続化
  const submitted = await draftResult.value.submit(repository, clock);
  return Response.created({ id: submitted.id.value });
}
```

---

## 2.5 まとめ

### 完全コンストラクタのルール

1. **全ての必須フィールドはコンストラクタで受け取る**
2. **コンストラクタを抜けた時点でオブジェクトは有効**
3. **setterで後から設定するパターンは禁止**
4. **オプションフィールドは明示的に Optional 型にする**

### 依存生成のルール

| 分類 | 生成方法 |
|------|---------|
| Pure Logic | コンストラクタ内で `new` |
| Configured Logic | Config経由でコンストラクタ内生成 |
| External Resource | メソッド引数 |
| Non-deterministic | メソッド引数 |

---

# Part 3: Polymorphism（多態性）

## 📚 前提知識

**必須:**
- インターフェースの基本（0.2.2節で解説済み）
- 条件分岐（if/else, switch）の基本

**推奨:**
- Strategy パターンの概念
- 開放閉鎖原則（OCP）の概念

---

## 3.1 なぜ switch を禁止するか

### 問題提起: switch 文の問題点

以下のコードを見てください：

```typescript
// ❌ switch で振る舞いを分岐
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  CONVENIENCE_STORE = 'convenience_store',
}

class PaymentProcessor {
  async process(method: PaymentMethod, amount: Money): Promise<PaymentResult> {
    switch (method) {
      case PaymentMethod.CREDIT_CARD:
        // クレジットカード決済のロジック（50行）
        const cardClient = new CreditCardClient();
        const cardResult = await cardClient.charge(amount);
        if (!cardResult.success) {
          throw new Error('カード決済失敗');
        }
        return { transactionId: cardResult.transactionId };
        
      case PaymentMethod.BANK_TRANSFER:
        // 銀行振込のロジック（40行）
        const bankClient = new BankTransferClient();
        const bankResult = await bankClient.initiateTransfer(amount);
        return { transactionId: bankResult.referenceNumber };
        
      case PaymentMethod.CONVENIENCE_STORE:
        // コンビニ決済のロジック（60行）
        const convenienceClient = new ConvenienceStoreClient();
        const paymentCode = await convenienceClient.generateCode(amount);
        return { transactionId: paymentCode };
        
      default:
        throw new Error(`Unknown payment method: ${method}`);
    }
  }
}
```

**問題点:**

| 問題 | 詳細 |
|------|------|
| **巨大化** | 各caseが長くなり、メソッド全体が数百行に |
| **開放閉鎖原則違反** | 新しい決済方法を追加するとき、このクラスを修正 |
| **テスト困難** | 全てのcaseを1つのクラスでテスト |
| **関連コードの散在** | クレジットカード関連のロジックが複数のswitchに分散 |

### switch が増殖するパターン

```typescript
// ❌ 同じ enum に対する switch が増殖
class PaymentProcessor {
  async process(method: PaymentMethod, amount: Money) {
    switch (method) { /* ... */ }
  }
  
  async refund(method: PaymentMethod, transactionId: string) {
    switch (method) { /* 同じ分岐が再登場 */ }
  }
  
  async getStatus(method: PaymentMethod, transactionId: string) {
    switch (method) { /* また同じ分岐 */ }
  }
  
  canPartialRefund(method: PaymentMethod): boolean {
    switch (method) { /* またまた同じ分岐 */ }
  }
}
```

**これが「shotgun surgery（散弾銃手術）」と呼ばれるコードの臭いです。**

新しい決済方法を追加するとき、複数の switch を全て修正する必要があります。

---

## 3.2 Polymorphism による解決

### 解決策: Interface + 実装クラス

```typescript
// ✅ Polymorphism で解決
interface PaymentGateway {
  process(amount: Money): Promise<PaymentResult>;
  refund(transactionId: string): Promise<RefundResult>;
  getStatus(transactionId: string): Promise<PaymentStatus>;
  canPartialRefund(): boolean;
}

class CreditCardPayment implements PaymentGateway {
  constructor(private readonly client: CreditCardClient) {}
  
  async process(amount: Money): Promise<PaymentResult> {
    const result = await this.client.charge(amount);
    if (!result.success) {
      throw new PaymentFailedError('カード決済失敗');
    }
    return { transactionId: result.transactionId };
  }
  
  async refund(transactionId: string): Promise<RefundResult> {
    return this.client.refund(transactionId);
  }
  
  async getStatus(transactionId: string): Promise<PaymentStatus> {
    return this.client.getStatus(transactionId);
  }
  
  canPartialRefund(): boolean {
    return true;  // クレジットカードは部分返金可能
  }
}

class BankTransferPayment implements PaymentGateway {
  constructor(private readonly client: BankTransferClient) {}
  
  async process(amount: Money): Promise<PaymentResult> {
    const result = await this.client.initiateTransfer(amount);
    return { transactionId: result.referenceNumber };
  }
  
  async refund(transactionId: string): Promise<RefundResult> {
    // 銀行振込は手動返金
    return { status: 'manual_refund_required' };
  }
  
  async getStatus(transactionId: string): Promise<PaymentStatus> {
    return this.client.checkTransferStatus(transactionId);
  }
  
  canPartialRefund(): boolean {
    return false;  // 銀行振込は部分返金不可
  }
}

// 使用側: switch 不要
class Checkout {
  async complete(payment: PaymentGateway, amount: Money) {
    return payment.process(amount);  // どの実装かは知らない
  }
}
```

### 比較

| 観点 | switch | Polymorphism |
|------|--------|--------------|
| 新しい種類の追加 | 全てのswitchを修正 | 新しいクラスを追加 |
| テスト | 1つのクラスで全ケース | 各クラスを個別テスト |
| 関連コードの凝集 | 分散 | 1クラスに集約 |
| 行数 | 1ファイルが巨大化 | 小さなファイルが複数 |

---

## 3.3 代替アプローチ比較

| アプローチ | 概要 | 長所 | 短所 | 本スキルでの扱い |
|-----------|------|------|------|-----------------|
| **Polymorphism** | Interface + 実装クラス | OCP準拠、テスト容易 | クラス数増加 | ✅ 採用 |
| **switch文** | enum + switch | シンプル、学習コスト低 | 変更に弱い、巨大化 | ❌ 基本禁止 |
| **Map/辞書** | `{ key: handler }` | 動的追加可能 | 型安全性が低い | △ 条件付き許容 |
| **パターンマッチ** | Rustのmatch等 | 網羅性チェック | 言語サポートが必要 | △ 言語による |

---

## 3.4 いつ switch を許容するか

**Polymorphism が常に正解ではありません。**

### 許容される場面

| 場面 | 理由 | 例 |
|------|------|-----|
| **分岐が2つで値選択のみ** | クラスを2つ作るほどではない | `flag ? valueA : valueB` |
| **境界層での変換** | プロトコル変換は拡張されにくい | `errorCode → HTTPステータス` |
| **enum が振る舞いを持たない** | 単なる識別子 | `status: 'draft' | 'submitted'` |
| **拡張の予定がない** | YAGNI原則 | 2-3種類で固定のマスタ |

### 判断フローチャート

```
この分岐は...

Q1: 各分岐で異なる「計算ロジック」がある？
├─ NO → switch/if で OK
└─ YES
    Q2: 各分岐を「独立してテスト」したい？
    ├─ NO → switch/if で OK
    └─ YES
        Q3: 今後、分岐が「追加される可能性」がある？
        ├─ NO → switch/if で OK（でも Polymorphism も可）
        └─ YES → Polymorphism 必須
```

### 🎭 架空対話: 「2つの分岐でもクラスを分けるの？」

**プラグマティック田中:** 「true/false の2分岐でもクラスを2つ作れってこと？」

```typescript
// これもクラスに分けるの？
if (user.isPremium) {
  return basePrice * 0.9;  // 10%割引
} else {
  return basePrice;
}
```

**ミノ駆動さん:** 「この例は『値の選択』だけですよね。計算ロジックは同じです。」

**本スキル:** 「はい。これは switch/if で十分です。Polymorphism が必要なのは『各分岐で異なるロジック』がある場合です。」

**新人の鈴木:** 「じゃあ、どこが境界なんですか？」

**本スキル:** 「判断基準は3つ：」

1. **各分岐で異なる計算ロジック** があるか？
2. **各分岐を独立してテスト** したいか？
3. **今後、分岐が追加** される可能性があるか？

全て NO なら switch/if で OK。1つでも YES なら Polymorphism を検討。

---

## 3.5 実装例: enum の正しい使い方

### 振る舞いのない enum（許容）

```typescript
// ✅ 振る舞いのない enum: 許容
enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// 単なる識別子として使用
class Ringi {
  constructor(
    readonly id: RingiId,
    readonly status: ApprovalStatus  // 振る舞いはない
  ) {}
}

// 境界層での変換（許容）
function toDisplayText(status: ApprovalStatus): string {
  switch (status) {
    case ApprovalStatus.PENDING: return '承認待ち';
    case ApprovalStatus.APPROVED: return '承認済み';
    case ApprovalStatus.REJECTED: return '却下';
  }
}
```

### 振る舞いのある場合（Polymorphism 必須）

```typescript
// ❌ 振る舞いを enum + switch で表現
enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_ONE_GET_ONE = 'buy_one_get_one',
}

function applyDiscount(
  type: DiscountType, 
  price: Money, 
  value: number
): Money {
  switch (type) {
    case DiscountType.PERCENTAGE:
      return price.multiply(1 - value / 100);
    case DiscountType.FIXED_AMOUNT:
      return price.subtract(Money.of(value));
    case DiscountType.BUY_ONE_GET_ONE:
      return price.divide(2);
  }
}

// ✅ Polymorphism で表現
interface Discount {
  apply(price: Money): Money;
}

class PercentageDiscount implements Discount {
  constructor(private readonly percent: number) {}
  
  apply(price: Money): Money {
    return price.multiply(1 - this.percent / 100);
  }
}

class FixedAmountDiscount implements Discount {
  constructor(private readonly amount: Money) {}
  
  apply(price: Money): Money {
    return price.subtract(this.amount);
  }
}

class BuyOneGetOneDiscount implements Discount {
  apply(price: Money): Money {
    return price.divide(2);
  }
}
```

---

# Part 4: イミュータビリティ

## 📚 前提知識

**必須:**
- 変数と参照の基本
- オブジェクトのコピーの概念

**推奨:**
- 副作用の問題点（0.3.2節で解説済み）
- 関数型プログラミングの基礎

---

## 4.1 なぜイミュータブルか

### 問題提起: ミュータブルオブジェクトの罠

```typescript
// ❌ ミュータブルなオブジェクト
class ShoppingCart {
  items: CartItem[] = [];
  
  addItem(item: CartItem) {
    this.items.push(item);  // 自分自身を変更
  }
  
  getTotal(): Money {
    return this.items.reduce((sum, item) => sum.add(item.price), Money.zero());
  }
}

// 問題が起きるシナリオ
const cart = new ShoppingCart();
cart.addItem(apple);

// カートを関数に渡す
displayCart(cart);

// 関数内でカートが変更されているかもしれない！
console.log(cart.getTotal());  // 予想と違う結果になる可能性

function displayCart(cart: ShoppingCart) {
  // 「ちょっとソートしよう」と思って...
  cart.items.sort((a, b) => a.name.localeCompare(b.name));  // 💥 元のカートが変わる！
}
```

### イミュータブルの利点

| ミュータブル | イミュータブル |
|------------|--------------|
| 「いつ変わったか」を追跡困難 | 変わらないので追跡不要 |
| 関数に渡すと変更されるかも | 安全に渡せる |
| 履歴を残すには工夫が必要 | 各状態が自然と残る |
| 並列処理で競合の可能性 | 競合なし |
| バグの原因特定が困難 | 状態が明確 |

### 代替アプローチ比較

| アプローチ | 概要 | 長所 | 短所 | 本スキルでの扱い |
|-----------|------|------|------|-----------------|
| **イミュータブル** | 変更時は新オブジェクト | 安全、予測可能 | メモリ使用量増加 | ✅ 採用 |
| **ミュータブル** | 直接変更 | メモリ効率 | バグの温床 | ❌ 基本禁止 |
| **Copy-on-Write** | 変更時のみコピー | バランス型 | 実装が複雑 | △ ライブラリ使用時 |
| **Defensive Copy** | 渡す前にコピー | 互換性維持 | コピーコスト | △ レガシー対応 |

---

## 4.2 イミュータブルの実装方法

### TypeScript での実装

```typescript
// ✅ イミュータブルなクラス
class ShoppingCart {
  constructor(private readonly items: readonly CartItem[]) {}
  
  // 変更メソッドは新しいインスタンスを返す
  addItem(item: CartItem): ShoppingCart {
    return new ShoppingCart([...this.items, item]);
  }
  
  removeItem(itemId: string): ShoppingCart {
    return new ShoppingCart(
      this.items.filter(item => item.id !== itemId)
    );
  }
  
  getTotal(): Money {
    return this.items.reduce(
      (sum, item) => sum.add(item.price), 
      Money.zero()
    );
  }
}

// 使用例
const cart1 = new ShoppingCart([]);
const cart2 = cart1.addItem(apple);   // cart1 は変わらない
const cart3 = cart2.addItem(banana);  // cart2 も変わらない

console.log(cart1.getItems().length); // 0
console.log(cart2.getItems().length); // 1
console.log(cart3.getItems().length); // 2
```

### 深いイミュータビリティ

```typescript
// ⚠️ 浅いイミュータビリティの問題
interface Config {
  readonly nested: { value: number };  // nested 自体は readonly だが...
}

const config: Config = { nested: { value: 1 } };
config.nested.value = 2;  // 💥 変更できてしまう！

// ✅ 深いイミュータビリティ
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type ImmutableConfig = DeepReadonly<Config>;
```

---

## 4.3 パフォーマンスの考慮

### 🎭 架空対話: 「毎回 new するのは遅くない？」

**レガシー佐藤:** 「ループの中で毎回新しいオブジェクトを作ったら遅くならない？」

```typescript
// 10万件のループ
for (const item of items) {
  cart = cart.addItem(item);  // 毎回 new ShoppingCart
}
```

**関数型山田:** 「現代のJavaScriptエンジンは短命オブジェクトの生成・回収が非常に高速です。ほとんどの場合、問題になりません。」

**プラグマティック田中:** 「でも、本当にホットパスなら計測すべきだよね。」

**本スキル:** 「その通りです。方針は：」

1. **まず正しく書く** - イミュータブルで
2. **計測する** - 本当に問題か確認
3. **問題があれば最適化** - その箇所のみ

```typescript
// パフォーマンスが問題になる場合の対処
// 方法1: バッチ処理用のメソッドを追加
class ShoppingCart {
  addItems(items: readonly CartItem[]): ShoppingCart {
    return new ShoppingCart([...this.items, ...items]);  // 1回のコピー
  }
}

// 方法2: Builder パターンで一時的にミュータブル
class ShoppingCartBuilder {
  private items: CartItem[] = [];
  
  addItem(item: CartItem): this {
    this.items.push(item);
    return this;
  }
  
  build(): ShoppingCart {
    return new ShoppingCart(Object.freeze([...this.items]));
  }
}
```

---

# Part 5: エラー処理

## 📚 前提知識

**必須:**
- 例外（try/catch）の基本
- TypeScript の型システム

**推奨:**
- 関数型言語の Option/Result 型
- ドメイン駆動設計のエラー分類

---

## 5.1 Result 型 vs 例外

### 問題提起: 例外の問題点

```typescript
// ❌ 例外ベースのエラー処理
class RingiService {
  async submit(data: RingiData): Promise<SubmittedRingi> {
    // どこで例外が投げられるか分からない
    const validated = this.validate(data);        // ValidationException?
    const draft = this.createDraft(validated);    // AmountExceededException?
    const submitted = await draft.submit(repo);   // DatabaseException? NetworkException?
    await this.notify(submitted);                 // SmtpException?
    return submitted;
  }
}

// 使用側: 何をcatchすべきか不明
try {
  const result = await service.submit(data);
} catch (e) {
  // e は何の型？ どう処理する？
  if (e instanceof ValidationException) { ... }
  else if (e instanceof AmountExceededException) { ... }
  else if (e instanceof DatabaseException) { ... }
  else { ... }
}
```

**例外の問題点:**

| 問題 | 詳細 |
|------|------|
| **型安全性がない** | どの例外が投げられるか型で分からない |
| **見えない制御フロー** | throw が複数箇所から来る可能性 |
| **処理の強制なし** | catch を書き忘れても動く（ランタイムエラー） |
| **パフォーマンス** | 例外生成はスタックトレース取得で重い |

### Result 型による解決

```typescript
// ✅ Result 型でエラーを明示
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

class DraftRingi {
  static create(data: ValidatedRingiInput): Result<DraftRingi, AmountExceededError> {
    if (data.amount.isGreaterThan(Money.of(100_000_000))) {
      return Result.err(RingiErrors.amountExceeded(...));
    }
    return Result.ok(new DraftRingi(data));
  }
}

// 使用側: エラーハンドリングを強制
const result = DraftRingi.create(data);
if (!result.ok) {
  // result.error は AmountExceededError 型
  console.log(result.error.message);
  return;
}
// result.value は DraftRingi 型
const draft = result.value;
```

### 代替アプローチ比較

| アプローチ | 概要 | 長所 | 短所 | 本スキルでの扱い |
|-----------|------|------|------|-----------------|
| **Result型** | 成功/失敗を型で表現 | 型安全、明示的 | 記述量増加 | ✅ ドメインエラーに採用 |
| **例外** | throw/catch | シンプル、広く知られている | 型安全性なし | △ インフラエラーに使用 |
| **null返却** | 失敗時はnull | シンプル | エラー理由が不明 | ❌ 却下 |
| **エラーコード返却** | 数値やenum | C言語からの伝統 | 型安全性なし | ❌ 却下 |

---

## 5.2 エラーの分類

### DomainError vs InfrastructureError

| 分類 | 定義 | 処理方法 | 例 |
|------|------|---------|-----|
| **DomainError** | ビジネスルール違反 | Result型で返す | 金額上限超過、権限不足 |
| **InfrastructureError** | 技術的な障害 | 例外でthrow | DB接続失敗、ネットワークエラー |

### なぜ分けるか

```typescript
// DomainError: ユーザーが対処可能
// → 「金額を100万円以下にしてください」
class AmountExceededError {
  readonly _tag = 'AmountExceededError';
  constructor(
    readonly actual: Money,
    readonly max: Money
  ) {}
  
  get message(): string {
    return `金額 ${this.actual} は上限 ${this.max} を超えています`;
  }
}

// InfrastructureError: ユーザーには対処不可能
// → 「しばらく待ってから再試行してください」
class DatabaseConnectionError extends Error {
  constructor(cause: Error) {
    super('データベースに接続できません');
    this.cause = cause;
  }
}
```

### 実装パターン

```typescript
// ドメイン層: Result 型
class DraftRingi {
  static create(data: ValidatedInput): Result<DraftRingi, DomainError> {
    // ドメインルールのチェック → Result
  }
  
  async submit(
    repository: RingiRepository,
    clock: Clock
  ): Promise<SubmittedRingi> {
    // InfrastructureError は throw される（境界層でcatch）
    await repository.save(submitted);
    return submitted;
  }
}

// 境界層: 両方を処理
async createRingi(input: UnvalidatedInput): Promise<Response> {
  // バリデーション
  const validation = new RingiInputValidation(input).execute();
  if (!validation.ok) {
    return Response.badRequest(validation.error);  // 400
  }
  
  // ドメインオブジェクト作成
  const draftResult = DraftRingi.create(validation.value);
  if (!draftResult.ok) {
    return Response.conflict(draftResult.error);   // 409
  }
  
  // Command 実行
  try {
    const submitted = await draftResult.value.submit(repository, clock);
    return Response.created({ id: submitted.id });  // 201
  } catch (e) {
    if (e instanceof InfrastructureError) {
      return Response.serverError(e);              // 500
    }
    throw e;  // 予期しないエラーは再throw
  }
}
```

---

## 5.3 Result 型の実装

### 基本実装

```typescript
// Result 型の定義
type Result<T, E> = 
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// ヘルパー関数
const Result = {
  ok<T, E = never>(value: T): Result<T, E> {
    return { ok: true, value };
  },
  
  err<T = never, E = unknown>(error: E): Result<T, E> {
    return { ok: false, error };
  },
};
```

### 使用例

```typescript
function divide(a: number, b: number): Result<number, 'division_by_zero'> {
  if (b === 0) {
    return Result.err('division_by_zero');
  }
  return Result.ok(a / b);
}

const result = divide(10, 2);
if (result.ok) {
  console.log(result.value);  // 5
} else {
  console.log(result.error);  // 'division_by_zero'
}
```

---

# Part 6: 設計ルール集

## 📚 前提知識

**必須:**
- クラスとインターフェースの基本
- 条件分岐の基本

**推奨:**
- SOLID原則の概念
- リファクタリングの経験

---

## 6.1 Interface 優先、継承禁止

### 問題提起: 継承の罠

```typescript
// ❌ 継承を使った設計
class Animal {
  eat() { console.log("食べる"); }
  sleep() { console.log("眠る"); }
}

class Bird extends Animal {
  fly() { console.log("飛ぶ"); }
}

class Penguin extends Bird {
  fly() { 
    throw new Error("ペンギンは飛べません");  // 💥 リスコフの置換原則違反
  }
}

// さらに問題が...
class FlyingFish extends ??? {
  // Fishを継承すべき？Birdを継承すべき？
  // 多重継承はできない！
}
```

**継承の問題点:**

| 問題 | 詳細 |
|------|------|
| **脆い基底クラス問題** | 親クラスを変更すると全ての子クラスが影響を受ける |
| **リスコフの置換原則違反** | 子クラスが親の契約を破る（Penguin.fly()） |
| **多重継承の禁止** | 多くの言語で1つの親しか持てない |
| **is-a の誤用** | 「ペンギンは鳥である」でも「飛ぶ」は継承できない |
| **実装の強制継承** | 親のprivateメソッドの実装に依存 |

### Interface による解決

```typescript
// ✅ Interface + Composition
interface Eater {
  eat(): void;
}

interface Sleeper {
  sleep(): void;
}

interface Flyer {
  fly(): void;
}

interface Swimmer {
  swim(): void;
}

// ペンギン: 食べる、眠る、泳ぐ（飛ばない）
class Penguin implements Eater, Sleeper, Swimmer {
  eat() { console.log("魚を食べる"); }
  sleep() { console.log("立ったまま眠る"); }
  swim() { console.log("高速で泳ぐ"); }
}

// トビウオ: 食べる、眠る、泳ぐ、飛ぶ
class FlyingFish implements Eater, Sleeper, Swimmer, Flyer {
  eat() { console.log("プランクトンを食べる"); }
  sleep() { console.log("浮きながら眠る"); }
  swim() { console.log("泳ぐ"); }
  fly() { console.log("水面から跳ねて滑空する"); }
}
```

### 代替アプローチ比較

| アプローチ | 概要 | 長所 | 短所 | 本スキルでの扱い |
|-----------|------|------|------|-----------------|
| **Interface + Composition** | 振る舞いをInterfaceで定義 | 柔軟、テスト容易 | 設計の手間 | ✅ 採用 |
| **継承** | extends で機能を引き継ぐ | シンプル、コード削減 | 脆い、変更困難 | ❌ 禁止 |
| **Mixin** | 複数のクラスを合成 | 多重継承的 | 言語サポートが限定的 | △ 言語による |
| **Trait** | 振る舞いの再利用 | Scala/Rustで強力 | TypeScriptでは限定的 | △ 言語による |

### 🎭 架空対話: 「コードの重複が増えるのでは？」

**レガシー佐藤:** 「継承を使わないと、共通コードをコピペすることにならない？」

**ミノ駆動さん:** 「いいえ。共通の振る舞いは Composition で再利用します。」

```typescript
// 共通の実装を持つクラス
class StandardEatingBehavior implements Eater {
  eat() { console.log("標準的に食べる"); }
}

// Composition で再利用
class Dog implements Eater, Sleeper {
  private readonly eater = new StandardEatingBehavior();
  
  eat() { this.eater.eat(); }  // 委譲
  sleep() { console.log("丸くなって眠る"); }
}
```

**プラグマティック田中:** 「継承より記述量は増えるけど、各クラスが独立してテストできるし、変更の影響も限定される。」

---

## 6.2 Early Return Only（else 禁止）

### 問題提起: ネストの深い条件分岐

```typescript
// ❌ else を使った深いネスト
function processOrder(order: Order, user: User): Result {
  if (order !== null) {
    if (user !== null) {
      if (user.isActive) {
        if (order.items.length > 0) {
          if (order.total <= user.creditLimit) {
            // ここでやっと本題の処理
            return processPayment(order);
          } else {
            return { error: "与信限度額超過" };
          }
        } else {
          return { error: "商品がありません" };
        }
      } else {
        return { error: "無効なユーザー" };
      }
    } else {
      return { error: "ユーザーが必要です" };
    }
  } else {
    return { error: "注文が必要です" };
  }
}
```

**問題点:**
- 本題の処理がネストの奥深くに隠れている
- エラーケースと正常ケースが混在
- 読む人の認知負荷が高い

### Early Return による解決

```typescript
// ✅ Early Return で平坦に
function processOrder(order: Order | null, user: User | null): Result {
  // ガード節: 異常系を先に処理
  if (order === null) {
    return { error: "注文が必要です" };
  }
  
  if (user === null) {
    return { error: "ユーザーが必要です" };
  }
  
  if (!user.isActive) {
    return { error: "無効なユーザー" };
  }
  
  if (order.items.length === 0) {
    return { error: "商品がありません" };
  }
  
  if (order.total > user.creditLimit) {
    return { error: "与信限度額超過" };
  }
  
  // 本題の処理（ネストなし）
  return processPayment(order);
}
```

### 代替アプローチ比較

| アプローチ | 概要 | 長所 | 短所 | 本スキルでの扱い |
|-----------|------|------|------|-----------------|
| **Early Return** | 異常系を先に return | 平坦、読みやすい | 関数が長くなる可能性 | ✅ 採用 |
| **ネスト if-else** | 条件をネスト | 構造が明確？ | 深いネスト、読みにくい | ❌ 禁止 |
| **三項演算子** | `? :` で分岐 | 短い | 複雑だと読みにくい | △ 単純な場合のみ |
| **Guard Clause** | Early Returnの別名 | 同上 | 同上 | ✅ 同義 |

### else が許容される例外

```typescript
// ✅ 対称的なパス（両方正常系）では else を許容
function getDisplayName(user: User): string {
  if (user.nickname) {
    return user.nickname;
  } else {
    return user.fullName;
  }
}

// ✅ 三項演算子も可
function getDisplayName(user: User): string {
  return user.nickname ?? user.fullName;
}
```

**許容される条件:**
1. 両方とも正常系（エラーではない）
2. 同じ型を返す
3. 単純な値の選択

---

## 6.3 条件式の明確化

### 問題提起: 意味不明な条件式

```typescript
// ❌ 意味が分からない条件式
if (user.age >= 20 && user.country === 'JP' && !user.suspended && user.verifiedAt !== null) {
  // 何を判定しているの？
}

// ❌ マジックナンバー
if (order.total > 10000) {
  applyDiscount(order);
}
```

### 解決策: 意味のある名前を付ける

```typescript
// ✅ 意味のある変数名
const isAdultInJapan = user.age >= 20 && user.country === 'JP';
const isActiveAccount = !user.suspended && user.verifiedAt !== null;
const canPurchaseAlcohol = isAdultInJapan && isActiveAccount;

if (canPurchaseAlcohol) {
  // 意図が明確
}

// ✅ 定数に名前を付ける
const DISCOUNT_THRESHOLD = Money.of(10000);

if (order.total.isGreaterThan(DISCOUNT_THRESHOLD)) {
  applyDiscount(order);
}
```

### 条件式の抽出ルール

| 条件の種類 | 対応 |
|-----------|------|
| 自明な単一条件 | そのまま書いてよい（`if (user === null)`） |
| 意味が不明確な単一条件 | `is_xxx` 変数に抽出 |
| 複合条件（2つ以上） | 意味のある名前の変数に抽出 |
| 複雑なビジネスルール | ルールクラスに抽出（Query） |

### 🎭 架空対話: 「変数を作りすぎでは？」

**レガシー佐藤:** 「毎回変数を作ると、コードが長くなりすぎない？」

```typescript
// 変数だらけになる？
const hasValidEmail = user.email.includes('@');
const hasConfirmedEmail = user.emailConfirmedAt !== null;
const isNotBanned = !user.bannedAt;
const canReceiveNewsletter = hasValidEmail && hasConfirmedEmail && isNotBanned;
```

**プラグマティック田中:** 「確かに行数は増える。でも、1行ずつの意味は明確だよ。」

**ミノ駆動さん:** 「複雑なビジネスルールなら、Query クラスに抽出すべきです。」

```typescript
// ✅ 複雑なルールは Query クラスに
class NewsletterEligibilityCheck {
  constructor(private readonly user: User) {}
  
  get isEligible(): boolean {
    return this.hasValidEmail 
        && this.hasConfirmedEmail 
        && this.isNotBanned;
  }
  
  private get hasValidEmail(): boolean {
    return this.user.email.includes('@');
  }
  
  private get hasConfirmedEmail(): boolean {
    return this.user.emailConfirmedAt !== null;
  }
  
  private get isNotBanned(): boolean {
    return !this.user.bannedAt;
  }
}

// 使用
if (new NewsletterEligibilityCheck(user).isEligible) {
  sendNewsletter(user);
}
```

---

## 6.4 Primitive Obsession の回避

### 問題提起: プリミティブ型の乱用

```typescript
// ❌ プリミティブ型をそのまま使用
function createUser(
  name: string,
  email: string,
  phone: string,
  postalCode: string,
  age: number
): User {
  // email の形式チェックは？
  // phone の形式チェックは？
  // postalCode の形式チェックは？
  // age が負の値だったら？
}

// 使用側で間違える
createUser(
  "tanaka@example.com",  // 💥 name と email を逆に！
  "田中太郎",
  "1234567",              // 💥 郵便番号と電話番号を逆に！
  "090-1234-5678",
  -5                      // 💥 負の年齢！
);
```

### 解決策: 値オブジェクト

```typescript
// ✅ 値オブジェクトで型安全に
class Email {
  private constructor(readonly value: string) {}
  
  static of(value: string): Result<Email, InvalidEmailError> {
    if (!value.includes('@')) {
      return Result.err(new InvalidEmailError(value));
    }
    return Result.ok(new Email(value));
  }
}

class PhoneNumber {
  private constructor(readonly value: string) {}
  
  static of(value: string): Result<PhoneNumber, InvalidPhoneError> {
    const cleaned = value.replace(/-/g, '');
    if (!/^\d{10,11}$/.test(cleaned)) {
      return Result.err(new InvalidPhoneError(value));
    }
    return Result.ok(new PhoneNumber(cleaned));
  }
}

class Age {
  private constructor(readonly value: number) {}
  
  static of(value: number): Result<Age, InvalidAgeError> {
    if (value < 0 || value > 150) {
      return Result.err(new InvalidAgeError(value));
    }
    return Result.ok(new Age(value));
  }
}

// 使用側: 型が違うので間違えられない
function createUser(
  name: UserName,
  email: Email,      // string ではない
  phone: PhoneNumber,
  age: Age
): User {
  // ...
}
```

### 値オブジェクトを作成すべき場合

| 条件 | 例 |
|------|-----|
| フォーマット制約がある | Email, PhoneNumber, PostalCode |
| 範囲制約がある | Age, Percentage, Money |
| 単位がある | Distance (km/m), Weight (kg/g) |
| ドメイン固有の意味がある | UserId, OrderId, ProductCode |
| 同じ型で意味が違う | StartDate/EndDate, FromAccount/ToAccount |

---

## 6.5 Parameters: Max 1-2

### 問題提起: 引数が多すぎる関数

```typescript
// ❌ 引数が多すぎる
function createOrder(
  customerId: string,
  productId: string,
  quantity: number,
  shippingAddress: string,
  billingAddress: string,
  paymentMethod: string,
  discountCode: string | null,
  giftWrapping: boolean,
  deliveryNote: string | null,
  priority: boolean
): Order {
  // ...
}

// 呼び出し: 順番を間違えやすい
createOrder(
  "product-123",    // 💥 customerId と productId を逆に！
  "customer-456",
  2,
  "東京都...",
  "東京都...",
  "credit_card",
  null,
  true,
  null,
  false
);
```

### 解決策: オブジェクトにまとめる

```typescript
// ✅ 関連する引数をオブジェクトにまとめる
interface CreateOrderInput {
  readonly customer: CustomerId;
  readonly product: ProductId;
  readonly quantity: Quantity;
  readonly shipping: ShippingAddress;
  readonly billing: BillingAddress;
  readonly payment: PaymentMethod;
  readonly options: OrderOptions;
}

interface OrderOptions {
  readonly discountCode?: DiscountCode;
  readonly giftWrapping: boolean;
  readonly deliveryNote?: string;
  readonly priority: boolean;
}

function createOrder(input: CreateOrderInput): Order {
  // ...
}

// 呼び出し: 名前付きで分かりやすい
createOrder({
  customer: CustomerId.of("customer-456"),
  product: ProductId.of("product-123"),
  quantity: Quantity.of(2),
  shipping: new ShippingAddress("東京都..."),
  billing: new BillingAddress("東京都..."),
  payment: PaymentMethod.CREDIT_CARD,
  options: {
    giftWrapping: true,
    priority: false,
  },
});
```

### ルール

| 引数の数 | 対応 |
|---------|------|
| 0-2個 | そのままでOK |
| 3個以上 | オブジェクトにまとめることを検討 |
| 同じ型の引数が複数 | 必ず値オブジェクトか構造体に |

---

## 6.6 Named Return Values（タプル禁止）

### 問題提起: タプルの問題

```typescript
// ❌ タプルを返す
function getDateRange(): [Date, Date] {
  return [startDate, endDate];
}

// 使用側: どっちが start でどっちが end？
const [a, b] = getDateRange();
// a が startDate? endDate? 分からない！

// さらに危険: 同じ型のタプル
function getUserInfo(): [string, string, string] {
  return [firstName, lastName, email];
}
// 順番を間違えても型エラーにならない！
```

### 解決策: 名前付きオブジェクト

```typescript
// ✅ 名前付きオブジェクトを返す
interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

function getDateRange(): DateRange {
  return { start: startDate, end: endDate };
}

// 使用側: 明確
const range = getDateRange();
console.log(range.start, range.end);

// ✅ クラスにすることも可能
class DateRange {
  constructor(
    readonly start: Date,
    readonly end: Date
  ) {
    if (start > end) {
      throw new Error("start must be before end");
    }
  }
  
  get durationInDays(): number {
    return (this.end.getTime() - this.start.getTime()) / (1000 * 60 * 60 * 24);
  }
}
```

### 禁止/許容の判断表

| パターン | 判定 | 理由 |
|---------|------|------|
| `[Date, Date]` | ❌ 禁止 | どちらが何か不明 |
| `[string, string]` | ❌ 禁止 | 同じ型で区別不能 |
| `[number, string]` | △ 注意 | 型が違うが意味が不明 |
| `{ start: Date, end: Date }` | ✅ 許容 | 名前で意味が明確 |
| `DateRange` クラス | ✅ 推奨 | バリデーション・メソッド追加可 |

---

# Part 7: アーキテクチャ

## 📚 前提知識

**必須:**
- ディレクトリ構造の基本
- モジュールの概念

**推奨:**
- ドメイン駆動設計の概念
- マイクロサービスの基礎

---

## 7.1 Screaming Architecture

### 問題提起: 何のシステムか分からないディレクトリ構造

```
❌ Bad: 技術レイヤーで分割
src/
├── controllers/
│   ├── UserController.ts
│   ├── OrderController.ts
│   └── ProductController.ts
├── services/
│   ├── UserService.ts
│   ├── OrderService.ts
│   └── ProductService.ts
├── repositories/
│   ├── UserRepository.ts
│   ├── OrderRepository.ts
│   └── ProductRepository.ts
├── entities/
│   ├── User.ts
│   ├── Order.ts
│   └── Product.ts
└── utils/
    └── helpers.ts
```

**問題:** このディレクトリ構造を見て、何のシステムか分かりますか？
- ECサイト？
- 社内システム？
- SNS？

**答え:** 分かりません。技術レイヤーしか見えないからです。

### Screaming Architecture とは

**Robert C. Martin (Uncle Bob)** が提唱した考え方：

> 「アーキテクチャは何のシステムかを叫ぶべきだ（Architecture should scream the intent of the system）」

```
✅ Good: 機能/ドメインで分割
src/
├── catalog/              # 商品カタログ
│   ├── Product.ts
│   ├── ProductRepository.ts
│   └── ProductController.ts
├── ordering/             # 注文管理
│   ├── Order.ts
│   ├── OrderRepository.ts
│   └── OrderController.ts
├── customers/            # 顧客管理
│   ├── Customer.ts
│   ├── CustomerRepository.ts
│   └── CustomerController.ts
├── payments/             # 決済
│   └── ...
└── shipping/             # 配送
    └── ...
```

**このディレクトリ構造を見れば：**
- 「ECサイトだ！」と一目で分かる
- 機能の境界が明確
- チームで担当を分けやすい

### 代替アプローチ比較

| アプローチ | 概要 | 長所 | 短所 | 本スキルでの扱い |
|-----------|------|------|------|-----------------|
| **Screaming Architecture** | 機能/ドメインで分割 | 意図が明確、境界が明確 | 技術レイヤーを跨ぐ | ✅ 採用 |
| **技術レイヤー分割** | controllers/services/... | 伝統的、学習コスト低 | 意図が不明、変更が複数層に | ❌ 禁止 |
| **クリーンアーキテクチャの層** | domain/infra/app | 依存方向が明確 | 小規模には過剰 | △ 概念は参考 |

---

## 7.2 MECE Tree Decomposition

### MECE とは

**MECE (Mutually Exclusive, Collectively Exhaustive):**
- **Mutually Exclusive:** 各要素が重複しない
- **Collectively Exhaustive:** 全体を網羅している

### ディレクトリ構造への適用

```
✅ MECE なディレクトリ構造
src/
├── ringis/           # 稟議（申請）
├── approvals/        # 承認ワークフロー
├── notifications/    # 通知
└── reports/          # レポート

各概念が1つのディレクトリにのみ存在
→ 「この機能はどこにある？」が即座に分かる
```

```
❌ MECE でないディレクトリ構造
src/
├── ringis/
│   └── approval/     # 💥 承認がここにもある
├── approvals/        # 💥 承認がここにもある
└── common/
    └── approval/     # 💥 さらにここにも！
```

### Rule of 5

**各ディレクトリの直接の子は5つ以下にせよ。**

```
✅ Good: 5つ以下
src/
├── catalog/
├── ordering/
├── customers/
├── payments/
└── shipping/

❌ Bad: 多すぎる
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
├── reports/
├── admin/
└── ... 15個以上
```

**多すぎる場合は階層化:**

```
✅ 階層化で整理
src/
├── commerce/           # ECコア
│   ├── catalog/
│   ├── ordering/
│   └── payments/
├── customer-experience/ # 顧客体験
│   ├── reviews/
│   ├── wishlists/
│   └── notifications/
└── operations/         # 運用
    ├── admin/
    └── reports/
```

---

## 7.3 Colocation（同居配置）

### Colocation とは

**関連するファイルを同じディレクトリに配置する**原則です。

```
✅ Colocation: テストはソースと同居
src/
├── ringis/
│   ├── DraftRingi.ts
│   ├── DraftRingi.test.ts       # テストが隣に
│   ├── RingiRepository.ts
│   └── RingiRepository.test.ts
└── approvals/
    ├── ApprovalWorkflow.ts
    └── ApprovalWorkflow.test.ts

❌ 分離: テストが別ディレクトリ
src/
└── ringis/
    ├── DraftRingi.ts
    └── RingiRepository.ts
tests/
└── ringis/
    ├── DraftRingi.test.ts
    └── RingiRepository.test.ts
```

### なぜ Colocation か

| 観点 | 分離配置 | Colocation |
|------|---------|------------|
| ファイル探し | `src/` と `tests/` を行き来 | 同じディレクトリにある |
| 対応関係 | ディレクトリ構造を同期する必要 | 自動的に対応 |
| リファクタリング | ファイル移動時に2箇所修正 | 1箇所のみ |
| 削除 | テストの削除忘れが発生しやすい | 一緒に削除 |

### 例外: フレームワークの制約

一部のフレームワークは特定のディレクトリ構造を要求します：

```
// Jest のデフォルト設定では __tests__/ を認識
// → プロジェクト設定で *.test.ts を認識するように変更

// vitest.config.ts
export default {
  test: {
    include: ['src/**/*.test.ts'],
  },
};
```

---

## 7.4 禁止: 技術レイヤー名のディレクトリ

### 禁止リスト

**ディレクトリ名**に以下を使うな：

```
❌ domain/        ❌ infrastructure/   ❌ application/
❌ presentation/  ❌ usecase/          ❌ entity/
❌ core/          ❌ common/           ❌ shared/
❌ services/      ❌ repositories/     ❌ controllers/
❌ utils/         ❌ helpers/          ❌ lib/
```

### ファイル名・クラス名は OK

```
✅ ファイル名: RingiRepository.ts
✅ クラス名: RingiRepository
❌ ディレクトリ名: repositories/
```

### なぜ禁止か

```
❌ Bad: repositories/ ディレクトリ
src/
├── repositories/
│   ├── UserRepository.ts
│   ├── OrderRepository.ts
│   └── ProductRepository.ts
└── ...

// User に関する変更をするとき：
// - src/entities/User.ts
// - src/repositories/UserRepository.ts
// - src/services/UserService.ts
// - src/controllers/UserController.ts
// → 4つのディレクトリを開く必要がある！
```

```
✅ Good: 機能ベース
src/
├── users/
│   ├── User.ts
│   ├── UserRepository.ts
│   ├── UserService.ts
│   └── UserController.ts
└── ...

// User に関する変更をするとき：
// - src/users/ だけ見ればいい！
```

---

# Part 8: テスト戦略

## 📚 前提知識

**必須:**
- 単体テストの基本（Jest, Vitest 等）
- モックの基本概念

**推奨:**
- 依存性注入の理解
- テストピラミッドの概念

---

## 8.1 依存分類別のテスト戦略

### 依存の4分類とテスト方法

| 分類 | テスト方法 | モック |
|------|-----------|--------|
| **Pure Logic** | 入力→出力を直接テスト | 不要 |
| **Configured Logic** | 設定を変えてテスト | 不要 |
| **External Resource** | InMemory実装を使用 | 必要 |
| **Non-deterministic** | 固定値を注入 | 必要 |

### Pure Logic のテスト

```typescript
// テスト対象
class TaxCalculator {
  calculate(price: Money, rate: TaxRate): Money {
    return price.multiply(rate.value);
  }
}

// テスト: モック不要
describe('TaxCalculator', () => {
  it('税額を計算できる', () => {
    const calculator = new TaxCalculator();
    const result = calculator.calculate(Money.of(1000), TaxRate.of(0.1));
    expect(result.value).toBe(100);
  });
});
```

### External Resource のテスト

```typescript
// テスト対象
class DraftRingi {
  async submit(repository: RingiRepository): Promise<SubmittedRingi> {
    const submitted = new SubmittedRingi(this.id, this.data);
    await repository.save(submitted);
    return submitted;
  }
}

// テスト: InMemory実装を使用
describe('DraftRingi', () => {
  it('申請できる', async () => {
    const repository = new InMemoryRingiRepository();
    const draft = new DraftRingi(RingiId.of('1'), ringiData);
    
    const submitted = await draft.submit(repository);
    
    expect(submitted.id.value).toBe('1');
    expect(await repository.findById(submitted.id)).not.toBeNull();
  });
});
```

---

## 8.2 Test Data Factory

### 問題提起: 共有フィクスチャの問題

```typescript
// ❌ 共有フィクスチャ
// fixtures/users.ts
export const testUsers = {
  admin: new User('admin', 'admin@example.com', 'admin'),
  normalUser: new User('user1', 'user@example.com', 'user'),
  // ...
};

// テストA
describe('AdminPanel', () => {
  it('管理者はアクセスできる', () => {
    const result = canAccess(testUsers.admin);  // 共有データを使用
    expect(result).toBe(true);
  });
});

// テストB（別ファイル）
describe('UserList', () => {
  it('ユーザー一覧を取得できる', () => {
    testUsers.admin.name = 'changed';  // 💥 共有データを変更！
    // ...
  });
});
```

**問題点:**
- テスト間で状態が共有される
- テストの実行順序で結果が変わる
- 1つのテストが他のテストを壊す

### Test Data Factory パターン

```typescript
// ✅ Test Data Factory
// src/users/UserTestFactory.ts（テストと同居）
export const UserTestFactory = {
  admin: (overrides?: Partial<UserData>) => new User({
    id: UserId.generate(),
    name: 'Test Admin',
    email: 'admin@example.com',
    role: 'admin',
    ...overrides,
  }),
  
  normalUser: (overrides?: Partial<UserData>) => new User({
    id: UserId.generate(),
    name: 'Test User',
    email: 'user@example.com',
    role: 'user',
    ...overrides,
  }),
};

// テストA
describe('AdminPanel', () => {
  it('管理者はアクセスできる', () => {
    const admin = UserTestFactory.admin();  // 新しいインスタンス
    const result = canAccess(admin);
    expect(result).toBe(true);
  });
});

// テストB
describe('UserList', () => {
  it('特定の名前のユーザーを検索できる', () => {
    const user = UserTestFactory.normalUser({ name: 'Tanaka' });  // カスタマイズ可能
    // ...
  });
});
```

### Factory の設計ルール

| ルール | 理由 |
|-------|------|
| 毎回新しいインスタンスを返す | テスト間の独立性を保つ |
| デフォルト値を持つ | テストで関係ない値を毎回書かなくていい |
| overrides を受け付ける | テストで必要な値だけ指定できる |
| テストと同居（Colocation） | 関連性が明確、管理しやすい |

---

## 8.3 InMemory Repository

### なぜ InMemory Repository が必要か

```typescript
// テスト対象
class ApproveRingi {
  async execute(
    ringiId: RingiId,
    repository: RingiRepository
  ): Promise<ApprovedRingi> {
    const ringi = await repository.findById(ringiId);
    if (!ringi) throw new RingiNotFoundError(ringiId);
    
    const approved = ringi.approve();
    await repository.save(approved);
    return approved;
  }
}

// ❌ 本物のDBを使ったテスト
describe('ApproveRingi', () => {
  it('稟議を承認できる', async () => {
    // DB接続が必要
    // テストが遅い
    // 他のテストと干渉する可能性
  });
});

// ✅ InMemory Repository を使ったテスト
describe('ApproveRingi', () => {
  it('稟議を承認できる', async () => {
    const repository = new InMemoryRingiRepository();
    const ringi = RingiTestFactory.pending();
    await repository.save(ringi);
    
    const useCase = new ApproveRingi();
    const result = await useCase.execute(ringi.id, repository);
    
    expect(result.status).toBe('approved');
    expect(await repository.findById(ringi.id)).toMatchObject({ status: 'approved' });
  });
});
```

### InMemory Repository の実装

```typescript
// src/ringis/__tests__/InMemoryRingiRepository.ts
class InMemoryRingiRepository implements RingiRepository {
  private readonly storage = new Map<string, Ringi>();
  
  async save(ringi: Ringi): Promise<void> {
    this.storage.set(ringi.id.value, ringi);
  }
  
  async findById(id: RingiId): Promise<Ringi | null> {
    return this.storage.get(id.value) ?? null;
  }
  
  async findAll(): Promise<readonly Ringi[]> {
    return [...this.storage.values()];
  }
  
  // テスト用ヘルパー
  clear(): void {
    this.storage.clear();
  }
}
```

---

## 8.4 Gateway パターン

### 外部サービスの抽象化

```typescript
// ❌ 外部サービスを直接使用
class OrderConfirmation {
  async execute(order: Order): Promise<void> {
    // Stripe を直接使用
    const stripe = new Stripe(process.env.STRIPE_KEY);
    await stripe.charges.create({
      amount: order.total.cents,
      currency: 'jpy',
    });
    
    // SendGrid を直接使用
    const sg = require('@sendgrid/mail');
    await sg.send({
      to: order.customer.email,
      subject: '注文確認',
    });
  }
}

// ✅ Gateway で抽象化
interface PaymentGateway {
  charge(amount: Money): Promise<PaymentResult>;
}

interface NotificationGateway {
  send(to: Email, subject: string, body: string): Promise<void>;
}

class OrderConfirmation {
  async execute(
    order: Order,
    paymentGateway: PaymentGateway,
    notificationGateway: NotificationGateway
  ): Promise<void> {
    await paymentGateway.charge(order.total);
    await notificationGateway.send(order.customer.email, '注文確認', '...');
  }
}
```

### テストダブルの種類

| 種類 | 用途 | 例 |
|------|------|-----|
| **Fake** | ステートフル、実際に動作する偽物 | InMemoryRepository |
| **Stub** | 固定値を返す | StubPaymentGateway（常に成功） |
| **Mock** | 呼び出しを検証 | MockNotificationGateway |
| **Spy** | 呼び出しを記録 | SpyLogger |

### テストダブルの選択基準

| 外部サービスの種類 | 推奨するテストダブル |
|------------------|---------------------|
| ストレージ（S3, DB） | Fake（ステートフル） |
| 通知（Email, Slack） | Mock（送信を検証） |
| 決済（Stripe, PayPal） | Stub（成功/失敗を制御） |
| 認証（OAuth, JWT） | Stub（トークンを固定） |

---

## 8.5 テストピラミッド

```
        /\
       /  \      E2E テスト（少数）
      /----\
     /      \    統合テスト（中程度）
    /--------\
   /          \  単体テスト（多数）
  /------------\
```

| テスト種別 | 対象 | 速度 | 信頼性 | 本数 |
|-----------|------|------|--------|------|
| **単体テスト** | Query, Transition, Pure Logic | 速い | 高い | 多い |
| **統合テスト** | Command + Repository | 中程度 | 中程度 | 中程度 |
| **E2Eテスト** | システム全体 | 遅い | やや低い | 少ない |

---

# Appendix A: クイックリファレンス

## A.1 4分類の判断チャート

```
このクラスは...
├─ 外部リソースにアクセスする？
│   ├─ YES + 書き込み → Command
│   └─ YES + 読み取りのみ → ReadModel
│
└─ NO（純粋関数）
    ├─ 型が変わる？ → Transition
    └─ 計算・判定？ → Query
```

## A.2 Polymorphism の判断チャート

```
この分岐は...
├─ 各分岐で異なる計算ロジック？
│   └─ NO → if/switch OK
│
├─ 各分岐を独立テストしたい？
│   └─ NO → if/switch OK
│
├─ 今後分岐が追加される？
│   └─ NO → if/switch OK
│
└─ 上記全て YES → Polymorphism 必須
```

## A.3 依存の生成方法チャート

```
この依存は...
├─ 外部リソースにアクセス？
│   └─ YES → メソッド引数
│
├─ 実行ごとに結果が変わる？
│   └─ YES → メソッド引数
│
├─ 設定値に依存？
│   └─ YES → Config経由でコンストラクタ内生成
│
└─ 上記全て NO → コンストラクタ内で new
```

## A.4 チェックリスト

### 新規クラス作成時

- [ ] 4分類（Command/Transition/Query/ReadModel）のいずれかに分類したか
- [ ] 完全コンストラクタになっているか
- [ ] 継承を使っていないか（Interface + Composition を使用）
- [ ] 引数は2個以下か

### コードレビュー時

- [ ] else を使っていないか（Early Return を使用）
- [ ] switch で振る舞いを分岐していないか（Polymorphism を検討）
- [ ] プリミティブ型を乱用していないか（値オブジェクトを検討）
- [ ] 条件式に名前が付いているか
- [ ] ディレクトリ名が技術レイヤー名ではないか

### テスト作成時

- [ ] Pure Logic は直接テストしているか（モック不要）
- [ ] External Resource には InMemory 実装を使用しているか
- [ ] 共有フィクスチャを使っていないか（Test Data Factory を使用）
- [ ] テストファイルがソースと同居しているか

---

## A.5 用語集

| 用語 | 意味 |
|------|------|
| **Command** | 永続状態を変更するクラス |
| **Query** | 純粋な計算を行うクラス |
| **Transition** | 型変換を行うクラス |
| **ReadModel** | 読み取り専用でデータを取得するクラス |
| **完全コンストラクタ** | 生成時点でオブジェクトが完全に有効 |
| **Pending Object Pattern** | 状態遷移を型で表現するパターン |
| **Polymorphism** | インターフェースと実装クラスによる多態性 |
| **Early Return** | 異常系を先に return して抜けるパターン |
| **Result型** | 成功/失敗を型で表現する仕組み |
| **DomainError** | ビジネスルール違反のエラー |
| **InfrastructureError** | 技術的障害のエラー |
| **Screaming Architecture** | ディレクトリ構造がシステムの意図を叫ぶ |
| **MECE** | 重複なく、漏れなく分類すること |
| **Colocation** | 関連ファイルを同じディレクトリに配置 |
| **Test Data Factory** | テストデータを生成するファクトリ関数 |
| **InMemory Repository** | メモリ上で動作するテスト用 Repository |
| **Gateway** | 外部サービスを抽象化するインターフェース |

---

## A.6 参考文献

| 書籍/リソース | 関連セクション |
|--------------|---------------|
| 『Clean Code』 Robert C. Martin | 全般 |
| 『Clean Architecture』 Robert C. Martin | Part 7 |
| 『ドメイン駆動設計入門』 成瀬允宣 | Part 1, Part 2 |
| 『リファクタリング』 Martin Fowler | Part 3, Part 6 |
| 『テスト駆動開発』 Kent Beck | Part 8 |
| 『実践ドメイン駆動設計』 Vaughn Vernon | Part 1 |

---

# Appendix B: よくある質問（FAQ）

## B.1 分類に関する質問

### Q: Command と Transition の違いが分かりません

**A:** 最も重要な違いは「副作用があるかどうか」です。

| 分類 | 副作用 | 外部リソース | 例 |
|------|--------|-------------|-----|
| Command | あり | Repository等を使う | `DraftRingi.submit(repo)` |
| Transition | なし | 使わない | `RingiInputValidation.execute()` |

**判断のコツ:**
- DBに保存する？ → Command
- APIを呼ぶ？ → Command
- 純粋に計算/変換するだけ？ → Transition

### Q: Query と ReadModel の違いが分かりません

**A:** 外部リソースにアクセスするかどうかです。

| 分類 | 外部リソース | テスト方法 | 例 |
|------|-------------|-----------|-----|
| Query | なし | モック不要 | `TaxCalculator.calculate()` |
| ReadModel | あり | モック必要 | `RingisForApprover.execute()` |

### Q: 1つのクラスが2つの分類に該当する場合は？

**A:** それはクラスの責務が大きすぎるサインです。分割を検討してください。

```typescript
// ❌ 2つの責務が混在
class OrderProcessor {
  process(order: Order): ProcessedOrder {
    // 計算（Query的）
    const tax = this.calculateTax(order);
    
    // 保存（Command的）
    this.repository.save(order);
  }
}

// ✅ 分割
class TaxCalculation {
  calculate(order: Order): Money { ... }  // Query
}

class OrderConfirmation {
  async confirm(order: Order, repo: OrderRepository) { ... }  // Command
}
```

---

## B.2 実装に関する質問

### Q: 全てのクラスに Interface が必要ですか？

**A:** いいえ。以下の場合に Interface を作成します：

| 場面 | Interface |
|------|-----------|
| テストでモックが必要 | 必要 |
| 複数の実装がある | 必要 |
| 外部ライブラリをラップ | 必要 |
| 純粋なロジック（Query等） | 不要なことが多い |

### Q: Result 型は毎回書くのが面倒です

**A:** ライブラリを使うか、プロジェクトで共通の Result 型を定義してください。

```typescript
// プロジェクト共通の Result 型
// src/Result.ts
export type Result<T, E> = 
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Result = {
  ok: <T>(value: T): Result<T, never> => ({ ok: true, value }),
  err: <E>(error: E): Result<never, E> => ({ ok: false, error }),
};
```

### Q: レガシーコードにどう適用すればいい？

**A:** 段階的に適用してください：

1. **新規コード** → 本スキルに従う
2. **変更するコード** → 変更部分のみリファクタリング
3. **大規模リファクタ** → チームで合意後、モジュール単位で

**絶対にやってはいけないこと:**
- 一度に全てを変更しようとする
- 動いているコードを理由なく変更する

---

## B.3 テストに関する質問

### Q: InMemory Repository は全ての Repository に必要？

**A:** はい。本スキルでは、すべての Repository に InMemory 実装を要求します。

**理由:**
- 単体テストが高速になる
- テストの独立性が保たれる
- 本番DBへの依存がなくなる

### Q: E2E テストは不要ですか？

**A:** いいえ、必要です。ただし、数を絞ります。

```
テストピラミッド:
- 単体テスト: 70%（多く、高速）
- 統合テスト: 20%
- E2E テスト: 10%（少なく、重要なシナリオのみ）
```

### Q: モックとスタブの違いは？

**A:**

| 種類 | 目的 | 検証方法 |
|------|------|---------|
| **Stub** | 固定の戻り値を返す | 戻り値をテスト |
| **Mock** | 呼び出しを記録・検証 | 呼び出しをテスト |

```typescript
// Stub: 固定値を返す
const stubPayment: PaymentGateway = {
  charge: async () => ({ success: true, transactionId: 'test-123' }),
};

// Mock: 呼び出しを検証
const mockNotification = {
  send: jest.fn(),
};
// テスト後
expect(mockNotification.send).toHaveBeenCalledWith(
  expect.objectContaining({ to: 'user@example.com' })
);
```

---

## B.4 設計判断に関する質問

### Q: Polymorphism と switch のどちらを使うべき？

**A:** 以下の3つの質問で判断してください：

1. 各分岐で**異なる計算ロジック**がある？
2. 各分岐を**独立してテスト**したい？
3. 今後、分岐が**追加される可能性**がある？

**全て NO → switch で OK**
**1つでも YES → Polymorphism を検討**

### Q: ディレクトリ構造はどこまで細かく分ける？

**A:** Rule of 5 に従います：

- 各ディレクトリの直接の子は5つ以下
- 超える場合は階層化で整理

```
✅ Good: 5つ以下
src/
├── catalog/
├── ordering/
├── customers/
├── payments/
└── shipping/

❌ Bad: 10個以上
→ 上位の概念でグループ化
```

### Q: このルールは絶対ですか？

**A:** いいえ。本スキルのルールは「ガイドライン」であり、「法律」ではありません。

**優先順位:**
1. 言語/フレームワークの制約
2. 本スキルのルール
3. チームの合意
4. 個人の好み

「なぜこのルールがあるか」を理解した上で、適切に判断してください。

---

# Appendix C: 実践例

## C.1 稟議システムの例

本書で一貫して使用してきた「稟議システム」の全体像です。

### ディレクトリ構造

```
src/
├── ringis/                    # 稟議
│   ├── DraftRingi.ts
│   ├── DraftRingi.test.ts
│   ├── SubmittedRingi.ts
│   ├── ApprovedRingi.ts
│   ├── RingiRepository.ts
│   ├── RingiInputValidation.ts
│   ├── RingiInputValidation.test.ts
│   ├── RingiTestFactory.ts
│   └── __tests__/
│       └── InMemoryRingiRepository.ts
├── approvals/                 # 承認ワークフロー
│   ├── ApprovalWorkflow.ts
│   ├── ApprovalRoute.ts
│   └── ...
├── notifications/             # 通知
│   ├── NotificationGateway.ts
│   ├── SlackNotification.ts
│   └── ...
└── Money.ts                   # 全ドメインで使用 → src/ 直下
```

### クラス分類

| クラス | 分類 | 責務 |
|--------|------|------|
| DraftRingi | Command | 起案稟議を申請する |
| SubmittedRingi | Command | 申請済み稟議を承認/却下する |
| RingiInputValidation | Transition | 入力を検証する |
| TaxCalculation | Query | 税額を計算する |
| RingisForApprover | ReadModel | 承認者の稟議一覧を取得 |

---

# 終わりに

本書では、Strict Refactoring Skill の各ルールについて「なぜ」を詳しく解説しました。

**覚えておいてほしいこと:**

1. **ルールは目的ではなく手段** - 良いコードを書くための道具
2. **例外は存在する** - 「いつ適用しないか」も重要
3. **理解して適用する** - 盲目的に従わない
4. **チームで合意する** - 1人で決めない

設計に正解はありません。しかし、一貫したルールがあることで、チームのコミュニケーションが円滑になり、コードの品質が向上します。

本書が、あなたの設計スキル向上の一助となれば幸いです。

---

**Happy Coding! 🚀**

