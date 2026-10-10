"use client";

import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import Welcome from "@/components/Welcome";
import ChatView from "@/components/ChatView";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
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

export default function Home() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"welcome" | "chat">("welcome");
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("system");
  const [user, setUser] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // load everything saved in this browser
  useEffect(() => {
    setChats(loadChats());
    setTheme(loadTheme());
    setUser(loadUser());
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

  const startNew = useCallback(() => {
    const empty = chats.find((c) => c.messages.length === 0);
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

  const updateChat = useCallback((id: string, messages: UIMessage[]) => {
    setChats((prev) =>
      prev
        .map((c) =>
          c.id === id ? { ...c, messages: cleanForStorage(messages), title: titleFrom(messages), updatedAt: Date.now() } : c
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  }, []);

  function deleteChat(id: string) {
    const rest = chats.filter((c) => c.id !== id);
    setChats(rest);
    if (id === activeId) {
      if (rest.length > 0) setActiveId(rest[0].id);
      else {
        const c = newChat();
        setChats([c]);
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
        onClose={() => setSidebarOpen(false)}
        onSelect={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
        }}
        onNew={startNew}
        onDelete={deleteChat}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="main">
        <header className="topbar">
          <button className="btn-ghost only-mobile" onClick={() => setSidebarOpen(true)}>
            Chats
          </button>
          <button className="brand-btn" onClick={() => setView("welcome")} title="Back to start page">
            <img src="/logo.svg" alt="StudyBuddy logo" width={34} height={34} />
            <span>StudyBuddy</span>
          </button>
        </header>

        <ChatView key={active.id} chatId={active.id} initialMessages={active.messages} onUpdate={updateChat} />
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
