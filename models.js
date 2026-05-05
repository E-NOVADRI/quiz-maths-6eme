// models.js — Schémas Mongoose

const mongoose = require('mongoose');

// ── User ──────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true, trim: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['admin', 'student'], default: 'student' },
  name:      { type: String, required: true, trim: true },
  class:     { type: String, default: '6ème' },
}, { timestamps: true });

// ── Score ─────────────────────────────────────────────────────────────────────
const scoreSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:     { type: String, required: true },
  lessonId:     { type: Number, required: true },
  lessonTitle:  { type: String },
  correct:      { type: Number, required: true },
  total:        { type: Number, required: true },
  percent:      { type: Number, required: true },
  answers:      { type: Array, default: [] },
}, { timestamps: true });

// Index pour accélérer les requêtes par utilisateur
scoreSchema.index({ userId: 1 });
scoreSchema.index({ userId: 1, lessonId: 1 });

const User  = mongoose.model('User',  userSchema);
const Score = mongoose.model('Score', scoreSchema);

module.exports = { User, Score };
