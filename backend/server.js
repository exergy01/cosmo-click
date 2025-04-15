const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: 'https://cosmo-click.vercel.app',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Инициализация подключения к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Для Render нужно включить SSL
});

// Создание таблиц
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        ccc FLOAT DEFAULT 0,
        cs FLOAT DEFAULT 0,
        energy INTEGER DEFAULT 100,
        asteroidResources FLOAT DEFAULT 0,
        cargoCCC FLOAT DEFAULT 0,
        cargoLevel INTEGER DEFAULT 1,
        asteroids TEXT DEFAULT '[]',
        drones TEXT DEFAULT '[]',
        tasks TEXT DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS game_history (
        id SERIAL PRIMARY KEY,
        userId INTEGER,
        gameType TEXT,
        result TEXT,
        amount FLOAT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS exchange_history (
        id SERIAL PRIMARY KEY,
        userId INTEGER,
        type TEXT,
        amount_from FLOAT,
        amount_to FLOAT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
      );
    `);

    // Проверка и создание тестового пользователя
    const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users');
    if (userCountResult.rows[0].count == 0) {
      await pool.query(
        `INSERT INTO users (ccc, cs, energy, asteroidResources, cargoCCC, cargoLevel, asteroids, drones, tasks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [0, 0, 100, 0, 0, 1, '[]', '[]', JSON.stringify(Array(10).fill(false))]
      );
      console.log('Test user created');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
})();

// Получение данных пользователя
app.get('/user/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновление валют
app.post('/update-currencies', async (req, res) => {
  const { userId, ccc, cs } = req.body;
  try {
    await pool.query('UPDATE users SET ccc = $1, cs = $2 WHERE id = $3', [ccc, cs, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновление энергии
app.post('/update-energy', async (req, res) => {
  const { userId, energy } = req.body;
  try {
    await pool.query('UPDATE users SET energy = $1 WHERE id = $2', [energy, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновление ресурсов
app.post('/update-resources', async (req, res) => {
  const { userId, asteroidResources, cargoCCC } = req.body;
  try {
    await pool.query(
      'UPDATE users SET asteroidResources = $1, cargoCCC = $2 WHERE id = $3',
      [asteroidResources, cargoCCC, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Сбор CCC
app.post('/collect-ccc', async (req, res) => {
  const { userId, amount } = req.body;
  try {
    const result = await pool.query('SELECT ccc, cargoCCC FROM users WHERE id = $1', [userId]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const newCCC = user.ccc + amount;
      const newCargoCCC = user.cargoccc - amount;
      await pool.query(
        'UPDATE users SET ccc = $1, cargoCCC = $2 WHERE id = $3',
        [newCCC, newCargoCCC, userId]
      );
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Покупка астероида
app.post('/buy-asteroid', async (req, res) => {
  const { userId, asteroidId, cost, resources } = req.body;
  try {
    const result = await pool.query(
      'SELECT cs, asteroids, asteroidResources FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const asteroids = JSON.parse(user.asteroids);
      if (user.cs >= cost && !asteroids.includes(asteroidId)) {
        asteroids.push(asteroidId);
        const newCS = user.cs - cost;
        const newAsteroidResources = user.asteroidresources + resources;
        await pool.query(
          'UPDATE users SET cs = $1, asteroids = $2, asteroidResources = $3 WHERE id = $4',
          [newCS, JSON.stringify(asteroids), newAsteroidResources, userId]
        );
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Not enough CS or asteroid already purchased' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Покупка дрона
app.post('/buy-drone', async (req, res) => {
  const { userId, droneId, cost } = req.body;
  try {
    const result = await pool.query('SELECT cs, drones FROM users WHERE id = $1', [userId]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const drones = JSON.parse(user.drones);
      if (user.cs >= cost && !drones.includes(droneId)) {
        drones.push(droneId);
        const newCS = user.cs - cost;
        await pool.query(
          'UPDATE users SET cs = $1, drones = $2 WHERE id = $3',
          [newCS, JSON.stringify(drones), userId]
        );
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Not enough CS or drone already purchased' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновление уровня карго
app.post('/upgrade-cargo', async (req, res) => {
  const { userId, level, cost } = req.body;
  try {
    const result = await pool.query('SELECT cs, cargoLevel FROM users WHERE id = $1', [userId]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (user.cs >= cost && user.cargolevel < level) {
        const newCS = user.cs - cost;
        await pool.query(
          'UPDATE users SET cs = $1, cargoLevel = $2 WHERE id = $3',
          [newCS, level, userId]
        );
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Not enough CS or invalid level' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Выполнение задания
app.post('/complete-task', async (req, res) => {
  const { userId, taskId } = req.body;
  try {
    const result = await pool.query('SELECT cs, tasks FROM users WHERE id = $1', [userId]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const tasks = JSON.parse(user.tasks);
      if (!tasks[taskId - 1]) {
        tasks[taskId - 1] = true;
        const newCS = user.cs + 1;
        await pool.query(
          'UPDATE users SET cs = $1, tasks = $2 WHERE id = $3',
          [newCS, JSON.stringify(tasks), userId]
        );
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Task already completed' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Сохранение истории игры
app.post('/save-game-history', async (req, res) => {
  const { userId, gameType, result, amount } = req.body;
  try {
    await pool.query(
      'INSERT INTO game_history (userId, gameType, result, amount) VALUES ($1, $2, $3, $4)',
      [userId, gameType, result, amount]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение истории игр
app.get('/game-history/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM game_history WHERE userId = $1 ORDER BY timestamp DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обмен CCC на CS
app.post('/exchange-ccc-to-cs', async (req, res) => {
  const { userId, amountCCC } = req.body;
  try {
    const result = await pool.query('SELECT ccc, cs FROM users WHERE id = $1', [userId]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (user.ccc >= amountCCC) {
        const rate = 100; // 100 CCC = 1 CS
        const amountCS = amountCCC / rate;
        const newCCC = user.ccc - amountCCC;
        const newCS = user.cs + amountCS;

        await pool.query(
          'UPDATE users SET ccc = $1, cs = $2 WHERE id = $3',
          [newCCC, newCS, userId]
        );
        await pool.query(
          'INSERT INTO exchange_history (userId, type, amount_from, amount_to) VALUES ($1, $2, $3, $4)',
          [userId, 'CCC_TO_CS', amountCCC, amountCS]
        );
        res.json({ success: true, amountCS });
      } else {
        res.status(400).json({ error: 'Not enough CCC' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обмен CS на CCC
app.post('/exchange-cs-to-ccc', async (req, res) => {
  const { userId, amountCS } = req.body;
  try {
    const result = await pool.query('SELECT ccc, cs FROM users WHERE id = $1', [userId]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (user.cs >= amountCS) {
        const rate = 50; // 1 CS = 50 CCC
        const amountCCC = amountCS * rate;
        const newCS = user.cs - amountCS;
        const newCCC = user.ccc + amountCCC;

        await pool.query(
          'UPDATE users SET ccc = $1, cs = $2 WHERE id = $3',
          [newCCC, newCS, userId]
        );
        await pool.query(
          'INSERT INTO exchange_history (userId, type, amount_from, amount_to) VALUES ($1, $2, $3, $4)',
          [userId, 'CS_TO_CCC', amountCS, amountCCC]
        );
        res.json({ success: true, amountCCC });
      } else {
        res.status(400).json({ error: 'Not enough CS' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение истории обменов
app.get('/exchange-history/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM exchange_history WHERE userId = $1 ORDER BY timestamp DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});