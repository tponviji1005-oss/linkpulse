require("dotenv").config();

const app = require("./src/app");
const redis = require("./src/config/redis");

const PORT = process.env.PORT || 5000;

if (!process.env.PORT) {
  console.warn("PORT not set in .env — defaulting to 5000");
}

if (redis) {
  redis.connect().catch((err) => {
    console.warn(`Redis connection failed: ${err.message} — caching disabled`);
  });
}

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} [${process.env.NODE_ENV}]`);
});
