import express from "express";
import cors from "cors";
import os from "node:os";
import process from "node:process";
import "dotenv/config";

const app = express();

const PORT = Number(process.env.PORT) || 4100;
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const startedAt = new Date();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

// Request timing middleware
app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(2)}ms`,
    );
  });

  next();
});

// Health check
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

// System metrics
app.get("/api/metrics", (_req, res) => {
  const memory = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();

  res.json({
    ok: true,
    time: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    cpu: {
      cores: os.cpus().length,
      loadAverage: os.loadavg(),
    },
    memory: {
      processRssMB: +(memory.rss / 1024 / 1024).toFixed(2),
      heapUsedMB: +(memory.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: +(memory.heapTotal / 1024 / 1024).toFixed(2),
      systemTotalMB: +(totalMemory / 1024 / 1024).toFixed(2),
      systemFreeMB: +(freeMemory / 1024 / 1024).toFixed(2),
      systemUsedPercent: +(
        ((totalMemory - freeMemory) / totalMemory) *
        100
      ).toFixed(2),
    },
  });
});

// GET echo
app.get("/api/echo", (req, res) => {
  res.json({
    ok: true,
    method: req.method,
    query: req.query,
    body: req.body ?? null,
    headers: {
      userAgent: req.headers["user-agent"] ?? null,
      forwardedFor: req.headers["x-forwarded-for"] ?? null,
      contentType: req.headers["content-type"] ?? null,
    },
    time: new Date().toISOString(),
  });
});

// POST echo
app.post("/api/echo", (req, res) => {
  res.json({
    ok: true,
    received: req.body ?? null,
    host: "NodePanel",
    method: req.method,
    query: req.query,
    time: new Date().toISOString(),
  });
});

// API information
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "NodePanel API",
    version: "1.1.0",
    endpoints: ["/api/health", "/api/metrics", "/api/echo"],
  });
});

// Invalid JSON error handler
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      ok: false,
      error: "Invalid JSON request body",
    });
  }

  console.error("Request error:", err);

  res.status(500).json({
    ok: false,
    error: "Internal server error",
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    error: "Not found",
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`NodePanel API listening on http://${HOST}:${PORT}`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`${signal} received. Closing server...`);

  server.close((err) => {
    if (err) {
      console.error("Shutdown error:", err);
      process.exitCode = 1;
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
