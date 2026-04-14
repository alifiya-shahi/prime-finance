import { useMemo, useState } from "react";
import { ThemeToggleButton, useShellData } from "../components/AppShellLayout";
import { api } from "../lib/api";

const quickAmounts = [100, 250, 500, 1000, 2500, 5000];
const paymentMethods = [
  { method: "Bank", description: "Bank Deposit", iconClass: "bank", icon: "BK", subtitle: "Visa ****8765" },
  { method: "Debit Card", description: "Card Deposit", iconClass: "card", icon: "DC", subtitle: "Visa ****8765" },
  { method: "PayPal", description: "PayPal Deposit", iconClass: "paypal", icon: "PP", subtitle: "den@example.com" }
];

const toMoney = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function DepositPage() {
  const { logout, refreshOverview } = useShellData();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("PayPal Deposit");
  const [selectedQuick, setSelectedQuick] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("PayPal");
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("");

  const breakdown = useMemo(() => {
    const amountNumber = Number(amount) || 0;
    const fee = 0;
    return {
      amount: toMoney(amountNumber),
      fee: toMoney(fee),
      total: toMoney(amountNumber + fee)
    };
  }, [amount]);

  const onClose = () => {
    window.location.href = "/dashboard";
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage("Please enter a valid amount greater than 0.");
      setMessageColor("#ff95be");
      return;
    }

    try {
      await api("/api/dashboard/deposit", {
        method: "POST",
        body: JSON.stringify({ description: description.trim(), amount: parsedAmount })
      });

      await refreshOverview();
      setMessageColor("#54ddad");
      setMessage("Deposit successful. Redirecting to dashboard...");

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    } catch (error) {
      setMessageColor("#ff95be");
      setMessage(error.message);
    }
  };

  return (
    <section className="main-pane">
      <header className="topbar">
        <div>
          <h2>Deposit Funds</h2>
          <p>Add money to your account balance</p>
        </div>
        <div className="topbar-actions">
          <ThemeToggleButton />
          <button id="logout-btn" className="btn-danger" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <section className="page-panel deposit-panel-wrap">
        <form id="deposit-form" className="deposit-sheet" onSubmit={onSubmit}>
          <div className="deposit-sheet-head">
            <div>
              <h3>Deposit Money</h3>
              <p>Add funds to your account</p>
            </div>
            <button id="deposit-close-btn" type="button" className="deposit-close-btn" aria-label="Close deposit" onClick={onClose}>
              x
            </button>
          </div>

          <div className="field deposit-field">
            <label htmlFor="deposit-amount">Enter Amount</label>
            <input
              id="deposit-amount"
              type="number"
              step="0.01"
              min="1"
              placeholder="100"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <section className="deposit-section">
            <h4>Quick Select</h4>
            <div className="quick-select-grid" id="quick-select-grid">
              {quickAmounts.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`quick-amount-btn ${selectedQuick === item ? "active" : ""}`}
                  onClick={() => {
                    setSelectedQuick(item);
                    setAmount(String(item));
                  }}
                >
                  ${item.toLocaleString()}
                </button>
              ))}
            </div>
          </section>

          <section className="deposit-section">
            <h4>Payment Method</h4>
            <div className="payment-method-list" id="payment-method-list">
              {paymentMethods.map((method) => (
                <button
                  key={method.method}
                  type="button"
                  className={`payment-method-card ${selectedMethod === method.method ? "active" : ""}`}
                  onClick={() => {
                    setSelectedMethod(method.method);
                    setDescription(method.description);
                  }}
                >
                  <span className={`payment-method-icon ${method.iconClass}`}>{method.icon}</span>
                  <span className="payment-method-copy">
                    <strong>{method.method}</strong>
                    <small>{method.subtitle}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="deposit-breakdown" aria-live="polite">
            <h4>Transaction Details</h4>
            <div className="line-item">
              <span>Deposit Amount</span>
              <strong id="detail-deposit-amount">{breakdown.amount}</strong>
            </div>
            <div className="line-item">
              <span>Processing Fee</span>
              <strong id="detail-processing-fee">{breakdown.fee}</strong>
            </div>
            <div className="line-item total">
              <span>Total Amount</span>
              <strong id="detail-total-amount">{breakdown.total}</strong>
            </div>
          </section>

          <div className="field deposit-field">
            <label htmlFor="deposit-note">Add Note (Optional)</label>
            <textarea id="deposit-note" rows="3" placeholder="Add a note for this deposit..."></textarea>
          </div>

          <input id="deposit-description" type="hidden" value={description} readOnly />

          <div className="deposit-actions-row">
            <button id="deposit-cancel-btn" className="btn-outline" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary deposit-submit-btn" type="submit">
              Confirm Deposit
            </button>
          </div>

          <div className="secure-box">
            <strong>Secure Transaction</strong>
            <p>Your payment information is encrypted and secure. We never store your card details.</p>
          </div>

          <p id="deposit-message" className="message" style={{ color: messageColor || undefined }}>
            {message}
          </p>
        </form>
      </section>
    </section>
  );
}
