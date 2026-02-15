# Strict Refactoring スキル再設計 — 3層アーキテクチャ化

## TL;DR

> **Quick Summary**: 4126行のモノリシック SKILL.md を「Core Rules (~250行)」+「参照パターン5ファイル」+「プロジェクト固有 CLAUDE.md (~200行)」の3層に再構成し、LLMの注意メカニズムに最適化してルール遵守率を95%+に引き上げる。
> 
> **Deliverables**:
> - 新 `skills/SKILL.md` (~250行): 15ルールの Core Rules
> - 5つの参照ファイル (各200-400行): 詳細パターン集
> - 強化版 `skills/generate-claude-md/SKILL.md`: パターン選択ロジック追加
> - 既存 examples/ ディレクトリの整合確認
> 
> **Estimated Effort**: Medium (2-3日)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7

---

## Context

### Original Request
4000行超のスキルは細かいルールが反映されない。300行程度なら効くので、分割・要約して100%反映を実現したい。

### Interview Summary
**Key Discussions**:
- 3者（Claude Codeエンジニア、ユーザー代表、UXデザイナー）で激論
- 「圧縮」ではなく「3層に最適配置」がコンセンサス
- ルール自体は全て正しい。変更不要。配置を最適化する

**Research Findings**:
- Lost in the Middle: 中間40-60%の情報は先頭/末尾比40%低い注意
- <10指示=95%+遵守、100+指示=50-68%遵守
- Claude Code: Level 1 (metadata) / Level 2 (SKILL.md) / Level 3 (参照ファイル) の Progressive Disclosure
- Constitutional AI: 10-15原則 > 1000ルール
- Production systems (Cursor/Copilot/Windsurf): 各200-500トークンのモジュラー構成

### Metis Review
**Identified Gaps** (addressed):
1. §3-7 Orphan Problem → 5つ目の参照ファイル `code-quality-patterns.md` を追加
2. Layer 2 Consumer Model → LLM comprehension とgenerate-claude-md の両用途に最適化
3. Checklist Strategy → 29項目→15項目に絞り、Core Rules の15ルールと1:1対応

---

## Work Objectives

### Core Objective
4126行の SKILL.md を3層に再構成し、Claude の attention 内に Core Rules が完全に収まる設計にする。全ルールを保持しつつ、各層の役割を明確に分離する。

### Concrete Deliverables
1. `skills/SKILL.md` — Core Rules (~250行)
2. `skills/command-patterns.md` — Command/Pure/ReadModel パターン集
3. `skills/error-handling.md` — エラー処理パターン集
4. `skills/testing-patterns.md` — テスト戦略パターン集
5. `skills/code-quality-patterns.md` — コード品質パターン集 (§3-7)
6. `skills/language-guides.md` — 言語別/FW別ガイド
7. 強化版 `skills/generate-claude-md/SKILL.md`

### Definition of Done
- [ ] Core Rules SKILL.md が250行以下
- [ ] Core Rules に15ルール全てが命令形で記載
- [ ] 現SKILL.mdの全ルールが3層のいずれかに存在（ルール欠落ゼロ）
- [ ] 各参照ファイルの先頭にTOC
- [ ] generate-claude-md がパターン選択ロジックを持つ
- [ ] 既存 examples/ が新構造と整合

### Must Have
- 全ルールの保持（1つも失わない）
- Core Rules が250行以下
- 先頭にLevel 1原則、末尾にチェックリスト（Primacy/Recency Effect）
- 参照ファイルへの導線（Core Rules内に各ルールから参照リンク）
- 15項目チェックリスト（Core 15ルールと1:1対応）

### Must NOT Have (Guardrails)
- WHY.md の内容を Core Rules に混入しない（教育 vs 指示の分離）
- コード例の冗長な展開（Core Rules は骨格1行のみ）
- 新しいルールの追加（既存ルールの再配置のみ）
- ルールの意味変更・緩和
- 250行の予算を超えるCore Rules
- 参照ファイル間の重複（各ルールは1箇所のみ）

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> ALL verification is executed by the agent using tools.

### Test Decision
- **Infrastructure exists**: N/A (ドキュメント再構成タスク)
- **Automated tests**: None (コードではなくドキュメント)
- **Framework**: N/A

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Markdown files** | Bash (wc -l, grep) | 行数カウント、ルール存在確認 |
| **ルール完全性** | Bash (diff/grep) | 旧SKILL.mdの全ルールが新構造に存在 |
| **構造整合性** | Bash (cat, grep) | 参照リンクの整合、TOC存在 |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Core Rules SKILL.md 作成
├── Task 2: command-patterns.md 作成
├── Task 4: code-quality-patterns.md 作成 (§3-7)
└── Task 6: language-guides.md 作成

Wave 2 (After Wave 1):
├── Task 3: error-handling.md 作成 (Task 1のエラールール確認後)
├── Task 5: testing-patterns.md 作成 (Task 1のテストルール確認後)
├── Task 7: generate-claude-md 強化 (全参照ファイル完成後)
└── Task 8: ルール完全性検証 + examples/ 整合確認
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 5, 7, 8 | 2, 4, 6 |
| 2 | None | 7 | 1, 4, 6 |
| 3 | 1 | 7 | 5, 4, 6 |
| 4 | None | 7 | 1, 2, 6 |
| 5 | 1 | 7 | 3, 4, 6 |
| 6 | None | 7 | 1, 2, 4 |
| 7 | 1, 2, 3, 4, 5, 6 | 8 | None |
| 8 | 7 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 4, 6 | task(category="unspecified-high") — 並列4タスク |
| 2 | 3, 5, 7, 8 | task(category="unspecified-high") — Task 7は全依存完了後 |

---

## TODOs

- [ ] 1. Core Rules SKILL.md の作成（最重要タスク）

  **What to do**:
  - 現 `skills/SKILL.md` (4126行) を読み込み、全ルール（指示文のみ）を抽出
  - 以下の構造で新 SKILL.md を作成:
    ```
    --- (YAML frontmatter: name, description) ---
    # Strict Refactoring Skill
    ## 対象言語 (5行: 対象と除外のみ)
    ## Level 1: 絶対遵守 (5原則)
      1. 3分類 (Command/Pure/ReadModel)
      2. 完全コンストラクタ
      3. ドメイン層でswitch/if-else分岐禁止 → Polymorphism
      4. イミュータブル優先
      5. Result型でドメインエラー表現
    ## Level 2: 標準遵守 (10ルール)
      6. Early Return Only
      7. 引数は1-2個
      8. 戻り値は名前付き型
      9. Primitive Obsession 回避
      10. Interface優先、継承禁止
      11. Pending Object Pattern
      12. Repository = Aggregate Root単位
      13. ディレクトリは概念ベース
      14. テスト命名: 仕様書として機能
      15. 外部リソース/Clockはメソッド引数
    ## 各ルールの詳細 (判断フロー + 骨格コード例 + 参照リンク)
    ## Quick Reference Checklist (15項目)
    ```
  - 各ルールは: 命令形1-2文 + 判断フロー(ある場合) + 骨格例(1行) + 「詳細→{reference}.md」
  - **250行以下を厳守**
  - YAML frontmatter の description を最適化（DiscoveryのためWHENを含める）

  **Must NOT do**:
  - WHY.md の内容を含めない
  - 長いコード例を含めない（骨格のみ: `DraftX(data).submit(repo) → SubmittedX`）
  - 新しいルールを追加しない
  - 表形式の比較表を大量に含めない（参照ファイルに移動）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: ルールの蒸留は高度な判断を要する作業
  - **Skills**: [`strict-refactoring`]
    - `strict-refactoring`: 現行ルールの完全な理解のため

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 4, 6)
  - **Blocks**: Tasks 3, 5, 7, 8
  - **Blocked By**: None

  **References** (CRITICAL):

  **Pattern References**:
  - `skills/SKILL.md` (全体) — 全ルールのソース。全4126行を読み、ルール（指示文）だけを抽出する
  - `skills/SKILL.md:96-102` — 大原則5項目。Level 1 の元となる
  - `skills/SKILL.md:4072-4127` — 現行チェックリスト29項目。15項目に絞る際の参考

  **Documentation References**:
  - `.sisyphus/drafts/skill-redesign.md` — 設計決定の全記録（Level分類、リサーチ結果）

  **External References**:
  - Constitutional AI pattern: 10-15原則 + 自己反省。参考にすべき構造

  **WHY Each Reference Matters**:
  - `skills/SKILL.md` 全体: ルールの抜け漏れをゼロにするため、全行を精読する必要がある
  - 大原則セクション: Level 1 の5原則の元テキスト
  - チェックリスト: 現行29項目→15項目に絞る際の取捨選択基準
  - ドラフト: 3者議論で確定した設計決定（15ルールの分類表）

  **Acceptance Criteria**:
  - [ ] `wc -l skills/SKILL.md` → 250行以下
  - [ ] YAML frontmatter に name と description が存在
  - [ ] "Level 1" セクションに5原則が命令形で記載
  - [ ] "Level 2" セクションに10ルールが命令形で記載
  - [ ] 各ルールに参照ファイルへのリンク（`→ 詳細: xxx.md`）が存在
  - [ ] 末尾にチェックリスト15項目が存在
  - [ ] `grep -c "禁止\|するな\|せよ\|使え\|従え" skills/SKILL.md` → 15以上（命令形が十分ある）

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Core Rules が行数制限内
    Tool: Bash
    Steps:
      1. wc -l skills/SKILL.md
      2. Assert: 行数 ≤ 250
    Expected Result: 250行以下
    Evidence: コマンド出力

  Scenario: 15ルール全てが存在
    Tool: Bash
    Steps:
      1. grep -c "Command.*Pure.*ReadModel\|完全コンストラクタ\|switch.*禁止\|Polymorphism\|イミュータブル\|Result" skills/SKILL.md
      2. grep -c "Early Return\|引数.*1-2\|名前付き\|Primitive\|Interface.*継承\|Pending Object\|Repository.*Aggregate\|概念ベース\|テスト命名\|メソッド引数" skills/SKILL.md
    Expected Result: 各grepで対応するルールがヒット
    Evidence: grep出力

  Scenario: 参照リンクが存在
    Tool: Bash
    Steps:
      1. grep -c "\.md" skills/SKILL.md
      2. Assert: 5以上（5つの参照ファイルへのリンク）
    Expected Result: 5+件のリンク
    Evidence: grep出力
  ```

  **Commit**: YES
  - Message: `refactor(skill): distill Core Rules to ~250 lines with 15 essential rules`
  - Files: `skills/SKILL.md`

---

- [ ] 2. command-patterns.md の作成

  **What to do**:
  - 現 SKILL.md の Section 1 (クラス分類, 163-995行) から詳細パターンを抽出
  - 先頭にTOC
  - 以下を含める:
    - 3分類の判断フロー（詳細版）
    - Pending Object Pattern の正規実装例（DraftRingi 全コード）
    - 状態名の選択ガイド
    - Repository 設計指針
    - Aggregate Root とRepositoryの関係
    - Pure の役割別パターン（型変換、計算、判定）
    - ReadModel のパターン
    - Resolver パターン
    - 境界層での許容分岐
  - Section 1.8 の YAGNI / Polymorphism判断基準 も含める

  **Must NOT do**:
  - WHY.md の内容（なぜPending Objectか等）を含めない
  - Level 1/2 のルール文を重複して書かない（Core Rules に既出）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`strict-refactoring`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 4, 6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `skills/SKILL.md:163-995` — Section 1 全体。Command/Pure/ReadModel のパターン集
  - `skills/SKILL.md:1068-1207` — Section 1.8 YAGNI / Polymorphism判断基準

  **WHY Each Reference Matters**:
  - Section 1: 全コード例とパターンのソース。漏れなく移行する必要がある

  **Acceptance Criteria**:
  - [ ] `wc -l skills/command-patterns.md` → 200-400行
  - [ ] 先頭にTOC（## Table of Contents）
  - [ ] DraftRingi 正規実装例が含まれる
  - [ ] Pending Object Pattern の状態名ガイドが含まれる
  - [ ] Resolver パターンが含まれる
  - [ ] 境界層の許容分岐が含まれる

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: パターンファイルの構造確認
    Tool: Bash
    Steps:
      1. head -20 skills/command-patterns.md
      2. Assert: TOC が存在
      3. grep -c "DraftRingi\|Pending.*Object\|Resolver\|ReadModel" skills/command-patterns.md
      4. Assert: 各パターンが含まれる
    Expected Result: TOC存在、主要パターン全てヒット
    Evidence: コマンド出力
  ```

  **Commit**: YES (groups with 4, 6)
  - Message: `docs(patterns): extract command/pure/readmodel patterns from monolithic skill`
  - Files: `skills/command-patterns.md`

---

- [ ] 3. error-handling.md の作成

  **What to do**:
  - 現 SKILL.md の Section 8 (エラー処理, 1947-2993行) から詳細パターンを抽出
  - 先頭にTOC
  - 以下を含める:
    - Result型の定義と使い方
    - DomainError 判別共用体の定義
    - InfrastructureError の定義
    - エラー作成ヘルパー (DomainErrors, EntityErrors)
    - どこで何を返すか（パターン1-3）
    - バリデーション結果の集約
    - HTTP ステータスコード対応
    - Controller 実装パターン（統合例）
    - 専用エラー型の作成基準
    - InfrastructureError リトライ戦略
    - 既存プロジェクトの移行手順
    - interface vs type の使い分け

  **Must NOT do**:
  - WHY.md の内容を含めない
  - Core Rules の Result型ルールを重複して書かない

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`strict-refactoring`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Parallel Group**: Wave 2 (with Tasks 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1 (Core Rules のエラールール確認のため)

  **References**:
  - `skills/SKILL.md:1947-2993` — Section 8 全体。エラー処理パターン集

  **WHY Each Reference Matters**:
  - Section 8: 最大のセクション(1047行)。全パターンを漏れなく移行

  **Acceptance Criteria**:
  - [ ] `wc -l skills/error-handling.md` → 200-400行
  - [ ] 先頭にTOC
  - [ ] Result型定義が含まれる
  - [ ] DomainError 5種 (Validation, NotFound, Conflict, Authorization, BusinessRuleViolation) が定義
  - [ ] Controller 実装パターンが含まれる
  - [ ] 移行手順が含まれる

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: エラー処理パターンの完全性
    Tool: Bash
    Steps:
      1. grep -c "Result\|DomainError\|InfrastructureError\|ValidationError\|NotFoundError" skills/error-handling.md
      2. Assert: 主要エラー型が全てヒット
      3. grep -c "Controller\|toDomainErrorResponse" skills/error-handling.md
      4. Assert: Controller パターンが含まれる
    Expected Result: 全主要パターンが存在
    Evidence: grep出力
  ```

  **Commit**: YES (groups with 5)
  - Message: `docs(patterns): extract error handling patterns from monolithic skill`
  - Files: `skills/error-handling.md`

---

- [ ] 4. code-quality-patterns.md の作成

  **What to do**:
  - 現 SKILL.md の Section 2-7 から詳細パターンを抽出:
    - Section 2 (完全コンストラクタ + 依存生成, 1249-1576行)
    - Section 3 (Interface優先, 1578-1591行)
    - Section 4 (Early Return, 1593-1662行)
    - Section 5 (条件式の明確化, 1664-1718行)
    - Section 6 (Primitive Obsession, 1735-1785行)
    - Section 7 (Parameters + Return Values, 1787-1946行)
  - 先頭にTOC
  - 以下を含める:
    - 完全コンストラクタの詳細実装例
    - 依存の4分類（Pure Logic / Configured / External / Non-deterministic）と判断フロー
    - Config分割基準
    - 入力バリデーションと完全コンストラクタの2フェーズアプローチ
    - 対称パス else の条件（4条件全て満たす場合のみ）
    - 条件の抽出ルール詳細と「自明」の定義
    - 値オブジェクト作成基準
    - Parameter Object パターン
    - 名前付き戻り値 vs タプルの判断表
    - ドットチェーンのルール
    - 行数の目安と引数のトレードオフ

  **Must NOT do**:
  - Core Rules に既出のルール文を重複しない
  - WHY.md の内容を含めない

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`strict-refactoring`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `skills/SKILL.md:1249-1946` — Section 2-7。コード品質ルールとパターン集

  **WHY Each Reference Matters**:
  - Section 2-7: Metis指摘の「§3-7 Orphan Problem」を解決する。335+行の居場所

  **Acceptance Criteria**:
  - [ ] `wc -l skills/code-quality-patterns.md` → 200-400行
  - [ ] 先頭にTOC
  - [ ] 依存の4分類と判断フローが含まれる
  - [ ] Early Return の対称パス条件が含まれる
  - [ ] Parameter Object パターンが含まれる
  - [ ] 名前付き戻り値の判断表が含まれる

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: コード品質パターンの完全性
    Tool: Bash
    Steps:
      1. grep -c "Pure Logic\|Configured\|External Resource\|Non-deterministic" skills/code-quality-patterns.md
      2. Assert: 依存4分類が全てヒット
      3. grep -c "Early Return\|Parameter Object\|Primitive" skills/code-quality-patterns.md
      4. Assert: 主要パターンが含まれる
    Expected Result: 全パターンが存在
    Evidence: grep出力
  ```

  **Commit**: YES (groups with 2, 6)
  - Message: `docs(patterns): extract code quality patterns (§2-7) from monolithic skill`
  - Files: `skills/code-quality-patterns.md`

---

- [ ] 5. testing-patterns.md の作成

  **What to do**:
  - 現 SKILL.md の Section 9 (テスト戦略, 2995-3779行) から詳細パターンを抽出
  - 先頭にTOC
  - 以下を含める:
    - テスト命名規則の詳細（パターン表 + 禁止事項）
    - Pure Logic / Configured / External / Non-deterministic 各テスト方法
    - テストピラミッド + Trophy ハイブリッド
    - Test Data Factory パターン（設計ルール + コード例）
    - テストデータ戦略の優先順位
    - InMemory Repository の実装例
    - DB統合テストのガイドライン
    - テスト分離（トランザクションロールバック）
    - 外部サービスのテスト戦略（Gateway + Fake/Mock/Stub 選択マトリクス）
    - テストダブルの配置（Colocation）
    - 統合テスト・Contract Test

  **Must NOT do**:
  - Core Rules のテスト命名ルールを重複しない

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`strict-refactoring`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1 (Core Rules のテストルール確認のため)

  **References**:
  - `skills/SKILL.md:2995-3779` — Section 9 全体。テストパターン集

  **WHY Each Reference Matters**:
  - Section 9: 785行のテスト戦略。Test Data Factory 等の重要パターンを漏れなく移行

  **Acceptance Criteria**:
  - [ ] `wc -l skills/testing-patterns.md` → 200-400行
  - [ ] 先頭にTOC
  - [ ] Test Data Factory パターンが含まれる
  - [ ] InMemory Repository 実装例が含まれる
  - [ ] Fake/Mock/Stub 選択マトリクスが含まれる
  - [ ] テスト命名の詳細パターン表が含まれる

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: テストパターンの完全性
    Tool: Bash
    Steps:
      1. grep -c "TestFactory\|InMemory.*Repository\|Fake\|Mock\|Stub" skills/testing-patterns.md
      2. Assert: 主要パターンが全てヒット
    Expected Result: 全テストパターンが存在
    Evidence: grep出力
  ```

  **Commit**: YES (groups with 3)
  - Message: `docs(patterns): extract testing patterns from monolithic skill`
  - Files: `skills/testing-patterns.md`

---

- [ ] 6. language-guides.md の作成

  **What to do**:
  - 現 SKILL.md から以下を抽出:
    - 言語別の適用度合い (8-29行)
    - Go での緩和ルール (33-80行)
    - 言語間の構文対応表 (82-95行)
    - Section 13: FW別ガイダンス (3901-4001行): NestJS, Next.js, Spring Boot
    - Section 14: アーキテクチャ別適用 (4013-4070行): モノリス, マイクロサービス
    - Section 11: パフォーマンス考慮 (3870-3891行)
    - Section 12: 既存プロジェクトへの適用 (3893-3899行)
  - 先頭にTOC

  **Must NOT do**:
  - Core Rules の言語対象を重複しない（Core は「対象/除外」の1行のみ）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 既存内容の移動が主。判断は少ない
  - **Skills**: [`strict-refactoring`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `skills/SKILL.md:8-95` — 言語別ルール
  - `skills/SKILL.md:3870-4070` — Section 11-14。FW別/Architecture別ガイド

  **WHY Each Reference Matters**:
  - これらのセクションは特定の言語/FW使用時のみ必要。参照ファイルに最適

  **Acceptance Criteria**:
  - [ ] `wc -l skills/language-guides.md` → 200-400行
  - [ ] 先頭にTOC
  - [ ] Go緩和ルールが含まれる
  - [ ] NestJS, Next.js, Spring のガイダンスが含まれる
  - [ ] マイクロサービスの追加ルールが含まれる

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: 言語/FWガイドの完全性
    Tool: Bash
    Steps:
      1. grep -c "Go\|NestJS\|Next.js\|Spring\|マイクロサービス" skills/language-guides.md
      2. Assert: 各ガイドが含まれる
    Expected Result: 全ガイドが存在
    Evidence: grep出力
  ```

  **Commit**: YES (groups with 2, 4)
  - Message: `docs(patterns): extract language and framework guides from monolithic skill`
  - Files: `skills/language-guides.md`

---

- [ ] 7. generate-claude-md スキルの強化

  **What to do**:
  - 現 `skills/generate-claude-md/SKILL.md` (754行) を読み込み
  - パターン選択ロジックを追加:
    - Step 2 にパターン選択フェーズを追加
    - プロジェクトのシステムタイプ・ドメインに基づき、参照ファイルから関連パターンを選択
    - 選択したパターンをプロジェクト固有のドメイン言語に変換してCLAUDE.mdに焼き込む
  - CLAUDE.md テンプレートに以下を追加:
    - `## このプロジェクトのCommand例` (command-patterns.md から選択・変換)
    - `## このプロジェクトのエラー処理` (error-handling.md から選択・変換)
    - `## このプロジェクトのテスト戦略` (testing-patterns.md から選択・変換)
  - 生成される CLAUDE.md が ~200行に収まるよう調整
  - 「Base Skill: `/strict-refactoring` を適用せよ」は維持

  **Must NOT do**:
  - 既存のシステムタイプ推論ロジックを壊さない
  - 参照ファイルの全内容をCLAUDE.mdに展開しない（選択・要約のみ）
  - 300行を超えるgenerate-claude-mdスキルにしない

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: パターン選択ロジックは高度な設計判断
  - **Skills**: [`strict-refactoring`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2 後半)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2, 3, 4, 5, 6 (全参照ファイル完成後)

  **References**:
  - `skills/generate-claude-md/SKILL.md` — 現行スキル全体。既存ロジックを把握
  - `skills/command-patterns.md` — Task 2 の成果物。パターン選択元
  - `skills/error-handling.md` — Task 3 の成果物
  - `skills/testing-patterns.md` — Task 5 の成果物
  - `skills/code-quality-patterns.md` — Task 4 の成果物
  - `skills/language-guides.md` — Task 6 の成果物
  - `examples/` — 既存CLAUDE.md例。生成品質の参考

  **WHY Each Reference Matters**:
  - 現行スキル: 壊してはいけない既存ロジック
  - 各参照ファイル: CLAUDE.md生成時の選択元
  - examples/: 生成品質のベンチマーク

  **Acceptance Criteria**:
  - [ ] パターン選択ロジックが Step 2 に追加されている
  - [ ] CLAUDE.md テンプレートに「このプロジェクトのCommand例」セクションがある
  - [ ] CLAUDE.md テンプレートに「このプロジェクトのエラー処理」セクションがある
  - [ ] CLAUDE.md テンプレートに「このプロジェクトのテスト戦略」セクションがある
  - [ ] 参照ファイル名 (command-patterns.md 等) への言及がある
  - [ ] `wc -l skills/generate-claude-md/SKILL.md` → 300行以下

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: generate-claude-md のパターン選択ロジック
    Tool: Bash
    Steps:
      1. grep -c "command-patterns\|error-handling\|testing-patterns\|code-quality\|language-guides" skills/generate-claude-md/SKILL.md
      2. Assert: 5つの参照ファイルが全て言及されている
      3. grep -c "このプロジェクトの" skills/generate-claude-md/SKILL.md
      4. Assert: プロジェクト固有セクションが3つ以上
    Expected Result: 参照ファイル連携とプロジェクト固有セクションが存在
    Evidence: grep出力
  ```

  **Commit**: YES
  - Message: `feat(generate-claude-md): add pattern selection logic for project-specific CLAUDE.md`
  - Files: `skills/generate-claude-md/SKILL.md`

---

- [ ] 8. ルール完全性検証 + 整合確認（最終タスク）

  **What to do**:
  - 旧 SKILL.md の全ルール（指示文）と新構造の全ルールを突合
  - 欠落ルールがゼロであることを確認
  - Core Rules の参照リンクが全て有効（ファイル・セクションが存在）であることを確認
  - examples/ ディレクトリの CLAUDE.md 例が新構造のテンプレートと整合することを確認
  - README.md を新構造に合わせて更新（ドキュメント表にパターンファイルを追加）
  - 旧 SKILL.md のバックアップ（git履歴で十分だが念のため確認）

  **Must NOT do**:
  - ルールの意味を変更しない
  - WHY.md を変更しない

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: ルール完全性の突合は漏れを許容できない
  - **Skills**: [`strict-refactoring`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (最終)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 7

  **References**:
  - `skills/SKILL.md` (旧: git stash or 最終commit前のバージョン) — 突合元
  - `skills/SKILL.md` (新: Task 1 の成果物) — 突合先（Core Rules）
  - `skills/command-patterns.md` — 突合先
  - `skills/error-handling.md` — 突合先
  - `skills/testing-patterns.md` — 突合先
  - `skills/code-quality-patterns.md` — 突合先
  - `skills/language-guides.md` — 突合先
  - `skills/SKILL.md:4072-4127` — チェックリスト。新15項目との対応確認
  - `README.md` — 更新対象
  - `examples/` — 整合確認対象

  **WHY Each Reference Matters**:
  - 旧SKILL.md: ルール欠落ゼロの保証のため
  - 全参照ファイル: 突合先として全ファイルを確認

  **Acceptance Criteria**:
  - [ ] 旧SKILL.md の Section 1-14 + チェックリストの全ルールが新構造に存在
  - [ ] Core Rules の参照リンクが全て有効
  - [ ] README.md が新構造を反映
  - [ ] examples/ のCLAUDE.md例が最低1つ、新テンプレート構造と整合

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: ルール完全性突合
    Tool: Bash
    Steps:
      1. 旧SKILL.mdから全「禁止」「せよ」「するな」「使え」ルールを抽出
      2. 新Core Rules + 5参照ファイルから同ルールを抽出
      3. diff で欠落を確認
    Expected Result: 欠落ゼロ
    Evidence: diff出力

  Scenario: 参照リンクの有効性
    Tool: Bash
    Steps:
      1. grep -oP '\w+-\w+\.md' skills/SKILL.md で参照ファイル名を抽出
      2. 各ファイルが存在するか ls で確認
    Expected Result: 全ファイルが存在
    Evidence: ls出力

  Scenario: README.md の整合
    Tool: Bash
    Steps:
      1. grep "patterns" README.md
      2. Assert: パターンファイルへの言及がある
    Expected Result: パターンファイルが記載
    Evidence: grep出力
  ```

  **Commit**: YES
  - Message: `docs: update README and verify rule completeness after skill restructure`
  - Files: `README.md`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `refactor(skill): distill Core Rules to ~250 lines with 15 essential rules` | skills/SKILL.md | wc -l ≤ 250 |
| 2,4,6 | `docs(patterns): extract patterns from monolithic skill` | skills/*.md (3 files) | wc -l 200-400 each |
| 3,5 | `docs(patterns): extract error and testing patterns` | skills/*.md (2 files) | wc -l 200-400 each |
| 7 | `feat(generate-claude-md): add pattern selection logic` | skills/generate-claude-md/SKILL.md | grep patterns |
| 8 | `docs: update README and verify rule completeness` | README.md | diff verification |

---

## Success Criteria

### Verification Commands
```bash
wc -l skills/SKILL.md           # Expected: ≤ 250
wc -l skills/command-patterns.md # Expected: 200-400
wc -l skills/error-handling.md   # Expected: 200-400
wc -l skills/testing-patterns.md # Expected: 200-400
wc -l skills/code-quality-patterns.md  # Expected: 200-400
wc -l skills/language-guides.md  # Expected: 200-400
wc -l skills/generate-claude-md/SKILL.md  # Expected: ≤ 300
ls skills/*.md | wc -l           # Expected: 6 (SKILL.md + 5 patterns)
```

### Final Checklist
- [ ] Core Rules SKILL.md ≤ 250行
- [ ] 15ルール全てが命令形で Core Rules に存在
- [ ] 5つの参照ファイルが各200-400行で存在
- [ ] 各参照ファイルの先頭にTOC
- [ ] Core Rules から参照ファイルへのリンクが有効
- [ ] generate-claude-md にパターン選択ロジック追加
- [ ] 旧SKILL.mdの全ルールが新構造に存在（欠落ゼロ）
- [ ] README.md が新構造を反映
- [ ] WHY.md は変更なし
- [ ] examples/ は整合確認済み
