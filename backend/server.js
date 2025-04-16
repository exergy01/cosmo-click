const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

// Настройка CORS
app.use(cors({
  origin: 'https://cosmo-click.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Обработка OPTIONS запросов
app.options('*', cors({
  origin: 'https://cosmo-click.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Отключение кэширования
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

const PORT = process.env.PORT || 3001;

app.post('/click-seif', async (req, res) => {
  const { userId, clicks, cargoccc, energy, lastClickTimestamp } = req.body;
  const now = new Date();
  const lastClick = new Date(lastClickTimestamp);
  const timeDiffSeconds = (now - lastClick) / 1000;

  // Проверка: не больше 1 клика в секунду
  const maxPossibleClicks = Math.floor(timeDiffSeconds);
  if (clicks > maxPossibleClicks) {
    console.log(`Cheating detected: userId=${userId}, clicks=${clicks}, maxPossible=${maxPossibleClicks}`);
    return res.status(400).json({ success: false, error: "Подозрение на мошенничество: слишком много кликов" });
  }

  // Проверка энергии
  const userResult = await pool.query('SELECT energy FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  const user = userResult.rows[0];
  const energySpent = user.energy - energy;
  if (energySpent !== clicks || energy < 0) {
    console.log(`Cheating detected: userId=${userId}, energySpent=${energySpent}, clicks=${clicks}`);
    return res.status(400).json({ success: false, error: "Подозрение на мошенничество: несоответствие энергии" });
  }

  // Обновляем данные в базе
  await pool.query(
    'UPDATE users SET cargoccc = $1, energy = $2 WHERE id = $3',
    [cargoccc, energy, userId]
  );
  res.json({ success: true });
});

// Создание таблиц
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        ccc FLOAT DEFAULT 0,
        cs FLOAT DEFAULT 5000,
        energy INTEGER DEFAULT 100,
        asteroidresources FLOAT DEFAULT 0,
        cargoccc FLOAT DEFAULT 0,
        cargolevel INTEGER DEFAULT 1,
        asteroids TEXT DEFAULT '[]',
        drones TEXT DEFAULT '[]',
        tasks TEXT DEFAULT '[]'
      );
    `);
    console.log('Table "users" created or already exists');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_history (
        id SERIAL PRIMARY KEY,
        userid INTEGER,
        gametype TEXT,
        result TEXT,
        amount FLOAT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userid) REFERENCES users(id)
      );
    `);
    console.log('Table "game_history" created or already exists');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS exchange_history (
        id SERIAL PRIMARY KEY,
        userid INTEGER,
        type TEXT,
        amount_from FLOAT,
        amount_to FLOAT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userid) REFERENCES users(id)
      );
    `);
    console.log('Table "exchange_history" created or already exists');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
});

// Получение пользователя
app.get('/user/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (id, ccc, cs, energy, asteroidresources, cargoccc, cargolevel, asteroids, drones, tasks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [userId, 0, 0, 100, 0, 0, 1, '[]', '[]', JSON.stringify(Array(10).fill(false))]
      );
      const newUser = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      return res.json(newUser.rows[0]);
    }
    res.json(userResult.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Получение истории обменов
app.get('/exchange-history/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    const result = await pool.query('SELECT * FROM exchange_history WHERE userid = $1 ORDER BY timestamp DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching exchange history:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Сбор CCC
app.post('/collect-ccc', async (req, res) => {
  const { userId, amount } = req.body;
  try {
    await pool.query(
      'UPDATE users SET ccc = ccc + $1, cargoccc = 0 WHERE id = $2',
      [amount, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error collecting CCC:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Обновление ресурсов
app.post('/update-resources', async (req, res) => {
  const { userId, cargoccc, asteroidresources } = req.body;
  console.log('Received update-resources request:', { userId, cargoccc, asteroidresources }); // Логирование запроса
  try {
    if (cargoccc === undefined || asteroidresources === undefined || userId === undefined) {
      throw new Error('Missing required fields: userId, cargoccc, or asteroidresources');
    }
    await pool.query(
      'UPDATE users SET cargoccc = $1, asteroidresources = $2 WHERE id = $3',
      [cargoccc, asteroidresources, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating resources:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Покупка астероида
app.post('/buy-asteroid', async (req, res) => {
  const { userId, asteroidId, cost, resources } = req.body;
  try {
    const userResult = await pool.query('SELECT cs, asteroids, asteroidresources FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.cs < cost) {
      return res.status(400).json({ success: false, message: 'Not enough CS' });
    }

    let asteroids = JSON.parse(user.asteroids);
    asteroids.push(asteroidId);

    await pool.query(
      'UPDATE users SET cs = $1, asteroids = $2, asteroidresources = $3 WHERE id = $4',
      [user.cs - cost, JSON.stringify(asteroids), user.asteroidresources + resources, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error buying asteroid:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Покупка дрона
app.post('/buy-drone', async (req, res) => {
  const { userId, droneId, cost } = req.body;
  try {
    const userResult = await pool.query('SELECT cs, drones FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.cs < cost) {
      return res.status(400).json({ success: false, message: 'Not enough CS' });
    }

    let drones = JSON.parse(user.drones);
    drones.push(droneId);

    await pool.query(
      'UPDATE users SET cs = $1, drones = $2 WHERE id = $3',
      [user.cs - cost, JSON.stringify(drones), userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error buying drone:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Улучшение карго
app.post('/upgrade-cargo', async (req, res) => {
  const { userId, level, cost } = req.body;
  try {
    const userResult = await pool.query('SELECT cs, cargolevel FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.cs < cost) {
      return res.status(400).json({ success: false, message: 'Not enough CS' });
    }

    await pool.query(
      'UPDATE users SET cs = $1, cargolevel = $2 WHERE id = $3',
      [user.cs - cost, level, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error upgrading cargo:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Выполнение задания
app.post('/complete-task', async (req, res) => {
  const { userId, taskId } = req.body;
  try {
    const userResult = await pool.query('SELECT tasks, cs FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let tasks = JSON.parse(userResult.rows[0].tasks);
    if (tasks[taskId - 1]) {
      return res.status(400).json({ success: false, message: 'Task already completed' });
    }

    tasks[taskId - 1] = true;
    const newCs = userResult.rows[0].cs + 1;

    await pool.query(
      'UPDATE users SET tasks = $1, cs = $2 WHERE id = $3',
      [JSON.stringify(tasks), newCs, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error completing task:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Обмен CCC на CS
app.post('/exchange-ccc-to-cs', async (req, res) => {
  const { userId, amountCCC } = req.body;
  const rate = 100; // 100 CCC = 1 CS
  try {
    const userResult = await pool.query('SELECT ccc, cs FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.ccc < amountCCC) {
      return res.status(400).json({ success: false, message: 'Not enough CCC' });
    }

    const amountCS = amountCCC / rate;
    await pool.query(
      'UPDATE users SET ccc = ccc - $1, cs = cs + $2 WHERE id = $3',
      [amountCCC, amountCS, userId]
    );

    await pool.query(
      'INSERT INTO exchange_history (userid, type, amount_from, amount_to, timestamp) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'CCC_TO_CS', amountCCC, amountCS, new Date()]
    );

    res.json({ success: true, amountCS });
  } catch (err) {
    console.error('Error exchanging CCC to CS:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Обмен CS на CCC
app.post('/exchange-cs-to-ccc', async (req, res) => {
  const { userId, amountCS } = req.body;
  const rate = 50; // 1 CS = 50 CCC
  try {
    const userResult = await pool.query('SELECT ccc, cs FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.cs < amountCS) {
      return res.status(400).json({ success: false, message: 'Not enough CS' });
    }

    const amountCCC = amountCS * rate;
    await pool.query(
      'UPDATE users SET cs = cs - $1, ccc = ccc + $2 WHERE id = $3',
      [amountCS, amountCCC, userId]
    );

    await pool.query(
      'INSERT INTO exchange_history (userid, type, amount_from, amount_to, timestamp) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'CS_TO_CCC', amountCS, amountCCC, new Date()]
    );

    res.json({ success: true, amountCCC });
  } catch (err) {
    console.error('Error exchanging CS to CCC:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});