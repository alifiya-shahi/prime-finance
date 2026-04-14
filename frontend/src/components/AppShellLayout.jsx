import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { TOKEN_KEY } from "../lib/constants";
import { formatCurrency } from "../lib/format";

const ShellContext = createContext(null);

function getPreferredTheme() {
  return "dark";
}

function getPreferredCurrency() {
  return "INR";
}

function ThemeIcon({ theme }) {
  if (theme === "light") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="4"></circle>
        <line x1="12" y1="2" x2="12" y2="5"></line>
        <line x1="12" y1="19" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="5" y2="12"></line>
        <line x1="19" y1="12" x2="22" y2="12"></line>
        <line x1="4.9" y1="4.9" x2="7" y2="7"></line>
        <line x1="17" y1="17" x2="19.1" y2="19.1"></line>
        <line x1="4.9" y1="19.1" x2="7" y2="17"></line>
        <line x1="17" y1="7" x2="19.1" y2="4.9"></line>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"></path>
    </svg>
  );
}

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useShellData();
  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      className="icon-btn theme-toggle"
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      onClick={toggleTheme}
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}

export function useShellData() {
  const value = useContext(ShellContext);
  if (!value) {
    throw new Error("useShellData must be used inside AppShellLayout.");
  }
  return value;
}

export default function AppShellLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboardRoute = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard-");
  const [theme, setTheme] = useState(getPreferredTheme);
  const [currencyCode, setCurrencyCode] = useState(getPreferredCurrency);
  const [overview, setOverview] = useState(null);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    navigate("/login");
  };

  const goDeposit = () => {
    navigate("/deposit");
  };

  const refreshOverview = async () => {
    const data = await api("/api/dashboard/overview");
    setOverview(data);
    return data;
  };

  useEffect(() => {
    document.body.classList.add("dashboard-page");
    return () => {
      document.body.classList.remove("dashboard-page");
    };
  }, []);

  useEffect(() => {
    const selectedTheme = theme === "light" ? "light" : "dark";
    document.body.classList.toggle("light-mode", selectedTheme === "light");
    document.body.dataset.theme = selectedTheme;
  }, [theme]);

  useEffect(() => {
    if (!overview?.user) {
      return;
    }

    setTheme(overview.user.theme === "light" ? "light" : "dark");
    setCurrencyCode(overview.user.currencyCode || "INR");
  }, [overview?.user?.theme, overview?.user?.currencyCode]);

  const updatePreferences = async (nextPreferences = {}) => {
    const nextTheme = nextPreferences.theme ?? theme;
    const nextCurrency = nextPreferences.currencyCode ?? currencyCode;
    const normalizedTheme = nextTheme === "light" ? "light" : "dark";
    const normalizedCurrency = nextCurrency || "INR";

    const result = await api("/api/auth/preferences", {
      method: "PUT",
      body: JSON.stringify({ theme: normalizedTheme, currencyCode: normalizedCurrency })
    });

    if (result?.user) {
      setTheme(result.user.theme === "light" ? "light" : "dark");
      setCurrencyCode(result.user.currencyCode || "INR");
      setOverview((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                theme: result.user.theme,
                currencyCode: result.user.currencyCode
              }
            }
          : current
      );
    }

    return result;
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      navigate("/login");
      return;
    }

    refreshOverview().catch(() => {
      logout();
    });
  }, [location.pathname]);

  const value = useMemo(
    () => ({
      overview,
      refreshOverview,
      logout,
      goDeposit,
      theme,
      currencyCode,
      toggleTheme: async () => {
        const nextTheme = theme === "light" ? "dark" : "light";
        setTheme(nextTheme);
        try {
          await updatePreferences({ theme: nextTheme });
        } catch (error) {
          setTheme(theme);
        }
      },
      setTheme: async (nextTheme) => {
        await updatePreferences({ theme: nextTheme });
      },
      setCurrencyCode: async (nextCurrency) => {
        await updatePreferences({ currencyCode: nextCurrency });
      },
      updatePreferences
    }),
    [overview, theme, currencyCode, updatePreferences]
  );

  return (
    <ShellContext.Provider value={value}>
      <div className="background-layer"></div>
      <main className="budget-shell">
        <aside className="side-nav">
          <div className="brand-block">
            <div className="brand-badge">PF</div>
            <div>
              <h1>PRIME Finance</h1>
              <p>Smart Finance</p>
            </div>
          </div>

          <article className="nav-balance-box">
            <p>Total Balance</p>
            <h3 id="total-balance-value">{formatCurrency(overview?.summary?.balance || 0)}</h3>
            <span id="monthly-note">Monthly consistency insights</span>
          </article>

          <nav className="menu-block">
            <NavLink to="/dashboard-1" className={() => `menu-item${isDashboardRoute ? " active" : ""}`}>
              <span className="menu-icon" aria-hidden="true">
                🏠
              </span>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/cards" className={({ isActive }) => `menu-item${isActive ? " active" : ""}`}>
              <span className="menu-icon" aria-hidden="true">
                💳
              </span>
              <span>My Cards</span>
            </NavLink>
            <NavLink to="/transactions" className={({ isActive }) => `menu-item${isActive ? " active" : ""}`}>
              <span className="menu-icon" aria-hidden="true">
                📊
              </span>
              <span>Transactions</span>
            </NavLink>
            <NavLink to="/goals" className={({ isActive }) => `menu-item${isActive ? " active" : ""}`}>
              <span className="menu-icon" aria-hidden="true">
                🎯
              </span>
              <span>Goals</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `menu-item${isActive ? " active" : ""}`}>
              <span className="menu-icon" aria-hidden="true">
                👤
              </span>
              <span>Profile</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `menu-item${isActive ? " active" : ""}`}>
              <span className="menu-icon" aria-hidden="true">
                ⚙️
              </span>
              <span>Settings</span>
            </NavLink>
            <NavLink to="/savings" className={({ isActive }) => `menu-item${isActive ? " active" : ""}`}>
              <span className="menu-icon" aria-hidden="true">
                🤖
              </span>
              <span>AI Suggestions</span>
            </NavLink>
          </nav>

          <div className="profile-strip">
            <div>
              <strong id="welcome-name">{overview?.user?.name || "User"}</strong>
            </div>
          </div>
        </aside>

        <Outlet />
      </main>
    </ShellContext.Provider>
  );
}
