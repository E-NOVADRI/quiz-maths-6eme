# 📐 Quiz Maths 6ème — Collège Moderne de Nafoun

Application web complète d'auto-évaluation — Node.js + MongoDB Atlas.

---

## 🗂️ Structure du projet

```
quiz-maths/
├── server.js          ← API Express + Auth JWT
├── models.js          ← Schémas MongoDB (User, Score)
├── seed.js            ← Création des comptes par défaut
├── questions.js       ← Banque de questions (backend)
├── package.json
├── .env.example       ← Template des variables d'environnement
├── .gitignore
└── public/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── app.js
        └── questions.js
```

---

## 🚀 DÉPLOIEMENT COMPLET (Render + MongoDB Atlas)

### ÉTAPE 1 — Créer la base de données MongoDB Atlas (gratuit)

1. Allez sur **https://cloud.mongodb.com** et créez un compte gratuit
2. Cliquez **"Build a Database"** → choisissez **"Free" (M0)**
3. Choisissez un cloud provider (ex: AWS) et une région proche (ex: Paris)
4. Cliquez **"Create"**
5. Créez un utilisateur de base :
   - Username : `quizadmin`
   - Password : générez un mot de passe (notez-le !)
   - Cliquez **"Create User"**
6. Dans "Where would you like to connect from?" → choisissez **"0.0.0.0/0"** (partout)
7. Cliquez **"Finish and Close"** puis **"Go to Database"**
8. Cliquez **"Connect"** → **"Drivers"**
9. Copiez l'URI qui ressemble à :
   ```
   mongodb+srv://quizadmin:MOTDEPASSE@cluster0.xxxxx.mongodb.net/
   ```
10. Remplacez `MOTDEPASSE` par votre vrai mot de passe et ajoutez `quiz-maths` à la fin :
    ```
    mongodb+srv://quizadmin:MOTDEPASSE@cluster0.xxxxx.mongodb.net/quiz-maths
    ```
    **Gardez cette URI, vous en aurez besoin à l'étape 3.**

---

### ÉTAPE 2 — Mettre le projet sur GitHub

1. Créez un compte sur **https://github.com**
2. Cliquez **"New repository"** → nommez-le `quiz-maths-6eme` → **"Create repository"**
3. Sur votre ordinateur, installez [Git](https://git-scm.com/downloads) si ce n'est pas fait
4. Ouvrez un terminal dans le dossier `quiz-maths` et tapez :
   ```bash
   git init
   git add .
   git commit -m "première version"
   git branch -M main
   git remote add origin https://github.com/VOTRE_USERNAME/quiz-maths-6eme.git
   git push -u origin main
   ```
   *(Remplacez VOTRE_USERNAME par votre nom GitHub)*

---

### ÉTAPE 3 — Déployer sur Render.com (gratuit)

1. Allez sur **https://render.com** et créez un compte (connectez-vous avec GitHub)
2. Cliquez **"New +"** → **"Web Service"**
3. Sélectionnez votre dépôt `quiz-maths-6eme`
4. Remplissez les champs :
   - **Name** : `quiz-maths-nafoun`
   - **Region** : Frankfurt (Europe)
   - **Branch** : `main`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : Free
5. Descendez jusqu'à **"Environment Variables"** et ajoutez :

   | Key | Value |
   |-----|-------|
   | `MONGO_URI` | `mongodb+srv://quizadmin:MOTDEPASSE@cluster0.xxxxx.mongodb.net/quiz-maths` |
   | `JWT_SECRET` | Une longue chaîne aléatoire (ex: `NafounMaths2024!xK9mP3qR7`) |
   | `NODE_ENV` | `production` |

6. Cliquez **"Create Web Service"**
7. Render va builder et déployer automatiquement (2-3 minutes)
8. Votre app est accessible à l'adresse : `https://quiz-maths-nafoun.onrender.com`

---

## 👥 Comptes par défaut

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| Professeur | `prof` | `password` |
| Élève démo | `eleve1` | `password` |

> ⚠️ Changez les mots de passe via le panneau Admin dès le premier déploiement !

---

## 🔄 Mises à jour

Pour mettre à jour l'application après modifications :

```bash
git add .
git commit -m "mise à jour"
git push
```
Render redéploie automatiquement à chaque push.

---

## 💻 Lancer en local (développement)

```bash
# 1. Copier le fichier d'environnement
cp .env.example .env
# 2. Remplir .env avec votre MONGO_URI et JWT_SECRET
# 3. Installer les dépendances
npm install
# 4. Démarrer
npm start
# → http://localhost:3000
```

---

## ✨ Fonctionnalités

### Élève
- Connexion sécurisée (JWT + cookies httpOnly)
- 13 leçons · 10–15 QCM mélangés aléatoirement
- Feedback immédiat + explication après chaque réponse
- Tableau de bord : score moyen, meilleur score, progression par leçon, historique

### Professeur (admin)
- Créer / modifier / supprimer des comptes élèves
- Vue globale des performances de toute la classe
- Détail par élève (historique complet)

---

## 🛠️ Ajouter des questions

Modifiez **les deux fichiers** :
- `questions.js` (backend)
- `public/js/questions.js` (frontend)

```javascript
{ 
  q: "Votre question ?",
  opts: ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
  ans: 0,          // index de la bonne réponse (0, 1, 2 ou 3)
  expl: "Explication de la bonne réponse."
}
```
