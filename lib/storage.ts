import type { UIMessage } from "ai";

export type StoredChat = {
  id: string;
  title: string;
  customTitle?: boolean; // true once the user renamed it, so auto-titles never overwrite it
  kind?: "quiz"; // the pinned Quiz chat; it is opened from the Quiz button, not listed with normal chats
  updatedAt: number;
  messages: UIMessage[];
};

const CHATS_KEY = "studybuddy:chats";
const USER_KEY = "studybuddy:user";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function newChat(kind?: "quiz"): StoredChat {
  if (kind === "quiz") return { id: uid(), title: "Quiz", customTitle: true, kind, updatedAt: Date.now(), messages: [] };
  return { id: uid(), title: "New chat", updatedAt: Date.now(), messages: [] };
}

export function loadChats(): StoredChat[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChats(chats: StoredChat[]) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats.slice(0, 30)));
  } catch {
    /* storage full or blocked: chats simply will not persist */
  }
}

export function loadUser(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function saveUser(name: string | null) {
  try {
    if (name) localStorage.setItem(USER_KEY, name);
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Prepare messages for localStorage:
 * - images are too big, keep a short text marker instead
 * - drop unfinished tool calls so a reopened chat never breaks the next request
 */
export function cleanForStorage(messages: UIMessage[]): UIMessage[] {
  return messages.map((m) => ({
    ...m,
    parts: m.parts
      .map((p) => (p.type === "file" ? { type: "text" as const, text: "[image attached]" } : p))
      .filter((p) => {
        if (!p.type.startsWith("tool-")) return true;
        const state = (p as { state?: string }).state;
        return state === "output-available" || state === "output-error";
      }),
  })) as UIMessage[];
}

export function titleFrom(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  const part = first?.parts.find((p) => p.type === "text");
  const text = part && part.type === "text" ? part.text.trim() : "";
  if (!text) return "New chat";
  return text.length > 42 ? text.slice(0, 42) + "..." : text;
}
