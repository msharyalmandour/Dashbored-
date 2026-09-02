"use client";

import { useState } from "react";
import { quizQuestions, scoreQuiz, type QuizAnswers } from "@/lib/quiz";
import { formatPrice } from "@/lib/format";
import { CarArt } from "./CarArt";
import { usePlatform } from "./PlatformContext";

export default function PersonalityQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [done, setDone] = useState(false);
  const { openDetail } = usePlatform();

  const question = quizQuestions[step];
  const matches = done ? scoreQuiz(answers) : [];

  function choose(optionId: string) {
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);
    if (step < quizQuestions.length - 1) {
      window.setTimeout(() => setStep(step + 1), 220);
    } else {
      window.setTimeout(() => setDone(true), 220);
    }
  }

  function reset() {
    setAnswers({});
    setStep(0);
    setDone(false);
  }

  return (
    <section id="quiz" className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <p className="font-data text-xs tracking-[0.3em] text-accent">30 SECONDS</p>
        <h2 className="mt-2 font-display text-4xl text-text sm:text-5xl">
          WHAT CAR FITS YOUR PERSONALITY?
        </h2>
        <p className="mt-3 text-text-soft">Your perfect car isn&rsquo;t just about specifications.</p>

        {!done ? (
          <div className="mt-10 rounded-2xl border border-line bg-bg-2 p-8 sm:p-10">
            <div className="mb-8 flex gap-2">
              {quizQuestions.map((q, i) => (
                <span
                  key={q.id}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < step ? "bg-accent" : i === step ? "bg-text-soft" : "bg-line"
                  }`}
                />
              ))}
            </div>

            <p className="font-data text-xs tracking-[0.2em] text-text-faint">
              QUESTION {step + 1} OF {quizQuestions.length}
            </p>
            <h3 className="mt-3 font-display text-3xl text-text">{question.question}</h3>
            <p className="mt-1 text-sm text-text-soft">{question.helper}</p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {question.options.map((opt) => {
                const selected = answers[question.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => choose(opt.id)}
                    className={`rounded-xl border px-6 py-5 text-left text-lg font-medium transition-colors ${
                      selected
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-line bg-bg-3 text-text hover:border-text-soft"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-line bg-bg-2 p-8 sm:p-10">
            <div className="flex items-center justify-between">
              <p className="font-data text-xs tracking-[0.2em] text-accent">YOUR MATCH</p>
              <button type="button" onClick={reset} className="text-xs text-text-soft hover:text-accent">
                Retake quiz
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {matches.map((m, i) => (
                <button
                  key={m.car.slug}
                  type="button"
                  onClick={() => openDetail(m.car.slug)}
                  className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-colors hover:border-accent ${
                    i === 0 ? "border-accent bg-accent/5" : "border-line bg-bg-3"
                  }`}
                >
                  <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg">
                    <CarArt car={m.car} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-data text-[11px] uppercase tracking-[0.2em] text-text-faint">
                      {m.car.brand}
                    </p>
                    <p className="truncate font-display text-2xl text-text">{m.car.model}</p>
                    <p className="mt-1 font-data text-xs text-text-soft">{formatPrice(m.car.priceFrom)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-data text-3xl text-accent">{m.percent}%</p>
                    <p className="text-[10px] text-text-faint">MATCH</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
