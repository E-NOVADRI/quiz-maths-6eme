require('dotenv').config();

const express      = require('express');
const mongoose     = require('mongoose');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path         = require('path');
const seed         = require('./seed');
const { User, Score } = require('./models');

const app        = express();
const PORT       = process.env.PORT       || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'maths6eme-nafoun-dev-secret';
const MONGO_URI  = process.env.MONGO_URI  || 'mongodb://localhost:27017/quiz-maths';

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  const token = req.cookies.token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token invalide ou expiré' }); }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès réservé au professeur' });
    next();
  });
}

function pub(u) {
  return { id: u._id, username: u.username, role: u.role, name: u.name, class: u.class, createdAt: u.createdAt };
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Identifiants manquants' });
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    const token = jwt.sign({ id: user._id, username: user.username, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*3600*1000, sameSite: 'lax' });
    res.json({ token, user: pub(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Introuvable' });
    res.json(pub(user));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── USERS ─────────────────────────────────────────────────────────────────────
app.get('/api/users', requireAdmin, async (req, res) => {
  try { res.json((await User.find().sort({ createdAt: 1 })).map(pub)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, name, role, className } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'Champs manquants' });
    if (await User.findOne({ username })) return res.status(409).json({ error: 'Identifiant déjà utilisé' });
    const user = await User.create({ username, password: await bcrypt.hash(password, 10), role: role||'student', name, class: className||'6ème' });
    res.status(201).json(pub(user));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { name, password, className, role } = req.body;
    const upd = {};
    if (name)      upd.name     = name;
    if (className) upd.class    = className;
    if (role)      upd.role     = role;
    if (password)  upd.password = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(req.params.id, upd, { new: true });
    if (!user) return res.status(404).json({ error: 'Introuvable' });
    res.json({ ok: true, user: pub(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Introuvable' });
    await Score.deleteMany({ userId: req.params.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SCORES ────────────────────────────────────────────────────────────────────
app.post('/api/scores', requireAuth, async (req, res) => {
  try {
    const { lessonId, lessonTitle, correct, total, answers } = req.body;
    if (lessonId == null || correct == null || total == null) return res.status(400).json({ error: 'Données manquantes' });
    const score = await Score.create({ userId: req.user.id, userName: req.user.name, lessonId, lessonTitle, correct, total, percent: Math.round(correct/total*100), answers: answers||[] });
    res.status(201).json(score);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/scores/me', requireAuth, async (req, res) => {
  try { res.json(await Score.find({ userId: req.user.id }).sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/scores/dashboard/me', requireAuth, async (req, res) => {
  try {
    const scores = await Score.find({ userId: req.user.id }).sort({ createdAt: -1 });
    const map = {};
    scores.forEach(s => {
      if (!map[s.lessonId]) map[s.lessonId] = { lessonId: s.lessonId, lessonTitle: s.lessonTitle, attempts: 0, bestScore: 0, lastScore: 0, totalCorrect: 0, totalQuestions: 0 };
      const l = map[s.lessonId];
      l.attempts++; l.bestScore = Math.max(l.bestScore, s.percent); l.lastScore = s.percent; l.totalCorrect += s.correct; l.totalQuestions += s.total;
    });
    res.json({ scores, byLesson: Object.values(map), totalAttempts: scores.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/scores/all', requireAdmin, async (req, res) => {
  try { res.json(await Score.find().sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/scores/dashboard/all', requireAdmin, async (req, res) => {
  try {
    const [scores, totalStudents] = await Promise.all([Score.find().sort({ createdAt: -1 }), User.countDocuments({ role: 'student' })]);
    const map = {};
    scores.forEach(s => {
      const id = s.userId.toString();
      if (!map[id]) map[id] = { userId: id, name: s.userName, attempts: 0, bestScore: 0, scores: [] };
      map[id].scores.push(s); map[id].attempts++; map[id].bestScore = Math.max(map[id].bestScore, s.percent);
    });
    const students = Object.values(map).map(st => ({ ...st, avgScore: Math.round(st.scores.reduce((a,b) => a+b.percent, 0) / st.scores.length) }));
    res.json({ students, totalScores: scores.length, totalStudents });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Connexion MongoDB ─────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connecté');
    await seed();
    app.listen(PORT, () => {
      console.log(`✅ Serveur sur http://localhost:${PORT}`);
      console.log('   👨‍🏫 prof / password   👨‍🎓 eleve1 / password');
    });
  })
  .catch(err => {
    console.error('❌ MongoDB:', err.message);
    process.exit(1);
  });
