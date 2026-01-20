---
name: strict-refactoring
description: コード修正、リファクタリング、設計相談を受けた際に使用。早期リターン、Interface優先設計、概念ベースのMECE構造化を適用する。
---

<!--
  CLAUDE.md や README.md に転記する場合:
  - 上記の --- で囲まれたメタデータ部分は削除してよい
  - 「# Strict Refactoring Skill」から記載する
-->

# Strict Refactoring Skill

## 対象言語
OOP を主軸とし、部分的に関数型の考えを導入している言語:
- Java, Kotlin, Scala
- C#, F#
- TypeScript, JavaScript
- Python
- Swift
- Go
- Rust

**純粋関数型言語（Haskell, Elixir, Clojure等）は対象外。**

### 言語別の適用度合い

| 言語 | 適用度 | 注意点 |
|------|--------|--------|
| Java/Kotlin/C# | 高 | 本スキルに最も適合 |
| TypeScript/Python | 高 | 型チェッカー（mypy等）の導入を推奨 |
| Swift | 高 | struct優先 |
| Go | 中 | 下記「Go での緩和ルール」参照 |
| Rust | 中 | 所有権システムとの兼ね合いで柔軟に適用。match式は許容 |

### Go での緩和ルール

Go はシンプルさを重視する文化を持つ。以下のルールを緩和せよ:

| 本スキルのルール | Go での扱い |
|------------------|-------------|
| 条件式の変数抽出 | `if err != nil` は抽出不要。そのまま書いてよい |
| interface 優先 | 先行定義不要。2つ以上の実装が必要になった時点で抽出せよ |
| 小さなクラス分割 | 過度な struct 分割より、明快な関数を優先してよい |
| デメテルの法則 | receiver methods のチェーン（`obj.Method().Method()`）は許容 |
| Polymorphism | 単純な type switch は許容（interface が過剰な場合） |

## 大原則
1. **本スキルのルールを優先せよ。** FWが構文レベルで強制する場合のみ例外を許容する。
2. **テストのためだけに設計を歪めるな。** ただしDIによる疎結合は「テストのため」ではなく「良い設計」である。
3. **イミュータブルを優先せよ。** 状態変更は最小限に、変更時は新しいオブジェクトを返す。

※「テストのために歪める」の例: privateをpublicにする、不要なgetterを追加する、等

## 1. Small Classes with Single Responsibility

### クラス優先、関数は従属
ビジネスロジックは小さな単一責任クラスで表現せよ。

**理由1: 表現力の差**
関数は V(Verb) または VO(VerbObject) の表現力しか持たない。
クラスは SV(SubjectVerb) または SVO(SubjectVerbObject) を表現でき、可読性が高い。

```python
# ❌ 関数: 誰が何をするか不明確
validate(order)
calculate_shipping(order, address)

# ✅ クラス: 主語が明確
OrderValidator().validate(order)
ShippingCostCalculator(tax_rate).calculate(order, address)
```

**理由2: パラメータ爆発の回避**
関数は全ての依存を引数で受け取る必要があり、パラメータが爆発する。
クラスはコンストラクタで依存を保持するため、メソッドの引数は少なくて済む。

```python
# ❌ 関数: パラメータ爆発
def process_order(order, validator, calculator, notifier, repository):
    ...

# ✅ クラス: メソッドの引数は少ない
class OrderProcessor:
    def __init__(self, config: OrderProcessorConfig):
        self._validator = OrderValidator(config.rules)
        self._calculator = PriceCalculator(config.tax_rate)
        self._notifier = EmailNotifier(config.smtp)
        self._repository = OrderRepository(config.db)

    def process(self, order: Order):  # 引数は1つだけ
        ...
```

| 言語 | カプセル化単位 |
|------|---------------|
| Java/TS/C#/Kotlin | class |
| Python | class / dataclass |
| Swift | struct / class |
| Go | struct + methods |
| Rust | struct + impl |

### 完全コンストラクタ (Complete Constructor)

**オブジェクトは生成された時点で完全に有効な状態にせよ。**

```python
# ❌ Bad: 依存を外から注入（不完全な状態を許容）
class OrderProcessor:
    def __init__(self, validator: OrderValidator, calculator: PriceCalculator):
        self._validator = validator  # Noneかもしれない
        self._calculator = calculator  # 不正な状態かもしれない

# ✅ Good: 完全コンストラクタ
class OrderProcessor:
    def __init__(self, config: OrderProcessorConfig):
        # バリデーション - 不正なら生成させない
        if not config.tax_rate or config.tax_rate < 0:
            raise InvalidConfigError("tax_rate must be positive")
        # 依存を内部で生成 - 有効な状態が保証される
        self._validator = OrderValidator(config.rules)
        self._calculator = PriceCalculator(config.tax_rate)
```

**適用範囲:**

| クラスの種類 | 方針 |
|-------------|------|
| 値オブジェクト（Money, Address等） | 完全コンストラクタ。バリデーションは `__post_init__` で |
| ビジネスロジック（Calculator, Rule等） | 完全コンストラクタ。設定値のみ受け取る |
| コラボレータを持つクラス（Processor等） | DIを許容。ただしコンストラクタでnullチェックせよ |
| インフラ境界（Repository, Client等） | 外部リソースの受け取りを許容 |

```python
# 値オブジェクト: 完全コンストラクタ + __post_init__
@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: Currency  # strではなくenum

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("amount must be non-negative")

# コラボレータを持つクラス: DI許容（テスト可能性のため）
class OrderProcessor:
    def __init__(self, repository: OrderRepository, notifier: OrderNotifier):
        if repository is None or notifier is None:
            raise ValueError("dependencies must not be None")
        self._repository = repository
        self._notifier = notifier
```

**Factory は単純なケースでは作るな。** コンストラクタで直接生成せよ。
複雑な生成ロジックが必要になったら導入する（YAGNI）。

### Naming: SV / SVO
```
✅ Good: OrderValidator, EmailSender, PaymentCalculator, PriceFormatter
❌ Bad:  Manager, Util, Helper, Base, Common, Service
```

**例外:** 言語/FW標準の命名（Go `http.Handler`, Java `Runnable` 等）は許容。

## 2. Polymorphism over Switch/Enum

### switch/if-else/enum は Polymorphism に置き換えよ

```python
# ❌ Bad: if-elif - 変更のたびに全分岐を探して修正
class PaymentProcessor:
    def charge(self, payment_type: PaymentType, amount: Money) -> Receipt:
        if payment_type == PaymentType.CREDIT_CARD:
            ...
        elif payment_type == PaymentType.BANK_TRANSFER:
            ...

# ✅ Good: Polymorphism - 新クラス追加だけで拡張可能
class PaymentMethod(Protocol):
    def charge(self, amount: Money) -> Receipt: ...

class CreditCardPayment:
    def charge(self, amount: Money) -> Receipt: ...

class BankTransferPayment:
    def charge(self, amount: Money) -> Receipt: ...

class PaymentProcessor:
    def process(self, method: PaymentMethod, amount: Money) -> Receipt:
        return method.charge(amount)
```

**Open-Closed Principle:** 拡張に開いて、修正に閉じよ。

### enum vs Polymorphism の判断基準

| 振る舞い | 選択 | 理由 |
|---------|------|------|
| **なし** | enum | 単なる識別子。分岐も不要 |
| **あり** | Polymorphism | 各バリアントに固有のロジックがある |

```python
# ✅ enum: 振る舞いなし（状態の識別のみ）
class OrderStatus(Enum):
    PENDING = auto()
    CONFIRMED = auto()
    SHIPPED = auto()

order.status = OrderStatus.CONFIRMED  # 単なる状態設定

# ✅ Polymorphism: 振る舞いあり（各種類に固有のロジック）
class PaymentMethod(Protocol):
    def charge(self, amount: Money) -> Receipt: ...
    def refund(self, receipt: Receipt) -> None: ...

class CreditCardPayment:
    def charge(self, amount: Money) -> Receipt:
        # クレジットカード固有の決済ロジック
        ...
```

**原則:** ビジネスロジックがあるなら、常に Polymorphism を選べ。
enum + switch/match で分岐するコードは、将来の拡張で必ず破綻する。

**許可される例外:**
- ADTのパターンマッチング（Rust `match`, Python `match/case` on dataclass）
- 境界での値変換（下記参照）

### 境界での値変換（switch/match 許容）

以下の場合は switch/match を許容する:

| 場所 | 例 |
|------|-----|
| JSON → enum | `case _EXTERNAL_ACTIVE: return Status.ACTIVE` |
| DB → enum | `case _DB_TYPE_NORMAL: return OrderType.NORMAL` |
| HTTP status | `case http.StatusOK: ...` |
| 外部API変換 | 外部システムのコード値を内部型に変換 |

**条件:** 変換ロジックのみで、ビジネスロジックを含まないこと。
分岐内で処理を行う場合は Polymorphism を使え。

```python
# ✅ OK: 境界変換（外部フォーマットの文字列リテラルは許容）
class StatusParser:
    # 外部API/DBのフォーマットを定数化
    _EXTERNAL_ACTIVE = "active"
    _EXTERNAL_INACTIVE = "inactive"

    def parse(self, value: str) -> Status:
        match value:
            case self._EXTERNAL_ACTIVE: return Status.ACTIVE
            case self._EXTERNAL_INACTIVE: return Status.INACTIVE
            case _: raise ValueError(f"Unknown status: {value}")

# ❌ NG: 分岐内でビジネスロジック → Polymorphism を使え
class OrderProcessor:
    def process(self, status: Status):  # 内部型を受け取る
        match status:
            case Status.ACTIVE: ...   # NG: ビジネスロジックを分岐で書くな
            case Status.INACTIVE: ...  # NG: Polymorphism を使え
```

## 3. Interface優先、継承禁止

**Abstract Class / 継承は使うな。** Composition over Inheritance。

| 言語 | 推奨 | 禁止 |
|------|------|------|
| Java/TS/C# | Interface + 実装クラス | abstract class, extends |
| Kotlin | Interface + data class | open class継承 |
| Python | Protocol + class | ABC継承, class継承 |
| Swift | Protocol + struct | class継承 |
| Go | interface + struct | 埋め込みによる擬似継承 |
| Rust | Trait + struct | - |

**唯一の例外:** フレームワークが継承を強制する場合（Django Model, Android Activity等）

## 4. Early Return Only

`else` 句は原則使うな。ガード節で処理せよ。

```python
# ❌ Bad: else句
class OrderProcessor:
    def process(self, order: Order):
        if order.is_valid():
            self._execute(order)
        else:
            self._reject(order)

# ✅ Good: ガード節
class OrderProcessor:
    def process(self, order: Order):
        if not order.is_valid():
            self._reject(order)
            return
        self._execute(order)
```

**例外:** 両パスが正常系で対称的な場合は `else` または三項演算子を許容する。

```python
# ✅ OK: 両パス正常系で対称的
class DiscountRateResolver:
    _GOLD_MEMBER_RATE = Decimal("0.2")
    _STANDARD_RATE = Decimal("0.1")

    def resolve(self, member: Member) -> Decimal:
        if member.is_gold():
            return self._GOLD_MEMBER_RATE
        else:
            return self._STANDARD_RATE

# ✅ OK: 三項演算子（クラスメソッド内で使用）
class DiscountRateResolver:
    _GOLD_MEMBER_RATE = Decimal("0.2")
    _STANDARD_RATE = Decimal("0.1")

    def resolve(self, member: Member) -> Decimal:
        return self._GOLD_MEMBER_RATE if member.is_gold() else self._STANDARD_RATE
```

### 「対称的なパス」の条件

以下の**すべて**を満たす場合のみ `else` を許容:
1. 両方が正常系である（片方がエラー/例外処理ではない）
2. 両方の処理量がほぼ同じ（1-3行程度）
3. 両方が同じ型を返す
4. 論理的に排他的な2択である

```python
# ✅ 対称的: 条件を満たす
class DiscountRateResolver:
    _GOLD_MEMBER_RATE = Decimal("0.2")
    _STANDARD_RATE = Decimal("0.1")

    def resolve(self, member: Member) -> Decimal:
        if member.is_gold():
            return self._GOLD_MEMBER_RATE
        else:
            return self._STANDARD_RATE

# ❌ 非対称: 片方がエラー処理 → Early Return を使え
class UserFinder:
    def __init__(self, repository: UserRepository):
        self._repository = repository

    def find(self, user_id: int) -> User:
        if user_id is None:
            raise ValueError("user_id is required")  # エラー処理
        else:
            return self._repository.find(user_id)  # 正常処理

# ✅ 修正後
class UserFinder:
    def __init__(self, repository: UserRepository):
        self._repository = repository

    def find(self, user_id: int) -> User:
        if user_id is None:
            raise ValueError("user_id is required")
        return self._repository.find(user_id)
```

## 5. 条件式の明確化

### 条件の種類に応じて抽出せよ

| 条件の種類 | 対応 |
|-----------|------|
| 自明な単一条件 | そのまま書いてよい |
| 意味が不明確な単一条件 | `is_xxx` 変数に抽出せよ |
| 複合条件（2つ以上） | ルールクラス（ポリシーパターン）に抽出せよ |

```python
# ✅ OK: 自明な単一条件はそのまま（クラスメソッド内で）
class OrderProcessor:
    def process(self, order: Order):
        if order.status == OrderStatus.CONFIRMED:
            ...
        if order is None:
            raise NotFoundError()

# ✅ Good: 意味が不明確な単一条件 → 変数
class DiscountApplier:
    _DISCOUNT_ELIGIBILITY_THRESHOLD = Money(Decimal("10000"), Currency.JPY)

    def apply(self, customer: Customer, order: Order):
        is_eligible_for_discount = customer.total_purchases > self._DISCOUNT_ELIGIBILITY_THRESHOLD
        if is_eligible_for_discount:
            ...

# ✅ Good: 複合条件 → ルールクラス
class ShippingEligibilityRule:
    def __init__(self, order: Order):
        self._order = order

    def is_satisfied(self) -> bool:
        return (
            self._order.status == OrderStatus.CONFIRMED
            and self._order.payment_completed
            and not self._order.is_cancelled
        )

class ShippingProcessor:
    def __init__(self, shipper: Shipper):
        self._shipper = shipper

    def process(self, order: Order):
        if ShippingEligibilityRule(order).is_satisfied():
            self._shipper.ship(order)
```

### 「自明」の定義

以下のパターンは「自明」とみなし、変数抽出不要:
- null/nil チェック: `x is None`, `x == null`, `x != nil`
- 空チェック: `len(x) == 0`, `x.is_empty()`, `not x`
- 存在チェック: `x in collection`, `key in dict`
- enum等値比較: `status == OrderStatus.CONFIRMED`, `type == OrderType.NORMAL`
- 単純な数値比較: `count > 0`, `age >= 18`, `len(items) < 10`
- 真偽値そのもの: `is_active`, `not is_deleted`

以下は「不明確」とみなし、`is_xxx` 変数に抽出せよ:
- ビジネスルールを含む比較: `total_purchases > 10000`（なぜ10000？）
- 計算を含む比較: `order.total * 0.1 > shipping_cost`
- ドメイン知識が必要な比較: `user.created_at < thirty_days_ago`

## 6. 関数の一貫性

### 3種類の関数
1つの関数は以下のいずれか1種類の責務のみを持たせよ:

| 種類 | 責務 | selfの使い方 |
|------|------|-------------|
| **Calculator** | 純粋な計算 | 不変の設定値のみ参照可（※） |
| **Executor** | 副作用の実行 | コラボレータの呼び出し |
| **Orchestrator** | 調整 | Calculator/Executorの組み合わせ |

※ Calculator内での `self._tax_rate` 等の参照は許容。ただしその値はコンストラクタで設定され、以降不変であること。

**Orchestratorで許可されるパターン:**
- Calculator → Executor
- Calculator → Calculator → Executor
- Executor → Executor（複数の副作用を順次実行）
- Calculator → 条件分岐 → Executor

```python
# ❌ Bad: 異なる責務が混在
class OrderProcessor:
    def process(self, order: Order):
        price = PriceCalculator().calculate(order)  # Calculator呼び出し
        tax = self._tax_calc.calculate(order)       # 別のCalculator
        self._repository.save(order)                # Executor（副作用）

# ✅ Good: 役割ごとに分離
class SubtotalCalculator:
    def calculate(self, items: list[OrderItem]) -> Money:
        return sum(item.price * item.quantity for item in items)

class TaxCalculator:
    def __init__(self, tax_rate: Decimal):
        self._tax_rate = tax_rate

    def calculate(self, subtotal: Money) -> Money:
        return subtotal * self._tax_rate

class OrderProcessor:
    def __init__(self, tax_rate: Decimal, repository: OrderRepository):
        self._subtotal_calc = SubtotalCalculator()
        self._tax_calc = TaxCalculator(tax_rate)
        self._repository = repository

    # Calculator: 純粋な計算のみ
    def _calculate_total(self, order: Order) -> Money:
        subtotal = self._subtotal_calc.calculate(order.items)
        tax = self._tax_calc.calculate(subtotal)
        return subtotal + tax

    # Executor: 副作用のみ
    def _persist(self, order: Order):
        self._repository.save(order)

    # Orchestrator: 調整役
    def process(self, order: Order):
        total = self._calculate_total(order)
        final_order = order.with_total(total)
        self._persist(final_order)
```

### デメテルの法則
ドットチェーンは1つまでにせよ。

```python
# ❌ Bad: ドット2つ以上
self._order.customer.address.city

# ✅ Good: ドット1つまで
self._order.get_shipping_city()
```

### 行数目安
10行以内にせよ。上記の分類に従えば自然と短くなる。

## 7. Primitive Obsession の回避

### 値オブジェクトを作成すべき場合

以下の**いずれか**に該当すればプリミティブを専用型にせよ:

| 条件 | 例 |
|------|-----|
| 単位がある | 金額(Money)、距離(Distance)、重量(Weight)、期間(Duration) |
| フォーマット制約がある | 電話番号、メールアドレス、郵便番号、UUID |
| 値域制約がある | 0-100のスコア(Score)、正の数量(Quantity)、パーセンテージ(Percentage) |
| 同じ型で意味が異なる値が複数ある | UserId と OrderId（両方int）、Email と Name（両方str） |

以下は **プリミティブのままでよい**:
- ループカウンタ、配列インデックス
- 一時的な計算の中間結果
- 外部API境界で即座に変換される値
- 言語標準の日付/時刻型（Date, DateTime等）

```python
# ❌ Bad: プリミティブ引数
class PaymentProcessor:
    def charge(self, amount: float, currency: str): ...

# ✅ Good: 値オブジェクトを使用
@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: Currency

class PaymentProcessor:
    def charge(self, money: Money): ...
```

### マジックナンバー/文字列は名前付き定数にせよ

```python
# ❌ Bad: マジックナンバー
class ApiClient:
    def fetch(self):
        if self._retry_count > 3:
            raise TooManyRetriesError()

# ✅ Good: 名前付き定数
class ApiClient:
    _MAX_RETRY_COUNT = 3

    def fetch(self):
        if self._retry_count > self._MAX_RETRY_COUNT:
            raise TooManyRetriesError()
```

### 定数のコロケーション
定数はスコープに応じて配置せよ。使われる範囲の最小スコープに置く。

```
src/
├── ordering/
│   ├── constants.py           # ordering全体で使う定数
│   ├── checkout/
│   │   ├── constants.py       # checkout内でのみ使う定数
│   │   └── checkout.py        # このファイル内でのみ使う定数はクラス/モジュール内で定義
```

```python
# ファイル内でのみ使う定数 → ファイル先頭またはクラス内
class OrderProcessor:
    _MAX_ITEMS_PER_ORDER = 100  # このクラス内でのみ使用

# 複数ファイルで使う定数 → 親ディレクトリの constants.py
# ordering/constants.py
ORDER_EXPIRY_DAYS = 30
```

## 8. Parameters: Max 1-2

引数は原則1-2個にせよ。3つ以上は Parameter Object にまとめよ。

## 9. Directory Structure: Concept-based MECE Tree

### 禁止: アーキテクチャレイヤー名

**ディレクトリ名**に以下の「技術的レイヤー名」を使うな:

```
❌ domain/        ❌ infrastructure/   ❌ application/
❌ presentation/  ❌ usecase/          ❌ entity/
❌ core/          ❌ common/           ❌ shared/
❌ services/      ❌ repositories/     ❌ controllers/
```

**ファイル名・クラス名**には技術的役割を含めてよい:

```
✅ order_repository.py    # ファイル名はOK
✅ OrderRepository        # クラス名はOK
❌ repositories/order.py  # ディレクトリ名はNG
```

**例外:** FWがディレクトリ構造を強制する場合のみ許容
- Rails: `app/controllers/`, `app/models/` → 強制されるので許容。ただしその中を概念で分割せよ
- Django: `app/views.py`, `app/models.py` → 強制されるので許容。ただしファイル内を概念で分割せよ
- Spring/FastAPI: 強制ではないので本ルールに従え

### Screaming Architecture

ディレクトリを見れば「何のシステムか」が分かるようにせよ。

```
❌ Bad: 何のシステムか不明
src/
├── domain/
├── infrastructure/
└── application/

✅ Good: ECサイトだと一目で分かる
src/
├── catalog/
├── ordering/
├── customers/
├── payments/
└── fulfillment/
```

### MECE Tree Decomposition

**原則（厳守せよ）:**
1. 各概念は1つの分類にのみ属させよ (Mutually Exclusive)
2. 全ての概念がいずれかの分類に属させよ (Collectively Exhaustive)
3. 各ディレクトリの子は5つ以下にせよ (Rule of 5)

**例: ECサイト（100+概念）の分解**

```
src/
├── catalog/                    # 商品カタログ
│   ├── products/              #   商品・バリエーション・価格
│   ├── categories/            #   カテゴリ・ブランド・タグ
│   ├── inventory/             #   在庫・倉庫
│   ├── reviews/               #   レビュー・評価
│   └── search/                #   検索・フィルタ
│
├── ordering/                   # 注文
│   ├── cart/                  #   カート・カートアイテム
│   ├── checkout/              #   購入手続き・バリデーション
│   ├── orders/                #   注文・明細・ステータス・履歴
│   └── returns/               #   返品・返金・キャンセル
│
├── customers/                  # 顧客
│   ├── accounts/              #   アカウント・認証・プロフィール
│   ├── addresses/             #   住所・住所検証
│   ├── preferences/           #   お気に入り・閲覧履歴・通知設定
│   └── loyalty/               #   ポイント・会員ランク・特典
│
├── payments/                   # 決済
│   ├── methods/               #   クレジットカード・銀行振込・電子マネー
│   ├── transactions/          #   決済処理・認可・キャプチャ
│   └── billing/               #   請求書・領収書
│
└── fulfillment/                # フルフィルメント
    ├── shipping/              #   配送・配送業者・配送方法・送料
    ├── tracking/              #   追跡番号・配送ステータス
    └── packaging/             #   梱包・納品書
```

### Cross-cutting Concerns

**ビジネスロジックの横断処理:** 主たる概念のディレクトリに配置せよ。
```
例: 「注文確定→決済→配送手配」→ ordering/checkout/ に配置
```

**技術的な横断処理（ロギング、認証、エラー処理）:**
- 言語/FWの標準機構を使用せよ（Middleware, Interceptor, AOP, Decorator等）
- 独自実装が必要な場合のみ `internal/` または言語慣習に従え

### Colocation
ソースとテストは同ディレクトリに同居させよ（FW制約がない限り）。

## 10. パフォーマンス考慮

本スキルはオブジェクト生成を多用する。以下の点に注意せよ:

```python
# ⚠️ ホットパスでの毎回インスタンス生成に注意
for order in orders:  # 10万件ループ
    if ShippingEligibilityRule(order).is_satisfied():  # 毎回生成
        ...

# ✅ パフォーマンスが問題になる場合は再利用
rule = ShippingEligibilityRule()
for order in orders:
    if rule.is_satisfied(order):  # インスタンス再利用
        ...
```

**方針:** まず正しく書き、計測して問題があれば最適化する。

## 11. 既存プロジェクトへの適用

一度に全て変更するな。以下の順序で段階的に適用せよ:

1. **新規コード:** 本スキルに従って書け
2. **変更するコード:** 変更箇所のみリファクタリングせよ
3. **大規模リファクタ:** チームで合意後、モジュール単位で実施せよ

**移行パターン:** 技術的レイヤー構造 → 概念ベース構造
```
# Before
src/domain/order/order.py
src/repository/order/order_repository.py
src/service/order/order_service.py

# After（段階的に移行）
src/ordering/orders/order.py
src/ordering/orders/order_repository.py  # 一時的に同居
src/ordering/orders/order_persistence.py # 最終形
```

---

## チェックリスト

コードレビュー時、以下を確認せよ:

### クラス設計
- [ ] ビジネスロジックはクラスで表現されているか（関数単体ではないか）
- [ ] クラス名は SV/SVO パターンか（Manager, Util, Helper, Service は禁止）
- [ ] 完全コンストラクタか（生成時点で有効な状態か）
- [ ] 継承を使っていないか（Interface/Protocol + Composition か）

### 関数設計
- [ ] switch/if-elif の分岐は Polymorphism に置き換えられているか
- [ ] else 句を使っていないか（Early Return か、対称パスは例外）
- [ ] 意味が不明確な単一条件は `is_xxx` 変数に抽出されているか
- [ ] 複合条件（2つ以上）はルールクラスに抽出されているか
- [ ] 1つの関数は Calculator/Executor/Orchestrator のいずれか1種類か
- [ ] 行数は10行以内か
- [ ] 引数は1-2個か

### 型設計
- [ ] プリミティブ型を直接使っていないか（専用クラス/dataclass か）
- [ ] マジックナンバー/文字列は名前付き定数になっているか
- [ ] 定数は適切なスコープに配置されているか（コロケーション）
- [ ] イミュータブルか（変更時は新しいオブジェクトを返すか）

### パフォーマンス
- [ ] ホットパスで毎回インスタンス生成していないか（問題があれば再利用を検討）

### ディレクトリ構造
- [ ] 技術的レイヤー名（domain, service, repository等）をディレクトリ名に使っていないか
- [ ] ディレクトリを見て「何のシステムか」分かるか
- [ ] 各ディレクトリの子は5つ以下か
- [ ] ソースとテストは同居しているか
