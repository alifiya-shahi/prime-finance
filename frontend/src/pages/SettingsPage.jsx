import { useEffect, useMemo, useState } from "react";
import { ThemeToggleButton, useShellData } from "../components/AppShellLayout";
import { api } from "../lib/api";

const currencyOptions = ["INR"];

export default function SettingsPage() {
  const { logout, goDeposit, theme, currencyCode, updatePreferences } = useShellData();
  const [currentCurrency, setCurrentCurrency] = useState("INR");
  const [currentTheme, setCurrentTheme] = useState(theme || "dark");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordMessageType, setPasswordMessageType] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setCurrentCurrency(currencyCode || "INR");
  }, [currencyCode]);

  useEffect(() => {
    setCurrentTheme(theme || "dark");
  }, [theme]);

  const canSavePassword = useMemo(
    () => currentPassword && newPassword && confirmPassword,
    [currentPassword, newPassword, confirmPassword]
  );

  const livePasswordStatus = useMemo(() => {
    if (!newPassword && !confirmPassword) {
      return "";
    }

    if (newPassword.length < 8) {
      return "New password must be at least 8 characters.";
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return "Passwords do not match yet.";
    }

    if (confirmPassword && newPassword === confirmPassword) {
      return "Passwords match.";
    }

    return "";
  }, [newPassword, confirmPassword]);

  const livePasswordStatusType = useMemo(() => {
    if (!livePasswordStatus) {
      return "";
    }
    if (livePasswordStatus === "Passwords match.") {
      return "success";
    }
    if (livePasswordStatus === "Passwords do not match yet.") {
      return "error";
    }
    return "info";
  }, [livePasswordStatus]);

  const savePreferences = (event) => {
    event.preventDefault();
    updatePreferences({ theme: currentTheme, currencyCode: currentCurrency })
      .then((result) => {
        if (result?.user) {
          setCurrentTheme(result.user.theme === "light" ? "light" : "dark");
          setCurrentCurrency(result.user.currencyCode || "INR");
          setSaveMessage("Preferences saved.");
          setTimeout(() => setSaveMessage(""), 1800);
        }
      })
      .catch((error) => {
        setSaveMessage(error.message);
      });
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordMessageType("");

    if (newPassword !== confirmPassword) {
      setPasswordMessage("New password and confirmation do not match.");
      setPasswordMessageType("error");
      return;
    }

    try {
      const result = await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });

      setPasswordMessage(result.message || "Password updated.");
      setPasswordMessageType("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordMessage(error.message);
      setPasswordMessageType("error");
    }
  };

  return (
    <section className="main-pane">
      <header className="topbar">
        <div>
          <h2>Settings</h2>
          <p>Currency, theme, and password controls</p>
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

      <section className="settings-grid">
        <article className="settings-card page-panel">
          <h3>Preferences</h3>
          <form className="settings-form" onSubmit={savePreferences}>
            <div className="field">
              <label htmlFor="currency">Currency</label>
              <select id="currency" value={currentCurrency} onChange={(event) => setCurrentCurrency(event.target.value)}>
                {currencyOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="theme">Theme</label>
              <select id="theme" value={currentTheme} onChange={(event) => setCurrentTheme(event.target.value)}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            <button className="btn-primary" type="submit">
              Save Preferences
            </button>
            {saveMessage ? <p className="message settings-message success">{saveMessage}</p> : null}
          </form>
        </article>

        <article className="settings-card page-panel">
          <h3>Change Password</h3>
          <form className="settings-form" onSubmit={changePassword}>
            <div className="field">
              <label htmlFor="current-password">Current Password</label>
              <input
                id="current-password"
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            {livePasswordStatus ? (
              <p className={`message settings-message ${livePasswordStatusType}`}>{livePasswordStatus}</p>
            ) : null}

            <button className="btn-primary" type="submit" disabled={!canSavePassword}>
              Update Password
            </button>
            {passwordMessage ? (
              <p className={`message settings-message ${passwordMessageType || "info"}`}>{passwordMessage}</p>
            ) : null}
          </form>
        </article>
      </section>
    </section>
  );
}
