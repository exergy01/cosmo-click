import React, { useState, useEffect } from 'react';
import './App.css';
import galaxyBackground from './images/galaxy_background.jpg';

// Декларация типов для Telegram
interface TelegramWebApp {
  ready: () => void;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
}

interface Telegram {
  WebApp: TelegramWebApp;
}

declare global {
  interface Window {
    Telegram: Telegram;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState("bottom-rocket");
  const [isPortrait, setIsPortrait] = useState(window.matchMedia("(orientation: portrait)").matches);
  const [ccc, setCcc] = useState(0);
  const [cs, setCs] = useState(0);
  const [tasks, setTasks] = useState(Array(15).fill(false));
  const [drones, setDrones] = useState<number[]>([]);
  const [asteroids, setAsteroids] = useState<number[]>([]);
  const [cargoLevel, setCargoLevel] = useState(1);
  const [cargoCCC, setCargoCCC] = useState(0);
  const [asteroidResources, setAsteroidResources] = useState(0);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [displayedResources, setDisplayedResources] = useState(Math.floor(asteroidResources));
  const [cccToCsAmount, setCccToCsAmount] = useState('');
  const [csToCccAmount, setCsToCccAmount] = useState('');

  // Инициализация Telegram Web App и получение userId
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      const telegramUser = window.Telegram.WebApp.initDataUnsafe?.user;
      if (telegramUser && telegramUser.id) {
        setUserId(telegramUser.id);
      } else {
        console.error('Не удалось получить userId из Telegram');
        setUserId(1); // Fallback для тестов
      }
    } else {
      console.warn('Telegram Web App API недоступен, использую userId = 1');
      setUserId(1); // Fallback для локальной разработки
    }
  }, []);

  // Загружаем данные с сервера
  useEffect(() => {
    if (userId === null) return;

    fetch(`http://localhost:3001/user/${userId}`)
      .then(res => res.json())
      .then(data => {
        setCcc(data.ccc || 0);
        setCs(data.cs || 0);
        const loadedTasks = Array.isArray(data.tasks) && data.tasks.length === 15 ? data.tasks : Array(15).fill(false);
        setTasks(loadedTasks);
        setDrones(Array.isArray(data.drones) ? data.drones : []);
        setAsteroids(Array.isArray(data.asteroids) ? data.asteroids : []);
        setCargoLevel(data.cargoLevel || 1);
        setCargoCCC(data.cargoCCC || 0);
        setAsteroidResources(data.asteroidResources || 0);
        setDisplayedResources(Math.floor(data.asteroidResources || 0));
      })
      .catch(err => console.error('Error loading user data:', err));

    fetch(`http://localhost:3001/exchanges/${userId}`)
      .then(res => res.json())
      .then(data => setExchanges(data))
      .catch(err => console.error('Error loading exchanges:', err));
  }, [userId]);

  // Обновляем displayedResources при смене вкладки
  useEffect(() => {
    setDisplayedResources(Math.floor(asteroidResources));
  }, [activeTab, asteroidResources]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    const handler = () => setIsPortrait(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Логика добычи CCC дронами и автоматического сбора
  useEffect(() => {
    if (drones.length > 0 && asteroids.length > 0 && asteroidResources > 0) {
      const interval = setInterval(() => {
        const totalIncomePerDay = drones.reduce((sum, droneId) => sum + droneData[droneId - 1].income, 0);
        const incomePerSecond = totalIncomePerDay / 86400;
        let newCargoCCC = cargoCCC + incomePerSecond;
        let newAsteroidResources = Math.max(asteroidResources - incomePerSecond, 0);

        console.log(`Добыча CCC: cargoLevel=${cargoLevel}, newCargoCCC=${newCargoCCC}`);

        // Автоматический сбор на 5 уровне
        if (cargoLevel === 5 && newCargoCCC >= 100) {
          console.log(`Автоматический сбор срабатывает: cargoCCC=${newCargoCCC}`);
          const amountToCollect = Math.floor(newCargoCCC / 100) * 100;
          newCargoCCC -= amountToCollect;

          setCcc((prev) => {
            console.log(`Зачисляем на баланс: ${amountToCollect} CCC`);
            return prev + amountToCollect;
          });

          fetch('http://localhost:3001/collect-ccc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, amount: amountToCollect }),
          }).catch(err => console.error('Error collecting CCC:', err));
        } else if (cargoLevel !== 5) {
          // Для уровней 1-4 ограничиваем вместимостью
          newCargoCCC = Math.min(newCargoCCC, getCargoCapacity());
        }

        setCargoCCC(newCargoCCC);
        setAsteroidResources(newAsteroidResources);

        fetch('http://localhost:3001/update-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, cargoCCC: newCargoCCC, asteroidResources: newAsteroidResources }),
        }).catch(err => console.error('Error updating resources:', err));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [drones, asteroids, cargoCCC, asteroidResources, userId, cargoLevel]);

  if (!isPortrait) {
    return (
      <div className="rotate-warning">
        Пожалуйста, поверните устройство в вертикальное положение 📱
      </div>
    );
  }

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

  const asteroidData = [
    { id: 1, cost: 4, resources: 1600 },
    { id: 2, cost: 6, resources: 2300 },
    { id: 3, cost: 9, resources: 3500 },
    { id: 4, cost: 12, resources: 5200 },
    { id: 5, cost: 18, resources: 7800 },
    { id: 6, cost: 25, resources: 11600 },
    { id: 7, cost: 37, resources: 17400 },
    { id: 8, cost: 49, resources: 26100 },
    { id: 9, cost: 77, resources: 39100 },
    { id: 10, cost: 108, resources: 58600 },
    { id: 11, cost: 143, resources: 87900 },
    { id: 12, cost: 200, resources: 98900 },
    { id: 13, cost: 500, resources: Infinity },
  ];

  const cargoData = [
    { level: 1, capacity: 50, cost: 0 },
    { level: 2, capacity: 200, cost: 5 },
    { level: 3, capacity: 2000, cost: 15 },
    { level: 4, capacity: 20000, cost: 45 },
    { level: 5, capacity: Infinity, cost: 100, autoCollect: true },
  ];

  const getCargoCapacity = () => {
    const cargo = cargoData[cargoLevel - 1];
    return cargo ? cargo.capacity : Infinity;
  };

  const isAutoCollect = () => {
    const cargo = cargoData[cargoLevel - 1];
    return cargo ? !!cargo.autoCollect : false;
  };

  const mainMenuItems = [
    { id: "main-resources", label: "РЕСУРСЫ", value: `${displayedResources} CCC` },
    { id: "main-drones", label: "ДРОНЫ", value: `${drones.length} / 15` },
    { id: "main-cargo", label: "КАРГО", value: isAutoCollect() ? "Авто" : `${getCargoCapacity()} CCC` },
  ];

  const actionMenuItems = [
    { id: "action-attack", label: "АТАКА" },
    { id: "action-exchange", label: "ОБМЕН" },
    { id: "action-quests", label: "ЗАДАНИЯ" },
  ];

  const bottomMenuItems = [
    { id: "bottom-games", icon: "🎮" },
    { id: "bottom-wallet", icon: "💳" },
    { id: "bottom-rocket", icon: "🚀" },
    { id: "bottom-friends", icon: "👥" },
    { id: "bottom-guide", icon: "📖" },
  ];

  const TopBar = () => {
    const totalIncomePerDay = drones.reduce((sum, droneId) => sum + droneData[droneId - 1].income, 0);
    const incomePerHour = totalIncomePerDay / 24;

    return (
      <div className="top-bar">
        <div className="currency neon-border">
          <span className="label">CCC:</span>
          <span className="value">{Math.floor(ccc * 100) / 100}</span>
          <div className="income-rate">{incomePerHour.toFixed(2)} в час</div>
        </div>
        <div className="currency neon-border">
          <span className="label">CS:</span>
          <span className="value">{Math.floor(cs * 100) / 100}</span>
        </div>
      </div>
    );
  };

  const MainContent = () => (
    <>
      <div className="menu-buttons">
        {mainMenuItems.map((item) => (
          <div
            key={item.id}
            className={`menu-button neon-border ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
            <div className="menu-value">{item.value}</div>
          </div>
        ))}
      </div>
      <div className="star-system" onClick={() => alert("Выбор звёздной системы скоро будет доступен!")}>
        ⭐ Звёздная система: Андромеда I
      </div>
      <div className="images-block">
        <img src={`${process.env.PUBLIC_URL}/images/space_bot_1.png`} alt="Дрон" className="drone-image" />
        <div className="seif-container">
          <img
            src={`${process.env.PUBLIC_URL}/images/seif.png`}
            alt="Сейф"
            className={`seif-image ${cargoCCC >= 1 && !isAutoCollect() ? 'clickable' : ''}`}
            onClick={() => {
              if (cargoCCC >= 1 && !isAutoCollect()) {
                fetch('http://localhost:3001/collect-ccc', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, amount: cargoCCC }),
                })
                  .then(res => res.json())
                  .then(() => {
                    setCcc((prev) => prev + cargoCCC);
                    setCargoCCC(0);
                    setDisplayedResources(Math.floor(asteroidResources));
                  })
                  .catch(err => console.error('Error collecting CCC:', err));
              }
            }}
          />
        </div>
        <div className="cargo-counter">{cargoCCC.toFixed(4)}</div>
      </div>
      <div className="action-menu">
        {actionMenuItems.map((item) => (
          <div
            key={item.id}
            className={`menu-button neon-border ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
          </div>
        ))}
      </div>
    </>
  );

  const ShopMenu = () => (
    <div className="menu-buttons">
      {mainMenuItems.map((item) => (
        <div
          key={item.id}
          className={`menu-button neon-border ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => setActiveTab(item.id)}
        >
          {item.label}
          <div className="menu-value">{item.value}</div>
        </div>
      ))}
    </div>
  );

  const TabContent = ({ tabId }: { tabId: string }) => {
    switch (tabId) {
      case "main-resources":
        return (
          <div className="tab-content shop">
            <ShopMenu />
            <h2>Астероиды</h2>
            <div className="shop-grid">
              {asteroidData.slice(0, 12).map((asteroid) => (
                <button
                  key={asteroid.id}
                  className={`shop-square neon-border ${asteroids.includes(asteroid.id) ? 'purchased' : ''}`}
                  disabled={cs < asteroid.cost || asteroids.includes(asteroid.id) || (asteroid.id > 1 && !asteroids.includes(asteroid.id - 1))}
                  onClick={() => {
                    fetch('http://localhost:3001/buy-asteroid', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId, asteroidId: asteroid.id, cost: asteroid.cost, resources: asteroid.resources }),
                    })
                      .then(res => res.json())
                      .then(() => {
                        setCs((prev) => prev - asteroid.cost);
                        setAsteroids((prev) => [...prev, asteroid.id]);
                        setAsteroidResources((prev) => prev + asteroid.resources);
                        setDisplayedResources(Math.floor(asteroidResources + asteroid.resources));
                      })
                      .catch(err => console.error('Error buying asteroid:', err));
                  }}
                >
                  Астероид №{asteroid.id}<br />
                  ({asteroid.resources} CCC)<br />
                  {asteroid.cost} CS
                </button>
              ))}
            </div>
            {asteroidData.slice(12).map((asteroid) => (
              <button
                key={asteroid.id}
                className={`shop-button neon-border ${asteroids.includes(asteroid.id) ? 'purchased' : ''}`}
                disabled={cs < asteroid.cost || asteroids.includes(asteroid.id) || (asteroid.id > 1 && !asteroids.includes(asteroid.id - 1))}
                onClick={() => {
                  fetch('http://localhost:3001/buy-asteroid', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, asteroidId: asteroid.id, cost: asteroid.cost, resources: asteroid.resources }),
                  })
                    .then(res => res.json())
                    .then(() => {
                      setCs((prev) => prev - asteroid.cost);
                      setAsteroids((prev) => [...prev, asteroid.id]);
                      setAsteroidResources((prev) => prev + asteroid.resources);
                      setDisplayedResources(Math.floor(asteroidResources + asteroid.resources));
                    })
                    .catch(err => console.error('Error buying asteroid:', err));
                }}
              >
                Астероид №{asteroid.id} ({asteroid.resources} CCC) - {asteroid.cost} CS
              </button>
            ))}
          </div>
        );
      case "main-drones":
        return (
          <div className="tab-content shop">
            <ShopMenu />
            <h2>Дроны</h2>
            <div className="shop-grid">
              {droneData.map((drone) => (
                <button
                  key={drone.id}
                  className={`shop-square neon-border ${drones.includes(drone.id) ? 'purchased' : ''}`}
                  disabled={cs < drone.cost || drones.includes(drone.id) || (drone.id > 1 && !drones.includes(drone.id - 1))}
                  onClick={() => {
                    fetch('http://localhost:3001/buy-drone', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId, droneId: drone.id, cost: drone.cost }),
                    })
                      .then(res => res.json())
                      .then(() => {
                        setCs((prev) => prev - drone.cost);
                        setDrones((prev) => [...prev, drone.id]);
                      })
                      .catch(err => console.error('Error buying drone:', err));
                  }}
                >
                  Бот №{drone.id}<br />
                  ({drone.income} CCC/сутки)<br />
                  {drone.cost} CS
                </button>
              ))}
            </div>
          </div>
        );
      case "main-cargo":
        return (
          <div className="tab-content shop">
            <ShopMenu />
            <h2>Cargo</h2>
            {cargoData.map((cargo) => (
              <button
                key={cargo.level}
                className={`shop-button neon-border ${cargoLevel >= cargo.level ? 'purchased' : ''}`}
                disabled={cs < cargo.cost || cargoLevel > cargo.level}
                onClick={() => {
                  fetch('http://localhost:3001/upgrade-cargo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, level: cargo.level, cost: cargo.cost }),
                  })
                    .then(res => res.json())
                    .then(() => {
                      setCs((prev) => prev - cargo.cost);
                      setCargoLevel(cargo.level);
                    })
                    .catch(err => console.error('Error upgrading cargo:', err));
                }}
              >
                Уровень {cargo.level} {cargo.autoCollect ? "(Авто)" : `(${cargo.capacity} CCC)`} - {cargo.cost === 0 ? "Бесплатно" : `${cargo.cost} CS`}
              </button>
            ))}
          </div>
        );
      case "action-quests":
        return (
          <div className="tab-content tasks">
            <h2>Задания</h2>
            {tasks.map((completed, index) => (
              <button
                key={index}
                className={`task-button neon-border ${completed ? 'completed' : ''}`}
                disabled={completed}
                onClick={() => {
                  fetch('http://localhost:3001/complete-task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, taskId: index + 1 }),
                  })
                    .then(res => res.json())
                    .then(() => {
                      setCs((prev) => prev + 1);
                      setTasks((prev) => {
                        const newTasks = [...prev];
                        newTasks[index] = true;
                        return newTasks;
                      });
                    })
                    .catch(err => console.error('Error completing task:', err));
                }}
              >
                Задание №{index + 1} - 1 CS
              </button>
            ))}
          </div>
        );
      case "action-exchange":
        const cccToCsRate = 100;
        const csToCccRate = 50;
        const cccToCsResult = (parseFloat(cccToCsAmount) || 0) / cccToCsRate;
        const csToCccResult = (parseFloat(csToCccAmount) || 0) * csToCccRate;
        const canExchangeCccToCs = parseFloat(cccToCsAmount) > 0 && parseFloat(cccToCsAmount) <= ccc;
        const canExchangeCsToCcc = parseFloat(csToCccAmount) > 0 && parseFloat(csToCccAmount) <= cs;

        return (
          <div className="tab-content exchange">
            <h2>Обмен</h2>
            <div className="exchange-section">
              <h3>Обмен CCC на CS</h3>
              <div className="balance-info">
                Доступно: {Math.floor(ccc * 100) / 100} CCC
              </div>
              <div className="exchange-input">
                <input
                  type="number"
                  value={cccToCsAmount}
                  onChange={(e) => setCccToCsAmount(e.target.value)}
                  placeholder="Введите сумму CCC"
                  min="0"
                  step="0.01"
                />
                <button
                  className="max-button neon-border"
                  onClick={() => setCccToCsAmount(ccc.toString())}
                >
                  Максимум
                </button>
              </div>
              <div className="exchange-result">
                Вы получите: {cccToCsResult.toFixed(2)} CS
              </div>
              <button
                className="exchange-button neon-border"
                disabled={!canExchangeCccToCs}
                onClick={() => {
                  const amountCCC = parseFloat(cccToCsAmount);
                  fetch('http://localhost:3001/exchange-ccc-to-cs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, amountCCC }),
                  })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        setCcc((prev) => prev - amountCCC);
                        setCs((prev) => prev + data.amountCS);
                        setExchanges((prev) => [{
                          type: 'CCC_TO_CS',
                          amount_from: amountCCC,
                          amount_to: data.amountCS,
                          timestamp: new Date().toISOString(),
                        }, ...prev]);
                        setCccToCsAmount('');
                      } else {
                        alert(data.error);
                      }
                    })
                    .catch(err => console.error('Error exchanging CCC to CS:', err));
                }}
              >
                Обменять
              </button>
            </div>

            <div className="exchange-section">
              <h3>Обмен CS на CCC</h3>
              <div className="balance-info">
                Доступно: {Math.floor(cs * 100) / 100} CS
              </div>
              <div className="exchange-input">
                <input
                  type="number"
                  value={csToCccAmount}
                  onChange={(e) => setCsToCccAmount(e.target.value)}
                  placeholder="Введите сумму CS"
                  min="0"
                  step="0.01"
                />
                <button
                  className="max-button neon-border"
                  onClick={() => setCsToCccAmount(cs.toString())}
                >
                  Максимум
                </button>
              </div>
              <div className="exchange-result">
                Вы получите: {csToCccResult.toFixed(2)} CCC
              </div>
              <button
                className="exchange-button neon-border"
                disabled={!canExchangeCsToCcc}
                onClick={() => {
                  const amountCS = parseFloat(csToCccAmount);
                  fetch('http://localhost:3001/exchange-cs-to-ccc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, amountCS }),
                  })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        setCs((prev) => prev - amountCS);
                        setCcc((prev) => prev + data.amountCCC);
                        setExchanges((prev) => [{
                          type: 'CS_TO_CCC',
                          amount_from: amountCS,
                          amount_to: data.amountCCC,
                          timestamp: new Date().toISOString(),
                        }, ...prev]);
                        setCsToCccAmount('');
                      } else {
                        alert(data.error);
                      }
                    })
                    .catch(err => console.error('Error exchanging CS to CCC:', err));
                }}
              >
                Обменять
              </button>
            </div>

            <h3>История обменов</h3>
            <div className="exchange-history">
              {exchanges.length === 0 ? (
                <p>История обменов пуста</p>
              ) : (
                exchanges.map((exchange, index) => (
                  <div key={index} className="exchange-item neon-border">
                    {exchange.type === 'CCC_TO_CS'
                      ? `Обменял ${exchange.amount_from} CCC на ${exchange.amount_to} CS`
                      : `Обменял ${exchange.amount_from} CS на ${exchange.amount_to} CCC`}
                    <br />
                    {new Date(exchange.timestamp).toLocaleString()}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case "action-attack":
        return <div className="tab-content"><h2>В стадии разработки</h2></div>;
      case "bottom-games":
        return (
          <div className="game-icons">
            <span className="game-icon">🎯</span>
            <span className="game-icon">🕹️</span>
            <span className="game-icon">🧩</span>
            <span className="game-icon">🎲</span>
            <span className="game-icon">🏆</span>
          </div>
        );
      default:
        return <div className="tab-content">Неизвестная вкладка</div>;
    }
  };

  const renderContent = () => {
    if (activeTab === "bottom-rocket") {
      return <MainContent />;
    }
    return <TabContent tabId={activeTab} />;
  };

  return (
    <div className="App" style={{ backgroundImage: `url(${galaxyBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <TopBar />
      {renderContent()}
      <div className="bottom-menu">
        {bottomMenuItems.map((item) => (
          <button
            key={item.id}
            className={`neon-icon-button ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;