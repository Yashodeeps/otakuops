// Runnable self-check (no test runner in this repo):
//   node --experimental-strip-types src/lib/personalization.test.ts
import assert from "node:assert/strict";
import { clickSignal, personalBoost } from "./personalization.ts";

// Top genre normalizes to 1; weaker/negative signals rank below it.
const sig = clickSignal([
  { genres: ["Action", "Shonen"], status: "watched" },
  { genres: ["Action"], status: "watching" },
  { genres: ["Romance"], status: "watchlist" },
  { genres: ["Ecchi"], status: "dropped" },
]);
assert.equal(sig["Action"], 1); // most-engaged genre pins to 1
assert.ok(sig["Romance"] < sig["Action"]); // watchlist is a weaker signal
assert.ok(sig["Ecchi"] < sig["Romance"]); // dropped is near-noise

// Boost is the mean affinity of a candidate's genres, in [0,1].
assert.equal(personalBoost(sig, ["Action"]), 1);
assert.equal(personalBoost(sig, []), 0);
const mixed = personalBoost(sig, ["Action", "Unknown"]);
assert.ok(mixed > 0 && mixed < 1);

// Empty history => empty signal => zero boost.
assert.deepEqual(clickSignal([]), {});
assert.equal(personalBoost({}, ["Action"]), 0);

console.log("personalization: all checks passed");
