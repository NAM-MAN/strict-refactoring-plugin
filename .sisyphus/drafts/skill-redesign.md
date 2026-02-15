# Draft: Strict Refactoring スキル再設計

## 現状分析

### ファイル行数
- `skills/SKILL.md`: 4,126行
- `docs/WHY.md`: 5,069行
- `skills/generate-claude-md/SKILL.md`: 754行

### SKILL.md セクション別行数
| セクション | 行数 | 割合 |
|-----------|------|------|
| Section 8: エラー処理 | ~1,047行 | 25% |
| Section 9: テスト戦略 | ~785行 | 19% |
| Section 1: クラス分類 (C/P/RM) | ~703行 | 17% |
| Section 2: 完全コンストラクタ | ~328行 | 8% |
| Section 7: パラメータ/戻り値 | ~160行 | 4% |
| Section 13: FW別ガイダンス | ~101行 | 2% |
| 言語別ルール | ~88行 | 2% |
| Section 10: ディレクトリ | ~88行 | 2% |
| その他 (3,4,5,6,11,12,14,CL) | ~826行 | 20% |

### ユーザー体感
- ~300行まで: ルールの遵守率が非常に高い
- 4000行超: 大まかには反映されるが細かいルールが無視される
- ルール自体は正しい（変更不要）
- 100%反映を目指したい

## リサーチ結果

### LLM Attention / Compliance 研究
- **Lost in the Middle**: 中間40-60%の情報は先頭/末尾に比べて注意が40%低下
- **Instruction Scale**: <10指示=95%遵守、50-100指示=70-80%、100-500指示=50-68%
- **Primacy Bias**: 先頭の指示は後方の2.3倍遵守される
- **最適チャンクサイズ**: 1ルール50-150トークン、総アクティブ1500-2000トークン

### Claude Code スキルシステム
- **Level 1 (Metadata)**: 常時ロード ~100トークン/スキル
- **Level 2 (SKILL.md本体)**: トリガー時ロード <5000トークン推奨
- **Level 3 (参照ファイル)**: 必要時にオンデマンドロード
- **Context Budget**: 全スキルメタデータ = コンテキストの2%
- **SKILL.md推奨上限**: 500行
- **参照は1階層まで**: ネストするとhead -100で部分読みされるリスク

### Production Systems の構造
- **Cursor**: always/ + auto-attached/ + agent-requested/ + manual/、各200-500トークン
- **Copilot**: copilot-instructions.md 500-1000トークン推奨
- **Windsurf**: 6000文字/ファイル上限、5ファイル分割

### Constitutional AI パターン
- 10-15のコア原則 (~300トークン) + 自己反省メカニズム
- 1000ルールより10原則 + 自己評価の方が効果的

## 設計決定（確定）

### アーキテクチャ: 3層構造
| 層 | 内容 | サイズ | ロード |
|----|------|--------|--------|
| Layer 1: Core Rules | SKILL.md | ~250行 | スキルロード時 |
| Layer 2: Pattern Catalog | docs/patterns/*.md | 各200-400行 | generate-claude-md参照 |
| Layer 3: Project CLAUDE.md | 自動生成 | ~200行 | 自動 |

### Core Rules 設計原則
- 命令形（「〜せよ」「〜するな」）
- 判断フローチャート含む
- 先頭=大原則（Primacy Effect）、末尾=チェックリスト（Recency Effect）
- 優先度階層: Level 1 (絶対) / Level 2 (標準) / Level 3 (推奨)
- コード例は骨格のみ（1パターン1行）
- 禁止事項明示

### generate-claude-md 強化
- docs/patterns/ からプロジェクトに関連するパターンを選択
- ドメイン固有の命名に変換してCLAUDE.mdに焼き込む

### 変更しないもの
- WHY.md: 既存のまま（教育用）
- examples/: 既存のまま（参考用）
