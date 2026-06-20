/*
 * Security limitations and accepted tradeoffs:
 *
 * - No account lockout on failed logins. The rate limiter on /login reduces
 *   brute-force risk but does not fully replace a lockout mechanism.
 *
 * - JWTs are stateless and cannot be revoked before expiry. Mitigate by keeping
 *   access token TTL short and pairing with refresh tokens in production.
 *
 * - Redis data is unencrypted at rest. Enable Redis AUTH and TLS before
 *   deploying to any environment that handles real credentials.
 *
 * - "User not found" and "wrong password" paths are constant-time via a dummy
 *   bcrypt.compare when no user is found, preventing username enumeration
 *   through response timing.
 */

const bcrypt = require("bcrypt");
const redis = require("../config/redis");

async function createUser(username, password) {
  const key = `user:${username}`;
  const passwordHash = await bcrypt.hash(password, 12);

  // hsetnx is atomic — only sets if the field doesn't exist, preventing
  // a race between the existence check and the write.
  const created = await redis.hsetnx(key, "passwordHash", passwordHash);
  if (!created) throw new Error("USERNAME_TAKEN");

  await redis.hset(key, "createdAt", new Date().toISOString());
}

const DUMMY_HASH = "$2b$12$invalidhashvaluethatisusedtomakeconstanttimechecks000000";

async function findUser(username) {
  const result = await redis.hgetall(`user:${username}`);
  if (!result || !Object.keys(result).length) {
    await bcrypt.compare("dummy", DUMMY_HASH);
    return null;
  }
  return result;
}

module.exports = { createUser, findUser };
