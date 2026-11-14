// Run: node srs.test.js
const assert = require('assert');
const { schedule, DAY, MIN } = require('./srs.js');
const now = new Date(2026, 0, 10, 15).getTime();
const midnight = new Date(2026, 0, 10).getTime();

let c = schedule(null, 2, now);                 // new -> step 1, 10 min
assert.equal(c.ivl, 0); assert.equal(c.due, now + 10 * MIN);
c = schedule(c, 2, now);                        // graduate -> 1 day, due at midnight
assert.equal(c.ivl, 1); assert.equal(c.due, midnight + DAY);
c = schedule(c, 2, now);                        // 1 * 2.5 -> 3 days
assert.equal(c.ivl, 3);
c = schedule(c, 0, now);                        // lapse -> relearn, ease drops
assert.equal(c.ivl, 0); assert.equal(c.lapses, 1); assert.equal(c.ease, 2.3);
assert.equal(schedule(null, 3, now).ivl, 4);    // easy on new card skips to 4 days
assert.equal(schedule(null, 0, now).due, now + MIN);
let e = { ivl: 10, ease: 1.3, step: 0, reps: 5, lapses: 0 };
assert.equal(schedule(e, 1, now).ease, 1.3);    // ease floor
console.log('srs ok');
