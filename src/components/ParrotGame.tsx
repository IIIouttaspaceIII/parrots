"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { generateRound, parrots } from "@/lib/game";
import type { Gender, Round, Score } from "@/lib/types";

function optionLabel(name: string) {
  return name;
}

export default function ParrotGame() {
  // Round is randomized, so it must only be generated on the client to avoid SSR/hydration mismatches.
  const [round, setRound] = useState<Round | null>(null);
  const [phase, setPhase] = useState<"guessing-species" | "guessing-gender" | "round-result">(
    "guessing-species"
  );
  const [score, setScore] = useState<Score>({ correct: 0, incorrect: 0 });
  const [speciesGuessId, setSpeciesGuessId] = useState<string | null>(null);
  const [speciesCorrect, setSpeciesCorrect] = useState<boolean | null>(null);
  const [genderGuess, setGenderGuess] = useState<Gender | null>(null);
  const [genderCorrect, setGenderCorrect] = useState<boolean | null>(null);

  const accuracy = useMemo(() => {
    const total = score.correct + score.incorrect;
    if (total === 0) return null;
    return Math.round((score.correct / total) * 100);
  }, [score]);

  useEffect(() => {
    setRound(generateRound(parrots));
  }, []);

  function handleSpeciesGuess(guessId: string) {
    if (!round || phase !== "guessing-species") return;
    const isCorrect = guessId === round.target.id;
    setSpeciesGuessId(guessId);
    setSpeciesCorrect(isCorrect);
    setScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      incorrect: s.incorrect + (isCorrect ? 0 : 1),
    }));

    if (isCorrect && round.target.dimorphism) {
      setPhase("guessing-gender");
    } else {
      setPhase("round-result");
    }
  }

  function handleGenderGuess(guess: Gender) {
    if (!round || phase !== "guessing-gender") return;
    const isCorrect = guess === round.displayedGender;
    setGenderGuess(guess);
    setGenderCorrect(isCorrect);
    setScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      incorrect: s.incorrect + (isCorrect ? 0 : 1),
    }));
    setPhase("round-result");
  }

  function handleNext() {
    setRound(generateRound(parrots));
    setPhase("guessing-species");
    setSpeciesGuessId(null);
    setSpeciesCorrect(null);
    setGenderGuess(null);
    setGenderCorrect(null);
  }

  if (!round) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">🦜 Parrot Guessing Game</h1>
        <p className="text-sm text-gray-500">
          Guess the parrot species from its photo. Photos and data sourced from Wikipedia.
        </p>
      </header>

      <div className="flex items-center justify-center gap-6 rounded-xl border border-gray-200 bg-gray-50 px-6 py-3 text-sm dark:border-gray-800 dark:bg-gray-900">
        <span className="font-medium text-green-600 dark:text-green-400">
          Correct: {score.correct}
        </span>
        <span className="font-medium text-red-600 dark:text-red-400">
          Incorrect: {score.incorrect}
        </span>
        {accuracy !== null && (
          <span className="font-medium text-gray-500">Accuracy: {accuracy}%</span>
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative h-72 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Image
            key={round.displayedImage}
            src={round.displayedImage}
            alt="A parrot to identify"
            fill
            sizes="(max-width: 512px) 100vw, 512px"
            className="object-contain"
            unoptimized
          />
          {round.target.isIllustration && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
              Historical illustration (no photo available)
            </span>
          )}
        </div>

        {phase === "guessing-species" && (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            {round.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSpeciesGuess(option.id)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-left text-sm font-medium transition hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                {optionLabel(option.commonName)}
              </button>
            ))}
          </div>
        )}

        {phase === "guessing-gender" && (
          <div className="flex w-full flex-col items-center gap-4">
            <p className="text-lg font-medium">
              Correct — it&apos;s a {round.target.commonName}! Is this one male or female?
            </p>
            <div className="flex w-full gap-3">
              <button
                onClick={() => handleGenderGuess("male")}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-4 text-base font-semibold transition hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                ♂ Male
              </button>
              <button
                onClick={() => handleGenderGuess("female")}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-4 text-base font-semibold transition hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                ♀ Female
              </button>
            </div>
          </div>
        )}

        {phase === "round-result" && (
          <div className="flex w-full flex-col items-center gap-4 text-center">
            <p
              className={`text-lg font-semibold ${
                speciesCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {speciesCorrect ? "Correct species!" : "Not quite."}
              {round.target.dimorphism && genderCorrect !== null && (
                <>
                  {" "}
                  {genderCorrect ? "You also nailed the sex." : "But the sex guess was wrong."}
                </>
              )}
            </p>
            <p className="text-sm text-gray-500">
              This is a{" "}
              <a
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(round.target.wikiTitle)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600"
              >
                {round.target.commonName}
              </a>{" "}
              (<em>{round.target.scientificName}</em>)
              {round.target.dimorphism && round.displayedGender && (
                <> &mdash; shown here is the {round.displayedGender}</>
              )}
              {round.target.extinct && <> &mdash; now extinct</>}.
            </p>
            {speciesGuessId && !speciesCorrect && (
              <p className="text-xs text-gray-400">
                You guessed:{" "}
                {round.options.find((o) => o.id === speciesGuessId)?.commonName}
              </p>
            )}
            {genderGuess && !genderCorrect && round.target.dimorphism && (
              <p className="text-xs text-gray-400">You guessed: {genderGuess}</p>
            )}
            <button
              onClick={handleNext}
              className="rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-700"
            >
              Next Parrot →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
