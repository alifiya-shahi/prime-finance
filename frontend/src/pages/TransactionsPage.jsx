import { useEffect, useMemo, useState } from "react";
import { ThemeToggleButton, useShellData } from "../components/AppShellLayout";
import { api, getToken } from "../lib/api";
import { formatCurrency } from "../lib/format";

const getTodayInputDate = () => new Date().toISOString().split("T")[0];

const createInitialForm = () => ({
  type: "expense",
  description: "",
  amount: "",
  category: "Food & Dining",
  date: getTodayInputDate(),
  notes: ""
});

export default function TransactionsPage() {
  const { logout, goDeposit, refreshOverview } = useShellData();
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(createInitialForm);
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("");

  async function loadTransactions() {
    const data = await api("/api/dashboard/transactions");
    setTransactions(data.transactions || []);
  }

  useEffect(() => {
    loadTransactions().catch((error) => {
      setMessage(error.message);
      setMessageColor("#ff95be");
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((item) => String(item.description || "").toLowerCase().includes(q));
  }, [search, transactions]);

  const closeModal = () => {
    setModalOpen(false);
    setMessage("");
    setMessageColor("");
  };

  const downloadTransactions = async (format) => {
    try {
      const token = getToken();
      const response = await fetch(`/api/dashboard/export/transactions?format=${encodeURIComponent(format)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Could not export transactions.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const extension = format === "pdf" ? "pdf" : "csv";
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions-${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setMessageColor("#54ddad");
      setMessage(`Transactions exported as ${extension.toUpperCase()}.`);
    } catch (error) {
      setMessageColor("#ff95be");
      setMessage(error.message);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const description = form.description.trim();
    const amount = Number(form.amount);

    if (!description) {
      setMessage("Description is required.");
      setMessageColor("#ff95be");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Amount must be greater than 0.");
      setMessageColor("#ff95be");
      return;
    }

    try {
      await api("/api/dashboard/transactions", {
        method: "POST",
        body: JSON.stringify({
          type: form.type,
          description,
          amount,
          category: form.category,
          date: form.date,
          notes: form.notes.trim()
        })
      });

      setMessageColor("#54ddad");
      setMessage("Transaction added.");

      await loadTransactions();
      await refreshOverview();
      setForm(createInitialForm());

      setTimeout(() => {
        closeModal();
      }, 500);
    } catch (error) {
      setMessageColor("#ff95be");
      setMessage(error.message);
    }
  };

  return (
    <section className="main-pane">
      <header className="topbar">
        <div>
          <h2>Transactions</h2>
          <p>Your complete transaction history</p>
        </div>
        <div className="topbar-actions">
          <ThemeToggleButton />
          <input
            type="search"
            id="txn-search"
            placeholder="Search description..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button id="add-transaction-btn" className="btn-primary new-budget-btn" type="button" onClick={() => setModalOpen(true)}>
            + Add Transaction
          </button>
          <button className="btn-outline" type="button" onClick={() => downloadTransactions("csv")}>
            Export CSV
          </button>
          <button className="btn-outline" type="button" onClick={() => downloadTransactions("pdf")}>
            Export PDF
          </button>
          <button id="deposit-btn" className="btn-ghost" type="button" onClick={goDeposit}>
            + Deposit
          </button>
          <button id="logout-btn" className="btn-danger" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <section className="transactions-panel page-panel">
        <h3>All Activity</h3>
        {message ? (
          <p className="message" style={{ color: messageColor || undefined }}>
            {message}
          </p>
        ) : null}
        <ul id="transactions-list" className="transactions-list">
          {filtered.length === 0 && <div className="empty-state">No transactions yet.</div>}
          {filtered.map((txn) => {
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

      <div id="transaction-modal" className={`tx-modal ${modalOpen ? "" : "hidden"}`} aria-hidden={modalOpen ? "false" : "true"}>
        <div className="tx-modal-backdrop" data-close-modal="true" onClick={closeModal}></div>
        <section className="tx-modal-card" role="dialog" aria-modal="true" aria-labelledby="tx-modal-title">
          <header className="tx-modal-head">
            <h3 id="tx-modal-title">Add New Transaction</h3>
            <button id="tx-modal-close" className="tx-close-btn" type="button" aria-label="Close" onClick={closeModal}>
              x
            </button>
          </header>

          <form id="tx-form" className="tx-form" onSubmit={onSubmit}>
            <div className="field">
              <label>Transaction Type</label>
              <div className="tx-type-grid">
                <label className={`tx-type-option ${form.type === "expense" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="type"
                    value="expense"
                    checked={form.type === "expense"}
                    onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                  />
                  <span>
                    Expense <small>Money spent</small>
                  </span>
                </label>
                <label className={`tx-type-option ${form.type === "income" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="type"
                    value="income"
                    checked={form.type === "income"}
                    onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                  />
                  <span>
                    Income <small>Money received</small>
                  </span>
                </label>
              </div>
            </div>

            <div className="field">
              <label htmlFor="tx-description">Merchant / Description</label>
              <input
                id="tx-description"
                type="text"
                placeholder="e.g., Starbucks, Salary, etc."
                required
                autoFocus
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="tx-amount">Amount</label>
              <input
                id="tx-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="tx-category">Category</label>
              <select
                id="tx-category"
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                <option>Food & Dining</option>
                <option>Travel</option>
                <option>Entertainment</option>
                <option>Business</option>
                <option>Shopping</option>
                <option>Other</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="tx-date">Date</label>
              <input
                id="tx-date"
                className="tx-date-input"
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="tx-notes">Notes (Optional)</label>
              <textarea
                id="tx-notes"
                rows="3"
                placeholder="Add any additional notes..."
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              ></textarea>
            </div>

            <div className="tx-actions">
              <button id="tx-cancel-btn" type="button" className="btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add Transaction
              </button>
            </div>

            <p id="tx-message" className="message" style={{ color: messageColor || undefined }}>
              {message}
            </p>
          </form>
        </section>
      </div>
    </section>
  );
}
