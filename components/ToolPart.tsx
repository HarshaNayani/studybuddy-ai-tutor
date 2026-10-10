"use client";

import QuizCard, { type Quiz } from "./QuizCard";

/** Renders what the assistant did behind the scenes (notes search, web search, quiz) */
export default function ToolPart({ part }: { part: any }) {
  const name = String(part.type).replace("tool-", "");
  const done = part.state === "output-available";
  const failed = part.state === "output-error";

  if (name === "generateQuiz" && done) return <QuizCard quiz={part.output as Quiz} />;

  const label =
    name === "searchNotes" ? "Searching study notes" : name === "searchWeb" ? "Searching the web" : "Building quiz";

  const sources: string[] =
    name === "searchNotes" && done
      ? Array.from(new Set<string>((part.output?.hits ?? []).map((h: any) => h.source)))
      : [];

  return (
    <div className="tool">
      <span className={`dot ${done ? "done" : failed ? "fail" : "run"}`} />
      {failed ? `${label} failed` : done ? `${label} - done` : `${label}...`}
      {sources.length > 0 && <span> ({sources.join(", ")})</span>}
      {name === "searchWeb" && done && (
        <ul>
          {(part.output?.results ?? []).map((r: any) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer">
                {r.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
