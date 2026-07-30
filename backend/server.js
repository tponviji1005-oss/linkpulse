require("dotenv").config();

const app = require("./src/app");
const { connectRedis, disconnectRedis } = require("./src/lib/redis");

const PORT = process.env.PORT || 5000;

if (!process.env.PORT) {
  console.warn("PORT not set in .env — defaulting to 5000");
}

async function startServer() {
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT} [${process.env.NODE_ENV}]`);
  });
}

startServer().catch((err) => {
  console.error("Server startup failed:", err.message);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received — shutting down gracefully");
  await disconnectRedis();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received — shutting down gracefully");
  await disconnectRedis();
  process.exit(0);
});
