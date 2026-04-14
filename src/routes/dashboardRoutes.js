const express = require("express");
const PDFDocument = require("pdfkit");
const { get, all, run } = require("../db/query");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/overview", authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await get(
      "SELECT id, name, email, theme, currency_code, xp, level, streak_days FROM users WHERE id = ?",
      [userId]
    );
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const goals = await all(
      `
        SELECT id, title, target_amount, current_amount, due_date, badge
        FROM savings_goals
        WHERE user_id = ?
        ORDER BY id DESC
      `,
      [userId]
    );

    const transactions = await all(
      `
        SELECT id, description, amount, type, created_at
        FROM transactions
        WHERE user_id = ?
        ORDER BY datetime(created_at) DESC
        LIMIT 8
      `,
      [userId]
    );

    const totals = await get(
      `
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense,
          COALESCE(SUM(CASE WHEN type = 'saving' THEN amount ELSE 0 END), 0) AS saving
        FROM transactions
        WHERE user_id = ?
      `,
      [userId]
    );

    const savingsProgress = goals.map((goal) => ({
      ...goal,
      progressPct: Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
    }));

    const incomeTotal = Number(totals.income || 0);
    const expenseTotal = Number(totals.expense || 0);
    const savingTotal = Number(totals.saving || 0);
    const balanceTotal = incomeTotal + expenseTotal;
    const effectiveSaving = savingTotal !== 0 ? savingTotal : Math.max(0, balanceTotal);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        theme: user.theme || "dark",
        currencyCode: user.currency_code || "INR",
        xp: user.xp,
        level: user.level,
        streakDays: user.streak_days
      },
      summary: {
        income: incomeTotal,
        expense: Math.abs(expenseTotal),
        saving: effectiveSaving,
        balance: balanceTotal
      },
      goals: savingsProgress,
      recentTransactions: transactions
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch dashboard data.", details: error.message });
  }
});

router.get("/transactions", authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;
    const transactions = await all(
      `
        SELECT id, description, amount, type, created_at
        FROM transactions
        WHERE user_id = ?
        ORDER BY datetime(created_at) DESC
      `,
      [userId]
    );

    return res.json({ transactions });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch transactions.", details: error.message });
  }
});

router.get("/analytics", authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;

    const totals = await get(
      `
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense,
          COALESCE(SUM(CASE WHEN type = 'saving' THEN amount ELSE 0 END), 0) AS saving
        FROM transactions
        WHERE user_id = ?
      `,
      [userId]
    );

    const categoryRows = await all(
      `
        SELECT COALESCE(category, 'General') AS category, SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE amount END) AS total
        FROM transactions
        WHERE user_id = ?
        GROUP BY COALESCE(category, 'General')
        ORDER BY total DESC
      `,
      [userId]
    );

    const monthlyRows = await all(
      `
        SELECT substr(created_at, 1, 7) AS month, SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE amount END) AS total
        FROM transactions
        WHERE user_id = ?
        GROUP BY substr(created_at, 1, 7)
        ORDER BY month DESC
        LIMIT 6
      `,
      [userId]
    );

    const budgets = await all(
      `
        SELECT id, category, limit_amount, period, created_at
        FROM budgets
        WHERE user_id = ?
        ORDER BY datetime(created_at) DESC
      `,
      [userId]
    );

    return res.json({
      totals: {
        income: Number(totals.income || 0),
        expense: Math.abs(Number(totals.expense || 0)),
        saving: Number(totals.saving || 0)
      },
      categoryBreakdown: categoryRows,
      monthlyTrend: monthlyRows.reverse(),
      budgets
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load analytics.", details: error.message });
  }
});

router.get("/budgets", authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;
    const budgets = await all(
      `
        SELECT id, category, limit_amount, period, created_at
        FROM budgets
        WHERE user_id = ?
        ORDER BY datetime(created_at) DESC
      `,
      [userId]
    );

    const totals = await all(
      `
        SELECT COALESCE(category, 'General') AS category, SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE amount END) AS spent
        FROM transactions
        WHERE user_id = ?
        GROUP BY COALESCE(category, 'General')
      `,
      [userId]
    );

    const spentMap = totals.reduce((acc, row) => {
      acc[row.category] = Number(row.spent || 0);
      return acc;
    }, {});

    return res.json({
      budgets: budgets.map((budget) => ({
        ...budget,
        spent: spentMap[budget.category] || 0,
        remaining: Math.max(0, Number(budget.limit_amount || 0) - (spentMap[budget.category] || 0)),
        progressPct: Math.min(100, Math.round(((spentMap[budget.category] || 0) / Number(budget.limit_amount || 1)) * 100))
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch budgets.", details: error.message });
  }
});

router.post("/budgets", authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;
    const category = String(req.body.category || "").trim();
    const limitAmount = Number(req.body.limitAmount);
    const period = String(req.body.period || "monthly").trim();

    if (!category) {
      return res.status(400).json({ message: "Category is required." });
    }

    if (!Number.isFinite(limitAmount) || limitAmount <= 0) {
      return res.status(400).json({ message: "Limit amount must be greater than 0." });
    }

    await run(
      `
        INSERT INTO budgets (user_id, category, limit_amount, period)
        VALUES (?, ?, ?, ?)
      `,
      [userId, category, limitAmount, period || "monthly"]
    );

    return res.status(201).json({ message: "Budget created successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create budget.", details: error.message });
  }
});

router.get("/export/transactions", authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;
    const format = String(req.query.format || "csv").toLowerCase();
    const transactions = await all(
      `
        SELECT description, amount, type, category, notes, is_recurring, recurrence_pattern, created_at
        FROM transactions
        WHERE user_id = ?
        ORDER BY datetime(created_at) DESC
      `,
      [userId]
    );

    if (format === "pdf") {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const filename = `transactions-${Date.now()}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

      doc.pipe(res);
      doc.fontSize(18).text("PRIME Finance - Transactions Export", { align: "left" });
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor("#666").text(`Generated at: ${new Date().toLocaleString()}`);
      doc.moveDown(1);
      doc.fillColor("#000");

      if (!transactions.length) {
        doc.fontSize(12).text("No transactions found.");
      } else {
        transactions.forEach((transaction, index) => {
          const amount = Number(transaction.amount || 0);
          const line = `${index + 1}. ${transaction.created_at || ""} | ${transaction.type || ""} | ${amount.toFixed(2)} | ${
            transaction.category || "General"
          } | ${transaction.description || ""}`;
          doc.fontSize(10).text(line, { lineGap: 2 });
        });
      }

      doc.end();
      return;
    }

    if (format !== "csv") {
      return res.status(400).json({ message: "Supported formats are csv and pdf." });
    }

    const rows = [
      ["Description", "Amount", "Type", "Category", "Notes", "Recurring", "Pattern", "Date"].join(",")
    ];

    transactions.forEach((transaction) => {
      const values = [
        transaction.description,
        transaction.amount,
        transaction.type,
        transaction.category || "",
        transaction.notes || "",
        transaction.is_recurring ? "Yes" : "No",
        transaction.recurrence_pattern || "",
        transaction.created_at
      ].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`);
      rows.push(values.join(","));
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=transactions-${Date.now()}.csv`);
    return res.send(rows.join("\n"));
  } catch (error) {
    return res.status(500).json({ message: "Failed to export transactions.", details: error.message });
  }
});

router.post("/assistant/advice", authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;
    const question = String(req.body.question || "").trim();

    const totals = await get(
      `
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense,
          COALESCE(SUM(CASE WHEN type = 'saving' THEN amount ELSE 0 END), 0) AS saving
        FROM transactions
        WHERE user_id = ?
      `,
      [userId]
    );

    const topCategory = await get(
      `
        SELECT COALESCE(category, 'General') AS category, SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS spent
        FROM transactions
        WHERE user_id = ?
        GROUP BY COALESCE(category, 'General')
        ORDER BY spent DESC
        LIMIT 1
      `,
      [userId]
    );

    const recentTransactions = await all(
      `
        SELECT description, amount, type, category, created_at
        FROM transactions
        WHERE user_id = ?
        ORDER BY datetime(created_at) DESC
        LIMIT 5
      `,
      [userId]
    );

    const income = Number(totals?.income || 0);
    const expense = Math.abs(Number(totals?.expense || 0));
    const saving = Number(totals?.saving || 0);
    const remaining = income - expense;
    const safeIncome = income > 0 ? income : Math.max(1000, expense + 500);
    const suggestedSavings = safeIncome * 0.2;
    const suggestedWants = safeIncome * 0.3;
    const weeklyCap = suggestedWants / 4;
    const topCategoryName = topCategory?.category || "General";
    const topCategorySpend = Number(topCategory?.spent || 0);

    const q = question.toLowerCase();
    const formatInr = (value) => `INR ${Math.round(value).toLocaleString("en-IN")}`;
    const questionSeed = `${question}|${topCategoryName}|${income}|${expense}|${saving}`;
    const hash = [...questionSeed].reduce((acc, char) => ((acc * 31 + char.charCodeAt(0)) >>> 0), 17);
    const pick = (options, shift = 0) => options[(hash + shift) % options.length];

    const recentHighlights = recentTransactions
      .slice(0, 3)
      .map((txn) => String(txn.description || txn.category || "transaction").split("|").pop().trim())
      .filter(Boolean);

    let intent = "general";
    if (/(debt|loan|credit card|card bill|emi)/.test(q)) intent = "debt";
    else if (/(invest|stock|etf|mutual|sip)/.test(q)) intent = "invest";
    else if (/(save|saving|emergency|future|retire)/.test(q)) intent = "save";
    else if (/(budget|spend|expense|cut cost|overspend)/.test(q)) intent = "spend";

    const baseline = [
      `Snapshot: income ${formatInr(income)}, expense ${formatInr(expense)}, savings ${formatInr(saving)}.`,
      `Your top spend area is ${topCategoryName} at ${formatInr(topCategorySpend)}.`,
      `A healthy monthly savings baseline for your profile is ${formatInr(suggestedSavings)}.`
    ].join(" ");

    const positiveTrend = remaining >= 0;

    const intentAdvice = {
      spend: [
        `For spending control, cap flexible spending to about ${formatInr(weeklyCap)} per week and add a mid-week check-in.`,
        `Run a 7-day trim: reduce ${topCategoryName} by 12% this week and redirect that cash to savings.`,
        `Use a simple rule: if a non-essential item is above ${formatInr(Math.max(200, weeklyCap * 0.18))}, wait 24 hours before purchase.`
      ],
      save: [
        `Set an auto-transfer of ${formatInr(Math.max(500, suggestedSavings * 0.6))} right after payday to make savings automatic.`,
        `Build an emergency buffer toward ${formatInr(safeIncome * 3)} first, then scale toward 6 months of expenses.`,
        `Try a weekly mini-goal: move ${formatInr(Math.max(250, suggestedSavings / 4))} every Friday to your savings bucket.`
      ],
      invest: [
        `If debt is manageable, route ${formatInr(suggestedSavings * 0.65)} monthly to diversified index investing and keep ${formatInr(
          suggestedSavings * 0.35
        )} liquid for short-term goals.`,
        `Start with a steady SIP-style plan: ${formatInr(Math.max(500, suggestedSavings * 0.5))} monthly, then increase 10% every quarter.`,
        `Prioritize consistency over timing: invest on fixed dates and avoid pausing unless emergency cash drops below target.`
      ],
      debt: [
        `Debt plan: pay minimums everywhere, then direct ${formatInr(Math.max(500, suggestedSavings * 0.7))} toward the highest-interest balance.`,
        `Use the avalanche strategy this month and keep one small auto-save of ${formatInr(Math.max(200, suggestedSavings * 0.2))} alive for stability.`,
        `If card utilization is high, target a 5-8% principal reduction in the next 30 days to lower interest pressure.`
      ],
      general: [
        `Keep your money flow simple: needs first, controlled wants, and automate savings before discretionary spending.`,
        `Track only 3 numbers weekly: total spend, top category, and amount transferred to savings.`,
        `For faster progress, keep a no-spend block of 2 days each week and review your results every Sunday.`
      ]
    };

    const trendLine = positiveTrend
      ? pick([
          `You have positive monthly runway of ${formatInr(remaining)}.`,
          `Current cashflow leaves about ${formatInr(remaining)} after expenses.`,
          `Nice momentum: you are not overspending this cycle, with ${formatInr(remaining)} left.`
        ], 1)
      : pick([
          `You are currently overspending by about ${formatInr(Math.abs(remaining))}.`,
          `Your plan needs a reset: spending is ahead of income by ${formatInr(Math.abs(remaining))}.`,
          `Alert: net cashflow is negative by ${formatInr(Math.abs(remaining))} this cycle.`
        ], 2);

    const activityLine = recentHighlights.length
      ? `Recent activity to monitor: ${recentHighlights.join(", ")}.`
      : "Add a few categorized transactions to unlock more precise, history-based coaching.";

    let directAnswer = "";

    if (intent === "invest") {
      const monthlyInvest = Math.max(500, suggestedSavings * 0.65);
      directAnswer = [
        `Direct answer: start investing ${formatInr(monthlyInvest)} per month in a simple diversified mix.`,
        `Suggested split: 70% broad index fund/ETF, 20% short-term debt fund, 10% gold ETF.`,
        `If you are new, automate it monthly and increase the amount by 10% every 3 months.`
      ].join(" ");
    } else if (intent === "save") {
      directAnswer = [
        `Direct answer: save at least ${formatInr(suggestedSavings)} per month from your current cashflow.`,
        `Set auto-transfer on salary day and keep 3 to 6 months of expenses as emergency cash.`
      ].join(" ");
    } else if (intent === "debt") {
      directAnswer = [
        `Direct answer: clear high-interest debt first while continuing a small savings habit.`,
        `Pay minimums on all debts, then put extra money toward the highest-interest one.`
      ].join(" ");
    } else if (intent === "spend") {
      directAnswer = [
        `Direct answer: keep discretionary spending near ${formatInr(weeklyCap)} per week.`,
        `Trim your top category (${topCategoryName}) by about 10-15% this month.`
      ].join(" ");
    } else {
      directAnswer = "Direct answer: use a simple 50/30/20 approach and automate savings before discretionary spending.";
    }

    const advice = [directAnswer, trendLine, baseline, pick(intentAdvice[intent], 3), activityLine].join(" ");

    return res.json({
      advice,
      summary: {
        income,
        expense,
        saving,
        remaining,
        topCategory: topCategoryName,
        topCategorySpend,
        weeklyCap,
        recentTransactions
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to generate assistant advice.", details: error.message });
  }
});

router.get("/reminders", authRequired, async (req, res) => {
  try {
    const reminders = await all(
      `
        SELECT id, title, reminder_date, notes, is_done, created_at
        FROM reminders
        WHERE user_id = ?
        ORDER BY datetime(reminder_date) ASC
      `,
      [req.user.userId]
    );

    return res.json({ reminders });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load reminders.", details: error.message });
  }
});

router.post("/reminders", authRequired, async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const reminderDate = String(req.body.reminderDate || "").trim();
    const notes = String(req.body.notes || "").trim();

    if (!title || !reminderDate) {
      return res.status(400).json({ message: "Title and reminder date are required." });
    }

    await run(
      `
        INSERT INTO reminders (user_id, title, reminder_date, notes)
        VALUES (?, ?, ?, ?)
      `,
      [req.user.userId, title, reminderDate, notes]
    );

    return res.status(201).json({ message: "Reminder created successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create reminder.", details: error.message });
  }
});

router.patch("/reminders/:id", authRequired, async (req, res) => {
  try {
    const reminderId = Number(req.params.id);
    const isDone = req.body.isDone ? 1 : 0;

    await run(
      `
        UPDATE reminders
        SET is_done = ?
        WHERE id = ? AND user_id = ?
      `,
      [isDone, reminderId, req.user.userId]
    );

    return res.json({ message: "Reminder updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update reminder.", details: error.message });
  }
});

router.post("/transactions", authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;
    const description = String(req.body.description || "").trim();
    const category = String(req.body.category || "General").trim();
    const notes = String(req.body.notes || "").trim();
    const rawType = String(req.body.type || "expense").toLowerCase();
    const date = String(req.body.date || "").trim();
    const amount = Number(req.body.amount);
    const isRecurring = req.body.isRecurring ? 1 : 0;
    const recurrencePattern = String(req.body.recurrencePattern || "").trim();

    if (!description) {
      return res.status(400).json({ message: "Description is required." });
    }

    if (!["income", "expense"].includes(rawType)) {
      return res.status(400).json({ message: "Type must be income or expense." });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number." });
    }

    const storedAmount = rawType === "expense" ? -Math.abs(amount) : Math.abs(amount);
    const finalDescription = [category, description, notes].filter(Boolean).join(" | ");
    const createdAt = date ? `${date}T12:00:00` : new Date().toISOString();

    await run(
      `
        INSERT INTO transactions (user_id, description, amount, type, category, notes, is_recurring, recurrence_pattern, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [userId, finalDescription, storedAmount, rawType, category, notes, isRecurring, isRecurring ? recurrencePattern || null : null, createdAt]
    );

    await run(
      `
        UPDATE users
        SET xp = xp + 3
        WHERE id = ?
      `,
      [userId]
    );

    return res.status(201).json({ message: "Transaction added successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add transaction.", details: error.message });
  }
});

router.get("/goals", authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;
    const goals = await all(
      `
        SELECT id, title, target_amount, current_amount, due_date, badge
        FROM savings_goals
        WHERE user_id = ?
        ORDER BY id DESC
      `,
      [userId]
    );

    const mapped = goals.map((goal) => ({
      ...goal,
      progressPct: Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
    }));

    return res.json({ goals: mapped });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch goals.", details: error.message });
  }
});

router.post("/goals", authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;
    const title = String(req.body.title || "").trim();
    const targetAmount = Number(req.body.targetAmount);
    const currentAmount = Number(req.body.currentAmount || 0);
    const dueDate = String(req.body.dueDate || "").trim();
    const badge = String(req.body.badge || "Rising Saver").trim();

    if (!title) {
      return res.status(400).json({ message: "Goal title is required." });
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return res.status(400).json({ message: "Target amount must be greater than 0." });
    }

    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      return res.status(400).json({ message: "Current amount cannot be negative." });
    }

    const safeCurrentAmount = Math.min(currentAmount, targetAmount);
    const normalizedDueDate = dueDate || null;

    await run(
      `
        INSERT INTO savings_goals (user_id, title, target_amount, current_amount, due_date, badge)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [userId, title, targetAmount, safeCurrentAmount, normalizedDueDate, badge || "Rising Saver"]
    );

    await run(
      `
        UPDATE users
        SET xp = xp + 8
        WHERE id = ?
      `,
      [userId]
    );

    return res.status(201).json({ message: "Goal created successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create goal.", details: error.message });
  }
});

router.post("/goals/:id/add-money", authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;
    const goalId = Number(req.params.id);
    const amount = Number(req.body.amount);

    if (!Number.isInteger(goalId) || goalId <= 0) {
      return res.status(400).json({ message: "Invalid goal id." });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number." });
    }

    const goal = await get(
      `
        SELECT id, title, target_amount, current_amount
        FROM savings_goals
        WHERE id = ? AND user_id = ?
      `,
      [goalId, userId]
    );

    if (!goal) {
      return res.status(404).json({ message: "Goal not found." });
    }

    const updatedCurrent = Math.min(Number(goal.current_amount || 0) + amount, Number(goal.target_amount || 0));
    const addedAmount = updatedCurrent - Number(goal.current_amount || 0);

    if (addedAmount <= 0) {
      return res.status(400).json({ message: "Nothing to add to this goal." });
    }

    await run(
      `
        UPDATE savings_goals
        SET current_amount = ?
        WHERE id = ? AND user_id = ?
      `,
      [updatedCurrent, goalId, userId]
    );

    await run(
      `
        INSERT INTO transactions (user_id, description, amount, type)
        VALUES (?, ?, ?, 'saving')
      `,
      [userId, `Goal top-up | ${goal.title}`, addedAmount]
    );

    await run(
      `
        UPDATE users
        SET xp = xp + 4
        WHERE id = ?
      `,
      [userId]
    );

    return res.json({
      message: "Money added to goal successfully.",
      goal: {
        id: goalId,
        current_amount: updatedCurrent,
        target_amount: goal.target_amount,
        progressPct: Math.min(100, Math.round((updatedCurrent / goal.target_amount) * 100))
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add money to goal.", details: error.message });
  }
});

router.post("/deposit", authRequired, async (req, res) => {
  try {
    const userId = req.user.userId;
    const description = String(req.body.description || "Deposit").trim();
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number." });
    }

    await run(
      `
        INSERT INTO transactions (user_id, description, amount, type)
        VALUES (?, ?, ?, 'income')
      `,
      [userId, description || "Deposit", amount]
    );

    await run(
      `
        UPDATE users
        SET xp = xp + 5
        WHERE id = ?
      `,
      [userId]
    );

    return res.status(201).json({ message: "Deposit added successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add deposit.", details: error.message });
  }
});

module.exports = router;
