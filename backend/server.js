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

// Данные дронов (аналогично клиенту)
const droneData = [
  { id: 1, cost: 1, income: 96 },
  { id: 2, cost: 9, income: 129 },
  { id: 3, cost: 17, income: 174 },
  { id: 4, cost: 25, income: 236 },
  { id: 5, cost: 34, income: 318 },
  { id: 6, cost: 43, income: 430 },
  { id: 7, cost: 52, income: 581 },
  { id: 8, cost: 61, income: 784 },
  { id: 9, cost: 70, income: 1059 },
  { id: 10, cost: 80, income: 1430 },
  { id: 11, cost: 90, income: 1930 },
  { id: 12, cost: 100, income: 2606 },
  { id: 13, cost: 110, income: 3518 },
  { id: 14, cost: 120, income: 4750 },
  { id: 15, cost: 130, income: 6595 },
];

// Данные карго (для проверки автосбора)
const cargoData = [
  { level: 1, capacity: 50, cost: 0 },
  { level: 2, capacity: 200, cost: 5 },
  { level: 3, capacity: 2000, cost: 15 },
  { level: 4, capacity: 20000, cost: 45 },
  { level: 5, capacity: Infinity, cost: 100, autoCollect: true },
];

app.post('/click-seif', async (req, res) => {
  const { userId, clicks, cargoccc, energy, lastClickTimestamp } = req.body;
  const now = new Date();
  const lastClick = new Date(lastClickTimestamp);
  const timeDiffSeconds = (now - lastClick) / 1000;

  const maxPossibleClicks = Math.floor(timeDiffSeconds);
  if (clicks > maxPossibleClicks) {
    console.log(`Cheating detected: userId=${userId}, clicks=${clicks}, maxPossible=${maxPossibleClicks}`);
    return res.status(400).json({ success: false, error: "Подозрение на мошенничество: слишком много кликов" });
  }

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

  await pool.query(
    'UPDATE users SET cargoccc = $1, energy = $2, last_updated = $3 WHERE id = $4',
    [cargoccc, energy, new Date(), userId]
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
        tasks TEXT DEFAULT '[]',
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

// Получение пользователя с расчётом ресурсов
app.get('/user/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    let userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (id, ccc, cs, energy, asteroidresources, cargoccc, cargolevel, asteroids, drones, tasks, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [userId, 0, 0, 100, 0, 0, 1, '[]', '[]', JSON.stringify(Array(10).fill(false)), new Date()]
      );
      userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      return res.json(userResult.rows[0]);
    }

    let user = userResult.rows[0];
    const drones = JSON.parse(user.drones);
    const asteroids = JSON.parse(user.asteroids);

    // Рассчитываем ресурсы, если есть дроны и астероиды
    if (drones.length > 0 && asteroids.length > 0 && user.asteroidresources > 0) {
      const lastUpdated = new Date(user.last_updated || new Date());
      const now = new Date();
      const timeDiffSeconds = (now - lastUpdated) / 1000;

      // Доход от дронов
      const totalIncomePerDay = drones.reduce((sum, droneId) => sum + droneData[droneId - 1].income, 0);
      const incomePerSecond = totalIncomePerDay / 86400;
      let newCargoCCC = user.cargoccc + incomePerSecond * timeDiffSeconds;
      let newAsteroidResources = Math.max(user.asteroidresources - incomePerSecond * timeDiffSeconds, 0);

      let newCcc = user.ccc;
      if (user.cargolevel === 5) {
        // Автосбор
        const amountToCollect = Math.floor(newCargoCCC / 100) * 100;
        newCcc += amountToCollect;
        newCargoCCC -= amountToCollect;
      } else {
        // Ограничение по вместимости карго
        const cargoCapacity = cargoData[user.cargolevel - 1].capacity;
        newCargoCCC = Math.min(newCargoCCC, cargoCapacity);
      }

      // Обновляем данные в базе
      await pool.query(
        'UPDATE users SET ccc = $1, cargoccc = $2, asteroidresources = $3, last_updated = $4 WHERE id = $5',
        [newCcc, newCargoCCC, newAsteroidResources, now, userId]
      );

      // Получаем обновлённые данные
      userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      user = userResult.rows[0];
    }

    res.json(user);
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
      'UPDATE users SET ccc = ccc + $1, cargoccc = 0, last_updated = $2 WHERE id = $3',
      [amount, new Date(), userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error collecting CCC:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Обновление ресурсов
app.post('/update-resources', async (req, res) => {
  const { userId, cargoccc, asteroidresources, ccc } = req.body;
  console.log('Received update-resources request:', { userId, cargoccc, asteroidresources, ccc });
  try {
    if (cargoccc === undefined || asteroidresources === undefined || userId === undefined) {
      throw new Error('Missing required fields: userId, cargoccc, or asteroidresources');
    }
    await pool.query(
      'UPDATE users SET ccc = $1, cargoccc = $2, asteroidresources = $3, last_updated = $4 WHERE id = $5',
      [ccc, cargoccc, asteroidresources, new Date(), userId]
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
      'UPDATE users SET cs = $1, asteroids = $2, asteroidresources = $3, last_updated = $4 WHERE id = $5',
      [user.cs - cost, JSON.stringify(asteroids), user.asteroidresources + resources, new Date(), userId]
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
      'UPDATE users SET cs = $1, drones = $2, last_updated = $3 WHERE id = $4',
      [user.cs - cost, JSON.stringify(drones), new Date(), userId]
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
      'UPDATE users SET cs = $1, cargolevel = $2, last_updated = $3 WHERE id = $4',
      [user.cs - cost, level, new Date(), userId]
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
      'UPDATE users SET tasks = $1, cs = $2, last_updated = $3 WHERE id = $4',
      [JSON.stringify(tasks), newCs, new Date(), userId]
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
  const rate = 100;
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
      'UPDATE users SET ccc = ccc - $1, cs = cs + $2, last_updated = $3 WHERE id = $4',
      [amountCCC, amountCS, new Date(), userId]
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
  const rate = 50;
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
      'UPDATE users SET cs = cs - $1, ccc = ccc + $2, last_updated = $3 WHERE id = $4',
      [amountCS, amountCCC, new Date(), userId]
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