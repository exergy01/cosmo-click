const express = require('express');
const cors = require('cors');
const sqlite3 = require('better-sqlite3');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Инициализация базы данных SQLite
const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3(dbPath);

// Создание таблиц
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ccc REAL DEFAULT 0,
    cs REAL DEFAULT 0,
    energy INTEGER DEFAULT 100, -- Добавляем колонку energy
    asteroidResources REAL DEFAULT 0,
    cargoCCC REAL DEFAULT 0,
    cargoLevel INTEGER DEFAULT 1,
    asteroids TEXT DEFAULT '[]',
    drones TEXT DEFAULT '[]',
    tasks TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    gameType TEXT,
    result TEXT,
    amount REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS exchange_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    type TEXT,
    amount_from REAL,
    amount_to REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

// Проверка и создание тестового пользователя
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  db.prepare(
    `INSERT INTO users (ccc, cs, energy, asteroidResources, cargoCCC, cargoLevel, asteroids, drones, tasks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(0, 0, 100, 0, 0, 1, '[]', '[]', JSON.stringify(Array(10).fill(false)));
}

// Получение данных пользователя
app.get('/user/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Обновление валют
app.post('/update-currencies', (req, res) => {
  const { userId, ccc, cs } = req.body;
  db.prepare('UPDATE users SET ccc = ?, cs = ? WHERE id = ?').run(ccc, cs, userId);
  res.json({ success: true });
});

// Обновление энергии
app.post('/update-energy', (req, res) => {
  const { userId, energy } = req.body;
  db.prepare('UPDATE users SET energy = ? WHERE id = ?').run(energy, userId);
  res.json({ success: true });
});

// Обновление ресурсов
app.post('/update-resources', (req, res) => {
  const { userId, asteroidResources, cargoCCC } = req.body;
  db.prepare('UPDATE users SET asteroidResources = ?, cargoCCC = ? WHERE id = ?').run(
    asteroidResources,
    cargoCCC,
    userId
  );
  res.json({ success: true });
});

// Сбор CCC
app.post('/collect-ccc', (req, res) => {
  const { userId, amount } = req.body;
  const user = db.prepare('SELECT ccc, cargoCCC FROM users WHERE id = ?').get(userId);
  if (user) {
    const newCCC = user.ccc + amount;
    const newCargoCCC = user.cargoCCC - amount;
    db.prepare('UPDATE users SET ccc = ?, cargoCCC = ? WHERE id = ?').run(newCCC, newCargoCCC, userId);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Покупка астероида
app.post('/buy-asteroid', (req, res) => {
  const { userId, asteroidId, cost, resources } = req.body;
  const user = db.prepare('SELECT cs, asteroids, asteroidResources FROM users WHERE id = ?').get(userId);
  if (user) {
    const asteroids = JSON.parse(user.asteroids);
    if (user.cs >= cost && !asteroids.includes(asteroidId)) {
      asteroids.push(asteroidId);
      const newCS = user.cs - cost;
      const newAsteroidResources = user.asteroidResources + resources;
      db.prepare(
        'UPDATE users SET cs = ?, asteroids = ?, asteroidResources = ? WHERE id = ?'
      ).run(newCS, JSON.stringify(asteroids), newAsteroidResources, userId);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Not enough CS or asteroid already purchased' });
    }
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Покупка дрона
app.post('/buy-drone', (req, res) => {
  const { userId, droneId, cost } = req.body;
  const user = db.prepare('SELECT cs, drones FROM users WHERE id = ?').get(userId);
  if (user) {
    const drones = JSON.parse(user.drones);
    if (user.cs >= cost && !drones.includes(droneId)) {
      drones.push(droneId);
      const newCS = user.cs - cost;
      db.prepare('UPDATE users SET cs = ?, drones = ? WHERE id = ?').run(
        newCS,
        JSON.stringify(drones),
        userId
      );
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Not enough CS or drone already purchased' });
    }
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Обновление уровня карго
app.post('/upgrade-cargo', (req, res) => {
  const { userId, level, cost } = req.body;
  const user = db.prepare('SELECT cs, cargoLevel FROM users WHERE id = ?').get(userId);
  if (user) {
    if (user.cs >= cost && user.cargoLevel < level) {
      const newCS = user.cs - cost;
      db.prepare('UPDATE users SET cs = ?, cargoLevel = ? WHERE id = ?').run(newCS, level, userId);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Not enough CS or invalid level' });
    }
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Выполнение задания
app.post('/complete-task', (req, res) => {
  const { userId, taskId } = req.body;
  const user = db.prepare('SELECT cs, tasks FROM users WHERE id = ?').get(userId);
  if (user) {
    const tasks = JSON.parse(user.tasks);
    if (!tasks[taskId - 1]) {
      tasks[taskId - 1] = true;
      const newCS = user.cs + 1;
      db.prepare('UPDATE users SET cs = ?, tasks = ? WHERE id = ?').run(
        newCS,
        JSON.stringify(tasks),
        userId
      );
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Task already completed' });
    }
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Сохранение истории игры
app.post('/save-game-history', (req, res) => {
  const { userId, gameType, result, amount } = req.body;
  db.prepare(
    'INSERT INTO game_history (userId, gameType, result, amount) VALUES (?, ?, ?, ?)'
  ).run(userId, gameType, result, amount);
  res.json({ success: true });
});

// Получение истории игр
app.get('/game-history/:userId', (req, res) => {
  const history = db
    .prepare('SELECT * FROM game_history WHERE userId = ? ORDER BY timestamp DESC')
    .all(req.params.userId);
  res.json(history);
});

// Обмен CCC на CS
app.post('/exchange-ccc-to-cs', (req, res) => {
  const { userId, amountCCC } = req.body;
  const user = db.prepare('SELECT ccc, cs FROM users WHERE id = ?').get(userId);
  if (user) {
    if (user.ccc >= amountCCC) {
      const rate = 100; // 100 CCC = 1 CS
      const amountCS = amountCCC / rate;
      const newCCC = user.ccc - amountCCC;
      const newCS = user.cs + amountCS;

      db.prepare('UPDATE users SET ccc = ?, cs = ? WHERE id = ?').run(newCCC, newCS, userId);

      db.prepare(
        'INSERT INTO exchange_history (userId, type, amount_from, amount_to) VALUES (?, ?, ?, ?)'
      ).run(userId, 'CCC_TO_CS', amountCCC, amountCS);

      res.json({ success: true, amountCS });
    } else {
      res.status(400).json({ error: 'Not enough CCC' });
    }
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Обмен CS на CCC
app.post('/exchange-cs-to-ccc', (req, res) => {
  const { userId, amountCS } = req.body;
  const user = db.prepare('SELECT ccc, cs FROM users WHERE id = ?').get(userId);
  if (user) {
    if (user.cs >= amountCS) {
      const rate = 50; // 1 CS = 50 CCC
      const amountCCC = amountCS * rate;
      const newCS = user.cs - amountCS;
      const newCCC = user.ccc + amountCCC;

      db.prepare('UPDATE users SET ccc = ?, cs = ? WHERE id = ?').run(newCCC, newCS, userId);

      db.prepare(
        'INSERT INTO exchange_history (userId, type, amount_from, amount_to) VALUES (?, ?, ?, ?)'
      ).run(userId, 'CS_TO_CCC', amountCS, amountCCC);

      res.json({ success: true, amountCCC });
    } else {
      res.status(400).json({ error: 'Not enough CS' });
    }
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Получение истории обменов
app.get('/exchange-history/:userId', (req, res) => {
  const history = db
    .prepare('SELECT * FROM exchange_history WHERE userId = ? ORDER BY timestamp DESC')
    .all(req.params.userId);
  res.json(history);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});