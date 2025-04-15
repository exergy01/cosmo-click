const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: 'https://cosmo-click.vercel.app',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Инициализация базы данных SQLite
const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Создание таблиц
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ccc REAL DEFAULT 0,
      cs REAL DEFAULT 0,
      energy INTEGER DEFAULT 100,
      asteroidResources REAL DEFAULT 0,
      cargoCCC REAL DEFAULT 0,
      cargoLevel INTEGER DEFAULT 1,
      asteroids TEXT DEFAULT '[]',
      drones TEXT DEFAULT '[]',
      tasks TEXT DEFAULT '[]'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      gameType TEXT,
      result TEXT,
      amount REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS exchange_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      type TEXT,
      amount_from REAL,
      amount_to REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  // Проверка и создание тестового пользователя
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) {
      console.error('Error checking user count:', err.message);
      return;
    }
    if (row.count === 0) {
      db.run(
        `INSERT INTO users (ccc, cs, energy, asteroidResources, cargoCCC, cargoLevel, asteroids, drones, tasks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [0, 0, 100, 0, 0, 1, '[]', '[]', JSON.stringify(Array(10).fill(false))],
        (err) => {
          if (err) {
            console.error('Error creating test user:', err.message);
          } else {
            console.log('Test user created');
          }
        }
      );
    }
  });
});

// Получение данных пользователя
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Обновление валют
app.post('/update-currencies', (req, res) => {
  const { userId, ccc, cs } = req.body;
  db.run('UPDATE users SET ccc = ?, cs = ? WHERE id = ?', [ccc, cs, userId], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Обновление энергии
app.post('/update-energy', (req, res) => {
  const { userId, energy } = req.body;
  db.run('UPDATE users SET energy = ? WHERE id = ?', [energy, userId], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Обновление ресурсов
app.post('/update-resources', (req, res) => {
  const { userId, asteroidResources, cargoCCC } = req.body;
  db.run(
    'UPDATE users SET asteroidResources = ?, cargoCCC = ? WHERE id = ?',
    [asteroidResources, cargoCCC, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// Сбор CCC
app.post('/collect-ccc', (req, res) => {
  const { userId, amount } = req.body;
  db.get('SELECT ccc, cargoCCC FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (user) {
      const newCCC = user.ccc + amount;
      const newCargoCCC = user.cargoCCC - amount;
      db.run(
        'UPDATE users SET ccc = ?, cargoCCC = ? WHERE id = ?',
        [newCCC, newCargoCCC, userId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ success: true });
        }
      );
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Покупка астероида
app.post('/buy-asteroid', (req, res) => {
  const { userId, asteroidId, cost, resources } = req.body;
  db.get('SELECT cs, asteroids, asteroidResources FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (user) {
      const asteroids = JSON.parse(user.asteroids);
      if (user.cs >= cost && !asteroids.includes(asteroidId)) {
        asteroids.push(asteroidId);
        const newCS = user.cs - cost;
        const newAsteroidResources = user.asteroidResources + resources;
        db.run(
          'UPDATE users SET cs = ?, asteroids = ?, asteroidResources = ? WHERE id = ?',
          [newCS, JSON.stringify(asteroids), newAsteroidResources, userId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
          }
        );
      } else {
        res.status(400).json({ error: 'Not enough CS or asteroid already purchased' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Покупка дрона
app.post('/buy-drone', (req, res) => {
  const { userId, droneId, cost } = req.body;
  db.get('SELECT cs, drones FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (user) {
      const drones = JSON.parse(user.drones);
      if (user.cs >= cost && !drones.includes(droneId)) {
        drones.push(droneId);
        const newCS = user.cs - cost;
        db.run(
          'UPDATE users SET cs = ?, drones = ? WHERE id = ?',
          [newCS, JSON.stringify(drones), userId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
          }
        );
      } else {
        res.status(400).json({ error: 'Not enough CS or drone already purchased' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Обновление уровня карго
app.post('/upgrade-cargo', (req, res) => {
  const { userId, level, cost } = req.body;
  db.get('SELECT cs, cargoLevel FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (user) {
      if (user.cs >= cost && user.cargoLevel < level) {
        const newCS = user.cs - cost;
        db.run(
          'UPDATE users SET cs = ?, cargoLevel = ? WHERE id = ?',
          [newCS, level, userId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
          }
        );
      } else {
        res.status(400).json({ error: 'Not enough CS or invalid level' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Выполнение задания
app.post('/complete-task', (req, res) => {
  const { userId, taskId } = req.body;
  db.get('SELECT cs, tasks FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (user) {
      const tasks = JSON.parse(user.tasks);
      if (!tasks[taskId - 1]) {
        tasks[taskId - 1] = true;
        const newCS = user.cs + 1;
        db.run(
          'UPDATE users SET cs = ?, tasks = ? WHERE id = ?',
          [newCS, JSON.stringify(tasks), userId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
          }
        );
      } else {
        res.status(400).json({ error: 'Task already completed' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Сохранение истории игры
app.post('/save-game-history', (req, res) => {
  const { userId, gameType, result, amount } = req.body;
  db.run(
    'INSERT INTO game_history (userId, gameType, result, amount) VALUES (?, ?, ?, ?)',
    [userId, gameType, result, amount],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// Получение истории игр
app.get('/game-history/:userId', (req, res) => {
  const userId = req.params.userId;
  db.all(
    'SELECT * FROM game_history WHERE userId = ? ORDER BY timestamp DESC',
    [userId],
    (err, history) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(history);
    }
  );
});

// Обмен CCC на CS
app.post('/exchange-ccc-to-cs', (req, res) => {
  const { userId, amountCCC } = req.body;
  db.get('SELECT ccc, cs FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (user) {
      if (user.ccc >= amountCCC) {
        const rate = 100; // 100 CCC = 1 CS
        const amountCS = amountCCC / rate;
        const newCCC = user.ccc - amountCCC;
        const newCS = user.cs + amountCS;

        db.run(
          'UPDATE users SET ccc = ?, cs = ? WHERE id = ?',
          [newCCC, newCS, userId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            db.run(
              'INSERT INTO exchange_history (userId, type, amount_from, amount_to) VALUES (?, ?, ?, ?)',
              [userId, 'CCC_TO_CS', amountCCC, amountCS],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }
                res.json({ success: true, amountCS });
              }
            );
          }
        );
      } else {
        res.status(400).json({ error: 'Not enough CCC' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Обмен CS на CCC
app.post('/exchange-cs-to-ccc', (req, res) => {
  const { userId, amountCS } = req.body;
  db.get('SELECT ccc, cs FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (user) {
      if (user.cs >= amountCS) {
        const rate = 50; // 1 CS = 50 CCC
        const amountCCC = amountCS * rate;
        const newCS = user.cs - amountCS;
        const newCCC = user.ccc + amountCCC;

        db.run(
          'UPDATE users SET ccc = ?, cs = ? WHERE id = ?',
          [newCCC, newCS, userId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            db.run(
              'INSERT INTO exchange_history (userId, type, amount_from, amount_to) VALUES (?, ?, ?, ?)',
              [userId, 'CS_TO_CCC', amountCS, amountCCC],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }
                res.json({ success: true, amountCCC });
              }
            );
          }
        );
      } else {
        res.status(400).json({ error: 'Not enough CS' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Получение истории обменов
app.get('/exchange-history/:userId', (req, res) => {
  const userId = req.params.userId;
  db.all(
    'SELECT * FROM exchange_history WHERE userId = ? ORDER BY timestamp DESC',
    [userId],
    (err, history) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(history);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});