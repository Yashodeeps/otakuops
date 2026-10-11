// Runnable self-check (no test runner in this repo):
//   node --experimental-strip-types src/lib/health.test.ts
import assert from "node:assert/strict";
import { checkDb } from "./health.ts";

// A probe that answers => up.
const up = await checkDb(async () => [{ one: 1 }]);
assert.equal(up.db, "up");
assert.ok(up.latencyMs >= 0);

// A probe that throws => down, and checkDb itself never throws.
const down = await checkDb(async () => {
  throw new Error("Environment variable not found: DATABASE_URL");
});
assert.equal(down.db, "down");
assert.ok(down.latencyMs >= 0);

// A slow probe is still timed, not abandoned.
const slow = await checkDb(() => new Promise((r) => setTimeout(r, 25)));
assert.equal(slow.db, "up");
assert.ok(slow.latencyMs >= 20);

console.log("health: all checks passed");
