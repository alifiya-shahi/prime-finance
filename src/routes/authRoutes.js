const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { get, run } = require("../db/query");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and password are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existing = await get("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      `
        INSERT INTO users (name, email, password_hash, theme, currency_code, xp, level, streak_days)
        VALUES (?, ?, ?, 'dark', 'INR', 0, 1, 0)
      `,
      [name, email.toLowerCase(), passwordHash]
    );

    const token = jwt.sign({ userId: result.lastID, email: email.toLowerCase() }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    return res.status(201).json({
      token,
      user: {
        id: result.lastID,
        name,
        email: email.toLowerCase(),
        theme: "dark",
        currencyCode: "INR"
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed.", details: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const user = await get(
      "SELECT id, name, email, password_hash, theme, currency_code, xp, level, streak_days FROM users WHERE email = ?",
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        theme: user.theme || "dark",
        currencyCode: user.currency_code || "INR",
        xp: user.xp,
        level: user.level,
        streakDays: user.streak_days
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed.", details: error.message });
  }
});

router.get("/me", authRequired, async (req, res) => {
  try {
    const user = await get(
      "SELECT id, name, email, theme, currency_code, xp, level, streak_days, created_at FROM users WHERE id = ?",
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      theme: user.theme || "dark",
      currencyCode: user.currency_code || "INR",
      xp: user.xp,
      level: user.level,
      streakDays: user.streak_days,
      createdAt: user.created_at
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not load profile.", details: error.message });
  }
});

router.post("/password", authRequired, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    const user = await get("SELECT id, password_hash FROM users WHERE id = ?", [req.user.userId]);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await run("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, user.id]);

    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Could not update password.", details: error.message });
  }
});

router.put("/preferences", authRequired, async (req, res) => {
  try {
    const theme = req.body.theme === "light" ? "light" : "dark";
    const currencyCode = String(req.body.currencyCode || "INR").toUpperCase();

    await run(
      `
        UPDATE users
        SET theme = ?, currency_code = ?
        WHERE id = ?
      `,
      [theme, currencyCode, req.user.userId]
    );

    const user = await get(
      "SELECT id, name, email, theme, currency_code, xp, level, streak_days, created_at FROM users WHERE id = ?",
      [req.user.userId]
    );

    return res.json({
      message: "Preferences updated successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        theme: user.theme || "dark",
        currencyCode: user.currency_code || "INR",
        xp: user.xp,
        level: user.level,
        streakDays: user.streak_days,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not update preferences.", details: error.message });
  }
});

module.exports = router;
