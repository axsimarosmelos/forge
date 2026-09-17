/* Small, deliberate practice loops integrated with Forge's existing progress. */
(() => {
  'use strict';
  const C = ForgeDeepPracticeCore;
  const previous = {render, validate};
  let seed = {problemId: '', chunk: '', criterion: ''};
  const data = () => state.deepPractice || (state.deepPractice = C.defaults());
  const active = () => data().active;
  validate = function(candidate) {
    previous.validate(candidate);
    if (candidate.deepPractice !== undefined) C.validate(candidate.deepPractice);
    return candidate;
  };
  try { if (state.deepPractice !== undefined) C.validate(state.deepPractice); }
  catch { state.deepPractice = C.defaults(); toast('Deep Practice data could not be read. Other Forge progress is still available.'); }
  navs.splice(navs.findIndex(n => n[0] === 'review'), 0, ['deep', 'timer', 'Deep Practice']);
  const identify = () => 'deep-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const field = (key, label, value, max = 500, required = false, handler = '') => `<div class="field"><label for="deep-${key}">${label}</label><textarea id="deep-${key}" name="${key}" maxlength="${max}" ${required ? 'required' : ''} ${handler ? `oninput="${handler}"` : ''}>${esc(value)}</textarea></div>`;
  function open(problemId = '') {
    if (!active()) {
      const p = ForgeStudy.allProblems().find(p => p.id === problemId);
      seed = {problemId: p?.id || '', chunk: p ? 'Trace one tiny example of ' + p.title : '', criterion: ''};
    }
    go('deep');
  }
  function ignitionView() {
    const i = data().ignition;
    return `<details class="card pad deep-ignition"><summary>Your ignition · give the work a reason</summary><p class="small muted">Picture who you want to become. Choose someone whose process you can learn from, then make one small invitation to practice.</p><form onsubmit="ForgeDeepPractice.ignite(event)">${field('futureSelf', 'The problem solver I am becoming', i.futureSelf, 300)}${field('model', 'A person, video, or worked example I can learn from', i.model, 300)}${field('cue', 'My practice cue — when and where I will begin', i.cue, 300)}<button class="btn">Save my ignition</button></form></details>`;
  }
  function setupView() {
    return `<section class="card pad deep-setup"><span class="eyebrow muted">01 / CHOOSE A SMALL REACH</span><h2>One chunk. One clear test.</h2><p class="small muted">Practice a loop boundary, a map lookup, or one step of an invariant. Use the code lab or a problem workspace to do the actual work.</p><div class="deep-presets" aria-label="Practice ideas">${[['trace', 'Trace a loop'], ['boundary', 'Test a boundary'], ['recall', 'Rebuild an idea']].map(([id, name]) => `<button class="btn small" onclick="ForgeDeepPractice.preset('${id}')">${name}</button>`).join('')}</div><form id="deep-start" onsubmit="ForgeDeepPractice.start(event)">${field('chunk', 'What exact skill will you practice?', seed.chunk, 200, true)}${field('criterion', 'What would a correct repetition demonstrate?', seed.criterion, 300, true)}<div class="field"><label for="deep-duration">Focus window</label><select id="deep-duration" name="duration"><option value="180">3 minutes · a tiny reach</option><option value="360" selected>6 minutes · focused practice</option><option value="600">10 minutes · a little more space</option></select></div>${seed.problemId ? `<p class="small">Linked workspace: <a href="#problem/${seed.problemId}">${esc(seed.problemId)}</a></p>` : ''}<button class="btn primary" ${data().sessions.length >= C.MAX_SESSIONS ? 'disabled' : ''}>Begin deep practice ${icon('arrow', 14)}</button>${data().sessions.length >= C.MAX_SESSIONS ? '<p class="small">Your 200-session notebook is full. Export a backup in Settings, then clear saved sessions below to make room.</p>' : ''}</form></section>`;
  }
  function coachView(s) {
    const counts = C.stats(s.reps), coach = C.coaching(s.reps), recent = C.stats(s.reps.slice(-10));
    return `<aside class="card pad deep-coach" data-zone="${coach.zone}"><span class="eyebrow muted">YOUR PRACTICE EDGE</span><h2>${coach.title}</h2><p>${coach.message}</p><div class="deep-counts"><div><strong>${counts.total}</strong><span>repetitions</span></div><div><strong>${counts.repaired}</strong><span>clean retries</span></div><div><strong>${recent.rate === null ? '—' : Math.round(recent.rate * 100) + '%'}</strong><span>recent clean reps</span></div></div><p class="small muted">${counts.clean} clean · ${counts.guided} guided · ${counts.misses} missed. Feedback uses up to 10 recent reps of this chunk, including retries.</p><p class="small muted">Around 80% clean reps is a starting guideline inspired by Coyle’s talk. This small, self-reported sample is not a mastery score. Adjust the challenge to the skill.</p></aside>`;
  }
  function sessionView(s) {
    const last = s.reps.at(-1), repairing = last && last.outcome !== 'clean', d = s.draft;
    return `<section class="card pad deep-session"><div class="between wrap"><div><span class="eyebrow muted">${repairing ? 'STOP · NOTICE · ADJUST · RETRY' : '02 / REACH WITH INTENTION'}</span><h2>${esc(s.chunk)}</h2></div><div class="deep-clock"><span id="deep-clock" role="timer" aria-label="Focus time remaining"></span><button id="deep-pause" class="btn small" onclick="ForgeDeepPractice.pause()"></button></div></div><p class="deep-criterion"><b>A clean rep means:</b> ${esc(s.criterion)}</p><p id="deep-clock-status" class="small muted" aria-live="polite"></p><div class="flex wrap"><a class="btn small" href="${s.problemId ? '#problem/' + s.problemId : '#lab'}">Open ${s.problemId ? 'linked workspace' : 'code lab'} ${icon('code', 14)}</a><a class="btn small" href="#learn">Study a worked example</a></div><p class="small muted">The clock continues across pages and reloads until you pause it. Expiry invites reflection; it never awards a solve.</p>${repairing ? `<div class="banner deep-retry"><b>Retry the same chunk.</b><p>Notice: ${esc(last.mistake)}</p><p>Change: ${esc(last.adjustment)}</p><span class="small">Go slowly. Close any help before trying to reproduce the step yourself.</span></div>` : ''}<form id="deep-rep-form" onsubmit="ForgeDeepPractice.record(event)">${field('attempt', 'What did you try or predict?', d.attempt, 500, true, "ForgeDeepPractice.draft('attempt',this.value)")}${field('evidence', 'What did your test, trace, or explanation show?', d.evidence, 500, true, "ForgeDeepPractice.draft('evidence',this.value)")}<div class="field"><label for="deep-outcome">How did this repetition go?</label><select id="deep-outcome" name="outcome" onchange="ForgeDeepPractice.outcome(this.value)">${[['clean', 'Clean — met my criterion without help'], ['miss', 'Missed — I found a specific gap'], ['guided', 'Guided — I used a hint or example']].map(([id, name]) => `<option value="${id}" ${d.outcome === id ? 'selected' : ''}>${name}</option>`).join('')}</select></div><div id="deep-diagnosis" ${d.outcome === 'clean' ? 'hidden' : ''}>${field('mistake', 'Where exactly did it break down?', d.mistake, 500, d.outcome !== 'clean', "ForgeDeepPractice.draft('mistake',this.value)")}${field('adjustment', 'What one change will you make on the retry?', d.adjustment, 500, d.outcome !== 'clean', "ForgeDeepPractice.draft('adjustment',this.value)")}</div><p id="deep-rep-error" class="small" role="alert"></p><button class="btn primary" ${s.reps.length >= C.MAX_REPS ? 'disabled' : ''}>Record ${repairing ? 'retry' : 'repetition'} ${icon('arrow', 14)}</button><p class="small muted">Outcomes are your own assessment. A repetition does not mark a platform problem solved.</p></form></section>${coachView(s)}<section class="card pad deep-reflect"><span class="eyebrow muted">03 / CARRY ONE THING FORWARD</span><h2>Close with a next step.</h2><form id="deep-finish" onsubmit="ForgeDeepPractice.finish(event)">${field('nextStep', 'What will you reproduce or test next time?', s.nextStep, 500, true, "ForgeDeepPractice.reflect('nextStep',this.value)")}${field('coachNote', 'Learn together: what feedback or technique will you try? (optional)', s.coachNote, 500, false, "ForgeDeepPractice.reflect('coachNote',this.value)")}<p class="small muted">Ask a peer to inspect one step, or name a useful technique from a worked example. Your notes stay in your own notebook.</p><button class="btn primary" ${s.reps.length ? '' : 'disabled'}>Save session & tomorrow’s recall</button><p class="small muted">${s.reps.length ? 'This adds a journal entry and a recall prompt due tomorrow.' : 'Record one honest repetition to save a session.'}</p></form><button class="textbtn" onclick="ForgeDeepPractice.discardDialog()">Discard this session…</button></section>${repsView(s.reps)}`;
  }
  function repsView(reps) {
    return reps.length ? `<section class="card pad deep-rep-list"><h2>Every attempt teaches you something.</h2>${reps.map((r, i) => `<details><summary>Rep ${i + 1} · ${r.outcome}${r.retryOf !== null ? ' · retry of rep ' + (r.retryOf + 1) : ''}</summary><p><b>Tried:</b> ${esc(r.attempt)}</p><p><b>Evidence:</b> ${esc(r.evidence)}</p>${r.outcome !== 'clean' ? `<p><b>Noticed:</b> ${esc(r.mistake)}</p><p><b>Next adjustment:</b> ${esc(r.adjustment)}</p>` : ''}</details>`).join('')}</section>` : '';
  }
  function historyView() {
    const sessions = data().sessions;
    return `<section class="card pad deep-history"><div class="between wrap"><h2>Your practice notebook</h2><span class="small muted">${sessions.length} saved sessions</span></div>${sessions.length ? [...sessions].reverse().map(s => { const n = C.stats(s.reps); return `<details><summary>${esc(s.chunk)} <span class="muted">· ${new Date(s.finishedAt).toLocaleDateString()}</span></summary><p class="small">${n.total} reps · ${n.clean} clean · ${n.repaired} clean retries · ${Math.round(s.elapsedMs / 1000)} focused seconds</p><p><b>Criterion:</b> ${esc(s.criterion)}</p><p><b>Next reach:</b> ${esc(s.nextStep)}</p>${s.coachNote ? `<p><b>Learn together:</b> ${esc(s.coachNote)}</p>` : ''}${s.problemId ? `<a class="btn small" href="#problem/${s.problemId}">Return to workspace</a>` : ''}<button class="btn small" onclick="ForgeDeepPractice.repeat('${s.id}')">Practice this chunk again</button>${repsView(s.reps)}</details>`; }).join('') : '<p class="small muted">Your first session starts with one small reach. Saved sessions will appear here, with your evidence and next steps.</p>'}${sessions.length ? '<button class="textbtn" onclick="ForgeDeepPractice.clearDialog()">Clear saved session notebook…</button>' : ''}</section>`;
  }
  function view() {
    const s = active(), ignition = data().ignition;
    return pageHead('THE DEEP PRACTICE STUDIO', 'Build the skill. One reach at a time.', 'Choose a small chunk. Try it. Notice the gap. Adjust and repeat.') + `<div class="deep-principles"><span>01 &nbsp; Find your edge</span><span>02 &nbsp; Make mistakes useful</span><span>03 &nbsp; Return with intention</span></div>${ignition.futureSelf ? `<p class="deep-purpose">Becoming: <b>${esc(ignition.futureSelf)}</b>${ignition.cue ? '<br><span class="small">' + esc(ignition.cue) + '</span>' : ''}${ignition.model ? '<br><span class="small">Learn from: ' + esc(ignition.model) + '</span>' : ''}</p>` : ''}<div class="deep-layout">${s ? sessionView(s) : setupView() + `<aside class="card pad deep-method"><span class="eyebrow muted">A WORKSHOP FOR YOUR THINKING</span><h2>Slow is a useful speed.</h2><ol><li><b>Observe a model.</b> Trace a worked step or pause a video and predict what happens next.</li><li><b>Make a small attempt.</b> Reproduce one step with the example closed.</li><li><b>Use the error.</b> Name the gap, change one thing, and retry.</li><li><b>Invite feedback.</b> Ask someone to inspect your reasoning, then test their suggestion.</li></ol><p class="small muted">Six minutes is a convenient focus window. Useful practice depends on the work you do inside it.</p></aside>`}</div>${ignitionView()}${historyView()}<details class="deep-source"><summary>Where this practice method comes from</summary><p class="small muted">Adapted from the supplied transcript of Daniel Coyle’s Big Think Clips interview, “You can progress more in 6 minutes than you would in a month.” Forge applies chunking, noticing errors, repetition, motivation through role models, and learning with others. The timer and difficulty bands are product choices; they do not promise a fixed learning rate, a 37× gain, or genius.</p></details>`;
  }
  function start(event) {
    event.preventDefault();
    if (active()) { toast('Resume or finish your current session first.'); return; }
    if (data().sessions.length >= C.MAX_SESSIONS) return;
    const f = new FormData(event.target);
    try { data().active = C.create({id: identify(), chunk: String(f.get('chunk')), criterion: String(f.get('criterion')), duration: Number(f.get('duration')), problemId: seed.problemId}, Date.now()); save(); render(); }
    catch (e) { toast(e.message); }
  }
  function record(event) {
    event.preventDefault(); const s = active(); if (!s) return;
    const f = new FormData(event.target), input = Object.fromEntries(['attempt', 'evidence', 'outcome', 'mistake', 'adjustment'].map(k => [k, String(f.get(k) || '')]));
    // Help revealed in the linked workspace must not become an independent rep.
    const helpAt = state.study?.workspaces[s.problemId]?.helpAt || 0;
    if (input.outcome === 'clean' && helpAt > s.helpSeenAt && helpAt >= (s.reps.at(-1)?.at ?? s.createdAt)) {
      s.draft = {...input, outcome: 'guided'}; save(); render();
      $('#deep-rep-error').textContent = 'Help was opened in the linked workspace. Record what it clarified and what you will retry without help.'; return;
    }
    try { C.record(s, input, Date.now()); s.helpSeenAt = Math.max(s.helpSeenAt, helpAt); save(); render(); $('#deep-attempt')?.focus(); }
    catch (e) { $('#deep-rep-error').textContent = 'Add an attempt and evidence. For a missed or guided rep, name the gap and one adjustment. ' + (s.reps.length >= C.MAX_REPS ? e.message : ''); }
  }
  function finish(event) {
    event.preventDefault(); const s = active(); if (!s) return;
    if (['attempt', 'evidence', 'mistake', 'adjustment'].some(k => s.draft[k].trim())) { toast('Record your unfinished repetition before saving the session, or clear its draft fields.'); return; }
    if (state.cards.length >= 20000 || state.journal.length >= 20000) { toast('Your recall or journal collection is full. Export a backup and make room before saving.'); return; }
    const f = new FormData(event.target);
    try {
      const completed = C.finish(s, String(f.get('nextStep') || ''), String(f.get('coachNote') || ''), Date.now()), counts = C.stats(s.reps);
      data().sessions.push(completed); data().active = null;
      state.journal.push({id: s.id, title: 'Deep practice: ' + s.chunk, at: completed.finishedAt, note: `${counts.total} reps; ${counts.clean} clean; ${counts.repaired} clean retries.\nCriterion: ${s.criterion}\n${s.reps.filter(r => r.outcome !== 'clean').map(r => 'Gap: ' + r.mistake + '\nAdjustment: ' + r.adjustment).join('\n')}\nNext reach: ${completed.nextStep}${completed.coachNote ? '\nLearn together: ' + completed.coachNote : ''}`});
      ensureCard(s.id, 'custom', 'Reproduce this chunk without help: ' + s.chunk, 'Check: ' + s.criterion + '\nNext reach: ' + completed.nextStep, completed.finishedAt + 86400000);
      touch(); save(); render(); toast('Session saved. Your next reach is in the journal and tomorrow’s Review.');
    } catch (e) { toast(e.message); }
  }
  function tick() {
    const s = active(); if (!s) return;
    const remaining = Math.ceil((s.duration * 1000 - C.elapsed(s, Date.now())) / 1000);
    if (!remaining && s.runningSince !== null) { C.pause(s, Date.now()); save(); }
    const clock = $('#deep-clock'), button = $('#deep-pause'), status = $('#deep-clock-status');
    if (clock) clock.textContent = Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0');
    if (button) { button.textContent = s.runningSince === null ? 'Resume' : 'Pause'; button.disabled = !remaining; }
    const message = !remaining ? 'Focus window complete. Finish your current thought, then reflect.' : s.runningSince === null ? 'Paused. Take the time you need.' : 'Focus on the next small step.';
    if (status && status.textContent !== message) status.textContent = message;
  }
  function renderBridge(problemId = '') {
    const node = document.createElement('section'); node.className = 'card pad deep-banner';
    node.innerHTML = `<div><span class="eyebrow muted">DEEP PRACTICE</span><h2>${active() ? 'Your next repetition is waiting.' : 'Turn one mistake into a better next attempt.'}</h2><p class="small muted">${active() ? esc(active().chunk) : 'A focused loop: attempt, notice, adjust, retry. Start with six minutes.'}</p></div><button class="btn primary" onclick="ForgeDeepPractice.open('${problemId}')">${active() ? 'Resume session' : 'Start a small reach'} ${icon('arrow', 14)}</button>`;
    $('#app').prepend(node);
  }
  render = function() {
    const [page, id] = (location.hash.slice(1) || 'today').split('/');
    if (page === 'deep') { updateChrome(); $('#app').innerHTML = view() + footer(); document.title = 'Forge · Deep Practice'; tick(); }
    else { previous.render(); if (page === 'today') renderBridge(); if (page === 'problem' && ForgeCatalogCore.safeID(id) && ForgeStudy.allProblems().some(p => p.id === id)) renderBridge(id); }
  };
  window.ForgeDeepPractice = {
    open, start, record, finish,
    draft: (key, value) => { if (active() && ['attempt', 'evidence', 'mistake', 'adjustment'].includes(key)) { active().draft[key] = value.slice(0, 500); save(); } },
    reflect: (key, value) => { if (active() && ['nextStep', 'coachNote'].includes(key)) { active()[key] = value.slice(0, 500); save(); } },
    outcome: value => { if (!active() || !['clean', 'miss', 'guided'].includes(value)) return; active().draft.outcome = value; $('#deep-diagnosis').hidden = value === 'clean'; for (const key of ['mistake', 'adjustment']) $('#deep-' + key).required = value !== 'clean'; save(); },
    pause: () => { if (!active()) return; active().runningSince === null ? C.resume(active(), Date.now()) : C.pause(active(), Date.now()); save(); tick(); },
    ignite: event => { event.preventDefault(); const f = new FormData(event.target); for (const key of ['futureSelf', 'model', 'cue']) data().ignition[key] = String(f.get(key) || '').trim().slice(0, 300); save(); render(); toast('Your practice intention is saved.'); },
    preset: key => { const choices = {trace: ['Predict a loop’s state after each iteration', 'My hand trace matches the output for an empty, one-item, and two-item input.'], boundary: ['Find and repair one boundary error', 'I can explain the failing case and the corrected condition without help.'], recall: ['Rebuild one algorithm invariant from memory', 'I can state what stays true and explain why one update preserves it.']}; if (choices[key]) { $('#deep-chunk').value = choices[key][0]; $('#deep-criterion').value = choices[key][1]; } },
    repeat: id => { if (active()) { go('deep'); toast('Finish your current session first.'); return; } const s = data().sessions.find(x => x.id === id); if (s) { seed = {problemId: s.problemId, chunk: s.chunk, criterion: s.criterion}; render(); $('#deep-chunk')?.focus(); } },
    discardDialog: () => modal(modalHead('Discard this practice session?') + '<p>The active timer, draft and repetitions will be removed. Saved sessions remain in your notebook.</p><button class="btn danger" onclick="ForgeDeepPractice.discard()">Discard session</button>'),
    discard: () => { data().active = null; save(); closeModal(); render(); },
    clearDialog: () => modal(modalHead('Clear your saved practice notebook?') + '<p>Export your progress first to keep the full repetition history. Journal entries, recall cards and your active session will remain.</p><div class="flex wrap"><button class="btn" onclick="exportData()">Export progress</button><button class="btn danger" onclick="ForgeDeepPractice.clearHistory()">Clear saved sessions</button></div>'),
    clearHistory: () => { data().sessions = []; save(); closeModal(); render(); }
  };
  setInterval(tick, 1000);
  render();
})();
