/**
 * SM-2 Spaced Repetition Algorithm
 * quality: 0=blackout, 1=wrong, 2=wrong but familiar, 3=correct (hard), 4=correct, 5=perfect
 */
export interface SM2Result {
  interval: number;      // days until next review
  repetitions: number;
  easeFactor: number;
  dueAt: Date;
}

export function sm2(
  quality: 0 | 1 | 2 | 3 | 4 | 5,
  repetitions: number,
  interval: number,
  easeFactor: number,
): SM2Result {
  let newInterval: number;
  let newReps: number;
  let newEF: number;

  if (quality >= 3) {
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else newInterval = Math.round(interval * easeFactor);
    newReps = repetitions + 1;
  } else {
    newInterval = 1;
    newReps = 0;
  }

  newEF = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  );

  const dueAt = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);

  return { interval: newInterval, repetitions: newReps, easeFactor: newEF, dueAt };
}

export const GRADE_LABELS: Record<0 | 1 | 2 | 3 | 4 | 5, string> = {
  0: "Blackout",
  1: "Wrong",
  2: "Hard",
  3: "Good",
  4: "Easy",
  5: "Perfect",
};
