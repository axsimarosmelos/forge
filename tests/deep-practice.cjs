const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../frontend/deep-practice-core.js'), 'utf8'));
const C = ForgeDeepPracticeCore;
const session = () => C.create({id: 'deep-test', chunk: 'Trace the loop', criterion: 'The trace matches my chosen input', duration: 360}, 1000);
const rep = outcome => ({attempt: 'Traced an empty input', evidence: outcome === 'clean' ? 'Zero iterations, as expected' : 'Read outside the array', outcome, mistake: outcome === 'clean' ? '' : 'The first index was not guarded', adjustment: outcome === 'clean' ? '' : 'Check the length before accessing the array'});

// Persisted wall time excludes pauses, caps at expiry, and handles clock rollback.
const clock = session();
assert.equal(C.elapsed(clock, 31000), 30000);
C.pause(clock, 31000);
assert.equal(C.elapsed(JSON.parse(JSON.stringify(clock)), 90000), 30000);
C.resume(clock, 100000); C.resume(clock, 110000);
assert.equal(C.elapsed(clock, 130000), 60000);
assert.equal(C.elapsed(clock, 90000), 30000);
assert.equal(C.elapsed(clock, 9999999), 360000);
C.pause(clock, 9999999); C.resume(clock, 9999999);
assert.equal(clock.runningSince, null);

// A mistake needs both a diagnosis and a next action before it can be recorded.
const s = session();
for (const bad of [{...rep('miss'), mistake: ''}, {...rep('guided'), adjustment: ''}, {...rep('clean'), evidence: ' '}, {...rep('clean'), outcome: 'accepted'}]) assert.throws(() => C.record(s, bad, 2000));
assert.equal(s.reps.length, 0);
C.record(s, rep('miss'), 2000); C.record(s, rep('guided'), 3000); C.record(s, rep('clean'), 4000); C.record(s, rep('clean'), 5000);
assert.deepEqual(s.reps.map(r => r.retryOf), [null, 0, 1, null]);
assert.deepEqual(C.stats(s.reps), {total: 4, clean: 2, guided: 1, misses: 1, repaired: 1, rate: .5});
assert.equal(C.coaching(s.reps).zone, 'calibrating');
assert.equal(C.coaching(Array(5).fill(rep('clean'))).zone, 'stretch');
assert.equal(C.coaching([...Array(8).fill(rep('clean')), ...Array(2).fill(rep('miss'))]).zone, 'edge');
assert.equal(C.coaching([...Array(6).fill(rep('clean')), ...Array(4).fill(rep('guided'))]).zone, 'simplify');
assert.equal(C.coaching([...Array(20).fill(rep('clean')), ...Array(10).fill(rep('miss'))]).zone, 'simplify');
assert.equal(C.stats([]).rate, null);

assert.throws(() => C.finish(session(), 'Try again', '', 6000));
assert.throws(() => C.finish(s, '', '', 6000));
const finished = C.finish(s, 'Try the one-item boundary tomorrow', 'Ask a peer to inspect the loop condition', 61000);
assert.equal(finished.elapsedMs, 60000); assert.equal(finished.runningSince, null);
const state = {...C.defaults(), sessions: [finished]};
assert.deepEqual(C.validate(JSON.parse(JSON.stringify(state))), state);
for (const bad of [
  {...state, sessions: [finished, finished]},
  {...state, active: s},
  {...state, sessions: [{...finished, problemId: "lc-1' onclick='alert(1)"}]},
  {...state, sessions: [{...finished, elapsedMs: Infinity}]},
  {...state, sessions: [{...finished, nextStep: 'x'.repeat(501)}]},
  {...state, sessions: [{...finished, reps: [{...finished.reps[0], retryOf: 0}]}]},
  {...state, ignition: {futureSelf: [], model: '', cue: ''}},
  {...state, active: {...session(), runningSince: -1}}
]) assert.throws(() => C.validate(bad));
const full = session();
for (let i = 0; i < C.MAX_REPS; i++) C.record(full, rep('clean'), 2000 + i);
assert.throws(() => C.record(full, rep('clean'), 3000));
console.log('PASS: deep-practice timer recovery, pause/expiry, repair chains, scoped coaching, completion and strict backup validation.');
