import { ThemeToggleButton, useShellData } from "../components/AppShellLayout";
import DashboardVariantTabs from "../components/DashboardVariantTabs";
import { formatCurrency } from "../lib/format";

export default function DashboardFourPage() {
  const { overview, logout, goDeposit } = useShellData();

  const user = overview?.user || {};
  const goals = overview?.goals || [];
  const summary = overview?.summary || {};

  const completedGoals = goals.filter((goal) => goal.progressPct >= 100).length;
  const activeGoals = goals.filter((goal) => goal.progressPct < 100).length;
  const totalGoalTarget = goals.reduce((sum, goal) => sum + Number(goal.target_amount || 0), 0);
  const totalGoalSaved = goals.reduce((sum, goal) => sum + Number(goal.current_amount || 0), 0);
  const completionRate = totalGoalTarget > 0 ? Math.round((totalGoalSaved / totalGoalTarget) * 100) : 0;

  return (
    <section className="main-pane">
      <header className="topbar">
        <div>
          <h2>Dashboard 4</h2>
          <p>Gamified profile and mission progress</p>
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

      <section className="savvy-bottom-grid two-col-grid">
        <article className="transactions-panel">
          <h3>Profile Progress</h3>
          <div className="profile-progress-grid">
            <div className="profile-progress-item">
              <span>Level</span>
              <strong>{user.level || 1}</strong>
            </div>
            <div className="profile-progress-item">
              <span>XP</span>
              <strong>{user.xp || 0}</strong>
            </div>
            <div className="profile-progress-item">
              <span>Streak</span>
              <strong>{user.streakDays || 0} days</strong>
            </div>
            <div className="profile-progress-item">
              <span>Balance</span>
              <strong>{formatCurrency(summary.balance || 0)}</strong>
            </div>
          </div>
        </article>

        <article className="transactions-panel">
          <h3>Goals Mission</h3>
          <div className="mission-stats-grid">
            <div>
              <span>Completed</span>
              <strong>{completedGoals}</strong>
            </div>
            <div>
              <span>Active</span>
              <strong>{activeGoals}</strong>
            </div>
            <div>
              <span>Saved</span>
              <strong>{formatCurrency(totalGoalSaved)}</strong>
            </div>
            <div>
              <span>Completion</span>
              <strong>{completionRate}%</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="transactions-panel">
        <h3>Goal Tracker</h3>
        <div className="goal-list-compact">
          {!goals.length && <div className="empty-state">No goals yet.</div>}
          {goals.map((goal) => (
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
      </section>
    </section>
  );
}
