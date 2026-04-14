import { useEffect, useState } from "react";
import { ThemeToggleButton, useShellData } from "../components/AppShellLayout";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";

const getTodayInputDate = () => new Date().toISOString().split("T")[0];

const createInitialGoalForm = () => ({
  title: "",
  targetAmount: "1000",
  currentAmount: "0",
  dueDate: getTodayInputDate(),
  badge: "Rising Saver"
});

export default function GoalsPage() {
  const { logout, goDeposit, refreshOverview } = useShellData();
  const [goals, setGoals] = useState([]);
  const [error, setError] = useState("");
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState(createInitialGoalForm);
  const [goalMessage, setGoalMessage] = useState("");
  const [topUpGoal, setTopUpGoal] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpMessage, setTopUpMessage] = useState("");

  async function loadGoals() {
    const data = await api("/api/dashboard/goals");
    setGoals(data.goals || []);
  }

  useEffect(() => {
    loadGoals().catch((err) => {
      setError(err.message);
    });
  }, []);

  const startAddGoalFlow = async () => {
    setGoalForm(createInitialGoalForm());
    setAddGoalOpen(true);
    setGoalMessage("");
  };

  const closeAddGoalModal = () => {
    setAddGoalOpen(false);
    setGoalMessage("");
    setGoalForm(createInitialGoalForm());
  };

  const submitAddGoal = async (event) => {
    event.preventDefault();

    const cleanTitle = goalForm.title.trim();
    const targetAmount = Number(goalForm.targetAmount);
    const currentAmount = Number(goalForm.currentAmount || "0");

    if (!cleanTitle) {
      setGoalMessage("Goal title is required.");
      return;
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setGoalMessage("Target amount must be greater than 0.");
      return;
    }

    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      setGoalMessage("Current amount cannot be negative.");
      return;
    }

    try {
      await api("/api/dashboard/goals", {
        method: "POST",
        body: JSON.stringify({
          title: cleanTitle,
          targetAmount,
          currentAmount,
          dueDate: goalForm.dueDate,
          badge: goalForm.badge.trim() || "Rising Saver"
        })
      });

      await loadGoals();
      await refreshOverview();
      closeAddGoalModal();
    } catch (err) {
      setGoalMessage(err.message);
    }
  };

  const addMoneyToGoal = async (goal) => {
    setTopUpGoal(goal);
    setTopUpAmount("100");
    setTopUpMessage("");
  };

  const closeTopUpModal = () => {
    setTopUpGoal(null);
    setTopUpAmount("");
    setTopUpMessage("");
  };

  const submitTopUp = async (event) => {
    event.preventDefault();

    const amount = Number(topUpAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setTopUpMessage("Amount must be greater than 0.");
      return;
    }

    try {
      await api(`/api/dashboard/goals/${topUpGoal.id}/add-money`, {
        method: "POST",
        body: JSON.stringify({ amount })
      });

      await loadGoals();
      await refreshOverview();
      closeTopUpModal();
    } catch (err) {
      setTopUpMessage(err.message);
    }
  };

  return (
    <section className="main-pane">
      <header className="topbar">
        <div>
          <h2>Savings Goals</h2>
          <p>Track each goal and stay on target</p>
        </div>
        <div className="topbar-actions">
          <ThemeToggleButton />
          <button id="add-goal-btn" className="btn-primary" type="button" onClick={startAddGoalFlow}>
            + Add Goal
          </button>
          <button id="deposit-btn" className="btn-ghost" type="button" onClick={goDeposit}>
            + Deposit
          </button>
          <button id="logout-btn" className="btn-danger" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <section id="goals-list" className="budget-grid page-panel">
        {goals.length === 0 && (
          <div className="empty-state">
            <p>{error || "No goals yet. Add savings targets from your dashboard."}</p>
            <button className="btn-primary page-action" type="button" onClick={startAddGoalFlow}>
              + Add Goal
            </button>
          </div>
        )}

        {goals.map((goal) => {
          const remaining = Math.max(0, goal.target_amount - goal.current_amount);
          const progressClass = goal.progressPct >= 100 ? "danger" : goal.progressPct > 80 ? "warn" : "safe";

          return (
            <article key={goal.id} className={`budget-card ${progressClass}`}>
              <div className="budget-head">
                <div>
                  <h4>{goal.title}</h4>
                  <p>{goal.due_date ? `Due ${new Date(goal.due_date).toLocaleDateString()}` : "No due date"}</p>
                </div>
                <span className="goal-badge">{goal.badge || "Rising Saver"}</span>
              </div>

              <div className="budget-values">
                <strong>
                  {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                </strong>
                <span>Remaining {formatCurrency(remaining)}</span>
              </div>

              <div className="progress-track">
                <div className="progress-bar" style={{ width: `${goal.progressPct}%` }}></div>
              </div>

              <div className="budget-footer">
                <span>{goal.progressPct}% used</span>
                <button className="btn-ghost goal-topup-btn" type="button" onClick={() => addMoneyToGoal(goal)}>
                  Add Money
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <div className={`tx-modal ${addGoalOpen ? "" : "hidden"}`} aria-hidden={addGoalOpen ? "false" : "true"}>
        <div className="tx-modal-backdrop" data-close-modal="true" onClick={closeAddGoalModal}></div>
        <section className="tx-modal-card goal-topup-modal" role="dialog" aria-modal="true" aria-labelledby="goal-create-title">
          <header className="tx-modal-head">
            <h3 id="goal-create-title">Create Savings Goal</h3>
            <button className="tx-close-btn" type="button" aria-label="Close" onClick={closeAddGoalModal}>
              x
            </button>
          </header>

          <form className="tx-form" onSubmit={submitAddGoal}>
            <div className="field">
              <label htmlFor="goal-title">Goal title</label>
              <input
                id="goal-title"
                type="text"
                placeholder="Emergency Fund"
                value={goalForm.title}
                onChange={(event) => setGoalForm((prev) => ({ ...prev, title: event.target.value }))}
                autoFocus
                required
              />
            </div>

            <div className="field">
              <label htmlFor="goal-target">Target amount</label>
              <input
                id="goal-target"
                type="number"
                min="1"
                step="1"
                placeholder="1000"
                value={goalForm.targetAmount}
                onChange={(event) => setGoalForm((prev) => ({ ...prev, targetAmount: event.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="goal-current">Current saved amount</label>
              <input
                id="goal-current"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={goalForm.currentAmount}
                onChange={(event) => setGoalForm((prev) => ({ ...prev, currentAmount: event.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="goal-due">Due date</label>
              <input
                id="goal-due"
                type="date"
                value={goalForm.dueDate}
                onChange={(event) => setGoalForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="goal-badge">Badge</label>
              <input
                id="goal-badge"
                type="text"
                placeholder="Rising Saver"
                value={goalForm.badge}
                onChange={(event) => setGoalForm((prev) => ({ ...prev, badge: event.target.value }))}
              />
            </div>

            <div className="tx-actions">
              <button className="btn-outline" type="button" onClick={closeAddGoalModal}>
                Cancel
              </button>
              <button className="btn-primary" type="submit">
                Create Goal
              </button>
            </div>

            <p className="message" style={{ minHeight: "1.2rem" }}>
              {goalMessage}
            </p>
          </form>
        </section>
      </div>

      <div className={`tx-modal ${topUpGoal ? "" : "hidden"}`} aria-hidden={topUpGoal ? "false" : "true"}>
        <div className="tx-modal-backdrop" data-close-modal="true" onClick={closeTopUpModal}></div>
        <section className="tx-modal-card goal-topup-modal" role="dialog" aria-modal="true" aria-labelledby="goal-topup-title">
          <header className="tx-modal-head">
            <h3 id="goal-topup-title">Add Money to Goal</h3>
            <button className="tx-close-btn" type="button" aria-label="Close" onClick={closeTopUpModal}>
              x
            </button>
          </header>

          <form className="tx-form" onSubmit={submitTopUp}>
            <div className="goal-topup-summary">
              <strong>{topUpGoal?.title}</strong>
              <span>
                {formatCurrency(topUpGoal?.current_amount || 0)} / {formatCurrency(topUpGoal?.target_amount || 0)}
              </span>
            </div>

            <div className="field">
              <label htmlFor="goal-topup-amount">Amount to add</label>
              <input
                id="goal-topup-amount"
                type="number"
                min="1"
                step="1"
                placeholder="Enter amount"
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(event.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="tx-actions">
              <button className="btn-outline" type="button" onClick={closeTopUpModal}>
                Cancel
              </button>
              <button className="btn-primary" type="submit">
                Add to Goal
              </button>
            </div>

            <p className="message" style={{ minHeight: "1.2rem" }}>
              {topUpMessage}
            </p>
          </form>
        </section>
      </div>
    </section>
  );
}
