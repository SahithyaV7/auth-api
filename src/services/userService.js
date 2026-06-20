/*
 * Security limitations and accepted tradeoffs:
 *
 * - No account lockout on failed logins. The rate limiter on /login (20 req
 *   per 15 min) reduces brute-force risk but does not fully replace a lockout
 *   mechanism — a determined attacker can still exhaust attempts over time.
 *
 * - JWTs are stateless and cannot be revoked before expiry. The 1h TTL limits
 *   the exposure window. For public-facing auth, pair with refresh token
 *   rotation and a server-side blocklist.
 *
 * - Redis data is unencrypted at rest. Enable Redis AUTH and TLS before
 *   deploying to any environment that handles real credentials.
 *
 * - Username enumeration via response timing is mitigated: findUser runs a
 *   dummy bcrypt.compare on the not-found path so both branches take ~300ms.
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
