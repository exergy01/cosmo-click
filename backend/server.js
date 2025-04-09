const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001; // Для Vercel используем process.env.PORT

// Логирование всех входящих запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.headers.origin}`);
  next();
});

// Настройка CORS
app.use(cors({
  origin: ['https://t.me', 'https://cosmo-click.vercel.app', 'http://localhost:3000'], // Разрешаем запросы с Telegram, Vercel и локального хоста
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// Парсинг JSON
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

  CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,
    amount_from FLOAT,
    amount_to FLOAT,
    timestamp TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Включаем поддержку внешних ключей
db.exec('PRAGMA foreign_keys = ON;');

// Создание пользователя (для тестов пока создаём userId = 1, если его нет)
const createUser = db.prepare('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)');
createUser.run(1, 'Player1');

// Получение данных игрока
app.get('/user/:id', (req, res) => {
  const userId = parseInt(req.params.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    // Если пользователя нет, создаём его
    db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(userId, `Player${userId}`);
    return res.json({
      ccc: 0,
      cs: 0,
      cargoLevel: 1,
      cargoCCC: 0,
      asteroidResources: 0,
      drones: [],
      asteroids: [],
      tasks: Array(15).fill(false),
    });
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

// Получение истории обменов
app.get('/exchanges/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const exchanges = db.prepare('SELECT * FROM exchanges WHERE user_id = ? ORDER BY timestamp DESC').all(userId);
  res.json(exchanges);
});

// Покупка дрона
app.post('/buy-drone', (req, res) => {
  console.log('Received /buy-drone request:', req.body);
  const { userId, droneId, cost } = req.body;
  const user = db.prepare('SELECT cs FROM users WHERE id = ?').get(userId);

  if (!user) {
    console.error(`User not found: ${userId}`);
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.cs < cost) {
    console.error(`Not enough CS for user ${userId}: ${user.cs} < ${cost}`);
    return res.status(400).json({ error: 'Not enough CS' });
  }

  const insertDrone = db.prepare('INSERT OR IGNORE INTO drones (user_id, drone_id) VALUES (?, ?)');
  const updateCS = db.prepare('UPDATE users SET cs = cs - ? WHERE id = ?');

  try {
    const transaction = db.transaction(() => {
      insertDrone.run(userId, droneId);
      updateCS.run(cost, userId);
    });

    transaction();
    console.log(`Drone ${droneId} purchased for user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error purchasing drone for user ${userId}:`, error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Покупка астероида
app.post('/buy-asteroid', (req, res) => {
  console.log('Received /buy-asteroid request:', req.body);
  const { userId, asteroidId, cost, resources } = req.body;
  const user = db.prepare('SELECT cs, asteroid_resources FROM users WHERE id = ?').get(userId);

  if (!user) {
    console.error(`User not found: ${userId}`);
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.cs < cost) {
    console.error(`Not enough CS for user ${userId}: ${user.cs} < ${cost}`);
    return res.status(400).json({ error: 'Not enough CS' });
  }

  const insertAsteroid = db.prepare('INSERT OR IGNORE INTO asteroids (user_id, asteroid_id) VALUES (?, ?)');
  const updateCS = db.prepare('UPDATE users SET cs = cs - ?, asteroid_resources = asteroid_resources + ? WHERE id = ?');

  try {
    const transaction = db.transaction(() => {
      insertAsteroid.run(userId, asteroidId);
      updateCS.run(cost, resources, userId);
    });

    transaction();
    console.log(`Asteroid ${asteroidId} purchased for user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error purchasing asteroid for user ${userId}:`, error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Сбор CCC
app.post('/collect-ccc', (req, res) => {
  console.log('Received /collect-ccc request:', req.body);
  const { userId, amount } = req.body;
  const user = db.prepare('SELECT cargo_ccc FROM users WHERE id = ?').get(userId);

  if (!user) {
    console.error(`User not found: ${userId}`);
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.cargo_ccc < amount) {
    console.error(`Not enough CCC in cargo for user ${userId}: ${user.cargo_ccc} < ${amount}`);
    return res.status(400).json({ error: 'Not enough CCC in cargo' });
  }

  const updateCCC = db.prepare('UPDATE users SET ccc = ccc + ?, cargo_ccc = 0 WHERE id = ?');

  try {
    updateCCC.run(amount, userId);
    console.log(`Collected ${amount} CCC for user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error collecting CCC for user ${userId}:`, error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Выполнение задания
app.post('/complete-task', (req, res) => {
  console.log('Received /complete-task request:', req.body);
  const { userId, taskId } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (!user) {
    console.error(`User not found: ${userId}`);
    return res.status(404).json({ error: 'User not found' });
  }

  const insertTask = db.prepare('INSERT OR IGNORE INTO tasks (user_id, task_id, completed) VALUES (?, ?, 1)');
  const updateCS = db.prepare('UPDATE users SET cs = cs + 1 WHERE id = ?');

  try {
    const transaction = db.transaction(() => {
      insertTask.run(userId, taskId);
      updateCS.run(userId);
    });

    transaction();
    console.log(`Task ${taskId} completed for user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error completing task for user ${userId}:`, error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Обновление карго
app.post('/upgrade-cargo', (req, res) => {
  console.log('Received /upgrade-cargo request:', req.body);
  const { userId, level, cost } = req.body;
  const user = db.prepare('SELECT cs FROM users WHERE id = ?').get(userId);

  if (!user) {
    console.error(`User not found: ${userId}`);
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.cs < cost) {
    console.error(`Not enough CS for user ${userId}: ${user.cs} < ${cost}`);
    return res.status(400).json({ error: 'Not enough CS' });
  }

  const updateCargo = db.prepare('UPDATE users SET cargo_level = ?, cs = cs - ? WHERE id = ?');

  try {
    updateCargo.run(level, cost, userId);
    console.log(`Cargo upgraded to level ${level} for user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error upgrading cargo for user ${userId}:`, error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Обновление ресурсов (для добычи дронами)
app.post('/update-resources', (req, res) => {
  console.log('Received /update-resources request:', req.body);
  const { userId, cargoCCC, asteroidResources } = req.body;
  const update = db.prepare('UPDATE users SET cargo_ccc = ?, asteroid_resources = ? WHERE id = ?');

  try {
    update.run(cargoCCC, asteroidResources, userId);
    console.log(`Resources updated for user ${userId}: cargoCCC=${cargoCCC}, asteroidResources=${asteroidResources}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error updating resources for user ${userId}:`, error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Обмен CCC на CS
app.post('/exchange-ccc-to-cs', (req, res) => {
  console.log('Received /exchange-ccc-to-cs request:', req.body);
  const { userId, amountCCC } = req.body;
  const user = db.prepare('SELECT ccc, cs FROM users WHERE id = ?').get(userId);

  if (!user) {
    console.error(`User not found: ${userId}`);
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.ccc < amountCCC) {
    console.error(`Not enough CCC for user ${userId}: ${user.ccc} < ${amountCCC}`);
    return res.status(400).json({ error: 'Not enough CCC' });
  }

  const rate = 100; // 100 CCC = 1 CS
  const amountCS = amountCCC / rate;

  const updateUser = db.prepare('UPDATE users SET ccc = ccc - ?, cs = cs + ? WHERE id = ?');
  const insertExchange = db.prepare('INSERT INTO exchanges (user_id, type, amount_from, amount_to, timestamp) VALUES (?, ?, ?, ?, ?)');

  try {
    const transaction = db.transaction(() => {
      updateUser.run(amountCCC, amountCS, userId);
      insertExchange.run(userId, 'CCC_TO_CS', amountCCC, amountCS, new Date().toISOString());
    });

    transaction();
    console.log(`Exchanged ${amountCCC} CCC to ${amountCS} CS for user ${userId}`);
    res.json({ success: true, amountCS });
  } catch (error) {
    console.error(`Error exchanging CCC to CS for user ${userId}:`, error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Обмен CS на CCC
app.post('/exchange-cs-to-ccc', (req, res) => {
  console.log('Received /exchange-cs-to-ccc request:', req.body);
  const { userId, amountCS } = req.body;
  const user = db.prepare('SELECT ccc, cs FROM users WHERE id = ?').get(userId);

  if (!user) {
    console.error(`User not found: ${userId}`);
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.cs < amountCS) {
    console.error(`Not enough CS for user ${userId}: ${user.cs} < ${amountCS}`);
    return res.status(400).json({ error: 'Not enough CS' });
  }

  const rate = 50; // 1 CS = 50 CCC
  const amountCCC = amountCS * rate;

  const updateUser = db.prepare('UPDATE users SET cs = cs - ?, ccc = ccc + ? WHERE id = ?');
  const insertExchange = db.prepare('INSERT INTO exchanges (user_id, type, amount_from, amount_to, timestamp) VALUES (?, ?, ?, ?, ?)');

  try {
    const transaction = db.transaction(() => {
      updateUser.run(amountCS, amountCCC, userId);
      insertExchange.run(userId, 'CS_TO_CCC', amountCS, amountCCC, new Date().toISOString());
    });

    transaction();
    console.log(`Exchanged ${amountCS} CS to ${amountCCC} CCC for user ${userId}`);
    res.json({ success: true, amountCCC });
  } catch (error) {
    console.error(`Error exchanging CS to CCC for user ${userId}:`, error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});