"use client";

import { useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";

type QuizQ = { question: string; options: string[]; answerIndex: number; explanation: string };
type Quiz = { topic: string; questions: QuizQ[] };

const SUGGESTIONS = [
  "Explain photosynthesis simply",
  "Quiz me on Newton's laws",
  "What is recursion? Give a Python example",
  "What are the latest developments in AI this week?",
];

function QuizCard({ quiz }: { quiz: Quiz }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const score = quiz.questions.filter((q, i) => picked[i] === q.answerIndex).length;
  const done = Object.keys(picked).length === quiz.questions.length;

  return (
    <div className="card">
      <div className="card-title">Quiz: {quiz.topic}</div>
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
        <div className="score">
          Score: {score}/{quiz.questions.length}
        </div>
      )}
    </div>
  );
}

function ToolPart({ part }: { part: any }) {
  const name = String(part.type).replace("tool-", "");
  const running = part.state !== "output-available" && part.state !== "output-error";

  if (name === "generateQuiz" && part.state === "output-available") return <QuizCard quiz={part.output as Quiz} />;

  const label =
    name === "searchNotes" ? "Searching study notes" : name === "searchWeb" ? "Searching the web" : "Building quiz";

  return (
    <div className="tool">
      {running ? `${label}...` : part.state === "output-error" ? `${label} failed` : `${label} done`}
      {name === "searchWeb" && part.state === "output-available" && (
        <ul>
          {(part.output.results ?? []).map((r: any) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer">
                {r.title}
              </a>
            </li>
          ))}
        </ul>
      )}
      {name === "searchNotes" && part.state === "output-available" && (
        <span> - {(part.output.hits ?? []).map((h: any) => h.source).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(", ") || "no match"}</span>
      )}
    </div>
  );
}

export default function Home() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const [image, setImage] = useState<{ url: string; name: string; type: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = status === "submitted" || status === "streaming";

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3_500_000) {
      alert("Image too large (max ~3.5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage({ url: reader.result as string, name: f.name, type: f.type });
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  function submit(text: string) {
    if ((!text.trim() && !image) || busy) return;
    sendMessage({
      text: text.trim() || "Please help me with this image.",
      files: image ? [{ type: "file", mediaType: image.type, filename: image.name, url: image.url }] : undefined,
    });
    setInput("");
    setImage(null);
  }

  return (
    <main>
      <header>
        <div className="brand"><img src="/logo.svg" alt="StudyBuddy logo" width={40} height={40} /><h1>StudyBuddy</h1></div>
        <p>Ask by text or photo. Answers come from study notes (RAG), live web search, and quizzes.</p>
      </header>

      <section className="chat">
        {messages.length === 0 && (
          <div className="suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => submit(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            {m.parts.map((p, i) => {
              if (p.type === "text") return m.role === "user" ? <p key={i}>{p.text}</p> : <ReactMarkdown key={i}>{p.text}</ReactMarkdown>;
              if (p.type === "file" && p.mediaType.startsWith("image/")) return <img key={i} src={p.url} alt="upload" className="thumb" />;
              if (p.type.startsWith("tool-")) return <ToolPart key={i} part={p} />;
              return null;
            })}
          </div>
        ))}
        {status === "submitted" && <div className="msg assistant dim">Thinking...</div>}
        {error && <div className="err">{error.message}</div>}
      </section>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        {image && (
          <div className="preview">
            <img src={image.url} alt="preview" />
            <button type="button" onClick={() => setImage(null)}>
              remove
            </button>
          </div>
        )}
        <div className="row">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          <button type="button" className="icon" onClick={() => fileRef.current?.click()} title="Attach image">
            +
          </button>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything, or attach a photo of a problem..." />
          <button type="submit" disabled={busy}>
            Send
          </button>
        </div>
      </form>
    </main>
  );
}

