"use client";

import type { StoredChat } from "@/lib/storage";

type Props = {
  chats: StoredChat[];
  activeId: string | null;
  user: string | null;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
};

export default function Sidebar({ chats, activeId, user, open, onClose, onSelect, onNew, onDelete, onOpenSettings }: Props) {
  const visible = chats.filter((c) => c.messages.length > 0 || c.id === activeId);

  return (
    <>
      {open && <div className="backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="side-head">
          <span>Your chats</span>
          <button className="icon-sm only-mobile" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <button className="btn-primary full" onClick={onNew}>
          + New chat
        </button>

        <div className="chat-list">
          {visible.length === 0 && <p className="empty">No chats yet</p>}
          {visible.map((c) => (
            <div key={c.id} className={`chat-item ${c.id === activeId ? "active" : ""}`}>
              <button className="chat-title" onClick={() => onSelect(c.id)}>
                {c.title}
              </button>
              <button className="del" onClick={() => onDelete(c.id)} aria-label="Delete chat" title="Delete chat">
                x
              </button>
            </div>
          ))}
        </div>

        <div className="side-foot">
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
