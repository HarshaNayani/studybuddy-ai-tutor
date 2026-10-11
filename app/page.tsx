"use client";

import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import Welcome from "@/components/Welcome";
import ChatView from "@/components/ChatView";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
import { IconPanel } from "@/components/icons";
import {
  cleanForStorage,
  loadChats,
  loadUser,
  newChat,
  saveChats,
  saveUser,
  titleFrom,
  type StoredChat,
} from "@/lib/storage";
import { applyTheme, loadTheme, type Theme } from "@/lib/theme";

const COLLAPSED_KEY = "studybuddy:sidebar-collapsed";
const isDesktop = () => typeof window !== "undefined" && window.innerWidth > 900;

export default function Home() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"welcome" | "chat">("welcome");
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("system");
  const [user, setUser] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop: chats panel hidden
  const [settingsOpen, setSettingsOpen] = useState(false);

  // load everything saved in this browser
  useEffect(() => {
    setChats(loadChats());
    setTheme(loadTheme());
    setUser(loadUser());
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveChats(chats);
  }, [chats, ready]);

  // apply the theme, and follow the OS setting live when "System" is selected
  useEffect(() => {
    if (!ready) return;
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, ready]);

  // show / hide the chats panel: collapses on desktop, slides in as a drawer on mobile
  function setPanelCollapsed(value: boolean) {
    setCollapsed(value);
    try {
      localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
  const openPanel = () => (isDesktop() ? setPanelCollapsed(false) : setSidebarOpen(true));
  const closePanel = () => (isDesktop() ? setPanelCollapsed(true) : setSidebarOpen(false));

  const startNew = useCallback(() => {
    const empty = chats.find((c) => c.kind !== "quiz" && c.messages.length === 0);
    if (empty) {
      setActiveId(empty.id);
    } else {
      const c = newChat();
      setChats((prev) => [c, ...prev]);
      setActiveId(c.id);
    }
    setView("chat");
    setSidebarOpen(false);
  }, [chats]);

  // keep the user's own order: update in place, never re-sort
  const updateChat = useCallback((id: string, messages: UIMessage[]) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              messages: cleanForStorage(messages),
              title: c.customTitle ? c.title : titleFrom(messages),
              updatedAt: Date.now(),
            }
          : c
      )
    );
  }, []);

  function openQuiz() {
    const existing = chats.find((c) => c.kind === "quiz");
    if (existing) {
      setActiveId(existing.id);
    } else {
      const q = newChat("quiz");
      setChats((prev) => [...prev, q]);
      setActiveId(q.id);
    }
    setView("chat");
    setSidebarOpen(false);
  }

  function renameChat(id: string, title: string) {
    const t = title.trim().slice(0, 60);
    if (!t) return;
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: t, customTitle: true } : c)));
  }

  // swap a chat with its visible neighbour above (-1) or below (+1)
  function moveChat(id: string, dir: -1 | 1) {
    setChats((prev) => {
      const vis = prev.filter((c) => c.kind !== "quiz" && (c.messages.length > 0 || c.id === activeId));
      const i = vis.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= vis.length) return prev;
      const a = prev.findIndex((c) => c.id === vis[i].id);
      const b = prev.findIndex((c) => c.id === vis[j].id);
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  }

  function deleteChat(id: string) {
    const rest = chats.filter((c) => c.id !== id);
    setChats(rest);
    if (id === activeId) {
      const next = rest.find((c) => c.kind !== "quiz");
      if (next) setActiveId(next.id);
      else {
        const c = newChat();
        setChats([c, ...rest]);
        setActiveId(c.id);
      }
    }
  }

  function clearChats() {
    const c = newChat();
    setChats([c]);
    setActiveId(c.id);
    setSettingsOpen(false);
  }

  const active = chats.find((c) => c.id === activeId);

  if (view === "welcome" || !active) return <Welcome onStart={startNew} />;

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeId={activeId}
        user={user}
        open={sidebarOpen}
        collapsed={collapsed}
        quizActive={active.kind === "quiz"}
        onQuiz={openQuiz}
        onClose={closePanel}
        onSelect={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
        }}
        onNew={startNew}
        onDelete={deleteChat}
        onRename={renameChat}
        onMove={moveChat}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="main">
        <header className="topbar">
          <button
            className={`btn-ghost chats-toggle ${collapsed ? "collapsed" : ""}`}
            onClick={openPanel}
            title="Show chats"
          >
            <IconPanel /> Chats
          </button>
          <button className="brand-btn" onClick={() => setView("welcome")} title="Back to start page">
            <img src="/logo.svg" alt="StudyBuddy logo" width={34} height={34} />
            <span>StudyBuddy</span>
          </button>
        </header>

        <ChatView
          key={active.id}
          chatId={active.id}
          mode={active.kind === "quiz" ? "quiz" : "chat"}
          initialMessages={active.messages}
          onUpdate={updateChat}
        />
      </div>

      {settingsOpen && (
        <SettingsModal
          theme={theme}
          user={user}
          onTheme={setTheme}
          onLogin={(name) => {
            saveUser(name);
            setUser(name);
          }}
          onLogout={() => {
            saveUser(null);
            setUser(null);
          }}
          onClearChats={clearChats}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
