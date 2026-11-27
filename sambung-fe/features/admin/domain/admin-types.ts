import type { ForecastRecord } from "@/features/forecast/domain/forecast-data";

/**
 * Domain types for Admin & Governance Panel (Fase 4 + Live AI Endpoints).
 */

export interface PriceObservationRecord {
  id: string;
  province: string;
  commodity: string;
  price: number;
  unit: string;
  source: string;
  period: string;
  status: "Valid" | "Ditolak" | "Anomali" | "Duplikat";
  reason?: string;
}

export interface SystemParameters {
  orderExpiryHours: number;
  fairPriceToleranceDelta: number;
  rendemenGKP: number;
  rendemenGKG: number;
  governmentFloorPriceGKP: number;
  lastUpdated: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorRole: "admin" | "petani" | "pembeli" | "sistem";
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
}

export interface ModelEvaluationRecord {
  province: string;
  horizon: "2 Pekan" | "4 Pekan" | string;
  horizonWeeks?: number;
  mase: number;
  mae?: number;
  mapePct?: number;
  intervalCoverage: string;
  cov80Pct?: number;
  nEval?: number;
  passMase?: boolean;
  passCov?: boolean;
  status: "Lulus Target" | "Fallback Baseline" | "Gagal Ambang Target" | string;
  activeMethod: string;
  isFallback: boolean;
}

export interface ModelEvaluationHorizonSummary {
  provinceCount: number;
  evalRowsCount: number;
  meanMaeRp: number;
  meanMapePct: number;
  meanMase: number;
  medianMase: number;
  meanCov80Pct: number;
  provincesPassingMase: number;
  provincesPassingGate: number;
  winnerModel?: string;
  mase20252026: number;
  cov8020252026?: number;
}

export interface ModelEvaluationBaselineRow {
  model: string;
  meanMaeRp: number;
  meanMapePct: number;
  meanMase: number;
  medianMase?: number;
  cov80Pct: number;
  intervalEvaluated?: boolean;
  passMase090?: string;
  passGateBoth: string;
  mase20252026?: number;
  wilcoxonP?: number;
  provincesBeaten?: string;
}

export interface ModelEvaluationSpikeThreshold {
  recallPct: number;
  precisionPct: number;
  f1Pct: number;
  prAuc: number;
  rocAuc: number;
  alerts: number;
  actualSpikes: number;
  rows: number;
  meetsNfr006: boolean;
}

export interface ModelEvaluationQuarantineRow {
  sourceFile: string;
  layer: string;
  provinceRaw: string;
  period: string;
  field: string;
  rawValue: string;
  reason: string;
}

export interface ModelEvaluationResponse {
  generatedAtUtc: string;
  modelName: string;
  modelVersion: string;
  walkForwardFolds: number;
  evaluationWindow: string;
  gateCriteria: {
    maxMase: number;
    minCoveragePct: number;
    maxCoveragePct: number;
  };
  summaryByHorizon: {
    "2w": ModelEvaluationHorizonSummary;
    "4w": ModelEvaluationHorizonSummary;
  };
  spatialExplainerSummary?: {
    holdout8wR2: number;
    holdout8wMaeRp: number;
    featureCount: number;
    maxShapAdditivityErrRp: number;
  };
  baselineComparison: {
    "2w": ModelEvaluationBaselineRow[];
    "4w": ModelEvaluationBaselineRow[];
  };
  gateRows: ModelEvaluationRecord[];
  maxShapAdditivityErrRp?: number;
  offlineSpikeNfr006?: {
    definition?: string;
    medianP95ThresholdPct?: number;
    p95ThresholdRangePct?: [number, number];
    meetsNfr006?: boolean;
    spikeBlend?: {
      nfr006Recall70?: ModelEvaluationSpikeThreshold;
      bestF1Balanced?: ModelEvaluationSpikeThreshold;
    };
  };
  quarantineLog: ModelEvaluationQuarantineRow[];
}

export interface AdminLivePredictOverrides {
  currentPrice?: number;
  precip28d?: number;
  stickyWeeks?: number;
  shockGrosirPct?: number;
  shockTradPct?: number;
  shockPeerPct?: number;
  shockBwh1Pct?: number;
}

export interface AdminLivePredictRequest {
  province: string;
  horizonWeeks: 2 | 4;
  weekStart?: string;
  overrides?: AdminLivePredictOverrides;
  forceAi?: boolean;
}

export interface AdminLivePredictDiagnostics {
  moveProbability?: number;
  probUp: number;
  probFlat: number;
  probDown: number;
  expectedReturn?: number;
  thresholdTau?: number;
  shrinkageLam?: number;
  gateTriggered: boolean;
  rule: string;
  provinceGroup?: string;
  specKey?: string;
  baseEffectRp?: number;
  additivityErrRp?: number;
  stateless: boolean;
  inferenceMode?: string;
}

export interface AdminLivePredictResponse extends ForecastRecord {
  referenceDateIso?: string;
  targetDateIso?: string;
  liveDiagnostics: AdminLivePredictDiagnostics;
}

export interface AdminAiIngestUpdateRow {
  province: string;
  producerPrice: number;
  wholesalePrice?: number;
  retailPrice?: number;
  precip28d?: number;
}

export interface AdminAiIngestRequest {
  weekStart: string;
  updates: AdminAiIngestUpdateRow[];
  persist?: boolean;
}

export interface AdminAiIngestResponse {
  status: string;
  weekStart: string;
  latestObservationWeek: string;
  updatedProvincesCount: number;
  updatedProvinces: string[];
  skippedProvinces: string[];
  recomputedForecastRecords: number;
  persistedToDisk: boolean;
  generatedAtUtc: string;
}

export interface AdminStats {
  totalOffers: number;
  totalVolumeKg: number;
  activeContracts: number;
  approvedContracts: number;
  flaggedOffers: number;
  registeredUsers: number;
  auditEntriesCount: number;
  dataFreshnessStatus: string;
}
