"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import ToolPart from "./ToolPart";
import { CATEGORIES } from "@/lib/suggestions";

// models sometimes write \( ... \) or \[ ... \]; convert to $...$ / $$...$$ which the math plugin understands
const toMath = (s: string) =>
  s
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);

type Props = {
  chatId: string;
  initialMessages: UIMessage[];
  onUpdate: (id: string, messages: UIMessage[]) => void;
};

type Attached = { url: string; name: string; type: string };

// Shrink the photo in the browser (max 1280px, JPEG) so requests stay small and fast
async function shrink(file: File): Promise<Attached> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return {
    url: canvas.toDataURL("image/jpeg", 0.8),
    name: file.name.replace(/\.\w+$/, "") + ".jpg",
    type: "image/jpeg",
  };
}

export default function ChatView({ chatId, initialMessages, onUpdate }: Props) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error } = useChat({ id: chatId, messages: initialMessages, transport });

  const [input, setInput] = useState("");
  const [image, setImage] = useState<Attached | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  // save the chat once a reply has finished (not on every streamed token)
  useEffect(() => {
    if ((status === "ready" || status === "error") && messages.length > 0) onUpdate(chatId, messages);
  }, [status, messages, chatId, onUpdate]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 15_000_000) {
      alert("Image too large (max 15 MB)");
      return;
    }
    try {
      setImage(await shrink(f));
    } catch {
      alert("Could not read this image. Please use a JPG or PNG.");
    }
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

  // related-topic chips are sent by the server (data-followups) after each finished answer
  const last = messages[messages.length - 1];
  const followUps: string[] =
    status === "ready" && last?.role === "assistant"
      ? last.parts.flatMap((p: any) => (p.type === "data-followups" ? (p.data?.topics ?? []) : []))
      : [];

  return (
    <>
      <div className="scroll">
        <div className="col">
          {messages.length === 0 && (
            <div className="start">
              <h2>What would you like to learn today?</h2>
              <p>Pick an idea below, type your own question, or attach a photo of a problem.</p>
              <div className="cats">
                {CATEGORIES.map((c) => (
                  <div key={c.title} className="cat">
                    <div className="cat-title">
                      <span>{c.icon}</span> {c.title}
                    </div>
                    {c.prompts.map((p) => (
                      <button key={p} className="cat-prompt" onClick={() => submit(p)}>
                        {p}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const visible = m.parts.filter((p) => !p.type.startsWith("data-"));
            if (visible.length === 0) return null;
            return (
              <div key={m.id} className={`msg ${m.role}`}>
                {visible.map((p, i) => {
                  if (p.type === "text")
                    return m.role === "user" ? (
                      <p key={i}>{p.text}</p>
                    ) : (
                      <ReactMarkdown key={i} remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {toMath(p.text)}
                      </ReactMarkdown>
                    );
                  if (p.type === "file" && p.mediaType.startsWith("image/"))
                    return <img key={i} src={p.url} alt="upload" className="thumb" />;
                  if (p.type.startsWith("tool-")) return <ToolPart key={i} part={p} />;
                  return null;
                })}
              </div>
            );
          })}

          {status === "submitted" && <div className="msg assistant dim">Thinking...</div>}
          {error && <div className="err">{error.message}</div>}

          {followUps.length > 0 && (
            <div className="followups">
              <div className="followups-label">Related topics to explore</div>
              <div className="chips">
                {followUps.map((t) => (
                  <button key={t} className="chip" onClick={() => submit(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <div className="col">
          {image && (
            <div className="preview">
              <img src={image.url} alt="preview" />
              <button type="button" className="link" onClick={() => setImage(null)}>
                remove
              </button>
            </div>
          )}
          <div className="row">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            <button type="button" className="icon" onClick={() => fileRef.current?.click()} title="Attach image">
              +
            </button>
            <input
              className="text-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a study question, or attach a photo of a problem..."
            />
            <button type="submit" className="btn-primary" disabled={busy}>
              Send
            </button>
          </div>
          <p className="hint">StudyBuddy only answers education-related questions.</p>
        </div>
      </form>
    </>
  );
}
