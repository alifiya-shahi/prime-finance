import { useMemo, useRef, useState } from "react";
import { ThemeToggleButton, useShellData } from "../components/AppShellLayout";
import DashboardVariantTabs from "../components/DashboardVariantTabs";
import { formatCurrency } from "../lib/format";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildActivityPath(coords) {
  if (!coords.length) {
    return "M0 24 C12 22, 24 20, 36 18 C50 15, 68 12, 100 8";
  }

  if (coords.length === 1) {
    return `M0 ${coords[0].y} L100 ${coords[0].y}`;
  }

  const step = 100 / Math.max(coords.length - 1, 1);
  let path = `M${coords[0].x} ${coords[0].y}`;

  for (let i = 1; i < coords.length; i += 1) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const c1x = Number((prev.x + step * 0.45).toFixed(2));
    const c2x = Number((curr.x - step * 0.45).toFixed(2));
    path += ` C${c1x} ${prev.y}, ${c2x} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  return path;
}

function buildGraphPoints(transactions) {
  const points = (transactions || []).slice(-8);
  if (!points.length) {
    return [];
  }

  const amounts = points.map((txn) => Number(txn.amount || 0));
  const maxAmount = Math.max(...amounts.map((amount) => Math.abs(amount)), 1);
  const step = 100 / Math.max(points.length - 1, 1);

  return points.map((txn, index) => {
    const x = Number((index * step).toFixed(2));
    const ratio = clamp(Number(txn.amount || 0) / maxAmount, -1, 1);
    const y = Number((16 - ratio * 10.8).toFixed(2));
    return { x, y, txn };
  });
}

function categorizeSpending(txn) {
  const text = String(txn.description || "").toLowerCase();
  if (/(restaurant|food|grocery|cafe|coffee|meal)/.test(text)) return "food";
  if (/(uber|taxi|bus|flight|train|travel|trip|fuel|gas)/.test(text)) return "travel";
  if (/(movie|netflix|game|music|fun|entertainment|party)/.test(text)) return "entertainment";
  return "business";
}

export default function DashboardPage() {
  const { overview, logout, goDeposit } = useShellData();
  const graphWrapRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, left: 0, top: 0, html: "" });

  const recentTransactions = overview?.recentTransactions || [];
  const goals = overview?.goals || [];
  const summary = overview?.summary || {};
  const user = overview?.user || {};

  const balance = Number(summary.balance || 0);
  const income = Number(summary.income || 0);
  const expense = Number(summary.expense || 0);
  const saving = Number(summary.saving || 0);
  const monthlyGrowthValue = income - expense;
  const monthlyGrowthPct = balance > 0 ? ((monthlyGrowthValue / balance) * 100).toFixed(1) : "0.0";

  const points = useMemo(() => buildGraphPoints(recentTransactions), [recentTransactions]);
  const graphPath = useMemo(() => buildActivityPath(points), [points]);
  const graphLabels = useMemo(() => {
    if (!points.length) {
      return [];
    }

    const indexSet = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);
    return [...indexSet]
      .map((index) => points[index])
      .sort((a, b) => a.x - b.x)
      .map((point) => ({
        x: point.x,
        label: new Date(point.txn.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      }));
  }, [points]);

  const spendTotals = useMemo(() => {
    const totals = { food: 0, travel: 0, entertainment: 0, business: 0 };

    recentTransactions.forEach((txn) => {
      const amount = Number(txn.amount || 0);
      if (amount >= 0) return;
      totals[categorizeSpending(txn)] += Math.abs(amount);
    });

    const realTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);
    const fallbackTotal = Math.max(1, Number(expense || 0));

    if (realTotal <= 0) {
      totals.food = fallbackTotal * 0.35;
      totals.travel = fallbackTotal * 0.25;
      totals.entertainment = fallbackTotal * 0.22;
      totals.business = fallbackTotal * 0.18;
    }

    return totals;
  }, [recentTransactions, expense]);

  const donutStyles = useMemo(() => {
    const circleLength = 2 * Math.PI * 18;
    const keys = ["food", "travel", "entertainment", "business"];
    const total = Object.values(spendTotals).reduce((sum, value) => sum + value, 0) || 1;
    let offset = 0;

    return keys.reduce((acc, key) => {
      const ratio = spendTotals[key] / total;
      const dash = Math.max(3, ratio * circleLength);
      acc[key] = {
        strokeDasharray: `${dash.toFixed(2)} ${(circleLength - dash).toFixed(2)}`,
        strokeDashoffset: `${(-offset).toFixed(2)}`
      };
      offset += dash;
      return acc;
    }, {});
  }, [spendTotals]);

  const onDotMove = (txn, event) => {
    const wrap = graphWrapRef.current;
    if (!wrap) return;

    const bounds = wrap.getBoundingClientRect();
    const amount = Number(txn.amount || 0);
    const signedAmount = amount < 0 ? `-${formatCurrency(Math.abs(amount))}` : `+${formatCurrency(amount)}`;
    const txnDate = new Date(txn.created_at).toLocaleDateString();

    setTooltip({
      visible: true,
      left: clamp(event.clientX - bounds.left + 12, 8, bounds.width - 190),
      top: clamp(event.clientY - bounds.top - 38, 8, bounds.height - 52),
      html: `<strong>${txn.description}</strong><span>${signedAmount} | ${txnDate}</span>`
    });
  };

  return (
    <section className="main-pane dashboard-main-pane">
      <header className="topbar">
        <div>
          <h2>Dashboard</h2>
          <p id="streak-pill">Welcome back</p>
        </div>
        <div className="topbar-actions">
          <ThemeToggleButton />
          <input type="search" placeholder="Search..." />
          <button id="deposit-btn" className="btn-ghost" type="button" onClick={goDeposit}>
            + Deposit
          </button>
          <button id="logout-btn" className="btn-danger" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <DashboardVariantTabs />

      <section className="savvy-layout-grid">
        <article className="savvy-balance-card">
          <div className="savvy-balance-head">
            <div>
              <p className="savvy-kicker">Total Balance</p>
              <p className="savvy-sub">Activity Graph</p>
              <h3 id="balance-value">{formatCurrency(balance)}</h3>
              <div className="savvy-growth-row">
                <span id="income-value">+{formatCurrency(Math.max(0, monthlyGrowthValue))} ({monthlyGrowthPct}%)</span>
                <span id="success-rate">Last 30 days</span>
              </div>
            </div>
            <div className="savvy-chart-icons">
              <span>View</span>
              <span>Sync</span>
            </div>
          </div>

          <div
            className="savvy-chart-area"
            id="activity-graph-wrap"
            aria-label="Activity graph"
            ref={graphWrapRef}
            onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
          >
            <svg className="savvy-chart-line" viewBox="0 0 100 32" preserveAspectRatio="none">
              <defs>
                <linearGradient id="activity-fill-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.34"></stop>
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
              <path id="activity-graph-fill" d={`${graphPath} L100 31 L0 31 Z`}></path>
              <path id="activity-graph-path" d={graphPath}></path>
              <g id="activity-graph-points">
                {points.map((point, index) => (
                  <circle
                    key={`${point.txn.id || point.txn.created_at}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r="0.9"
                    className={`activity-point ${Number(point.txn.amount || 0) >= 0 ? "income" : "expense"}`}
                    onMouseEnter={(event) => onDotMove(point.txn, event)}
                    onMouseMove={(event) => onDotMove(point.txn, event)}
                    onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
                  >
                    <title>{`${point.txn.description} | ${formatCurrency(point.txn.amount || 0)}`}</title>
                  </circle>
                ))}
              </g>
            </svg>
            <div
              id="activity-graph-tooltip"
              className={`graph-tooltip${tooltip.visible ? "" : " hidden"}`}
              style={{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }}
              dangerouslySetInnerHTML={{ __html: tooltip.html }}
            ></div>
            <div className="activity-axis-labels" aria-hidden="true">
              {graphLabels.map((item) => (
                <span key={`${item.x}-${item.label}`} style={{ left: `${item.x}%` }}>
                  {item.label}
                </span>
              ))}
            </div>
          </div>

        </article>

        <div className="savvy-side-stack">
          <article className="savvy-card">
            <h3>Spending Overview</h3>
            <div className="spending-donut-wrap">
              <svg className="spending-donut" viewBox="0 0 48 48" aria-hidden="true">
                <circle className="donut-track" cx="24" cy="24" r="18"></circle>
                <circle id="spend-seg-food" className="donut-segment food" cx="24" cy="24" r="18" style={donutStyles.food}></circle>
                <circle id="spend-seg-travel" className="donut-segment travel" cx="24" cy="24" r="18" style={donutStyles.travel}></circle>
                <circle
                  id="spend-seg-entertainment"
                  className="donut-segment entertainment"
                  cx="24"
                  cy="24"
                  r="18"
                  style={donutStyles.entertainment}
                ></circle>
                <circle
                  id="spend-seg-business"
                  className="donut-segment business"
                  cx="24"
                  cy="24"
                  r="18"
                  style={donutStyles.business}
                ></circle>
              </svg>
            </div>

            <div className="spending-legend-list">
              <div className="spending-legend-item">
                <span className="dot food"></span>
                <span>Food</span>
                <strong id="spend-food-value">{formatCurrency(spendTotals.food)}</strong>
              </div>
              <div className="spending-legend-item">
                <span className="dot travel"></span>
                <span>Travel</span>
                <strong id="spend-travel-value">{formatCurrency(spendTotals.travel)}</strong>
              </div>
              <div className="spending-legend-item">
                <span className="dot entertainment"></span>
                <span>Entertainment</span>
                <strong id="spend-entertainment-value">{formatCurrency(spendTotals.entertainment)}</strong>
              </div>
              <div className="spending-legend-item">
                <span className="dot business"></span>
                <span>Business</span>
                <strong id="spend-business-value">{formatCurrency(spendTotals.business)}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="savvy-bottom-grid">
        <article className="transactions-panel">
          <h3>Recent Activity</h3>
          <ul id="transactions-list" className="transactions-list">
            {recentTransactions.length === 0 && <div className="empty-state">No transactions yet.</div>}
            {recentTransactions.slice(0, 6).map((txn) => {
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
        </article>
      </section>
    </section>
  );
}
