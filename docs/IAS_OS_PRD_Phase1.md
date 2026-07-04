# IAS OS — Product Requirements Document (Phase 1)

**Product:** IAS OS — Indian Administrative Services Operating System
**Tagline:** *"Focus on Today's Ticket. Let the Rank Take Care of Itself."*
**Document status:** Phase 1 — for review & approval. No implementation begins until approved.
**Context:** This is a **brownfield PRD**. The platform (working name *Conquer Capital*, repo `upsc-prep-os`) already exists with 19 live modules and a truthfulness-first data architecture. Phase 1 therefore defines the product *and* the **delta**: the few deliberate changes that re-align the existing system to the IAS OS vision.

---

## 1. Product Vision

One calm place where a UPSC aspirant executes today's work, and the system silently converts that daily execution into syllabus coverage, durable memory, writing skill, and interview depth — so that outcomes are produced by the process, never stared at.

The product succeeds when the user thinks about **tickets**, not rank; the system thinks about the rank so the user doesn't have to.

## 2. Mission Statement

Manage the entire UPSC CSE lifecycle — Day 1 to Personality Test — as a single operating system: Jira for execution (sprints/tickets), Notion for documentation (notes), Obsidian for knowledge (linked, deduplicated), GitHub Projects for planning (backlog = syllabus), and a second brain for learning (spaced repetition + retrieval) — with every number derived from real, auditable activity.

## 3. Product Philosophy

| Principle | Meaning in product terms |
|---|---|
| Execution > Motivation | The default screen is today's tickets, never a motivational dashboard |
| Consistency > Intensity | Streak = minimum viable day; no "12-hour hero day" mechanics |
| Systems > Goals | Goals live in quarterly review only; days and weeks are systems |
| Learning > Memorization | Every topic flows through understand → connect → retrieve |
| Knowledge > Notes | One knowledge base, anchored to the syllabus spine; zero duplicate notes |
| Revision > Reading | The revision queue outranks new content every day |
| Collector Thinking > Exam Thinking | Every topic carries a "why does a DM need this" lens |
| Truthfulness (existing, non-negotiable) | No metric is ever fabricated; empty states over fake numbers |

## 4. User Personas

**P1 — Saurabh (primary, the only Phase-1 user).** Beginner; GS Foundation classes running (currently GS-II); **PSIR optional selected, classes begin 8 July**; two sources (Spotlight Academy, StudyIQ) — one primary, one conceptual backup; night owl, ~12 h/day; builds the platform himself. Critical psychology: performs dramatically better on small weekly goals than on end goals (evidence: −45 kg achieved through weekly-only focus). Rank/outcome displays create anxiety and must be quarantined.

**P2 — Future aspirant (out of Phase-1 scope, shapes architecture only).** Multi-user, onboarding, and content licensing are explicitly deferred; nothing in Phase 1 may hard-block them.

## 5. Current State (what already exists and stays)

| Existing module | Route | Role in IAS OS |
|---|---|---|
| Sprint Board | `/program` | **Execution core** — weekly sprints; tasks auto-track from the activity ledger |
| Dashboard | `/command` | Daily surface (to be outcome-shielded, §7 FR-1) |
| Weekly Review | `/review` | Sprint review/retro digest (real ledger data) |
| Exam Intelligence | `/exam` | Outcome analytics (to become the quarantined quarterly surface) |
| Syllabus Intelligence | `/syllabus` | Product backlog — 158 official topics incl. PSIR I & II |
| PYQ Intelligence | `/pyq` | 851 decoded GS/Essay/Prelims Qs + 530 optional Qs (168 PSIR) |
| NCERT Library | `/ncert` | Source reading with progress + AI study tools |
| Answer Lab / Test Arena | `/answers` `/tests` | Mains writing + MCQ practice, AI-evaluated |
| Revision Engine | `/revision` | SM-2 spaced repetition |
| Notes / Knowledge Hub | `/notes` `/knowledge` | Knowledge base (to gain dedupe policy, FR-5) |
| Current Affairs / Live Actions | `/current-affairs` `/intelligence` | Daily CA with GS mapping |
| AI Mentor | `/mentor` | Grounded tutor (NCERT/syllabus/PYQ context) |
| Globe Command Center | `/launch` | Geography/IR spatial layer + daily country focus |
| Optional Decision | `/optional` | **Decision made (PSIR)** — becomes a sealed decision record |
| Activity ledger | (internal) | Single source of truth for every metric |

## 6. User Journey

**Daily loop (the only loop the user must think about):**
```
open /command ──► revision queue → 0 ──► today's tickets (from sprint)
     ▲                                        │ class ticket? → process topic (7-step)
     │                                        │ practice ticket? → /pyq /tests /answers
     └── shutdown note (5-min daily review) ◄─┘  everything auto-logs to the ledger
```
**Weekly loop:** Sunday → `/review` digest (real numbers) → retro (keep/drop/try) → plan next sprint on `/program` (≤ 15 min).
**Quarterly loop (the ONLY outcome look):** `/exam` — coverage vs phase exit criteria, trend lines, plan correction.
**Lifecycle:** P0 Foundation → P1 Core Build → P2 Prelims Pivot → P3 Mains → P4 Interview (phase criteria already defined in the Program Charter).

## 7. Functional Requirements (Phase-1 delta)

> Each FR lists: problem → requirement → acceptance criteria (AC). Priorities: **P0 = this phase**, P1 = next.

### FR-1 · Outcome Shield — **P0** *(the psychological core)*
**Problem:** Daily surfaces currently show outcome data (T-minus-Prelims countdown, target-marks framing, topper benchmarks). For this user, that measurably harms execution.
**Requirement:** Daily surfaces (`/command`, Shell topbar/sidebar, `/launch` HUD, `/program`) show **process signals only**: today's tickets, revision queue, streak, focus minutes, sprint progress. All outcome data (countdowns, target marks, topper comparisons, projected anything) moves to `/exam`, which is reframed as the **Quarterly Direction Room** and is not linked from daily flows' primary actions.
**AC:** (1) No countdown, rank, or marks target renders on `/command`, `/program`, `/review` (weekly section), Shell, or `/launch` HUD. (2) `/exam` retains full outcome analytics unchanged. (3) Streak and sprint metrics remain. (4) No data is deleted — only relocated.

### FR-2 · PSIR Program Activation — **P0**
**Problem:** The optional is decided (PSIR) but the system still runs "undecided" state (Sprint-1 memo task, decision-page framing, Sociology-first recommendation).
**Requirement:** PSIR becomes a first-class epic: PSIR I & II syllabus nodes act as backlog; the 168 decoded PSIR PYQs surface in practice flows; `/optional` is sealed as a "Decision record — PSIR, July 2026" (evidence preserved, CTA removed); Sprint templates gain PSIR tickets (classes begin 8 July).
**AC:** (1) `/optional` header states the decision and date; no "choose" CTA. (2) Sprint planner template includes PSIR class-sync tickets. (3) PSIR PYQs filterable in `/pyq`. (4) The stale "decision memo" task pattern is retired from templates.

### FR-3 · Ticket Model — **P0**
**Problem:** Sprint tasks exist but lack the Jira-like semantics the vision requires.
**Requirement:** Rename tasks → **tickets** across UI. Each ticket carries a **type**: `CLASS` (sync with coaching), `LEARN` (new topic), `REVISE`, `PRACTICE` (PYQ/MCQ), `WRITE` (answers/essay), `ADMIN`. Metric-bound auto-tracking (existing) is unchanged; type drives icon/color and weekly-review breakdown.
**AC:** (1) Ticket type selectable at creation, shown on board and in `/review`. (2) Existing sprints migrate (default type inferred from metric). (3) Vocabulary "ticket/sprint/backlog" consistent on `/program` and `/review`.

### FR-4 · Coaching Timetable Integration — **P1**
**Problem:** Coaching schedules (GS Foundation; PSIR from 8 July) currently live outside the system; the system must integrate them, not fight them.
**Requirement:** Ingest an uploaded timetable (PDF/image → AI decode, same pipeline pattern as PYQ decoding) into dated `CLASS` tickets, each pre-linked to its syllabus node. A **source policy** setting records primary vs backup source (Spotlight Academy vs StudyIQ); backup-source content is reachable only from a topic's page, never scheduled.
**AC:** (1) Upload → proposed tickets with date/topic → user confirms. (2) Each class ticket links to a syllabus node. (3) Source policy visible in settings and stamped on notes.

### FR-5 · Unified Knowledge Base (zero-duplicate notes) — **P1**
**Problem:** Two sources + classes + self-study creates duplicate-note risk, which the user explicitly forbids.
**Requirement:** Every note anchors to exactly one syllabus node (existing spine). On note creation, the semantic-related engine (already built on pgvector) checks for an existing note on that node/topic and offers **merge-into** instead of create. One node = one living note; sources append sections, never new notes.
**AC:** (1) Creating a second note on an anchored node triggers the merge prompt. (2) Notes display their syllabus anchor + source stamps. (3) Knowledge Hub shows one entry per topic.

### FR-6 · Process-only Success Signals — **P0**
**Requirement:** All celebration/summary copy references process (tickets closed, sprint %, streak, queue-zero days) — never rank, marks, percentile, or peer comparison. Weekly Review's framing: "what improved this week."
**AC:** Copy audit passes on `/command`, `/program`, `/review`, `/exam` entry points.

## 8. Non-functional Requirements

| NFR | Requirement |
|---|---|
| Truthfulness | Every displayed number derives from the ledger or real content tables; empty state over estimate (existing invariant, applies to all new work) |
| Calm | No push notifications, no gamified popups, no red badges except revision-due; zero social/comparison features |
| Performance | Daily surfaces < 1 s TTI on the user's machine; board interactions optimistic |
| Reliability | All state in Postgres (Docker volume); no cloud dependency for core loop; AI features degrade gracefully (quota-aware) |
| Privacy | Single-user local-first; no telemetry |
| Accessibility | Keyboard operable (Ctrl+B, Ctrl+K exist); focus-visible controls |
| Auditability | Any metric traceable to ledger events on inspection |

## 9. Product Scope (Phase 1) & 10. Out of Scope

**In scope:** FR-1, FR-2, FR-3, FR-6 (P0); FR-4, FR-5 specified now, built next.
**Explicitly out of scope:** mobile apps; multi-user/auth; social features, leaderboards, peer comparison of any kind; marketplace/content sales; notification system; rank predictors; test-series percentile scraping; gamification beyond streak; offline sync; non-UPSC exams (MPSC config exists but is dormant).

## 11. Design Principles

1. **Today is the whole UI.** Everything else is one click deeper.
2. **The board cannot lie** — auto-tickets track from the ledger; overrides are explicit and visible.
3. **Quarantine outcomes** — direction is reviewed quarterly by appointment, not ambiently.
4. **One spine** — the official syllabus anchors notes, tickets, PYQs, and classes.
5. **Integrate coaching, don't compete with it** — the timetable is an input, not an enemy.
6. **Calm, minimal, fast** — dark, quiet, monospace-labelled; nothing pulses except live feeds.
7. **Empty over fake** — unchanged, forever.

## 12. Constraints & 13. Assumptions

**Constraints:** solo developer-user; free-tier AI quotas (Gemini daily caps — batch/pace all decode jobs); Windows + OneDrive dev environment (run from `C:\Users\saura\Projects\upsc-prep-os`, commit via OneDrive repo); existing Prisma/Postgres schema must migrate, never reset.
**Assumptions (to confirm at review):**
1. Primary source = **Spotlight Academy**, backup = StudyIQ *(unconfirmed — please confirm which is primary)*.
2. The PSIR timetable file will be provided for FR-4 ingestion.
3. Relocating the T-minus countdown off the daily dashboard is acceptable *(it currently sits on `/command` and `/launch`)*.
4. "Ticket" vocabulary is preferred over "task" everywhere.

## 14. Risks

| Risk | L | Impact | Mitigation |
|---|---|---|---|
| Outcome data leaks back into daily view via new features | M | High (psychology) | FR-6 copy audit is a release gate |
| Two-source duplication despite policy | M | Medium | FR-5 merge-prompt + source stamps |
| Timetable decode errors create wrong class tickets | M | Low | Human confirm step before ticket creation |
| System-building displaces studying (builder = user) | H | High | Build only in sprint-planned `ADMIN` tickets; cap/week |
| AI quota exhaustion blocks flows | M | Medium | Graceful degradation; queue decode jobs overnight |

## 15. Success Metrics & KPIs (all process, all ledger-derived)

**North-star:** **Sprint completion %** (tickets complete ÷ planned, weekly).
**Supporting:** streak (min-viable-day); revision-queue-zero days/week; tickets closed/week by type; answers written/week; focus minutes/day (trend, not target-shame); % of class topics processed within 48 h; duplicate-note rate (target 0).
**Deliberately absent:** predicted rank, marks projections, peer percentile. *(Retention %, mock scores remain visible in the Quarterly Direction Room only.)*

## 16. Acceptance Criteria (Phase-1 gate)

Phase 1 is done when: all FR-1/2/3/6 ACs pass; a full week runs as: plan sprint Sunday → daily ticket execution → Weekly Review shows real breakdown by ticket type → zero outcome metrics encountered in the daily loop; and the user reports (retro) that the system "feels like closing tickets, not preparing for a rank."

## 17. Future Expansion (post-Phase 2)

Timetable auto-sync (recurring), Essay studio, DAF/Interview module (P4), mock-score journal (quarterly room), knowledge-graph visualization over the note spine, multi-aspirant SaaS hardening, MPSC activation.

## 18. Core Modules & 19. Dependencies

```
                       ┌────────────────────────────┐
                       │   SYLLABUS SPINE (/syllabus)│  one anchor for everything
                       └──────┬──────────┬──────────┘
              anchors         │          │        anchors
        ┌─────────────────────┤          ├──────────────────────┐
        ▼                     ▼          ▼                      ▼
  KNOWLEDGE BASE        SPRINT/TICKETS  CLASS TIMETABLE    PRACTICE CORPUS
  /notes /knowledge     /program        (FR-4 ingest)      /pyq /tests /answers
        │                     │          │                      │
        │  every action writes▼to the    │                      │
        │            ┌────────────────┐  │                      │
        └───────────►│ ACTIVITY LEDGER│◄─┴──────────────────────┘
                     └───┬──────┬─────┘
             daily surface▼      ▼ weekly/quarterly
              /command      /review · /exam (Direction Room)
              (process only)     (outcomes quarantined here)
```
Dependency rule: everything depends on the **spine** and writes to the **ledger**; surfaces only read. No module may read outcome analytics into a daily surface (FR-1 boundary).

## 20. System Boundaries

**Inside:** planning, execution, knowledge, revision, practice, evaluation, review — for one aspirant, UPSC CSE 2027.
**Outside:** coaching content itself (classes happen off-platform; the system schedules and captures them); peer data; rank prediction; anything requiring always-on cloud.

---

### Open questions for approval (blocking Phase 2)
1. Confirm primary source: **Spotlight Academy** or StudyIQ?
2. Provide the PSIR timetable file for FR-4.
3. Approve moving the T-minus countdown & topper benchmarks off `/command` + `/launch` into `/exam` (FR-1).
4. Approve "ticket" vocabulary (FR-3).

**On approval, Phase 2 = implementation plan + build order for FR-1 → FR-2 → FR-3 → FR-6, then FR-4/FR-5.**
