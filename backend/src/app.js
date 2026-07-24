const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const redis = require("./config/redis");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const { redirectLink } = require("./controllers/linkController");

const app = express();

app.use(helmet());
app.use(morgan("dev"));
// TODO: Restrict cors origin to frontend URL once frontend is built
app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.get("/health", (req, res) => {
  const redisStatus = redis ? redis.status : "not configured";
  res.json({ status: "ok", uptime: process.uptime(), redis: redisStatus });
});

app.get("/", (req, res) => {
  res.json({ message: "LinkPulse API running 🚀" });
});

app.get("/:shortCode", redirectLink);

app.use(errorHandler);

if (redis) {
  const shutdown = async (signal) => {
    console.log(`${signal} received — closing Redis connection`);
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = app;
