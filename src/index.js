import express from "express";
import cors from "cors";
import os from "node:os";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 4100;
const HOST = process.env.HOST || "0.0.0.0";

// In production, set CORS_ORIGIN to your deployed frontend URL.
// Defaults to "*" so this test project works from anywhere.
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const startedAt = new Date();

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    message: "Node server is up",
    time: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: startedAt.toISOString(),
    node: process.version,
    host: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    env: process.env.NODE_ENV || "development",
  });
});

app.get("/api/echo", (req, res) => {
  res.json({
    ok: true,
    method: req.method,
    query: req.query,
    body: req.body ?? null,
    headers: {
      "user-agent": req.headers["user-agent"],
      "x-forwarded-for": req.headers["x-forwarded-for"] ?? null,
    },
  });
});

app.post("/api/echo", (req, res) => {
  res.json({
    ok: true,
    received: req.body ?? null,
    host: "NodePanel",
    method: req.method,
  });
});

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "server",
    endpoints: ["/api/health", "/api/echo"],
  });
});

app.use((_req, res) => res.status(404).json({ ok: false, error: "Not found" }));

app.listen(PORT, HOST, () => {
  console.log(`API server listening on http://${HOST}:${PORT}`);
});
