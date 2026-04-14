import { ThemeToggleButton, useShellData } from "../components/AppShellLayout";
import DashboardVariantTabs from "../components/DashboardVariantTabs";
import { formatCurrency } from "../lib/format";

export default function DashboardThreePage() {
  const { overview, logout, goDeposit } = useShellData();

  const summary = overview?.summary || {};
  const recentTransactions = overview?.recentTransactions || [];

  const income = Number(summary.income || 0);
  const expense = Number(summary.expense || 0);
  const saving = Number(summary.saving || 0);
  const balance = Number(summary.balance || 0);
  const savingRate = income > 0 ? Math.round((saving / income) * 100) : 0;

  return (
    <section className="main-pane">
      <header className="topbar">
        <div>
          <h2>Dashboard 3</h2>
          <p>Cash flow view with savings performance</p>
        </div>
        <div className="topbar-actions">
          <ThemeToggleButton />
          <button className="btn-ghost" type="button" onClick={goDeposit}>
            + Deposit
          </button>
          <button className="btn-danger" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <DashboardVariantTabs />

      <section className="metrics-row">
        <article className="metric-card">
          <p className="metric-label">Income</p>
          <h3>{formatCurrency(income)}</h3>
          <small>Money received</small>
        </article>
        <article className="metric-card">
          <p className="metric-label">Expense</p>
          <h3>{formatCurrency(expense)}</h3>
          <small>Money spent</small>
        </article>
        <article className="metric-card">
          <p className="metric-label">Saving</p>
          <h3>{formatCurrency(saving)}</h3>
          <small>Funds reserved</small>
        </article>
        <article className="metric-card">
          <p className="metric-label">Saving Rate</p>
          <h3>{savingRate}%</h3>
          <small>Of total income</small>
        </article>
      </section>

      <section className="transactions-panel">
        <h3>Cash Flow Breakdown</h3>
        <div className="cashflow-bars">
          <div className="cashflow-row">
            <span>Income</span>
            <div className="cashflow-track">
              <div className="cashflow-fill income" style={{ width: `${income > 0 ? 100 : 0}%` }}></div>
            </div>
            <strong>{formatCurrency(income)}</strong>
          </div>
          <div className="cashflow-row">
            <span>Expense</span>
            <div className="cashflow-track">
              <div className="cashflow-fill expense" style={{ width: `${income > 0 ? Math.min(100, (expense / income) * 100) : 0}%` }}></div>
            </div>
            <strong>{formatCurrency(expense)}</strong>
          </div>
          <div className="cashflow-row">
            <span>Saving</span>
            <div className="cashflow-track">
              <div className="cashflow-fill saving" style={{ width: `${income > 0 ? Math.min(100, (saving / income) * 100) : 0}%` }}></div>
            </div>
            <strong>{formatCurrency(saving)}</strong>
          </div>
        </div>
      </section>

      <section className="transactions-panel">
        <h3>Latest Activity</h3>
        <ul className="transactions-list">
          {!recentTransactions.length && <div className="empty-state">No transactions yet.</div>}
          {recentTransactions.slice(0, 5).map((txn) => {
            const amountLabel = txn.amount < 0 ? `-${formatCurrency(Math.abs(txn.amount))}` : `+${formatCurrency(txn.amount)}`;
            return (
              <li key={txn.id || `${txn.description}-${txn.created_at}`}>
                <div className="txn-info">
                  <span className="txn-title">{txn.description}</span>
                  <span className="txn-date">
                    {new Date(txn.created_at).toLocaleDateString()} - {txn.type}
                  </span>
                </div>
                <span className={`txn-amount ${txn.type}`}>{amountLabel}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="transactions-panel">
        <h3>Net Position</h3>
        <p className="net-balance-value">{formatCurrency(balance)}</p>
      </section>
    </section>
  );
}
