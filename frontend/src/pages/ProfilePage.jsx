import { useEffect, useState } from "react";
import { ThemeToggleButton, useShellData } from "../components/AppShellLayout";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";

export default function ProfilePage() {
  const { overview, logout, goDeposit } = useShellData();
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api("/api/auth/me")
      .then(setProfile)
      .catch((error) => setMessage(error.message));
  }, []);

  const user = profile || overview?.user || {};
  const balance = overview?.summary?.balance || 0;
  const savings = overview?.summary?.saving || 0;
  const joinedAt = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Unknown";

  return (
    <section className="main-pane">
      <header className="topbar">
        <div>
          <h2>Profile</h2>
          <p>Your account summary and identity</p>
        </div>
        <div className="topbar-actions">
          <ThemeToggleButton />
          <button id="deposit-btn" className="btn-ghost" type="button" onClick={goDeposit}>
            + Deposit
          </button>
          <button id="logout-btn" className="btn-danger" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <section className="profile-layout">
        <article className="profile-card hero-card page-panel">
          <div className="profile-hero-header">
            <div className="profile-avatar-lg">
              {(user.name || "U").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="profile-kicker">Account Owner</p>
              <h3>{user.name || "User"}</h3>
              <p className="profile-sub">{user.email || "No email found"}</p>
            </div>
          </div>

          <div className="profile-summary-grid">
            <div className="profile-summary-item">
              <span>Balance</span>
              <strong>{formatCurrency(balance)}</strong>
            </div>
            <div className="profile-summary-item">
              <span>Savings</span>
              <strong>{formatCurrency(savings)}</strong>
            </div>
            <div className="profile-summary-item">
              <span>Level</span>
              <strong>{user.level || 1}</strong>
            </div>
            <div className="profile-summary-item">
              <span>XP</span>
              <strong>{Number(user.xp || 0).toLocaleString()}</strong>
            </div>
          </div>
        </article>

        <article className="profile-card page-panel">
          <h3>Account Details</h3>
          <div className="detail-list">
            <div className="detail-row">
              <span>Name</span>
              <strong>{user.name || "User"}</strong>
            </div>
            <div className="detail-row">
              <span>Email</span>
              <strong>{user.email || "Not available"}</strong>
            </div>
            <div className="detail-row">
              <span>Joined</span>
              <strong>{joinedAt}</strong>
            </div>
            <div className="detail-row">
              <span>Streak Days</span>
              <strong>{user.streakDays ?? user.streak_days ?? 0}</strong>
            </div>
          </div>

          {message ? <p className="message">{message}</p> : null}
        </article>
      </section>
    </section>
  );
}
