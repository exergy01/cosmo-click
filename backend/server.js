const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const db = new Database('game.db', { verbose: console.log });

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
    asteroidResources REAL DEFAULT 0,
    energy INTEGER DEFAULT 1000
  );

  CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    type TEXT,
    amount_from REAL,
    amount_to REAL,
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    gameType TEXT,
    result TEXT,
    amount REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

app.get('/user/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (!user) {
    const initialTasks = JSON.stringify(Array(15).fill(false));
    db.prepare(`
      INSERT INTO users (id, ccc, cs, tasks, drones, asteroids, cargoLevel, cargoCCC, asteroidResources, energy)
      VALUES (?, 100, 10, ?, '[]', '[]', 1, 0, 0, 1000)
    `).run(userId, initialTasks);
    return res.json({
      id: userId,
      ccc: 100,
      cs: 10,
      tasks: Array(15).fill(false),
      drones: [],
      asteroids: [],
      cargoLevel: 1,
      cargoCCC: 0,
      asteroidResources: 0,
      energy: 1000,
    });
  }

  res.json({
    ...user,
    tasks: JSON.parse(user.tasks),
    drones: JSON.parse(user.drones),
    asteroids: JSON.parse(user.asteroids),
  });
});

app.get('/user-data', (req, res) => {
  const userId = 1; // Временный хардкод для тестов
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (!user) {
    const initialTasks = JSON.stringify(Array(15).fill(false));
    db.prepare(`
      INSERT INTO users (id, ccc, cs, tasks, drones, asteroids, cargoLevel, cargoCCC, asteroidResources, energy)
      VALUES (?, 100, 10, ?, '[]', '[]', 1, 0, 0, 1000)
    `).run(userId, initialTasks);
    return res.json({
      userId: userId.toString(),
      ccc: 100,
      cs: 10,
      tasks: Array(15).fill(false),
      drones: [],
      asteroids: [],
      cargoLevel: 1,
      cargoCCC: 0,
      asteroidResources: 0,
      energy: 1000,
    });
  }

  res.json({
    userId: user.id.toString(),
    ccc: user.ccc,
    cs: user.cs,
    energy: user.energy,
    asteroidResources: user.asteroidResources,
    cargoCCC: user.cargoCCC,
    cargoLevel: user.cargoLevel,
  });
});

app.post('/update-resources', (req, res) => {
  const { userId, cargoCCC, asteroidResources, cs } = req.body;
  const params = [];
  let query = 'UPDATE users SET ';
  if (cargoCCC !== undefined) {
    query += 'cargoCCC = ?, ';
    params.push(cargoCCC);
  }
  if (asteroidResources !== undefined) {
    query += 'asteroidResources = ?, ';
    params.push(asteroidResources);
  }
  if (cs !== undefined) {
    query += 'cs = ?, ';
    params.push(cs);
  }
  query = query.slice(0, -2);
  query += ' WHERE id = ?';
  params.push(userId);

  db.prepare(query).run(...params);
  res.json({ success: true });
});

app.post('/collect-ccc', (req, res) => {
  const { userId, amount } = req.body;
  db.prepare('UPDATE users SET ccc = ccc + ?, cargoCCC = 0 WHERE id = ?').run(amount, userId);
  res.json({ success: true });
});

app.post('/buy-asteroid', (req, res) => {
  const { userId, asteroidId, cost, resources } = req.body;
  const user = db.prepare('SELECT cs, asteroids FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ success: false, error: 'Пользователь не найден' });
  }

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

app.post('/buy-drone', (req, res) => {
  const { userId, droneId, cost } = req.body;
  const user = db.prepare('SELECT cs, drones FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ success: false, error: 'Пользователь не найден' });
  }

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

app.post('/upgrade-cargo', (req, res) => {
  const { userId, level, cost } = req.body;
  const user = db.prepare('SELECT cs FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ success: false, error: 'Пользователь не найден' });
  }

  if (user.cs < cost) {
    return res.json({ success: false, error: 'Недостаточно CS' });
  }

  db.prepare('UPDATE users SET cs = cs - ?, cargoLevel = ? WHERE id = ?').run(cost, level, userId);

  res.json({ success: true });
});

app.post('/complete-task', (req, res) => {
  console.log('Получен запрос на /complete-task:', req.body);
  const { userId, taskId } = req.body;
  const user = db.prepare('SELECT tasks FROM users WHERE id = ?').get(userId);

  if (!user) {
    console.error('Пользователь не найден:', userId);
    return res.status(404).json({ success: false, error: 'Пользователь не найден' });
  }

  const tasks = JSON.parse(user.tasks);
  console.log('Текущие задачи:', tasks);
  tasks[taskId - 1] = true;

  db.prepare('UPDATE users SET cs = cs + 1, tasks = ? WHERE id = ?').run(JSON.stringify(tasks), userId);

  res.json({ success: true });
});

app.post('/exchange-ccc-to-cs', (req, res) => {
  const { userId, amountCCC } = req.body;
  const user = db.prepare('SELECT ccc FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ success: false, error: 'Пользователь не найден' });
  }

  if (user.ccc < amountCCC) {
    return res.json({ success: false, error: 'Недостаточно CCC' });
  }

  const amountCS = amountCCC / 100;

  db.prepare('UPDATE users SET ccc = ccc - ?, cs = cs + ? WHERE id = ?').run(amountCCC, amountCS, userId);

  db.prepare(`
    INSERT INTO exchanges (userId, type, amount_from, amount_to, timestamp)
    VALUES (?, 'CCC_TO_CS', ?, ?, ?)
  `).run(userId, amountCCC, amountCS, new Date().toISOString());

  res.json({ success: true, amountCS });
});

app.post('/exchange-cs-to-ccc', (req, res) => {
  const { userId, amountCS } = req.body;
  const user = db.prepare('SELECT cs FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ success: false, error: 'Пользователь не найден' });
  }

  if (user.cs < amountCS) {
    return res.json({ success: false, error: 'Недостаточно CS' });
  }

  const amountCCC = amountCS * 50;

  db.prepare('UPDATE users SET cs = cs - ?, ccc = ccc + ? WHERE id = ?').run(amountCS, amountCCC, userId);

  db.prepare(`
    INSERT INTO exchanges (userId, type, amount_from, amount_to, timestamp)
    VALUES (?, 'CS_TO_CCC', ?, ?, ?)
  `).run(userId, amountCS, amountCCC, new Date().toISOString());

  res.json({ success: true, amountCCC });
});

app.get('/exchanges/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const exchanges = db.prepare('SELECT * FROM exchanges WHERE userId = ? ORDER BY timestamp DESC').all(userId);
  res.json(exchanges);
});

app.get('/game-history/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const history = db
    .prepare('SELECT gameType, result, amount, timestamp FROM game_history WHERE userId = ? ORDER BY timestamp DESC LIMIT 10')
    .all(userId);
  res.json(history);
});

app.post('/save-game-history', (req, res) => {
  const { userId, gameType, result, amount } = req.body;
  db.prepare(`
    INSERT INTO game_history (userId, gameType, result, amount)
    VALUES (?, ?, ?, ?)
  `).run(userId, gameType, result, amount);
  res.json({ success: true });
});

app.post('/update-currencies', (req, res) => {
  const { userId, ccc, cs } = req.body;
  db.prepare('UPDATE users SET ccc = ?, cs = ? WHERE id = ?').run(ccc, cs, userId);
  res.json({ success: true });
});

app.post('/update-energy', (req, res) => {
  const { userId, energy } = req.body;
  db.prepare('UPDATE users SET energy = ? WHERE id = ?').run(energy, userId);
  res.json({ success: true });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
