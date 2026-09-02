import type { Car, Environment, Feeling } from "./types";
import { cars } from "./cars-data";

export interface QuizOption {
  id: string;
  label: string;
  feeling?: Feeling;
  environment?: Environment;
}

export interface QuizQuestion {
  id: "priority" | "road" | "feeling";
  question: string;
  helper: string;
  options: QuizOption[];
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: "priority",
    question: "What matters most to you?",
    helper: "Pick the one that pulls you first.",
    options: [
      { id: "speed", label: "Speed", feeling: "speed" },
      { id: "luxury", label: "Luxury", feeling: "luxury" },
      { id: "technology", label: "Technology", feeling: "technology" },
      { id: "adventure", label: "Adventure", feeling: "adventure" },
      { id: "design", label: "Design", feeling: "attention" },
    ],
  },
  {
    id: "road",
    question: "Where do you love driving?",
    helper: "The road that actually makes you want to drive.",
    options: [
      { id: "city", label: "City", environment: "night-city" },
      { id: "highway", label: "Highway", environment: "architecture" },
      { id: "track", label: "Track", environment: "track" },
      { id: "mountains", label: "Mountains", environment: "mountain" },
      { id: "desert", label: "Desert", environment: "desert" },
    ],
  },
  {
    id: "feeling",
    question: "What feeling do you want?",
    helper: "Not specs. A feeling.",
    options: [
      { id: "power", label: "Power", feeling: "speed" },
      { id: "freedom", label: "Freedom", feeling: "adventure" },
      { id: "comfort", label: "Comfort", feeling: "luxury" },
      { id: "attention", label: "Attention", feeling: "attention" },
      { id: "control", label: "Control", feeling: "technology" },
    ],
  },
];

export type QuizAnswers = Partial<Record<QuizQuestion["id"], string>>;

export interface QuizMatch {
  car: Car;
  percent: number;
}

function resolveOption(questionId: QuizQuestion["id"], optionId: string): QuizOption | undefined {
  return quizQuestions.find((q) => q.id === questionId)?.options.find((o) => o.id === optionId);
}

export function scoreQuiz(answers: QuizAnswers): QuizMatch[] {
  const chosenFeelings: Feeling[] = [];
  const chosenEnvironments: Environment[] = [];

  (Object.keys(answers) as QuizQuestion["id"][]).forEach((qId) => {
    const optionId = answers[qId];
    if (!optionId) return;
    const opt = resolveOption(qId, optionId);
    if (opt?.feeling) chosenFeelings.push(opt.feeling);
    if (opt?.environment) chosenEnvironments.push(opt.environment);
  });

  const scored = cars.map((car) => {
    let raw = 0;
    chosenFeelings.forEach((f) => {
      if (car.feelings.includes(f)) raw += 2;
    });
    chosenEnvironments.forEach((e) => {
      if (car.environment === e) raw += 2;
    });
    const maxRaw = chosenFeelings.length * 2 + chosenEnvironments.length * 2 || 1;
    const percent = Math.round(58 + (raw / maxRaw) * 39);
    return { car, percent: Math.min(percent, 97) };
  });

  return scored.sort((a, b) => b.percent - a.percent || b.car.horsepower - a.car.horsepower).slice(0, 3);
}
