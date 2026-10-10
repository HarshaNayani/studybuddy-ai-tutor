"use client";

import { useState } from "react";

type QuizQ = { question: string; options: string[]; answerIndex: number; explanation: string };
export type Quiz = { topic: string; questions: QuizQ[] };

export default function QuizCard({ quiz }: { quiz: Quiz }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const total = quiz.questions.length;
  const answered = Object.keys(picked).length;
  const score = quiz.questions.filter((q, i) => picked[i] === q.answerIndex).length;
  const done = answered === total;

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Quiz: {quiz.topic}</span>
        <span className="card-meta">
          {answered}/{total} answered
        </span>
      </div>
      <div className="progress">
        <div style={{ width: `${(answered / total) * 100}%` }} />
      </div>

      {quiz.questions.map((q, qi) => (
        <div key={qi} className="q">
          <p>
            <b>{qi + 1}.</b> {q.question}
          </p>
          {q.options.map((opt, oi) => {
            const chosen = picked[qi] !== undefined;
            const cls = !chosen ? "" : oi === q.answerIndex ? "correct" : picked[qi] === oi ? "wrong" : "";
            return (
              <button
                key={oi}
                className={`opt ${cls}`}
                disabled={chosen}
                onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
              >
                {opt}
              </button>
            );
          })}
          {picked[qi] !== undefined && <p className="expl">{q.explanation}</p>}
        </div>
      ))}

      {done && (
        <div className="score-row">
          <span className="score">
            Score: {score}/{total}
          </span>
          <button className="btn-ghost" onClick={() => setPicked({})}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
