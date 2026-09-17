// Deliberate-practice records are self-reported evidence, never judge results.
(function(root) {
  'use strict';
  const MAX_SESSIONS = 200, MAX_REPS = 50;
  const plain = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const text = (x, max, required = false) => typeof x === 'string' && x.length <= max && (!required || !!x.trim());
  const number = (x, max = 1e15) => Number.isFinite(x) && x >= 0 && x <= max;
  const safeID = x => typeof x === 'string' && /^[-a-zA-Z0-9_]{1,100}$/.test(x);
  const problemID = x => x === '' || typeof x === 'string' && /^(lc-\d+|cf-\d+-[A-Za-z0-9]+|at-[A-Za-z0-9_-]+)$/.test(x);
  function defaults() { return {version: 1, ignition: {futureSelf: '', model: '', cue: ''}, active: null, sessions: []}; }
  function validateSession(s, completed) {
    if (!plain(s) || !safeID(s.id) || !text(s.chunk, 200, true) || !text(s.criterion, 300, true) || !problemID(s.problemId) || ![180, 360, 600].includes(s.duration) || !number(s.createdAt) || !number(s.elapsedMs, s.duration * 1000) || !(s.runningSince === null || number(s.runningSince)) || !Array.isArray(s.reps) || s.reps.length > MAX_REPS || !plain(s.draft)) throw Error('Invalid deep-practice session.');
    for (const key of ['attempt', 'evidence', 'mistake', 'adjustment']) if (!text(s.draft[key], 500)) throw Error('Invalid practice draft.');
    if (!number(s.helpSeenAt)) throw Error('Invalid practice help history.');
    if (!text(s.nextStep, 500, completed) || !text(s.coachNote, 500)) throw Error('Invalid practice reflection.');
    if (!['clean', 'miss', 'guided'].includes(s.draft.outcome)) throw Error('Invalid practice outcome.');
    for (const [i, r] of s.reps.entries()) {
      const expectedRetry = i > 0 && s.reps[i - 1].outcome !== 'clean' ? i - 1 : null;
      if (!plain(r) || !number(r.at) || !['clean', 'miss', 'guided'].includes(r.outcome) || !text(r.attempt, 500, true) || !text(r.evidence, 500, true) || !text(r.mistake, 500, r.outcome !== 'clean') || !text(r.adjustment, 500, r.outcome !== 'clean') || r.retryOf !== expectedRetry) throw Error('Invalid practice repetition.');
    }
    if (completed && (!number(s.finishedAt) || s.finishedAt < s.createdAt || s.runningSince !== null || !s.reps.length || !text(s.nextStep, 500, true) || !text(s.coachNote, 500))) throw Error('Invalid practice reflection.');
    return s;
  }
  function validate(s) {
    if (!plain(s) || s.version !== 1 || !plain(s.ignition) || !['futureSelf', 'model', 'cue'].every(k => text(s.ignition[k], 300)) || !Array.isArray(s.sessions) || s.sessions.length > MAX_SESSIONS || !(s.active === null || plain(s.active))) throw Error('Invalid deep-practice backup.');
    const ids = new Set();
    for (const session of s.sessions) { validateSession(session, true); if (ids.has(session.id)) throw Error('Duplicate practice session.'); ids.add(session.id); }
    if (s.active) { validateSession(s.active, false); if (ids.has(s.active.id) || s.sessions.length >= MAX_SESSIONS) throw Error('Invalid active practice session.'); }
    return s;
  }
  function newDraft() { return {attempt: '', evidence: '', outcome: 'clean', mistake: '', adjustment: ''}; }
  function create({id, chunk, criterion, problemId = '', duration = 360}, at) {
    return validateSession({id, chunk: chunk.trim(), criterion: criterion.trim(), problemId, duration, createdAt: at, elapsedMs: 0, runningSince: at, reps: [], draft: newDraft(), nextStep: '', coachNote: '', helpSeenAt: 0}, false);
  }
  function elapsed(s, at) { return Math.min(s.duration * 1000, s.elapsedMs + (s.runningSince === null ? 0 : Math.max(0, at - s.runningSince))); }
  function pause(s, at) { s.elapsedMs = elapsed(s, at); s.runningSince = null; return s; }
  function resume(s, at) { if (s.runningSince === null && elapsed(s, at) < s.duration * 1000) s.runningSince = at; return s; }
  function record(s, input, at) {
    if (s.reps.length >= MAX_REPS) throw Error('This session has 50 repetitions. Save your reflection before starting another.');
    const r = {at, outcome: input.outcome, retryOf: s.reps.length && s.reps.at(-1).outcome !== 'clean' ? s.reps.length - 1 : null};
    for (const key of ['attempt', 'evidence', 'mistake', 'adjustment']) r[key] = String(input[key] || '').trim();
    if (r.outcome === 'clean') { r.mistake = ''; r.adjustment = ''; }
    validateSession({...s, reps: [...s.reps, r]}, false);
    s.reps.push(r); s.draft = newDraft(); return r;
  }
  function finish(s, nextStep, coachNote, at) {
    const result = {...s, elapsedMs: elapsed(s, at), runningSince: null, finishedAt: Math.max(s.createdAt, at), nextStep: nextStep.trim(), coachNote: coachNote.trim()};
    return validateSession(result, true);
  }
  function stats(reps) {
    const clean = reps.filter(r => r.outcome === 'clean').length;
    return {total: reps.length, clean, guided: reps.filter(r => r.outcome === 'guided').length, misses: reps.filter(r => r.outcome === 'miss').length, repaired: reps.filter(r => r.outcome === 'clean' && r.retryOf !== null).length, rate: reps.length ? clean / reps.length : null};
  }
  function coaching(reps) {
    const s = stats(reps.slice(-10));
    if (s.total < 5) return {zone: 'calibrating', title: 'Find your edge', message: 'Log at least five honest repetitions of this chunk before judging the difficulty. Start slowly and test one small thing.'};
    if (s.rate > .9) return {zone: 'stretch', title: 'Add one small challenge', message: 'Most recent repetitions were clean. Try a new boundary case, less scaffolding, or explain the invariant from memory.'};
    if (s.rate < .7) return {zone: 'simplify', title: 'Make the chunk smaller', message: 'Slow down, trace a tiny example, or study a worked step. Then close the example and retry the same skill.'};
    return {zone: 'edge', title: 'Stay with this challenge', message: 'You are succeeding often while still finding useful errors. Repair the next mistake before increasing difficulty.'};
  }
  root.ForgeDeepPracticeCore = {MAX_SESSIONS, MAX_REPS, defaults, validate, create, elapsed, pause, resume, record, finish, stats, coaching};
})(globalThis);
