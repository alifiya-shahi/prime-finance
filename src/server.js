require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();
const port = process.env.PORT || 4000;

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is missing. Set it in your .env file before production use.");
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);

const frontendDistPath = path.join(__dirname, "..", "frontend", "dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

app.use(express.static(frontendDistPath));

app.get("/", (req, res) => {
  if (!hasFrontendBuild) {
    res.status(500).json({
      message: "Frontend build not found. Run `npm run client:build` before starting the server."
    });
    return;
  }

  res.sendFile(frontendIndexPath);
});

app.get(/^\/(?!api).*/, (req, res) => {
  if (!hasFrontendBuild) {
    res.status(500).json({
      message: "Frontend build not found. Run `npm run client:build` before starting the server."
    });
    return;
  }

  res.sendFile(frontendIndexPath);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
