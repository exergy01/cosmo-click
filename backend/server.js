const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const port = process.env.PORT || 3001;

// Настройка CORS
app.use(cors());
app.use(express.json());

// Инициализация базы данных
const db = new Database('cosmo-click.db', { verbose: console.log });

// Создание таблиц (пример)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    ccc REAL DEFAULT 0,
    cs REAL DEFAULT 0,
    tasks TEXT DEFAULT '[]',
    drones TEXT DEFAULT '[]',
    asteroids TEXT DEFAULT '[]',
    cargoLevel INTEGER DEFAULT 1,
    cargoCCC REAL DEFAULT 0,
    asteroidResources REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    type TEXT,
    amount_from REAL,
    amount_to REAL,
    timestamp TEXT
  );
`);

// Получение данных пользователя
app.get('/user/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (!user) {
    // Если пользователь не найден, создаём нового
    db.prepare(`
      INSERT INTO users (id, ccc, cs, tasks, drones, asteroids, cargoLevel, cargoCCC, asteroidResources)
      VALUES (?, 0, 0, '[]', '[]', '[]', 1, 0, 0)
    `).run(userId);
    return res.json({
      id: userId,
      ccc: 0,
      cs: 0,
      tasks: [],
      drones: [],
      asteroids: [],
      cargoLevel: 1,
      cargoCCC: 0,
      asteroidResources: 0,
    });
  }

  res.json({
    ...user,
    tasks: JSON.parse(user.tasks),
    drones: JSON.parse(user.drones),
    asteroids: JSON.parse(user.asteroids),
  });
});

// Обновление ресурсов
app.post('/update-resources', (req, res) => {
  const { userId, cargoCCC, asteroidResources } = req.body;
  db.prepare('UPDATE users SET cargoCCC = ?, asteroidResources = ? WHERE id = ?')
    .run(cargoCCC, asteroidResources, userId);
  res.json({ success: true });
});

// Сбор CCC
app.post('/collect-ccc', (req, res) => {
  const { userId, amount } = req.body;
  db.prepare('UPDATE users SET ccc = ccc + ?, cargoCCC = 0 WHERE id = ?')
    .run(amount, userId);
  res.json({ success: true });
});

// Покупка астероида
app.post('/buy-asteroid', (req, res) => {
  const { userId, asteroidId, cost, resources } = req.body;
  const user = db.prepare('SELECT cs, asteroids FROM users WHERE id = ?').get(userId);

  if (user.cs < cost) {
    return res.json({ success: false, error: 'Недостаточно CS' });
  }

  const asteroids = JSON.parse(user.asteroids);
  asteroids.push(asteroidId);

  db.prepare(`
    UPDATE users
    SET cs = cs - ?,
        asteroids = ?,
        asteroidResources = asteroidResources + ?
    WHERE id = ?
  `).run(cost, JSON.stringify(asteroids), resources, userId);

  res.json({ success: true });
});

// Покупка дрона
app.post('/buy-drone', (req, res) => {
  const { userId, droneId, cost } = req.body;
  const user = db.prepare('SELECT cs, drones FROM users WHERE id = ?').get(userId);

  if (user.cs < cost) {
    return res.json({ success: false, error: 'Недостаточно CS' });
  }

  const drones = JSON.parse(user.drones);
  drones.push(droneId);

  db.prepare(`
    UPDATE users
    SET cs = cs - ?,
        drones = ?
    WHERE id = ?
  `).run(cost, JSON.stringify(drones), userId);

  res.json({ success: true });
});

// Обновление уровня карго
app.post('/upgrade-cargo', (req, res) => {
  const { userId, level, cost } = req.body;
  const user = db.prepare('SELECT cs FROM users WHERE id = ?').get(userId);

  if (user.cs < cost) {
    return res.json({ success: false, error: 'Недостаточно CS' });
  }

  db.prepare('UPDATE users SET cs = cs - ?, cargoLevel = ? WHERE id = ?')
    .run(cost, level, userId);

  res.json({ success: true });
});

// Выполнение задания
app.post('/complete-task', (req, res) => {
  const { userId, taskId } = req.body;
  const user = db.prepare('SELECT tasks FROM users WHERE id = ?').get(userId);

  const tasks = JSON.parse(user.tasks);
  tasks[taskId - 1] = true;

  db.prepare('UPDATE users SET cs = cs + 1, tasks = ? WHERE id = ?')
    .run(JSON.stringify(tasks), userId);

  res.json({ success: true });
});

// Обмен CCC на CS
app.post('/exchange-ccc-to-cs', (req, res) => {
  const { userId, amountCCC } = req.body;
  const user = db.prepare('SELECT ccc FROM users WHERE id = ?').get(userId);

  if (user.ccc < amountCCC) {
    return res.json({ success: false, error: 'Недостаточно CCC' });
  }

  const amountCS = amountCCC / 100; // 100 CCC = 1 CS

  db.prepare('UPDATE users SET ccc = ccc - ?, cs = cs + ? WHERE id = ?')
    .run(amountCCC, amountCS, userId);

  db.prepare(`
    INSERT INTO exchanges (userId, type, amount_from, amount_to, timestamp)
    VALUES (?, 'CCC_TO_CS', ?, ?, ?)
  `).run(userId, amountCCC, amountCS, new Date().toISOString());

  res.json({ success: true, amountCS });
});

// Обмен CS на CCC
app.post('/exchange-cs-to-ccc', (req, res) => {
  const { userId, amountCS } = req.body;
  const user = db.prepare('SELECT cs FROM users WHERE id = ?').get(userId);

  if (user.cs < amountCS) {
    return res.json({ success: false, error: 'Недостаточно CS' });
  }

  const amountCCC = amountCS * 50; // 1 CS = 50 CCC

  db.prepare('UPDATE users SET cs = cs - ?, ccc = ccc + ? WHERE id = ?')
    .run(amountCS, amountCCC, userId);

  db.prepare(`
    INSERT INTO exchanges (userId, type, amount_from, amount_to, timestamp)
    VALUES (?, 'CS_TO_CCC', ?, ?, ?)
  `).run(userId, amountCS, amountCCC, new Date().toISOString());

  res.json({ success: true, amountCCC });
});

// Получение истории обменов
app.get('/exchanges/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const exchanges = db.prepare('SELECT * FROM exchanges WHERE userId = ? ORDER BY timestamp DESC')
    .all(userId);
  res.json(exchanges);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});