import { useEffect, useState } from "react";
import { ThemeToggleButton, useShellData } from "../components/AppShellLayout";
import { api } from "../lib/api";

function isFinanceQuestion(question) {
  const financeKeywords = [
    "budget",
    "save",
    "saving",
    "invest",
    "expense",
    "spend",
    "money",
    "debt",
    "loan",
    "card",
    "salary",
    "income",
    "fund",
    "emergency",
    "retirement",
    "stock",
    "etf"
  ];

  const normalized = question.toLowerCase();
  return financeKeywords.some((word) => normalized.includes(word));
}

function buildFinanceReply(question, overview) {
  const q = question.toLowerCase();
  const income = Number(overview?.summary?.income || 0);
  const expense = Number(overview?.summary?.expense || 0);
  const saving = Number(overview?.summary?.saving || 0);
  const balance = Number(overview?.summary?.balance || 0);

  const safeIncome = income > 0 ? income : Math.max(balance, 1000);
  const needs = safeIncome * 0.5;
  const wants = safeIncome * 0.3;
  const future = safeIncome * 0.2;
  const emergencyTarget = safeIncome * 6;

  if (q.includes("save") || q.includes("saving")) {
    return `Great question. A simple target is to save about ${formatCurrency(future)} monthly (around 20% of income). You are currently saving ${formatCurrency(saving)}. Keep at least 3 to 6 months of expenses as emergency cash, around ${formatCurrency(emergencyTarget)} for your profile.`;
  }

  if (q.includes("invest") || q.includes("stock") || q.includes("etf")) {
    return `A balanced starter plan: first keep emergency money safe, then invest regularly. If your high-interest debt is controlled, you can invest ${formatCurrency(future * 0.6)} monthly into broad index ETFs and keep ${formatCurrency(future * 0.4)} for short-term goals.`;
  }

  if (q.includes("debt") || q.includes("loan") || q.includes("card")) {
    return `For debt, pay minimums on all accounts, then focus extra money on the highest-interest debt first. You can reserve ${formatCurrency(future * 0.7)} for debt payoff and still keep ${formatCurrency(future * 0.3)} for savings momentum.`;
  }

  if (q.includes("spend") || q.includes("budget") || q.includes("expense")) {
    return `Try a cute but powerful 50/30/20 split: Needs ${formatCurrency(needs)}, Wants ${formatCurrency(wants)}, Future ${formatCurrency(future)}. Your current expense is ${formatCurrency(expense)}, so keep this week spending close to ${formatCurrency(wants / 4)} for lifestyle purchases.`;
  }

  return `Smart move asking this. Based on your profile, start with: Needs ${formatCurrency(needs)}, Wants ${formatCurrency(wants)}, Future ${formatCurrency(future)}. Review weekly, trim one unnecessary subscription, and move that amount directly to savings or investing.`;
}

export default function SavingsPage() {
  const { overview, logout, goDeposit } = useShellData();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (overview?.user?.name) {
      setMessages([
        {
          role: "assistant",
          text: `Hi ${overview.user.name}, ask me anything about money and I will suggest a practical plan from your transaction history.`
        }
      ]);
    } else {
      setMessages([{ role: "assistant", text: "Hi, ask me a finance question and I will guide your next money move." }]);
    }
  }, [overview?.user?.name]);

  const askQuestion = (text) => {
    const userQuestion = text.trim();
    if (!userQuestion) return;

    setMessages((prev) => [...prev, { role: "user", text: userQuestion }, { role: "assistant", text: "Analyzing your history..." }]);

    if (!isFinanceQuestion(userQuestion)) {
      setMessages((prev) => {
        const withoutTyping = prev.slice(0, -1);
        return [
          ...withoutTyping,
          {
            role: "assistant",
            text: "I am your finance-only assistant. Ask me about spending, saving, debt, investing, emergency funds, salary planning, or budgeting."
          }
        ];
      });
      return;
    }

    api("/api/dashboard/assistant/advice", {
      method: "POST",
      body: JSON.stringify({ question: userQuestion })
    })
      .then((result) => {
        setMessages((prev) => {
          const withoutTyping = prev.slice(0, -1);
          return [...withoutTyping, { role: "assistant", text: result.advice || buildFinanceReply(userQuestion, overview) }];
        });
      })
      .catch(() => {
        setMessages((prev) => {
          const withoutTyping = prev.slice(0, -1);
          return [...withoutTyping, { role: "assistant", text: buildFinanceReply(userQuestion, overview) }];
        });
      });
  };

  return (
    <section className="main-pane">
      <header className="topbar">
        <div>
          <h2>AI Suggestions</h2>
          <p>Ask finance questions about spending, saving, and investing anytime</p>
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

      <section className="ai-suggestions-grid">
        <article className="ai-chat-panel">
          <div className="ai-chat-head">
            <div>
              <h3>Ask AI</h3>
              <p>Your playful finance buddy for smart money moves</p>
            </div>
            <span className="ai-status-pill">Online</span>
          </div>

          <div className="ai-chips" id="ai-chips">
            {[
              "How much should I save from a $2,500 salary?",
              "Should I pay debt first or invest first?",
              "How much can I spend this week?"
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                className="ai-chip"
                onClick={() => {
                  askQuestion(chip);
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          <div id="ai-chat-log" className="ai-chat-log" aria-live="polite">
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`ai-message ${message.role}`}>
                <span className="ai-avatar">{message.role === "user" ? "You" : "AI"}</span>
                <p>{message.text}</p>
              </article>
            ))}
          </div>

          <form
            id="ai-chat-form"
            className="ai-chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              askQuestion(question);
              setQuestion("");
            }}
          >
            <label className="sr-only" htmlFor="ai-question">
              Ask finance AI
            </label>
            <input
              id="ai-question"
              type="text"
              maxLength="280"
              placeholder="Ask about budgeting, saving, debt, investing..."
              required
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button className="btn-primary" type="submit">
              Ask AI
            </button>
          </form>
        </article>
      </section>
    </section>
  );
}
