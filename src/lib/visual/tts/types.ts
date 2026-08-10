/* ════════════════════════════════════════════════════════════════
   Narration engine — provider-independent contract.

   The renderer asks for narration. It must never know, or care, which
   backend produced it. That is what stops one provider's daily quota
   from being able to stop the study system.
   ════════════════════════════════════════════════════════════════ */

export type TtsMode =
  | "quality"    // best available neural voice; refuse to downgrade silently
  | "free"       // free allocations + local only
  | "zero-cost"  // never touch anything that could bill
  | "offline"    // local only, no network
  | "dev"        // local only, for debugging layout/timing
  | "test";      // a few representative segments only

/** Free-tier headroom, as far as the provider will tell us. */
export interface QuotaInfo {
  provider: string;
  /** null = unlimited / not metered (local providers). */
  requestsRemaining: number | null;
  charactersRemaining: number | null;
  /** Free allocation window this refers to. */
  window: "day" | "month" | "none";
  note?: string;
}

export interface CostEstimate {
  provider: string;
  characters: number;
  /** True when this call is expected to stay inside the free allocation. */
  withinFreeAllowance: boolean;
  /** Rupees. 0 for local and for free-tier usage. */
  estimatedInr: number;
}

export interface TtsOptions {
  voice?: string;
  /** 1.0 = provider default. Lower is slower, which teaching usually wants. */
  speed?: number;
  style?: string;
}

export interface TtsResult {
  audioPath: string;
  durationMs: number;
  provider: string;
  voice: string;
  format: "wav";
  sampleRate: number;
  cached: boolean;
  /** False for SAPI and anything else not fit to ship. */
  productionQuality: boolean;
  metadata?: Record<string, unknown>;
}

export interface TtsProvider {
  readonly id: string;
  /** Human-facing name for logs and the voice badge. */
  readonly label: string;
  /** False = development placeholder (SAPI). Never selected automatically. */
  readonly productionQuality: boolean;
  /** True when using it cannot produce a bill under any circumstances. */
  readonly alwaysFree: boolean;
  /** True when it needs no network. */
  readonly offlineCapable: boolean;
  readonly defaultVoice: string;

  isAvailable(): Promise<boolean>;
  listVoices(): Promise<string[]>;
  getRemainingQuota(): Promise<QuotaInfo>;
  estimateCost(text: string): CostEstimate;
  synthesize(text: string, outFile: string, options?: TtsOptions): Promise<TtsResult>;
}

/** Thrown instead of silently degrading to a placeholder voice. */
export class NoProductionTtsAvailable extends Error {
  constructor(public readonly detail: string) {
    super(`NO_PRODUCTION_TTS_AVAILABLE — ${detail}`);
    this.name = "NoProductionTtsAvailable";
  }
}
