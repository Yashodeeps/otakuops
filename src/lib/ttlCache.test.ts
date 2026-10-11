// Runnable self-check (no test runner in this repo):
//   node --experimental-strip-types src/lib/ttlCache.test.ts
import assert from "node:assert/strict";
import { ttlCache } from "./ttlCache.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A hit inside the window never calls the loader again.
let loads = 0;
const cache = ttlCache<number>(60);
const load = async () => ++loads;

assert.equal(await cache.get("a", load), 1);
assert.equal(await cache.get("a", load), 1); // served from the entry
assert.equal(loads, 1);

// Distinct keys are distinct entries.
assert.equal(await cache.get("b", load), 2);
assert.equal(cache.size(), 2);

// Past the TTL the loader runs again, and expired entries are pruned.
await sleep(80);
assert.equal(await cache.get("a", load), 3);
assert.equal(cache.size(), 1); // "b" expired and was dropped on the miss

// A throwing load propagates and leaves nothing cached.
const boom = ttlCache<number>(60);
await assert.rejects(() => boom.get("x", async () => { throw new Error("upstream down"); }));
assert.equal(boom.size(), 0);
assert.equal(await boom.get("x", async () => 7), 7); // retry still works

console.log("ttlCache: all checks passed");
