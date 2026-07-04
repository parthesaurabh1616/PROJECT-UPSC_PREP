# IAS OS — Phase 3 Architecture: Cognitive Operating System (COS)

**Status:** For review & approval. No implementation until approved.
**Prereqs:** Phase 1 PRD (approved) · Phase 2 (implemented: tickets, sprints, PSIR schedule, Outcome Shield, decision record).
**Prime directive (inherited, non-negotiable):** every number derives from real events; empty state over estimate; insights are process-framed (Outcome Shield applies to the COS too).

---

## 0. Architectural Thesis

The COS is **not a new app** — it is a read-model + enrichment layer over what already exists. The platform already has the one thing a cognitive twin needs: a truthful **event stream** (`ActivityEvent`: chapter reads, PYQ attempts with self-rating, SM-2 review grades, answers written, tests taken, focus sessions, CA reads — all timestamped, subject-tagged). Phase 3 adds:

1. **One new capture surface** (a 20-second daily check-in — the only data the ledger can't infer).
2. **One new stateful spine record** (`TopicState` — the twin's memory of every syllabus node).
3. **Deterministic derivation engines** (profile, retention, quality — pure functions over the ledger, recomputable from scratch at any time).
4. **An AI enrichment pipeline** (Collector lens, Exam-Eve kits — cached artifacts, quota-aware, regenerated only when sources change).

```
                        ┌──────────────────────────────────────────────┐
                        │              CAPTURE LAYER                   │
                        │  existing ledger writes   +   DailyCheckin   │
                        └──────────────┬───────────────────┬───────────┘
                                       ▼                   ▼
                        ┌──────────────────────────────────────────────┐
                        │        ACTIVITY LEDGER  (source of truth)    │
                        └───────┬──────────────┬──────────────┬────────┘
                 deterministic  ▼              ▼              ▼   nightly/on-read
              ┌───────────────────┐  ┌──────────────────┐  ┌────────────────────┐
              │ M2 Memory Engine  │  │ M3 Quality Engine│  │ M1 Profile Engine  │
              │ TopicState ladder │  │ LQS per topic    │  │ + M5 Energy Engine │
              └─────────┬─────────┘  └────────┬─────────┘  └─────────┬──────────┘
                        ▼                     ▼                      ▼
              ┌──────────────────────────────────────────────────────────────┐
              │                    TopicState  (per syllabus node)           │
              │   status · ladder stage · retention · LQS · nextRevisionAt   │
              └───────┬──────────────────────────────────────────┬───────────┘
              AI enrich▼ (quota-aware, cached)                   ▼ surfaces (read-only)
        ┌────────────────────────────┐            ┌──────────────────────────────┐
        │ M6 Collector Lens          │            │ /command (today's revisions) │
        │ M7 Exam-Eve Kit pipeline   │            │ /program (auto tickets)      │
        │ TopicArtifact store        │            │ /exam (Direction Room)       │
        └────────────────────────────┘            │ M4 Decision Journal (/log)   │
                                                  └──────────────────────────────┘
```

**Three laws of the COS:**
- **L1 — Ledger is truth.** Engines never write metrics; they derive them. Any derived value must be recomputable by replaying events.
- **L2 — Silence over noise.** No profile claim, insight, or score is shown until its minimum evidence threshold is met (each module defines its N below).
- **L3 — Shield holds.** COS output is always framed as *process guidance* ("revise Federalism today"), never outcome prediction ("you'll score X").

---

## 1. Module Architecture

### M1 · Learning Profile Engine
**What it is:** a set of pure derivation functions (`src/lib/cos/profile.ts`) computing the twin's traits from the ledger, plus a weekly `ProfileSnapshot` row for trend lines.

| Trait | Derivation (all from existing tables) | Min evidence (L2) |
|---|---|---|
| Strong/weak subjects | per-subject composite: PYQ self-rating avg + Test Arena accuracy + SM-2 avg grade + answer eval scores | ≥10 graded events/subject |
| Learning speed | NCERT chapters (or topics) completed per deep-work hour, 28-day rolling | ≥8 chapters |
| Retention ability | mean SM-2 grade on first re-exposure per card cohort | ≥30 reviews |
| Revision efficiency | Δ(grade) per minute of REVISION_REVIEWED time | ≥30 reviews |
| Preferred study timing | histogram of focus minutes by hour-of-day **weighted by next-day recall grade** of material studied in that hour | ≥14 active days |
| Concentration span | p75 of uninterrupted STUDY_SESSION durations, trend | ≥20 sessions |
| Answer quality | Answer Lab evaluation scores, per GS paper, trend | ≥6 evaluated answers |
| MCQ accuracy | Test Arena + PYQ attempts, per subject | ≥40 attempts |
| Concept mastery | roll-up of TopicState (M2/M3) per syllabus section | derives from M2/M3 |

**Update model:** computed on read with a 10-min in-process cache; `ProfileSnapshot` persisted by the nightly job (see §4 Scheduler) so trends survive recomputation. "Auto-update after every session" is thus achieved by construction — the next read reflects the new events.

### M2 · Memory & Forgetting Engine
**Two-tier design (decision D-1, please approve):** the existing **SM-2 card engine stays** as the *micro* layer (facts/cards). Phase 3 adds a *macro* layer — **topic-level revision ladder** on `TopicState`:

- Ladder: `R1 +1d → R2 +7d → R3 +21d → R4 +60d → R5 +120d` (from ticket/topic completion).
- **Retention estimate:** Ebbinghaus `R(t) = exp(−Δt / S)`, with stability `S = S₀ · 2^stage`, `S₀ = 2 days`, modulated by performance: a topic-revision outcome (self-grade 0–5, same scale as SM-2) shifts stage: grade ≥4 → advance; grade 3 → repeat interval; grade ≤2 → drop one stage (floor R1).
- **Scheduling is automatic:** completing a `CLASS`/`LEARN` ticket linked to a syllabus node (or marking a chapter done) creates/updates `TopicState` and sets `nextRevisionAt = now + 1d`. A nightly pass materializes due topic-revisions as **REVISE tickets in the active sprint** (capped, prioritized — see edge cases E3). Micro layer (cards) is untouched.
- New ledger event: `TOPIC_REVISED` (refId = nodeId, value = grade 0–5) — written when the user completes a topic-revision ticket via a 10-second recall self-grade prompt.

### M3 · Learning Quality Engine
**LQS: 0–100 per topic**, deterministic checklist over the ledger; the topic's score is the sum of earned components (each verifiable, each with a real event behind it):

| Component | Points | Evidence event |
|---|---|---|
| Class/lecture processed | 10 | CLASS ticket for the node closed |
| Note exists & anchored | 15 | Note with `syllabusNodeId` (FR-5 anchor) |
| Recall quality | 20 | mean SM-2/TOPIC_REVISED grade on the node (×20/5) |
| Revision ladder adherence | 15 | stage reached ÷ stage expected by elapsed time |
| PYQs engaged | 10 | ≥5 PYQ_ATTEMPTED with refs on this node/topic |
| MCQ accuracy | 10 | node-tagged test accuracy (×10) |
| Answer written | 10 | ≥1 ANSWER_WRITTEN mapped to node |
| Collector lens read | 5 | artifact viewed event |
| CA integration | 5 | ≥1 CA linked/read on topic |
| Knowledge connections | ~~5~~ folded into note anchor (dup of FR-5) → **Answer ≥2 = 10 pts** (rebalance) |

Aggregations: section LQS = mean of child topics (untouched topics count 0 — honest); subject LQS likewise. **Hours are never an input.**

### M4 · Decision Journal
New model `DecisionRecord` + `/decisions` page (append-only; edits create revisions). Fields per spec: date, title, decision, reason, evidence (links to platform pages/PYQ data), alternatives, expectedOutcome, reviewAt, status (`ACTIVE | REVIEWED | SUPERSEDED`), reviewNote. **Seeded at migration with the three decisions already made** (PSIR — linking to the sealed /optional evidence; StudyIQ July batch; sprint-based operating system). Review dates surface as ADMIN tickets when due. Purpose enforced by UI copy: *"Decided on {date} for {reason} — re-litigating costs a ticket."*

### M5 · Energy & Focus Engine
**Capture:** `DailyCheckin` — one row/day, 7 sliders (sleep hours + energy/mood/stress/focus/confidence/distraction 1–5) + optional note; entered from /command in <20s; **day boundary 04:00** (night-owl; decision D-2). Missing days are simply absent (no imputation).
**Insight engine:** Pearson correlation between check-in factors and same/next-day performance series (MCQ accuracy, mean recall grade, focus minutes, LQS delta). **Publication gate:** |r| ≥ 0.4 AND n ≥ 14 paired days AND the two cohorts differ by ≥ 8% — otherwise the insight does not exist. Output phrased with evidence: *"Across 22 days, recall grades averaged 3.9 after ≥7h sleep vs 3.1 after <6h."* Insights appear in Weekly Review only (not daily — Shield).

### M6 · Collector Thinking Engine
On topic completion (LQS ≥ 40 or CLASS ticket closed), enqueue generation of a **Collector Lens** artifact via existing `lib/ai.ts` (Gemini primary / Groq fallback): administrative relevance, governance application, DM perspective, one ethical dilemma, policy links, interview points, 2 real examples — grounded with the node's syllabus text + the user's note + related PYQs (existing semantic-related engine). Stored as `TopicArtifact(kind=COLLECTOR)`; shown on the topic page and in /mentor context. Regenerated only if the source note's hash changes.

### M7 · Exam-Eve Engine
A **distillation state machine** per topic, producing `TopicArtifact` rows:

```
NOTE (user's, source of truth)
  → REVISION_NOTE (~40% length)      [gate: LQS ≥ 40]
  → ONE_PAGER (≤1 page)              [gate: R2 complete]
  → MINDMAP (JSON tree, rendered)    [gate: R3 complete]
  → FLASHCARDS (5–12 Q/A → seeds SM-2 cards, deduped)  [gate: R3]
  → RECALL_30 (30-second sheet: 5–8 bullet triggers)   [gate: R4]
```
Artifacts generate progressively as the topic matures — by design the "Exam Eve Kit" is complete when the ladder is. All artifacts carry `sourceHash`; note edits mark descendants `STALE` (badge, regenerate on demand). A `/eve` kit view groups artifacts by paper → section, with per-subject completeness = artifacts present ÷ artifacts gated-possible (honest denominator).

---

## 2. Data Flow (canonical write → read path)

```
user acts (reads chapter / closes ticket / grades recall / checks in)
  → ActivityEvent (+ DailyCheckin)                                [writes]
  → TopicState updated in the same transaction (status/ladder)    [state]
  → nightly job: materialize due REVISE tickets · ProfileSnapshot
                 · enqueue M6/M7 generations within AI budget      [jobs]
  → surfaces read: /command (due today) · /program (auto tickets)
                 · /review (insights) · /eve (kits) · /decisions   [reads]
```

## 3. Database Changes (Prisma, additive only — no existing table modified except one nullable column)

```prisma
model TopicState {            // the cognitive twin, one row per touched syllabus node
  id             String   @id @default(cuid())
  userId         String
  nodeId         String   // syllabus node key (existing spine ids)
  status         String   @default("TOUCHED") // TOUCHED|PROCESSED|PRACTICED|REVISING|MASTERED|DECAYED
  ladderStage    Int      @default(0)         // 0..5
  lastRevisedAt  DateTime?
  nextRevisionAt DateTime?
  lastGrade      Int?
  lqs            Int      @default(0)         // cached; recomputable
  lqsParts       Json?                        // component breakdown for the UI
  updatedAt      DateTime @updatedAt
  @@unique([userId, nodeId])
  @@index([userId, nextRevisionAt])
}

model DailyCheckin {
  id        String   @id @default(cuid())
  userId    String
  day       DateTime // 04:00-boundary date, unique per user
  sleepHrs  Float?
  energy    Int?     // 1..5 … mood, stress, focus, confidence, distraction same
  mood      Int?
  stress    Int?
  focus     Int?
  confidence Int?
  distraction Int?
  note      String?
  @@unique([userId, day])
}

model DecisionRecord {
  id          String    @id @default(cuid())
  userId      String
  decidedAt   DateTime
  title       String
  decision    String
  reason      String
  evidence    String?   // markdown, links to platform routes
  alternatives String?
  expectedOutcome String?
  reviewAt    DateTime?
  status      String    @default("ACTIVE") // ACTIVE|REVIEWED|SUPERSEDED
  reviewNote  String?
  createdAt   DateTime  @default(now())
}

model TopicArtifact {
  id          String   @id @default(cuid())
  userId      String
  nodeId      String
  kind        String   // COLLECTOR|REVISION_NOTE|ONE_PAGER|MINDMAP|FLASHCARDS|RECALL_30
  content     Json
  sourceHash  String
  stale       Boolean  @default(false)
  model       String?
  createdAt   DateTime @default(now())
  @@unique([userId, nodeId, kind])
}

model ProfileSnapshot {
  id        String   @id @default(cuid())
  userId    String
  weekStart DateTime
  data      Json     // full computed profile at snapshot time
  @@unique([userId, weekStart])
}

// SprintTask: + nodeId String? (nullable link: ticket → syllabus node)
// ActivityEvent.type gains values: "TOPIC_REVISED", "CHECKIN", "ARTIFACT_VIEWED" (string field — no migration needed)
```

## 4. Scheduler (no new infra)
A single idempotent job `scripts/cos-nightly.ts` (run via `npm run cos:nightly`, optionally Windows Task Scheduler at 04:05; **also self-heals lazily** — /command triggers the same routine if last run > 24h): ① advance DECAYED statuses (overdue > 2× interval) ② materialize due topic-revisions as REVISE tickets (cap/priority per E3) ③ write ProfileSnapshot on Sundays ④ drain the AI generation queue within budget (default 10 artifacts/night).

## 5. State Diagram — TopicState

```
UNTOUCHED ──class/chapter/note──► TOUCHED ──note+cards──► PROCESSED
     ▲                                                        │ PYQ/answer/test on node
     │ (node never seen: no row)                              ▼
  DECAYED ◄──overdue > 2× interval── REVISING ◄──R1 due─── PRACTICED
     │ grade ≥4 on comeback              │ ladder R1→R5 (grades move stage ±)
     └──────────────────────────────────►│ stage 5 & retention ≥ 0.8
                                          ▼
                                       MASTERED (still gets R5 refreshes)
```

## 6. Algorithms (reference implementations)

- **Retention:** `R = exp(−hoursSince(lastRevisedAt) / (48·2^stage))`; topic "at risk" when R < 0.55 (drives priority).
- **Ladder update on grade g:** `stage' = min(5, stage+1)` if g≥4; `stage` if g==3; `max(1, stage−1)` if g≤2; `nextRevisionAt = now + INTERVAL[stage']`.
- **LQS:** §M3 table; recomputed on any node-linked event; cached in TopicState.
- **Revision-ticket priority (E3):** `priority = (1−R) · examWeight(node) · staleness`, where examWeight = decoded-PYQ frequency for the node's section (real corpus data) normalized 0.5–1.5.
- **Insight gate (M5):** paired series, Pearson r, publication rule as §M5; cohort split at factor median; report absolute deltas only.
- **Timing preference:** for each hour h, `score(h) = Σ focusMin(h) · nextDayRecallFactor`; report top-2 windows only if ≥14 active days.

## 7. Acceptance Criteria (per module)
- **M1:** /exam Direction Room shows profile with per-trait evidence counts; traits below threshold render "collecting evidence (n/N)". Recompute-from-scratch equals cached values.
- **M2:** closing a node-linked ticket sets R1 for tomorrow; completing the REVISE ticket with grade 4 schedules +7d; grade 2 drops stage; overdue 2× flags DECAYED; all visible on the topic page.
- **M3:** every topic page shows LQS with clickable component breakdown; components without events show 0 + the action that earns them; hours appear nowhere in the formula.
- **M4:** /decisions lists ≥3 seeded records; creating, reviewing (status change + note), and superseding work; review-due creates an ADMIN ticket.
- **M5:** check-in from /command in ≤3 clicks + sliders; no insight shown before gates pass; each insight cites its n and delta; insights only in /review.
- **M6/M7:** closing a qualifying topic queues artifacts; artifacts appear ≤24h later (or on-demand); note edit marks children STALE; /eve shows per-subject kit completeness with honest denominators; flashcards seed SM-2 without duplicating existing cards (semantic dedupe via existing pgvector).

## 8. Edge Cases
- **E1 cold start:** every engine renders its evidence-gathering state; nothing breaks with 0 rows.
- **E2 AI quota exhausted:** queue persists; artifacts marked PENDING; UI shows "queued — generates tonight"; no silent failure.
- **E3 revision pile-up** (illness/travel): materialize at most 6 topic-revisions/day, by priority; the rest wait (interval ages → priority rises); never dump 40 tickets on a Monday.
- **E4 conflicting layers:** cards (SM-2) and topics (ladder) are separate queues; /revision shows both, topic revisions first.
- **E5 night-owl day boundary:** all "today" logic in COS uses 04:00 cutoff (existing streak logic untouched in Phase 3 — noted as a candidate FR for Phase 4).
- **E6 note deleted/unanchored:** LQS component drops; artifacts marked STALE not deleted.
- **E7 self-grade gaming:** grades only move revision timing, never any success metric (Shield-compatible by design).
- **E8 duplicate flashcards:** cosine ≥ 0.92 against existing cards → skip.
- **E9 sprint absent** (no active sprint): due revisions surface on /command directly; ledger still records TOPIC_REVISED.

## 9. Risks
| Risk | L | Mitigation |
|---|---|---|
| Check-in fatigue → M5 data starves | M | 20-second form, streak-friendly, degrade gracefully (M5 simply stays silent) |
| Insight ≠ causation misread | M | fixed phrasing template: observational, delta + n, no imperative claims |
| AI artifact quality drift | M | artifacts always show source note beside them; regenerate button; user note remains canonical |
| Complexity creep (COS becomes a second job) | H | only two new user behaviours: 20s check-in + 10s recall grade; everything else automatic |
| Quota costs grow with corpus | M | nightly budget cap; artifacts immutable-cached by sourceHash |
| Shield erosion via "mastery %" anxiety | M | mastery shown per-topic only; no global "readiness %" anywhere |

## 10. Dependencies & Scalability
**Depends on (all existing):** ActivityEvent ledger · syllabus spine + node ids · SM-2 Revision · PyqAttempt/TestAttempt/MainsAnswer · pgvector related-engine · lib/ai (Gemini/Groq, quota-aware) · Sprint/SprintTask (+nodeId column).
**Scalability:** all new tables are userId-keyed (multi-user ready); engines are pure functions (unit-testable, replayable); artifacts are content-addressed (sourceHash) → cacheable/CDN-able; snapshots keep trend queries O(weeks) not O(events); ladder math is O(1) per event.

---

## Approval gates (blocking implementation)
- **D-1:** Two-tier memory (SM-2 cards *micro* + fixed ladder 1/7/21/60/120 *macro* on topics) — approve?
- **D-2:** COS day boundary at **04:00** — approve?
- **D-3:** Daily commitment: one 20-second check-in + one 10-second recall grade per revision ticket — acceptable?
- **D-4:** AI budget: ~10 artifacts generated per night (free-tier safe) — acceptable?

**Proposed build order after approval:** 3.1 TopicState + ladder + LQS (+ nodeId on tickets) → 3.2 Check-in + Profile → 3.3 Decision Journal (seeded) → 3.4 Collector Lens + Eve pipeline → 3.5 Insight engine (activates automatically once 14 days of check-ins exist).
