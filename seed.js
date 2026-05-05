// seed.js — Crée les comptes par défaut si la base est vide

const bcrypt = require('bcryptjs');
const { User } = require('./models');

async function seed() {
  const count = await User.countDocuments();
  if (count > 0) {
    console.log('ℹ️  Base déjà initialisée, seed ignoré.');
    return;
  }

  const hash = await bcrypt.hash('password', 10);

  await User.insertMany([
    {
      username: 'prof',
      password: hash,
      role: 'admin',
      name: 'Professeur SILUE',
      class: '',
    },
    {
      username: 'eleve1',
      password: hash,
      role: 'student',
      name: 'Koné Seydou',
      class: '6ème 1',
    },
  ]);

  console.log('✅ Comptes par défaut créés :');
  console.log('   👨‍🏫 prof / password');
  console.log('   👨‍🎓 eleve1 / password');
}

module.exports = seed;
