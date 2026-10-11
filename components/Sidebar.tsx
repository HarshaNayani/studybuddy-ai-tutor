"use client";

import { useRef, useState } from "react";
import type { StoredChat } from "@/lib/storage";
import { IconDots, IconDown, IconPanel, IconPencil, IconQuiz, IconTrash, IconUp } from "./icons";

type Props = {
  chats: StoredChat[];
  activeId: string | null;
  user: string | null;
  open: boolean; // mobile drawer
  collapsed: boolean; // desktop hidden
  quizActive: boolean; // the Quiz chat is the one open
  onQuiz: () => void;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onOpenSettings: () => void;
};

export default function Sidebar({
  chats,
  activeId,
  user,
  open,
  collapsed,
  quizActive,
  onQuiz,
  onClose,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onMove,
  onOpenSettings,
}: Props) {
  // the options menu is positioned from the button's screen position (fixed), so the scrolling list never clips it
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const menuId = menu?.id ?? null;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const skipBlur = useRef(false); // set when Escape cancels a rename, so the blur that follows does not save it

  // empty chats stay hidden until the first message (except the one currently open)
  const visible = chats.filter((c) => c.kind !== "quiz" && (c.messages.length > 0 || c.id === activeId));

  function startEdit(c: StoredChat) {
    setMenu(null);
    skipBlur.current = false;
    setDraft(c.title);
    setEditingId(c.id);
  }

  function commit(id: string) {
    const t = draft.trim();
    if (t) onRename(id, t);
    setEditingId(null);
  }

  return (
    <>
      {open && <div className="backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        <div className="side-head">
          <span>Your chats</span>
          <button className="icon-btn" onClick={onClose} aria-label="Hide chats" title="Hide chats">
            <IconPanel />
          </button>
        </div>

        <button className="btn-primary full" onClick={onNew}>
          + New chat
        </button>

        <div className="chat-list" onScroll={() => setMenu(null)}>
          {visible.length === 0 && <p className="empty">No chats yet</p>}
          {visible.map((c, idx) => (
            <div key={c.id} className={`chat-item ${c.id === activeId ? "active" : ""}`}>
              {editingId === c.id ? (
                <input
                  className="rename-input"
                  autoFocus
                  value={draft}
                  maxLength={60}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit(c.id);
                    if (e.key === "Escape") {
                      skipBlur.current = true;
                      setEditingId(null);
                    }
                  }}
                  onBlur={() => {
                    if (skipBlur.current) {
                      skipBlur.current = false;
                      return;
                    }
                    commit(c.id);
                  }}
                  onFocus={(e) => e.target.select()}
                />
              ) : (
                <button
                  className="chat-title"
                  title={`${c.title} (double-click to rename)`}
                  onClick={() => onSelect(c.id)}
                  onDoubleClick={() => startEdit(c)}
                >
                  {c.title}
                </button>
              )}

              <button
                className="dots"
                aria-label="Chat options"
                title="Chat options"
                onClick={(e) => {
                  if (menuId === c.id) return setMenu(null);
                  const r = e.currentTarget.getBoundingClientRect();
                  const menuHeight = 175;
                  // open downward, or upward when there is no room below
                  const top = r.bottom + menuHeight > window.innerHeight ? Math.max(8, r.top - menuHeight) : r.bottom + 2;
                  setMenu({ id: c.id, top, left: Math.max(8, r.right - 168) });
                }}
              >
                <IconDots />
              </button>

              {menuId === c.id && (
                <>
                  <div className="menu-backdrop" onClick={() => setMenu(null)} />
                  <div
                    className="menu"
                    role="menu"
                    style={{ position: "fixed", top: menu!.top, left: menu!.left, right: "auto" }}
                  >
                    <button onClick={() => startEdit(c)}>
                      <IconPencil /> Rename
                    </button>
                    <button
                      disabled={idx === 0}
                      onClick={() => {
                        onMove(c.id, -1);
                        setMenu(null);
                      }}
                    >
                      <IconUp /> Move up
                    </button>
                    <button
                      disabled={idx === visible.length - 1}
                      onClick={() => {
                        onMove(c.id, 1);
                        setMenu(null);
                      }}
                    >
                      <IconDown /> Move down
                    </button>
                    <button
                      className="danger"
                      onClick={() => {
                        setMenu(null);
                        if (confirm("Delete this chat?")) onDelete(c.id);
                      }}
                    >
                      <IconTrash /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="side-foot">
          <button className={`btn-ghost full quiz-btn ${quizActive ? "active" : ""}`} onClick={onQuiz}>
            <IconQuiz /> Quiz
          </button>
          <button className="btn-ghost full" onClick={onOpenSettings}>
            Settings
          </button>
          <button className="btn-ghost full" onClick={onOpenSettings}>
            {user ? `Signed in: ${user}` : "Login"}
          </button>
        </div>
      </aside>
    </>
  );
}
