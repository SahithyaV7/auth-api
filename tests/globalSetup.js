const Redis = require("ioredis");

module.exports = async () => {
  const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/1");
  await redis.flushdb();
  await redis.quit();
};
