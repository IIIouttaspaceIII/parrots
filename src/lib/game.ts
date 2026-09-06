import parrotsData from "@/data/parrots.json";
import type { Gender, Parrot, Round } from "./types";

export const parrots: Parrot[] = parrotsData as Parrot[];

const OPTIONS_PER_ROUND = 10;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Builds a new round: picks a target species, an image (male/female if applicable), and 10 shuffled options. */
export function generateRound(pool: Parrot[] = parrots): Round {
  const target = pickRandom(pool);

  let displayedImage = target.imageUrl;
  let displayedGender: Gender | null = null;
  if (target.dimorphism) {
    displayedGender = Math.random() < 0.5 ? "male" : "female";
    displayedImage = target.dimorphism[displayedGender];
  }

  const distractorPool = pool.filter((p) => p.id !== target.id);
  const distractors = shuffle(distractorPool).slice(0, OPTIONS_PER_ROUND - 1);
  const options = shuffle([target, ...distractors]);

  return { target, displayedImage, displayedGender, options };
}
