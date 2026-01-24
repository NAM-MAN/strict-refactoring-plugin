/**
 * CLAUDE.md Generator Input Schema
 * 
 * 4つのサンプルから抽出したパターンに基づく入力スキーマ定義
 */

// =============================================================================
// Primary Type Classification (MECE)
// =============================================================================

type SystemType =
  | "request-response"  // Web App, REST API, CLI, Serverless
  | "event-driven"      // Message Consumer, Webhook Handler, Scheduled Job
  | "stateful"          // Document Editor, Workflow Builder, Dashboard
  | "library"           // Utility Library, SDK, Framework
  | "data-intensive";   // CRUD Application, ETL Pipeline, Reporting

type SystemSubType = {
  "request-response": "web-app" | "rest-api" | "graphql-api" | "cli" | "serverless";
  "event-driven": "message-consumer" | "webhook-handler" | "scheduled-job" | "stream-processor";
  "stateful": "document-editor" | "workflow-builder" | "dashboard" | "form-builder";
  "library": "utility" | "ui-component" | "sdk" | "framework";
  "data-intensive": "crud-app" | "etl-pipeline" | "search-system" | "reporting";
};

// =============================================================================
// Secondary Dimensions (Cross-cutting)
// =============================================================================

type DeploymentModel = "monolith" | "modular-monolith" | "microservices" | "serverless" | "edge";

type StateComplexity = "stateless" | "session" | "workflow" | "event-sourced";

type MultiTenancy = "single-tenant" | "logical" | "physical" | "hybrid";

type ComplianceLevel = "standard" | "regulated" | "high-security";

// =============================================================================
// Domain Definition
// =============================================================================

interface DomainDefinition {
  /** 日本語名 (e.g., "顧客管理") */
  japaneseName: string;
  
  /** 英語名 (ディレクトリ名として使用, e.g., "customers") */
  englishName: string;
  
  /** サブドメイン */
  subdomains: SubdomainDefinition[];
  
  /** このドメインに属するエンティティ */
  entities: EntityDefinition[];
}

interface SubdomainDefinition {
  /** 日本語名 (e.g., "登録") */
  japaneseName: string;
  
  /** 英語名 (ディレクトリ名として使用, e.g., "registration") */
  englishName: string;
  
  /** 簡潔な説明 */
  description: string;
}

interface EntityDefinition {
  /** 日本語名 (e.g., "案件") */
  japaneseName: string;
  
  /** 英語クラス名 (e.g., "Deal") */
  englishName: string;
  
  /** 状態遷移があるか */
  hasStateTransition: boolean;
  
  /** 状態一覧 (hasStateTransition=true の場合) */
  states?: StateDefinition[];
  
  /** 状態遷移一覧 */
  transitions?: TransitionDefinition[];
}

interface StateDefinition {
  /** 日本語名 (e.g., "下書き") */
  japaneseName: string;
  
  /** 英語名 (e.g., "Draft") */
  englishName: string;
  
  /** 説明 */
  description: string;
}

interface TransitionDefinition {
  /** 遷移元状態 */
  from: string;
  
  /** 遷移先状態 */
  to: string;
  
  /** アクション名 (e.g., "submit", "approve") */
  action: string;
  
  /** Command クラス名 (e.g., "DraftDeal" → "PendingDeal") */
  commandClass?: string;
}

// =============================================================================
// Boundary Layer Definition
// =============================================================================

interface BoundaryLayerDefinition {
  /** 境界層の種類 */
  type: "controller" | "handler" | "resolver" | "mapper" | "middleware" | "consumer" | "publisher";
  
  /** 命名パターン (e.g., "{Resource}Controller") */
  namingPattern: string;
  
  /** 責務の説明 */
  responsibility: string;
  
  /** 具体例 */
  examples: string[];
}

// =============================================================================
// Tech Stack
// =============================================================================

interface TechStackDefinition {
  /** 言語 */
  language: "typescript" | "java" | "kotlin" | "python" | "go" | "rust";
  
  /** フレームワーク (オプション) */
  framework?: string;
  
  /** データベース (オプション) */
  database?: string;
  
  /** パッケージマネージャー */
  packageManager?: "npm" | "pnpm" | "yarn" | "gradle" | "maven" | "pip" | "cargo";
  
  /** メッセージキュー (Event-Driven の場合) */
  messageQueue?: "sqs" | "rabbitmq" | "kafka" | "redis";
}

// =============================================================================
// Compliance Requirements
// =============================================================================

interface ComplianceRequirements {
  /** 監査ログが必要か */
  requiresAuditLog: boolean;
  
  /** 個人情報を扱うか */
  hasPII: boolean;
  
  /** 金融データを扱うか */
  hasFinancialData: boolean;
  
  /** 規制フレームワーク */
  regulatoryFrameworks?: string[];
  
  /** テナント分離の要件 */
  tenantIsolation?: {
    type: MultiTenancy;
    isolationKey: string;  // e.g., "branchId", "organizationId"
  };
}

// =============================================================================
// Quick Commands
// =============================================================================

interface QuickCommands {
  /** 開発サーバー起動 */
  dev: string;
  
  /** テスト実行 */
  test: string;
  
  /** 単体テスト */
  testUnit?: string;
  
  /** 統合テスト */
  testIntegration?: string;
  
  /** Lint */
  lint: string;
  
  /** 型チェック */
  typecheck: string;
  
  /** フォーマット */
  format?: string;
  
  /** DB マイグレーション */
  dbMigrate?: string;
  
  /** ビルド */
  build?: string;
  
  /** カスタムコマンド */
  custom?: Record<string, string>;
}

// =============================================================================
// Main Input Schema
// =============================================================================

export interface ClaudeMdGeneratorInput {
  // -------------------------------------------------------------------------
  // Required: プロジェクト基本情報
  // -------------------------------------------------------------------------
  
  /** プロジェクト名 (e.g., "金融機関向けCRM") */
  projectName: string;
  
  /** プロジェクト説明（1文） */
  projectDescription: string;
  
  /** システムタイプ */
  systemType: SystemType;
  
  /** システムサブタイプ */
  systemSubType: SystemSubType[SystemType];
  
  /** ドメイン定義 */
  domains: DomainDefinition[];
  
  // -------------------------------------------------------------------------
  // Required: 副次元
  // -------------------------------------------------------------------------
  
  /** デプロイメントモデル */
  deployment: DeploymentModel;
  
  /** 状態の複雑さ */
  stateComplexity: StateComplexity;
  
  /** マルチテナンシー */
  multiTenancy: MultiTenancy;
  
  /** コンプライアンスレベル */
  complianceLevel: ComplianceLevel;
  
  // -------------------------------------------------------------------------
  // Optional: 技術スタック
  // -------------------------------------------------------------------------
  
  /** 技術スタック */
  techStack?: TechStackDefinition;
  
  /** クイックコマンド */
  quickCommands?: QuickCommands;
  
  // -------------------------------------------------------------------------
  // Optional: 詳細設定
  // -------------------------------------------------------------------------
  
  /** 境界層定義（カスタム） */
  boundaryLayers?: BoundaryLayerDefinition[];
  
  /** コンプライアンス要件 */
  compliance?: ComplianceRequirements;
  
  /** 値オブジェクト一覧 */
  valueObjects?: string[];
  
  /** カスタムチェックリスト項目 */
  customChecklist?: {
    category: string;
    items: string[];
  }[];
}

// =============================================================================
// Example Inputs (4つのサンプルから抽出)
// =============================================================================

/** 金融機関向けCRM の入力例 */
export const financialCrmExample: ClaudeMdGeneratorInput = {
  projectName: "金融機関向けCRM",
  projectDescription: "金融機関の法人営業部門向けCRMシステム。顧客管理、案件管理、営業活動記録、コンプライアンス対応を統合する。",
  systemType: "data-intensive",
  systemSubType: "crud-app",
  deployment: "modular-monolith",
  stateComplexity: "workflow",
  multiTenancy: "logical",
  complianceLevel: "regulated",
  
  domains: [
    {
      japaneseName: "顧客管理",
      englishName: "customers",
      subdomains: [
        { japaneseName: "登録", englishName: "registration", description: "顧客登録・更新" },
        { japaneseName: "セグメント", englishName: "segmentation", description: "顧客セグメント・ランク" },
        { japaneseName: "担当者", englishName: "contacts", description: "担当者・連絡先" },
        { japaneseName: "履歴", englishName: "history", description: "取引履歴・接点履歴" },
      ],
      entities: [
        { japaneseName: "顧客", englishName: "Customer", hasStateTransition: false },
        { japaneseName: "担当者", englishName: "Contact", hasStateTransition: false },
      ],
    },
    {
      japaneseName: "案件管理",
      englishName: "deals",
      subdomains: [
        { japaneseName: "ライフサイクル", englishName: "lifecycle", description: "案件ライフサイクル" },
        { japaneseName: "パイプライン", englishName: "pipeline", description: "パイプライン・ステージ" },
        { japaneseName: "提案", englishName: "proposals", description: "提案書・見積" },
        { japaneseName: "予測", englishName: "forecasting", description: "売上予測" },
      ],
      entities: [
        {
          japaneseName: "案件",
          englishName: "Deal",
          hasStateTransition: true,
          states: [
            { japaneseName: "下書き", englishName: "Draft", description: "編集中" },
            { japaneseName: "申請中", englishName: "Pending", description: "承認待ち" },
            { japaneseName: "進行中", englishName: "Active", description: "承認済み" },
            { japaneseName: "成約", englishName: "Won", description: "案件成約" },
            { japaneseName: "失注", englishName: "Lost", description: "案件失注" },
            { japaneseName: "却下", englishName: "Rejected", description: "承認却下" },
          ],
          transitions: [
            { from: "Draft", to: "Pending", action: "register", commandClass: "DraftDeal" },
            { from: "Pending", to: "Active", action: "approve", commandClass: "PendingDeal" },
            { from: "Pending", to: "Rejected", action: "reject", commandClass: "PendingDeal" },
            { from: "Active", to: "Won", action: "win", commandClass: "ActiveDeal" },
            { from: "Active", to: "Lost", action: "lose", commandClass: "ActiveDeal" },
          ],
        },
      ],
    },
  ],
  
  techStack: {
    language: "typescript",
    framework: "Next.js",
    database: "PostgreSQL",
    packageManager: "pnpm",
  },
  
  compliance: {
    requiresAuditLog: true,
    hasPII: true,
    hasFinancialData: true,
    regulatoryFrameworks: ["FISC"],
    tenantIsolation: {
      type: "logical",
      isolationKey: "branchId",
    },
  },
  
  valueObjects: ["Money", "DateRange", "Clock", "AuditContext"],
};

/** 決済API の入力例 */
export const paymentApiExample: ClaudeMdGeneratorInput = {
  projectName: "決済API",
  projectDescription: "EC事業者向け決済代行APIサービス。クレジットカード決済、コンビニ決済、銀行振込を統合したREST APIを提供する。",
  systemType: "request-response",
  systemSubType: "rest-api",
  deployment: "microservices",
  stateComplexity: "workflow",
  multiTenancy: "logical",
  complianceLevel: "high-security",
  
  domains: [
    {
      japaneseName: "決済コア",
      englishName: "payments",
      subdomains: [
        { japaneseName: "オーソリ", englishName: "authorization", description: "与信確保" },
        { japaneseName: "キャプチャ", englishName: "capture", description: "売上確定" },
        { japaneseName: "返金", englishName: "refunds", description: "返金処理" },
        { japaneseName: "取消", englishName: "cancellation", description: "取消処理" },
      ],
      entities: [
        {
          japaneseName: "決済",
          englishName: "Payment",
          hasStateTransition: true,
          states: [
            { japaneseName: "処理中", englishName: "Pending", description: "処理待ち" },
            { japaneseName: "オーソリ済", englishName: "Authorized", description: "与信確保完了" },
            { japaneseName: "売上確定", englishName: "Captured", description: "キャプチャ完了" },
            { japaneseName: "取消済", englishName: "Voided", description: "オーソリ取消" },
            { japaneseName: "返金済", englishName: "Refunded", description: "返金完了" },
          ],
          transitions: [
            { from: "Pending", to: "Authorized", action: "authorize" },
            { from: "Authorized", to: "Captured", action: "capture" },
            { from: "Authorized", to: "Voided", action: "void" },
            { from: "Captured", to: "Refunded", action: "refund" },
          ],
        },
      ],
    },
  ],
  
  techStack: {
    language: "typescript",
    framework: "Express",
    database: "PostgreSQL",
    packageManager: "pnpm",
  },
  
  compliance: {
    requiresAuditLog: true,
    hasPII: false,
    hasFinancialData: true,
    regulatoryFrameworks: ["PCI-DSS"],
  },
  
  valueObjects: ["Money", "Currency", "IdempotencyKey", "MerchantId"],
};

/** 注文処理ワーカー の入力例 */
export const orderWorkerExample: ClaudeMdGeneratorInput = {
  projectName: "注文処理ワーカー",
  projectDescription: "ECサイトの注文処理を担当するバックグラウンドワーカー。注文キューからメッセージを受信し、在庫確保・決済・配送手配を実行する。",
  systemType: "event-driven",
  systemSubType: "message-consumer",
  deployment: "microservices",
  stateComplexity: "workflow",
  multiTenancy: "single-tenant",
  complianceLevel: "standard",
  
  domains: [
    {
      japaneseName: "注文処理",
      englishName: "orders",
      subdomains: [
        { japaneseName: "ライフサイクル", englishName: "lifecycle", description: "注文ライフサイクル" },
        { japaneseName: "バリデーション", englishName: "validation", description: "注文バリデーション" },
        { japaneseName: "キャンセル", englishName: "cancellation", description: "キャンセル処理" },
      ],
      entities: [
        {
          japaneseName: "注文",
          englishName: "Order",
          hasStateTransition: true,
          states: [
            { japaneseName: "処理待ち", englishName: "Pending", description: "処理待ち" },
            { japaneseName: "確定済み", englishName: "Confirmed", description: "確定済み" },
            { japaneseName: "出荷済み", englishName: "Shipped", description: "出荷済み" },
          ],
          transitions: [
            { from: "Pending", to: "Confirmed", action: "confirm" },
            { from: "Confirmed", to: "Shipped", action: "ship" },
          ],
        },
      ],
    },
    {
      japaneseName: "Saga",
      englishName: "saga",
      subdomains: [
        { japaneseName: "注文完了", englishName: "order-fulfillment", description: "注文完了Saga" },
        { japaneseName: "補償処理", englishName: "compensation", description: "補償処理" },
      ],
      entities: [],
    },
  ],
  
  techStack: {
    language: "typescript",
    packageManager: "pnpm",
    messageQueue: "sqs",
  },
  
  valueObjects: ["Money", "OrderId", "ProductId", "IdempotencyKey"],
};

/** バリデーションライブラリ の入力例 */
export const validationLibraryExample: ClaudeMdGeneratorInput = {
  projectName: "バリデーションライブラリ",
  projectDescription: "TypeScript向けの型安全なバリデーションライブラリ。Zodライクな宣言的APIでスキーマを定義し、型推論とランタイムバリデーションを提供する。",
  systemType: "library",
  systemSubType: "utility",
  deployment: "monolith",  // ライブラリはN/Aだが必須フィールドのため
  stateComplexity: "stateless",
  multiTenancy: "single-tenant",  // ライブラリはN/A
  complianceLevel: "standard",
  
  domains: [
    {
      japaneseName: "スキーマ",
      englishName: "schemas",
      subdomains: [
        { japaneseName: "プリミティブ", englishName: "primitives", description: "プリミティブ型" },
        { japaneseName: "コレクション", englishName: "collections", description: "コレクション型" },
        { japaneseName: "合成", englishName: "composites", description: "合成型" },
        { japaneseName: "コア", englishName: "core", description: "コア定義" },
      ],
      entities: [
        { japaneseName: "スキーマ", englishName: "Schema", hasStateTransition: false },
      ],
    },
    {
      japaneseName: "バリデータ",
      englishName: "validators",
      subdomains: [
        { japaneseName: "文字列", englishName: "string", description: "文字列バリデータ" },
        { japaneseName: "数値", englishName: "number", description: "数値バリデータ" },
        { japaneseName: "配列", englishName: "array", description: "配列バリデータ" },
        { japaneseName: "コア", englishName: "core", description: "コア定義" },
      ],
      entities: [
        { japaneseName: "バリデータ", englishName: "Validator", hasStateTransition: false },
      ],
    },
  ],
  
  techStack: {
    language: "typescript",
    packageManager: "pnpm",
  },
  
  valueObjects: [],
};
