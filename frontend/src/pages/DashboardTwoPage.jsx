import { ThemeToggleButton, useShellData } from "../components/AppShellLayout";
import DashboardVariantTabs from "../components/DashboardVariantTabs";
import { formatCurrency } from "../lib/format";

export default function DashboardTwoPage() {
  const { overview, logout, goDeposit } = useShellData();

  const summary = overview?.summary || {};
  const goals = overview?.goals || [];
  const recentTransactions = overview?.recentTransactions || [];

  const onTrack = goals.filter((goal) => goal.progressPct < 100).length;
  const exceeded = goals.filter((goal) => goal.progressPct >= 100).length;

  return (
    <section className="main-pane">
      <header className="topbar">
        <div>
          <h2>Dashboard 2</h2>
          <p>Compact analytics and goals snapshot</p>
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
          <p className="metric-label">Balance</p>
          <h3>{formatCurrency(summary.balance || 0)}</h3>
          <small>Current net value</small>
        </article>
        <article className="metric-card">
          <p className="metric-label">Income</p>
          <h3>{formatCurrency(summary.income || 0)}</h3>
          <small>Total incoming</small>
        </article>
        <article className="metric-card">
          <p className="metric-label">On Track Goals</p>
          <h3>{onTrack}</h3>
          <small>Healthy progress</small>
        </article>
        <article className="metric-card">
          <p className="metric-label">Exceeded Goals</p>
          <h3>{exceeded}</h3>
          <small>Need attention</small>
        </article>
      </section>

      <section className="savvy-bottom-grid two-col-grid">
        <article className="transactions-panel">
          <h3>Recent Transactions</h3>
          <ul className="transactions-list">
            {!recentTransactions.length && <div className="empty-state">No transactions yet.</div>}
            {recentTransactions.slice(0, 6).map((txn) => {
              const amountLabel = txn.amount < 0 ? `-${formatCurrency(Math.abs(txn.amount))}` : `+${formatCurrency(txn.amount)}`;
              return (
                <li key={txn.id || `${txn.description}-${txn.created_at}`}>
                  <div className="txn-info">
                    <span className="txn-title">{txn.description}</span>
                    <span className="txn-date">{new Date(txn.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className={`txn-amount ${txn.type}`}>{amountLabel}</span>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="transactions-panel">
          <h3>Goal Progress</h3>
          <div className="goal-list-compact">
            {!goals.length && <div className="empty-state">No goals yet.</div>}
            {goals.slice(0, 6).map((goal) => (
              <div key={goal.id} className="goal-compact-item">
                <div className="goal-compact-head">
                  <strong>{goal.title}</strong>
                  <span>{goal.progressPct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${goal.progressPct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
