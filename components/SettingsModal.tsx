"use client";

import { useState } from "react";
import type { Theme } from "@/lib/theme";

type Props = {
  theme: Theme;
  user: string | null;
  onTheme: (t: Theme) => void;
  onLogin: (name: string) => void;
  onLogout: () => void;
  onClearChats: () => void;
  onClose: () => void;
};

const THEMES: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export default function SettingsModal({ theme, user, onTheme, onLogin, onLogout, onClearChats, onClose }: Props) {
  const [name, setName] = useState("");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Settings">
        <div className="modal-head">
          <h3>Settings</h3>
          <button className="icon-sm" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <section>
          <h4>Appearance</h4>
          <div className="segmented">
            {THEMES.map((t) => (
              <button key={t.id} className={theme === t.id ? "on" : ""} onClick={() => onTheme(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4>Account</h4>
          {user ? (
            <div className="account">
              <div className="avatar">{user.slice(0, 1).toUpperCase()}</div>
              <div>
                <div>{user}</div>
                <small>Demo sign-in, stored in this browser only</small>
              </div>
              <button className="btn-ghost" onClick={onLogout}>
                Log out
              </button>
            </div>
          ) : (
            <form
              className="login"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) onLogin(name.trim());
              }}
            >
              <input
                className="text-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={30}
              />
              <button type="submit" className="btn-primary">
                Login
              </button>
              <small>Demo only: no account or password is created. Your name stays in this browser.</small>
            </form>
          )}
        </section>

        <section>
          <h4>Data</h4>
          <button
            className="btn-danger"
            onClick={() => {
              if (confirm("Delete all chats from this browser?")) onClearChats();
            }}
          >
            Delete all chats
          </button>
        </section>
      </div>
    </div>
  );
}
