// ── app.js — SPA principale ────────────────────────────────────────────────

const API = '';  // même origine

// ── État global ──────────────────────────────────────────────────────────────
let state = {
  user: null,
  view: 'login',       // login | home | quiz | result | dashboard | admin
  // quiz
  lessonId: null,
  questions: [],
  current: 0,
  answers: [],
  selected: null,
  confirmed: false,
  // scores locaux (enrichis après fetch)
  myScores: {},        // { lessonId: { best, last, attempts } }
  lastResult: null,
};

// ── Utilitaires ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const app = () => document.getElementById('app');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

function scoreColor(pct) {
  if (pct >= 80) return 'good';
  if (pct >= 50) return 'mid';
  return 'low';
}
function scoreMention(pct) {
  if (pct >= 80) return { text: 'Excellent travail !', color: '#173404' };
  if (pct >= 60) return { text: 'Bien, continue ainsi !', color: '#042C53' };
  if (pct >= 40) return { text: 'Peut mieux faire.', color: '#412402' };
  return { text: 'À retravailler.', color: '#501313' };
}
function fillColor(pct) {
  if (pct >= 80) return 'fill-green';
  if (pct >= 50) return 'fill-amber';
  return 'fill-red';
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Render dispatcher ────────────────────────────────────────────────────────
function render() {
  switch (state.view) {
    case 'login':     renderLogin(); break;
    case 'home':      renderHome(); break;
    case 'quiz':      renderQuiz(); break;
    case 'result':    renderResult(); break;
    case 'dashboard': renderDashboard(); break;
    case 'admin':     renderAdmin(); break;
  }
}

// ── TOPBAR ───────────────────────────────────────────────────────────────────
function topbar(extra = '') {
  const u = state.user;
  return `
  <div class="topbar">
    <div class="topbar-brand">
      📐 Quiz Maths 6ème
      <span>Collège Moderne de Nafoun</span>
    </div>
    <div class="topbar-right">
      ${extra}
      <div class="user-badge">Bonjour, <strong>${u.name}</strong></div>
      ${u.role === 'admin' ? `<button class="btn btn-sm" onclick="go('admin')">👨‍🏫 Admin</button>` : ''}
      <button class="btn btn-sm" onclick="go('dashboard')">📊 Mon bilan</button>
      <button class="btn btn-sm" onclick="logout()">Déconnexion</button>
    </div>
  </div>`;
}

// ── LOGIN ────────────────────────────────────────────────────────────────────
function renderLogin() {
  app().innerHTML = `
  <div class="login-wrap">
    <div class="login-card">
      <h1>📐 Quiz Maths 6ème</h1>
      <p>Collège Moderne de Nafoun — Connectez-vous pour commencer</p>
      <div class="form-group">
        <label>Identifiant</label>
        <input id="f-user" type="text" placeholder="ex: eleve1" autocomplete="username">
      </div>
      <div class="form-group">
        <label>Mot de passe</label>
        <input id="f-pass" type="password" placeholder="••••••••" autocomplete="current-password">
      </div>
      <div id="login-err" class="error-msg hidden"></div>
      <button class="btn btn-primary w-full mt-2" onclick="doLogin()">Se connecter</button>
      <p class="text-sm text-muted mt-2" style="text-align:center">
        Comptes démo : <strong>prof</strong> / <strong>password</strong> &nbsp;|&nbsp; <strong>eleve1</strong> / <strong>password</strong>
      </p>
    </div>
  </div>`;
  document.getElementById('f-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

async function doLogin() {
  const username = $('f-user').value.trim();
  const password = $('f-pass').value;
  const err = $('login-err');
  err.classList.add('hidden');
  try {
    const data = await api('POST', '/api/auth/login', { username, password });
    state.user = data.user;
    await loadMyScores();
    go('home');
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
  }
}

async function logout() {
  await api('POST', '/api/auth/logout').catch(() => {});
  state.user = null;
  state.myScores = {};
  go('login');
}

// ── HOME — grille des leçons ──────────────────────────────────────────────────
async function loadMyScores() {
  try {
    const data = await api('GET', '/api/scores/dashboard/me');
    state.myScores = {};
    data.byLesson.forEach(l => { state.myScores[l.lessonId] = l; });
  } catch (_) {}
}

function renderHome() {
  const cards = LESSONS.map(l => {
    const s = state.myScores[l.id];
    let badge = `<span class="lc-score none">Non commencé</span>`;
    if (s) {
      const cls = scoreColor(s.bestScore);
      badge = `<span class="lc-score ${cls}">Meilleur : ${s.bestScore}% · ${s.attempts} essai(s)</span>`;
    }
    return `
    <div class="lesson-card" onclick="startLesson(${l.id})">
      <div class="lc-num">Leçon ${l.id}</div>
      <div class="lc-title">${l.title}</div>
      <div class="lc-comp">${l.competence}</div>
      ${badge}
    </div>`;
  }).join('');

  app().innerHTML = `
  <div class="app-shell">
    ${topbar()}
    <div class="main-content">
      <div class="section-header">
        <div>
          <div class="section-title">Choisissez une leçon</div>
          <div class="section-sub">${LESSONS.length} leçons · 10 à 15 questions par leçon</div>
        </div>
      </div>
      <div class="lesson-grid">${cards}</div>
    </div>
  </div>`;
}

// ── QUIZ ──────────────────────────────────────────────────────────────────────
function startLesson(id) {
  const bank = QUESTION_BANK[id] || [];
  state.lessonId = id;
  state.questions = shuffle(bank).slice(0, Math.min(15, bank.length));
  state.current = 0;
  state.answers = [];
  state.selected = null;
  state.confirmed = false;
  state.view = 'quiz';
  render();
}

function renderQuiz() {
  const lesson = LESSONS.find(l => l.id === state.lessonId);
  const q = state.questions[state.current];
  const total = state.questions.length;
  const pct = Math.round((state.current / total) * 100);

  const opts = q.opts.map((opt, i) => {
    let cls = '';
    if (state.confirmed) {
      if (i === q.ans) cls = 'reveal';
      else if (i === state.selected && i !== q.ans) cls = 'wrong';
    } else if (i === state.selected) cls = 'selected';
    return `
    <button class="option-btn ${cls}" onclick="selectOpt(${i})" ${state.confirmed ? 'disabled' : ''}>
      <span class="opt-letter">${['A','B','C','D'][i]}</span>
      ${opt}
    </button>`;
  }).join('');

  const feedback = state.confirmed ? `
  <div class="feedback ${state.selected === q.ans ? 'ok' : 'nok'}">
    ${state.selected === q.ans ? '✓ Correct ! ' : '✗ Incorrect. '}${q.expl}
  </div>` : '';

  const navBtn = state.confirmed
    ? `<button class="btn btn-primary" onclick="nextQ()">${state.current < total - 1 ? 'Question suivante →' : 'Voir les résultats'}</button>`
    : `<button class="btn btn-primary" onclick="confirmQ()" ${state.selected === null ? 'disabled' : ''}>Valider</button>`;

  app().innerHTML = `
  <div class="app-shell">
    ${topbar(`<button class="btn btn-sm" onclick="go('home')">← Leçons</button>`)}
    <div class="main-content">
      <div class="card">
        <div style="font-size:13px;color:var(--muted);margin-bottom:1rem;">
          Leçon ${state.lessonId} — <strong>${lesson.title}</strong>
        </div>
        <div class="quiz-topbar">
          <div class="quiz-progress-bar">
            <div class="progress-bar">
              <div class="progress-fill fill-blue" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="quiz-counter">${state.current + 1} / ${total}</div>
        </div>
        <div class="question-label">Question ${state.current + 1}</div>
        <div class="question-text">${q.q}</div>
        <div class="options">${opts}</div>
        ${feedback}
        <div class="quiz-nav">${navBtn}</div>
      </div>
    </div>
  </div>`;
}

function selectOpt(i) {
  if (state.confirmed) return;
  state.selected = i;
  renderQuiz();
}

function confirmQ() {
  if (state.selected === null) return;
  state.confirmed = true;
  state.answers.push({ selected: state.selected, correct: state.questions[state.current].ans });
  renderQuiz();
}

function nextQ() {
  if (state.current < state.questions.length - 1) {
    state.current++;
    state.selected = null;
    state.confirmed = false;
    renderQuiz();
  } else {
    finishQuiz();
  }
}

async function finishQuiz() {
  const correct = state.answers.filter(a => a.selected === a.correct).length;
  const total = state.answers.length;
  const lesson = LESSONS.find(l => l.id === state.lessonId);
  state.lastResult = { lessonId: state.lessonId, lessonTitle: lesson.title, correct, total, percent: Math.round(correct / total * 100) };
  // Enregistrer sur le serveur
  try {
    await api('POST', '/api/scores', {
      lessonId: state.lessonId,
      lessonTitle: lesson.title,
      correct, total,
      answers: state.answers
    });
    await loadMyScores();
  } catch (_) {}
  state.view = 'result';
  render();
}

// ── RESULT ────────────────────────────────────────────────────────────────────
function renderResult() {
  const r = state.lastResult;
  const wrong = r.total - r.correct;
  const m = scoreMention(r.percent);
  const fc = fillColor(r.percent);

  app().innerHTML = `
  <div class="app-shell">
    ${topbar()}
    <div class="main-content">
      <div class="card result-wrap">
        <div style="font-size:13px;color:var(--muted);margin-bottom:1rem;">
          Leçon ${r.lessonId} — <strong>${r.lessonTitle}</strong>
        </div>
        <div class="result-ring">
          <div class="result-pct">${r.percent}%</div>
          <div class="result-label">Score</div>
        </div>
        <div class="result-mention" style="color:${m.color}">${m.text}</div>
        <div class="stats-row">
          <div class="stat-box">
            <div class="sv" style="color:var(--green)">${r.correct}</div>
            <div class="sl">Correctes</div>
          </div>
          <div class="stat-box">
            <div class="sv" style="color:var(--red)">${wrong}</div>
            <div class="sl">Incorrectes</div>
          </div>
          <div class="stat-box">
            <div class="sv">${r.total}</div>
            <div class="sl">Total</div>
          </div>
        </div>
        <div class="progress-bar" style="margin-bottom:1.5rem">
          <div class="progress-fill ${fc}" style="width:${r.percent}%"></div>
        </div>
        <div class="result-actions">
          <button class="btn btn-primary" onclick="startLesson(${r.lessonId})">🔄 Recommencer</button>
          <button class="btn" onclick="go('home')">📚 Autres leçons</button>
          <button class="btn" onclick="go('dashboard')">📊 Mon bilan</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── DASHBOARD ÉLÈVE ───────────────────────────────────────────────────────────
async function renderDashboard() {
  app().innerHTML = `
  <div class="app-shell">
    ${topbar(`<button class="btn btn-sm" onclick="go('home')">← Leçons</button>`)}
    <div class="main-content">
      <div class="splash"><div class="spinner-lg"></div><p>Chargement…</p></div>
    </div>
  </div>`;

  let data;
  try { data = await api('GET', '/api/scores/dashboard/me'); }
  catch (_) { data = { scores: [], byLesson: [], totalAttempts: 0 }; }

  const totalAttempts = data.totalAttempts || 0;
  const avgScore = data.scores.length
    ? Math.round(data.scores.reduce((a, b) => a + b.percent, 0) / data.scores.length)
    : 0;
  const bestLesson = data.byLesson.reduce((best, l) => l.bestScore > (best?.bestScore || 0) ? l : best, null);
  const lessonsStarted = data.byLesson.length;

  // Construire tableau par leçon
  const lessonRows = LESSONS.map(l => {
    const s = data.byLesson.find(b => b.lessonId === l.id);
    if (!s) return `
    <div class="lesson-perf-row">
      <div class="lpr-name" style="color:var(--hint)">${l.id}. ${l.title}</div>
      <div class="lpr-bar"><div class="progress-bar"><div class="progress-fill fill-blue" style="width:0%"></div></div></div>
      <div class="lpr-pct" style="color:var(--hint)">—</div>
      <div class="lpr-tries" style="color:var(--hint)">0 essai</div>
    </div>`;
    const fc = fillColor(s.bestScore);
    return `
    <div class="lesson-perf-row">
      <div class="lpr-name">${l.id}. ${l.title}</div>
      <div class="lpr-bar">
        <div class="progress-bar">
          <div class="progress-fill ${fc}" style="width:${s.bestScore}%"></div>
        </div>
      </div>
      <div class="lpr-pct">${s.bestScore}%</div>
      <div class="lpr-tries">${s.attempts} essai(s)</div>
    </div>`;
  }).join('');

  // Historique récent
  const recent = [...(data.scores || [])].reverse().slice(0, 8).map(s => `
  <tr>
    <td>${fmtDate(s.date)}</td>
    <td>${s.lessonTitle}</td>
    <td><span class="badge badge-${scoreColor(s.percent)}" style="background:${s.percent>=80?'var(--green-lt)':s.percent>=50?'var(--amber-lt)':'var(--red-lt)'};color:${s.percent>=80?'var(--green)':s.percent>=50?'var(--amber)':'var(--red)'}">${s.percent}%</span></td>
    <td>${s.correct}/${s.total}</td>
    <td><button class="btn btn-sm" onclick="startLesson(${s.lessonId})">Réessayer</button></td>
  </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--hint)">Aucune tentative pour l\'instant</td></tr>';

  app().innerHTML = `
  <div class="app-shell">
    ${topbar(`<button class="btn btn-sm" onclick="go('home')">← Leçons</button>`)}
    <div class="main-content">
      <div class="section-header">
        <div>
          <div class="section-title">Mon tableau de bord</div>
          <div class="section-sub">${state.user.name} · ${state.user.class || '6ème'}</div>
        </div>
        <button class="btn" onclick="go('home')">Faire un quiz</button>
      </div>

      <div class="metrics-row">
        <div class="metric-card">
          <div class="mv">${totalAttempts}</div>
          <div class="ml">Tentatives totales</div>
        </div>
        <div class="metric-card">
          <div class="mv">${lessonsStarted}</div>
          <div class="ml">Leçons commencées</div>
        </div>
        <div class="metric-card">
          <div class="mv">${avgScore}%</div>
          <div class="ml">Score moyen</div>
        </div>
        <div class="metric-card">
          <div class="mv">${bestLesson ? bestLesson.bestScore + '%' : '—'}</div>
          <div class="ml">Meilleur score${bestLesson ? '<br><span style="font-size:11px;color:var(--muted)">L.' + bestLesson.lessonId + '</span>' : ''}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:1rem">
        <div class="section-header" style="margin-bottom:1rem">
          <div class="section-title" style="font-size:15px">Performances par leçon</div>
        </div>
        ${lessonRows}
      </div>

      <div class="card">
        <div class="section-header" style="margin-bottom:1rem">
          <div class="section-title" style="font-size:15px">Historique récent</div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Leçon</th><th>Score</th><th>Résultat</th><th></th></tr></thead>
            <tbody>${recent}</tbody>
          </table>
        </div>
      </div>
    </div>
  </div>`;
}

// ── ADMIN ──────────────────────────────────────────────────────────────────────
let adminTab = 'students';

async function renderAdmin() {
  if (state.user.role !== 'admin') { go('home'); return; }

  app().innerHTML = `
  <div class="app-shell">
    ${topbar(`<button class="btn btn-sm" onclick="go('home')">← Leçons</button>`)}
    <div class="main-content">
      <div class="section-header">
        <div>
          <div class="section-title">Panneau professeur</div>
          <div class="section-sub">Gestion des élèves et suivi des performances</div>
        </div>
      </div>
      <div class="tabs">
        <div class="tab ${adminTab==='students'?'active':''}" onclick="switchTab('students')">👨‍🎓 Élèves</div>
        <div class="tab ${adminTab==='scores'?'active':''}" onclick="switchTab('scores')">📊 Performances</div>
      </div>
      <div id="admin-content">
        <div class="splash"><div class="spinner-lg"></div></div>
      </div>
    </div>
  </div>`;

  loadAdminTab();
}

function switchTab(tab) {
  adminTab = tab;
  // re-render juste les tabs et le contenu
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => { if (t.textContent.includes(tab === 'students' ? 'Élèves' : 'Performances')) t.classList.add('active'); });
  loadAdminTab();
}

async function loadAdminTab() {
  const c = document.getElementById('admin-content');
  if (!c) return;
  c.innerHTML = `<div class="splash"><div class="spinner-lg"></div></div>`;

  if (adminTab === 'students') {
    let users;
    try { users = await api('GET', '/api/users'); } catch (_) { users = []; }
    const rows = users.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.username}</td>
      <td>${u.class || '—'}</td>
      <td><span class="badge badge-${u.role === 'admin' ? 'admin' : 'student'}">${u.role === 'admin' ? 'Professeur' : 'Élève'}</span></td>
      <td>
        <button class="btn btn-sm" onclick="openEditModal('${u.id}','${u.name}','${u.class||''}')">✏️</button>
        ${u.role !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}','${u.name}')">🗑</button>` : ''}
      </td>
    </tr>`).join('');

    c.innerHTML = `
    <div class="card" style="margin-bottom:1rem">
      <div class="section-header" style="margin-bottom:1rem">
        <div class="section-title" style="font-size:15px">Liste des utilisateurs (${users.length})</div>
        <button class="btn btn-primary btn-sm" onclick="openAddModal()">+ Ajouter un élève</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nom</th><th>Identifiant</th><th>Classe</th><th>Rôle</th><th>Actions</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--hint)">Aucun utilisateur</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;
  }

  if (adminTab === 'scores') {
    let data;
    try { data = await api('GET', '/api/scores/dashboard/all'); }
    catch (_) { data = { students: [], totalScores: 0, totalStudents: 0 }; }

    const metricHtml = `
    <div class="metrics-row" style="margin-bottom:1.25rem">
      <div class="metric-card"><div class="mv">${data.totalStudents}</div><div class="ml">Élèves inscrits</div></div>
      <div class="metric-card"><div class="mv">${data.students.length}</div><div class="ml">Élèves actifs</div></div>
      <div class="metric-card"><div class="mv">${data.totalScores}</div><div class="ml">Tentatives totales</div></div>
    </div>`;

    const studentRows = data.students.map(st => {
      const fc = fillColor(st.avgScore);
      return `
      <tr>
        <td><strong>${st.name}</strong></td>
        <td>${st.attempts}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="progress-bar" style="flex:1;height:8px">
              <div class="progress-fill ${fc}" style="width:${st.avgScore}%"></div>
            </div>
            <span style="font-size:13px;font-weight:600;min-width:38px">${st.avgScore}%</span>
          </div>
        </td>
        <td>${st.bestScore}%</td>
        <td><button class="btn btn-sm" onclick="showStudentDetail('${st.userId}')">Détail</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--hint)">Aucune donnée</td></tr>';

    c.innerHTML = `
    ${metricHtml}
    <div class="card">
      <div class="section-header" style="margin-bottom:1rem">
        <div class="section-title" style="font-size:15px">Performances des élèves</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Élève</th><th>Tentatives</th><th>Score moyen</th><th>Meilleur</th><th></th></tr></thead>
          <tbody>${studentRows}</tbody>
        </table>
      </div>
    </div>`;
  }
}

// ── ADMIN Modals ──────────────────────────────────────────────────────────────
function openAddModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal';
  overlay.innerHTML = `
  <div class="modal-box">
    <h2>➕ Ajouter un élève</h2>
    <div class="form-row">
      <div class="form-group"><label>Nom complet</label><input id="m-name" placeholder="Ex: Koné Moussa"></div>
      <div class="form-group"><label>Classe</label><input id="m-class" placeholder="6ème 1" value="6ème 1"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Identifiant</label><input id="m-user" placeholder="ex: kone.moussa"></div>
      <div class="form-group"><label>Mot de passe</label><input id="m-pass" type="password" placeholder="••••••••"></div>
    </div>
    <div id="m-err" class="error-msg hidden"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="submitAdd()">Créer</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function submitAdd() {
  const name = $('m-name').value.trim();
  const className = $('m-class').value.trim();
  const username = $('m-user').value.trim();
  const password = $('m-pass').value;
  const err = $('m-err');
  if (!name || !username || !password) { err.textContent = 'Tous les champs sont requis.'; err.classList.remove('hidden'); return; }
  try {
    await api('POST', '/api/users', { name, className, username, password, role: 'student' });
    closeModal();
    loadAdminTab();
  } catch (e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

function openEditModal(id, name, cls) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal';
  overlay.innerHTML = `
  <div class="modal-box">
    <h2>✏️ Modifier l'utilisateur</h2>
    <div class="form-group"><label>Nom complet</label><input id="e-name" value="${name}"></div>
    <div class="form-group"><label>Classe</label><input id="e-class" value="${cls}"></div>
    <div class="form-group"><label>Nouveau mot de passe (laisser vide = inchangé)</label><input id="e-pass" type="password" placeholder="••••••••"></div>
    <div id="e-err" class="error-msg hidden"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="submitEdit('${id}')">Enregistrer</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function submitEdit(id) {
  const name = $('e-name').value.trim();
  const className = $('e-class').value.trim();
  const password = $('e-pass').value;
  const err = $('e-err');
  const body = { name, className };
  if (password) body.password = password;
  try {
    await api('PUT', `/api/users/${id}`, body);
    closeModal();
    loadAdminTab();
  } catch (e) { err.textContent = e.message; err.classList.remove('hidden'); }
}

async function deleteUser(id, name) {
  if (!confirm(`Supprimer l'élève "${name}" ? Cette action est irréversible.`)) return;
  try {
    await api('DELETE', `/api/users/${id}`);
    loadAdminTab();
  } catch (e) { alert(e.message); }
}

async function showStudentDetail(userId) {
  let allScores;
  try { allScores = await api('GET', '/api/scores/all'); }
  catch (_) { allScores = []; }
  const myS = allScores.filter(s => s.userId === userId).reverse().slice(0, 20);
  const name = myS[0]?.userName || 'Élève';

  const rows = myS.map(s => `
  <tr>
    <td>${fmtDate(s.date)}</td>
    <td>${s.lessonTitle}</td>
    <td><span style="font-weight:600;color:${s.percent>=80?'var(--green)':s.percent>=50?'var(--amber)':'var(--red)'}">${s.percent}%</span></td>
    <td>${s.correct}/${s.total}</td>
  </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--hint)">Aucun résultat</td></tr>';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal';
  overlay.innerHTML = `
  <div class="modal-box" style="max-width:520px">
    <h2>📊 Détail — ${name}</h2>
    <div class="table-wrap" style="max-height:380px;overflow-y:auto;margin-top:1rem">
      <table>
        <thead><tr><th>Date</th><th>Leçon</th><th>Score</th><th>Résultat</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="modal-actions"><button class="btn btn-primary" onclick="closeModal()">Fermer</button></div>
  </div>`;
  document.body.appendChild(overlay);
}

function closeModal() {
  const m = document.getElementById('modal');
  if (m) m.remove();
}

// ── Navigation ────────────────────────────────────────────────────────────────
function go(view) {
  state.view = view;
  render();
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const me = await api('GET', '/api/auth/me');
    state.user = me;
    await loadMyScores();
    go('home');
  } catch (_) {
    go('login');
  }
}

// Expose globals
window.doLogin = doLogin;
window.logout = logout;
window.go = go;
window.startLesson = startLesson;
window.selectOpt = selectOpt;
window.confirmQ = confirmQ;
window.nextQ = nextQ;
window.switchTab = switchTab;
window.openAddModal = openAddModal;
window.submitAdd = submitAdd;
window.openEditModal = openEditModal;
window.submitEdit = submitEdit;
window.deleteUser = deleteUser;
window.showStudentDetail = showStudentDetail;
window.closeModal = closeModal;

init();
