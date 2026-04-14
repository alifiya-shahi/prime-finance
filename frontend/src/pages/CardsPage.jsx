import { ThemeToggleButton, useShellData } from "../components/AppShellLayout";
import { formatCurrency } from "../lib/format";

function getMaskedCardNumber(seed) {
  const raw = String(seed || "482934715206").replace(/\D/g, "");
  const padded = `7642${raw}`.padEnd(16, "0").slice(0, 16);
  return padded.replace(/(.{4})/g, "$1 ").trim();
}

function toMerchantName(description) {
  const text = String(description || "Card Transaction");
  const parts = text.split("|").map((item) => item.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : text;
}

export default function CardsPage() {
  const { overview, logout, goDeposit } = useShellData();
  const summary = overview?.summary || {};
  const user = overview?.user || {};
  const recentTransactions = overview?.recentTransactions || [];

  const balance = Number(summary.balance || 0);
  const spent = Number(summary.expense || 0);
  const income = Number(summary.income || 0);

  const spendingLimit = Math.max(5000, Math.ceil(spent * 1.3), Math.ceil((income || balance || 0) * 0.45));
  const spentSafe = Math.max(0, spent);
  const limitProgress = Math.min(100, Math.round((spentSafe / Math.max(1, spendingLimit)) * 100));
  const remainingLimit = Math.max(0, spendingLimit - spentSafe);
  const recentCardTransactions = recentTransactions.slice(0, 5);

  const cardHolder = user?.name || "Prime User";
  const cardNumber = getMaskedCardNumber(user?.id || user?.email || cardHolder);
  const expiry = "09/30";

  return (
    <section className="main-pane">
      <header className="topbar">
        <div>
          <h2>My Cards</h2>
          <p>Overview of your digital cards</p>
        </div>
        <div className="topbar-actions">
          <ThemeToggleButton />
          <button id="add-card-btn" className="btn-primary" type="button" onClick={goDeposit}>
            + Add Card
          </button>
          <button id="deposit-btn" className="btn-ghost" type="button" onClick={goDeposit}>
            + Deposit
          </button>
          <button id="logout-btn" className="btn-danger" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <section className="cards-page-grid">
        <article className="card-preview-shell">
          <div className="atm-card-ui">
            <div className="atm-card-top">
              <span className="chip green">Primary Card</span>
              <strong>PRIME</strong>
            </div>

            <div className="atm-card-chip" aria-hidden="true"></div>
            <p className="atm-card-number">{cardNumber}</p>

            <div className="atm-card-bottom">
              <div>
                <span>Card Holder</span>
                <strong>{cardHolder}</strong>
              </div>
              <div>
                <span>Expires</span>
                <strong>{expiry}</strong>
              </div>
            </div>
          </div>

          <div className="cards-metrics-grid">
            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-icon violet">cc</span>
                <span className="chip green">Balance</span>
              </div>
              <p className="metric-label">Main Card Balance</p>
              <h3 id="card-main-balance">{formatCurrency(balance)}</h3>
              <small>Virtual Mastercard</small>
            </article>

            <article className="metric-card">
              <div className="metric-top">
                <span className="metric-icon orange">$</span>
                <span className="chip orange">Monthly</span>
              </div>
              <p className="metric-label">Spent This Month</p>
              <h3 id="card-monthly-spent">{formatCurrency(spentSafe)}</h3>
              <small>Across all cards</small>
            </article>
          </div>
        </article>

        <article className="card-side-panel page-panel">
          <h3>Spending Limit Progress</h3>
          <p className="card-side-sub">Track your monthly usage against your card limit.</p>

          <div className="card-limit-stats">
            <div>
              <span>Used</span>
              <strong>{formatCurrency(spentSafe)}</strong>
            </div>
            <div>
              <span>Limit</span>
              <strong>{formatCurrency(spendingLimit)}</strong>
            </div>
            <div>
              <span>Remaining</span>
              <strong>{formatCurrency(remainingLimit)}</strong>
            </div>
          </div>

          <div className="progress-track card-limit-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={limitProgress}>
            <div className="progress-bar card-limit-bar" style={{ width: `${limitProgress}%` }}></div>
          </div>
          <p className="card-limit-note">{limitProgress}% of monthly card limit used</p>

          <h3 className="card-recent-title">Recent Card Transactions</h3>
          <ul className="cards-recent-list">
            {recentCardTransactions.length === 0 && <div className="empty-state">No recent card transactions.</div>}
            {recentCardTransactions.map((txn) => {
              const amountLabel = Number(txn.amount || 0) < 0 ? `-${formatCurrency(Math.abs(Number(txn.amount || 0)))}` : `+${formatCurrency(Number(txn.amount || 0))}`;
              return (
                <li key={txn.id || `${txn.description}-${txn.created_at}`}>
                  <div>
                    <strong>{toMerchantName(txn.description)}</strong>
                    <span>{new Date(txn.created_at).toLocaleDateString()}</span>
                  </div>
                  <em className={txn.type === "expense" ? "expense" : "income"}>{amountLabel}</em>
                </li>
              );
            })}
          </ul>
        </article>
      </section>
    </section>
  );
}
