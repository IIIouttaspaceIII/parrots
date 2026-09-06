export interface Dimorphism {
  male: string;
  female: string;
}

export interface Parrot {
  id: string;
  commonName: string;
  scientificName: string;
  wikiTitle: string;
  extinct: boolean;
  imageUrl: string;
  dimorphism: Dimorphism | null;
}

export type Gender = "male" | "female";

export type RoundPhase = "guessing-species" | "guessing-gender" | "round-result";

export interface Round {
  target: Parrot;
  displayedImage: string;
  displayedGender: Gender | null;
  options: Parrot[];
}

export interface Score {
  correct: number;
  incorrect: number;
}
