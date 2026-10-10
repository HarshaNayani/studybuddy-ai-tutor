"use client";

const FEATURES = [
  { icon: "\u{1F4F7}", title: "Ask by photo", text: "Snap a problem or diagram and get clear, step-by-step help." },
  { icon: "\u{1F4DA}", title: "Study notes (RAG)", text: "Answers grounded in study notes, with the source shown." },
  { icon: "\u{1F310}", title: "Live web search", text: "Current facts from the web when the notes are not enough." },
  { icon: "\u{1F9E0}", title: "Interactive quizzes", text: "Test yourself and see your score instantly." },
];

const STEPS = [
  { n: "1", title: "Ask", text: "Type a question or upload a photo." },
  { n: "2", title: "Learn", text: "Get a simple explanation with sources." },
  { n: "3", title: "Practice", text: "Take a quiz and explore related topics." },
];

export default function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="welcome">
      <div className="welcome-top">
        <nav className="wnav">
          <img src="/logo.svg" alt="StudyBuddy logo" width={36} height={36} />
          <span>StudyBuddy</span>
        </nav>

        <section className="hero">
          <span className="badge">AI tutor for students</span>
          <h1>
            Learn anything.
            <br />
            <span className="grad">Ask by text or photo.</span>
          </h1>
          <p>
            StudyBuddy explains concepts step by step, solves problems from a picture, searches live information and
            quizzes you, all focused on your education.
          </p>
        </section>

        <section className="features">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature">
              <div className="f-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </section>

        <section className="steps">
          {STEPS.map((s) => (
            <div key={s.n} className="step">
              <span className="num">{s.n}</span>
              <div>
                <b>{s.title}</b>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="cta">
        <button className="btn-primary big" onClick={onStart}>
          Get started
        </button>
        <p>Free to use. No sign-up needed.</p>
      </div>

      <footer className="about">
        <div className="about-inner">
          <div>
            <h4>About the company</h4>
            <p>
              AI Ready School builds personalised AI learning for K-12 schools. Its platform includes Cypher (an AI
              learning companion), Morpheus (an AI teaching agent), Zion (a suite of 30+ AI tools), NEO (an AI
              innovation lab) and Matrix (AI infrastructure for schools).{" "}
              <a href="https://www.aireadyschool.com/" target="_blank" rel="noreferrer">
                aireadyschool.com
              </a>
            </p>
          </div>
          <div>
            <h4>About this project</h4>
            <p>
              StudyBuddy is a student project built for the igebra.ai AI Intern assignment, with an Ed-Tech focus.
              Made by Harshavardhan Reddy Nayani using Next.js, the Vercel AI SDK, Groq and Tavily.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
