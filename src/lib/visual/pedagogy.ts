/* ════════════════════════════════════════════════════════════════
   Pedagogical validator — experience first, terminology last.

   The rule this enforces (directive §13–15): a technical term may only
   be spoken AFTER the mechanism it names has already been shown and
   explained. Naming first turns understanding into memorisation, which
   is exactly the failure mode this whole engine exists to avoid.

   Found in the wild: Plate Tectonics named "subduction" in scene 11 and
   only described the plate sinking in scene 12. Both boards passed every
   other check, so this needed to be mechanical rather than noticed.
   ════════════════════════════════════════════════════════════════ */
import { Storyboard } from "./types";

export interface TermGate {
  /** The technical term whose introduction is being policed. */
  term: RegExp;
  /** Plain-language evidence that the mechanism has already been taught. */
  mechanism: RegExp;
  label: string;
  /** What the mechanism should look like, for the error message. */
  expects: string;
}

export const TERM_GATES: TermGate[] = [
  // ── Geography ──
  { label: "subduction", term: /\bsubduct(?:ion|ing|s|ed)?\b/i,
    mechanism: /\bsinks?\b|\bsinking\b|bends? (?:down|beneath|under)|dives?\b|slides? (?:under|beneath)|forced (?:under|beneath)|descend/i,
    expects: "show the denser plate bending down and sinking first" },
  { label: "convergence", term: /\bconvergen(?:ce|t)\b/i,
    mechanism: /toward each other|towards each other|move together|moving together|push(?:ing)? (?:into|against)|collide|collision|meet\b/i,
    expects: "show the plates moving toward each other first" },
  { label: "divergence", term: /\bdivergen(?:ce|t)\b/i,
    mechanism: /away from each other|apart\b|separat|spread/i,
    expects: "show the plates pulling apart first" },
  { label: "Coriolis", term: /\bcoriolis\b/i,
    mechanism: /deflect|apparent|curv(?:e|ing)|rotating earth|earth (?:spins|rotates)|turns? to the (?:right|left)/i,
    expects: "show the moving object appearing to deflect on a rotating Earth first" },
  { label: "orographic", term: /\borographic\b/i,
    mechanism: /rises?\b|rising|uplift|forced up|cools?\b|condens/i,
    expects: "show moist air forced up a mountain and cooling first" },
  { label: "accretion", term: /\baccretion\b/i,
    mechanism: /stick|clump|coalesc|collid|gather|build(?:s|ing)? up/i,
    expects: "show material sticking together first" },
  { label: "recombination", term: /\brecombination\b/i,
    mechanism: /electrons? (?:are )?captur|join|combine|neutral atom/i,
    expects: "show electrons being captured into atoms first" },

  // ── PSIR ──
  { label: "state of nature", term: /\bstate of nature\b/i,
    mechanism: /no government|no police|no (?:common )?(?:law|authority|power)|without (?:a )?(?:government|authority|ruler)|nobody (?:to )?enforce/i,
    expects: "show a world with no authority first" },
  { label: "social contract", term: /\bsocial contract\b/i,
    mechanism: /agree(?:ment)?\b|give up|gives? up|surrender|consent|come together/i,
    expects: "show people agreeing to give something up first" },
  { label: "Leviathan", term: /\bleviathan\b/i,
    mechanism: /common (?:power|authority)|single authority|one (?:sword|voice)|sovereign|powerful ruler/i,
    expects: "show the common authority being created first" },
  /* Deliberately broad. The first draft only matched "no higher"/"supreme" and
     flagged boards that had in fact taught the mechanism as "no other authority
     may challenge the state" — a false positive. A validator that cries wolf
     pushes the generator into worse boards to satisfy it. */
  { label: "sovereignty", term: /\bsovereignt(?:y|ies)\b/i,
    mechanism: /highest|supreme|final (?:say|word)|no higher|above all|no other authority|no ?(?:one|body) above|cannot be (?:challenged|overruled)|unchallenged|indivisible|absolute (?:power|authority)/i,
    expects: "show that no authority sits above it first" },
  { label: "security dilemma", term: /\bsecurity dilemma\b/i,
    mechanism: /fear|afraid|threat|arms?\b|weapon/i,
    expects: "show A arming, B fearing, B arming first" },
  { label: "balance of power", term: /\bbalance of power\b/i,
    mechanism: /stronger|grow(?:s|ing)? in power|threat|join(?:s|ed)? together|alliance/i,
    expects: "show one state growing and others combining first" },
];

export interface OrderingProblem {
  label: string;
  termScene: number;
  mechanismScene: number | null;
  message: string;
}

/**
 * Text that counts as INTRODUCING a term.
 * A TITLE card's on-screen text is excluded: the video's own title legitimately
 * contains the term ("Hobbes — State of Nature to Leviathan"), and the topic is
 * rendered as persistent chrome on every scene anyway, so treating it as an
 * introduction flags every board that is named after its subject. Narration in
 * the title scene still counts — saying the word is different from titling with it.
 */
function sceneText(sb: Storyboard, i: number): string {
  const s = sb.scenes[i];
  const onScreen = s.visual?.primitive === "TITLE" ? "" : (s.onScreenText ?? []).join(" ");
  return `${s.narration ?? ""} ${onScreen}`;
}

/**
 * Flag every term introduced before the mechanism it names.
 * Only gates whose term actually appears are considered — a board that never
 * mentions subduction is not failing the subduction rule.
 */
export function validateTermOrdering(sb: Storyboard): OrderingProblem[] {
  const problems: OrderingProblem[] = [];
  const texts = sb.scenes.map((_, i) => sceneText(sb, i));

  for (const gate of TERM_GATES) {
    const termIdx = texts.findIndex((t) => gate.term.test(t));
    if (termIdx === -1) continue;

    const mechIdx = texts.findIndex((t) => gate.mechanism.test(t));
    // The mechanism may legitimately land in the same scene, immediately
    // before the name — that is the SHOW → SAY → NAME pattern working.
    if (mechIdx !== -1 && mechIdx <= termIdx) continue;

    problems.push({
      label: gate.label,
      termScene: sb.scenes[termIdx].n,
      mechanismScene: mechIdx === -1 ? null : sb.scenes[mechIdx].n,
      message: mechIdx === -1
        ? `"${gate.label}" is named in scene ${sb.scenes[termIdx].n} but its mechanism is never shown — ${gate.expects}`
        : `"${gate.label}" is named in scene ${sb.scenes[termIdx].n} but only explained in scene ${sb.scenes[mechIdx].n} — ${gate.expects}`,
    });
  }
  return problems;
}

/** Prompt fragment so the generator is told the rule, not just judged by it. */
export function termOrderingRule(): string {
  return `TERMINOLOGY ORDERING — experience first, explanation second, terminology third.
A technical term may only be spoken AFTER the scene that shows and explains the
thing it names. Examples of the required order:
${TERM_GATES.slice(0, 6).map((g) => `  · ${g.expects}, THEN name "${g.label}"`).join("\n")}
Naming first turns understanding into memorisation. If you introduce a term,
the immediately preceding scenes must already have made the mechanism obvious.`;
}
