const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
const port = 3001;

// Настройка CORS и парсинга JSON
app.use(cors());
app.use(express.json());

// Инициализация базы данных
const db = new Database('game.db', { verbose: console.log });

// Создание таблиц (если они ещё не существуют)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    ccc FLOAT DEFAULT 0,
    cs FLOAT DEFAULT 0,
    cargo_level INTEGER DEFAULT 1,
    cargo_ccc FLOAT DEFAULT 0,
    asteroid_resources FLOAT DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS drones (
    user_id INTEGER,
    drone_id INTEGER,
    PRIMARY KEY (user_id, drone_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS asteroids (
    user_id INTEGER,
    asteroid_id INTEGER,
    PRIMARY KEY (user_id, asteroid_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    user_id INTEGER,
    task_id INTEGER,
    completed INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, task_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Включаем поддержку внешних ключей
db.exec('PRAGMA foreign_keys = ON;');

// Создание пользователя (для тестов пока используем userId = 1)
const createUser = db.prepare('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)');
createUser.run(1, 'Player1');

// Получение данных игрока
app.get('/user/:id', (req, res) => {
  const userId = parseInt(req.params.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const drones = db.prepare('SELECT drone_id FROM drones WHERE user_id = ?').all(userId).map(row => row.drone_id);
  const asteroids = db.prepare('SELECT asteroid_id FROM asteroids WHERE user_id = ?').all(userId).map(row => row.asteroid_id);
  const tasks = db.prepare('SELECT task_id, completed FROM tasks WHERE user_id = ?').all(userId);

  res.json({
    ccc: user.ccc,
    cs: user.cs,
    cargoLevel: user.cargo_level,
    cargoCCC: user.cargo_ccc,
    asteroidResources: user.asteroid_resources,
    drones,
    asteroids,
    tasks: tasks.reduce((acc, task) => {
      acc[task.task_id - 1] = !!task.completed;
      return acc;
    }, Array(15).fill(false)),
  });
});

// Покупка дрона
app.post('/buy-drone', (req, res) => {
  const { userId, droneId, cost } = req.body;
  const user = db.prepare('SELECT cs FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.cs < cost) {
    return res.status(400).json({ error: 'Not enough CS' });
  }

  const insertDrone = db.prepare('INSERT OR IGNORE INTO drones (user_id, drone_id) VALUES (?, ?)');
  const updateCS = db.prepare('UPDATE users SET cs = cs - ? WHERE id = ?');

  const transaction = db.transaction(() => {
    insertDrone.run(userId, droneId);
    updateCS.run(cost, userId);
  });

  transaction();
  res.json({ success: true });
});

// Покупка астероида
app.post('/buy-asteroid', (req, res) => {
  const { userId, asteroidId, cost, resources } = req.body;
  const user = db.prepare('SELECT cs, asteroid_resources FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.cs < cost) {
    return res.status(400).json({ error: 'Not enough CS' });
  }

  const insertAsteroid = db.prepare('INSERT OR IGNORE INTO asteroids (user_id, asteroid_id) VALUES (?, ?)');
  const updateCS = db.prepare('UPDATE users SET cs = cs - ?, asteroid_resources = asteroid_resources + ? WHERE id = ?');

  const transaction = db.transaction(() => {
    insertAsteroid.run(userId, asteroidId);
    updateCS.run(cost, resources, userId);
  });

  transaction();
  res.json({ success: true });
});

// Сбор CCC
app.post('/collect-ccc', (req, res) => {
  const { userId, amount } = req.body;
  const user = db.prepare('SELECT cargo_ccc FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.cargo_ccc < amount) {
    return res.status(400).json({ error: 'Not enough CCC in cargo' });
  }

  const updateCCC = db.prepare('UPDATE users SET ccc = ccc + ?, cargo_ccc = 0 WHERE id = ?');
  updateCCC.run(amount, userId);
  res.json({ success: true });
});

// Выполнение задания
app.post('/complete-task', (req, res) => {
  const { userId, taskId } = req.body;
  const insertTask = db.prepare('INSERT OR IGNORE INTO tasks (user_id, task_id, completed) VALUES (?, ?, 1)');
  const updateCS = db.prepare('UPDATE users SET cs = cs + 1 WHERE id = ?');

  const transaction = db.transaction(() => {
    insertTask.run(userId, taskId);
    updateCS.run(userId);
  });

  transaction();
  res.json({ success: true });
});

// Обновление карго
app.post('/upgrade-cargo', (req, res) => {
  const { userId, level, cost } = req.body;
  const user = db.prepare('SELECT cs FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.cs < cost) {
    return res.status(400).json({ error: 'Not enough CS' });
  }

  const updateCargo = db.prepare('UPDATE users SET cargo_level = ?, cs = cs - ? WHERE id = ?');
  updateCargo.run(level, cost, userId);
  res.json({ success: true });
});

// Обновление ресурсов (для добычи дронами)
app.post('/update-resources', (req, res) => {
  const { userId, cargoCCC, asteroidResources } = req.body;
  const update = db.prepare('UPDATE users SET cargo_ccc = ?, asteroid_resources = ? WHERE id = ?');
  update.run(cargoCCC, asteroidResources, userId);
  res.json({ success: true });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});