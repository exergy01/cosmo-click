import React, { useState, useEffect } from 'react';
import './App.css';
import galaxyBackground from './images/galaxy_background.jpg';

// Декларация типов для Telegram (временное решение, пока не заработает telegram.d.ts)
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

    fetch(`https://cosmo-click.vercel.app/user/${userId}`)
      .then(res => res.json())
      .then(data => {
        setCcc(data.ccc);
        setCs(data.cs);
        setTasks(data.tasks);
        setDrones(data.drones);
        setAsteroids(data.asteroids);
        setCargoLevel(data.cargoLevel);
        setCargoCCC(data.cargoCCC);
        setAsteroidResources(data.asteroidResources);
      })
      .catch(err => console.error('Error loading user data:', err));

    fetch(`https://cosmo-click.vercel.app/exchanges/${userId}`)
      .then(res => res.json())
      .then(data => setExchanges(data))
      .catch(err => console.error('Error loading exchanges:', err));
  }, [userId]);

  // Обновление отображения ресурсов каждые 5 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedResources(Math.floor(asteroidResources));
    }, 5000);
    return () => clearInterval(interval);
  }, [asteroidResources]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    const handler = () => setIsPortrait(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (drones.length > 0 && asteroids.length > 0 && cargoCCC < getCargoCapacity() && asteroidResources > 0) {
      const interval = setInterval(() => {
        const totalIncomePerDay = drones.reduce((sum, droneId) => sum + droneData[droneId - 1].income, 0);
        const incomePerSecond = totalIncomePerDay / 86400;
        const newCargoCCC = Math.min(cargoCCC + incomePerSecond, getCargoCapacity());
        const newAsteroidResources = Math.max(asteroidResources - incomePerSecond, 0);

        setCargoCCC(newCargoCCC);
        setAsteroidResources(newAsteroidResources);

        fetch('https://cosmo-click.vercel.app/update-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, cargoCCC: newCargoCCC, asteroidResources: newAsteroidResources }),
        }).catch(err => console.error('Error updating resources:', err));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [drones, asteroids, cargoCCC, asteroidResources, userId]);

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
    { level: 5, capacity: Infinity, cost: 100 },
  ];

  const getCargoCapacity = () => cargoData[cargoLevel - 1].capacity;

  const mainMenuItems = [
    { id: "main-resources", label: "РЕСУРСЫ", value: `${displayedResources} CCC` },
    { id: "main-drones", label: "ДРОНЫ", value: `${drones.length} / 15` },
    { id: "main-cargo", label: "КАРГО", value: `${getCargoCapacity()} CCC` },
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
            className={`seif-image ${cargoCCC >= 1 ? 'clickable' : ''}`}
            onClick={() => {
              if (cargoCCC >= 1) {
                fetch('https://cosmo-click.vercel.app/collect-ccc', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, amount: cargoCCC }),
                })
                  .then(res => res.json())
                  .then(() => {
                    setCcc((prev) => prev + cargoCCC);
                    setCargoCCC(0);
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
                    fetch('https://cosmo-click.vercel.app/buy-asteroid', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId, asteroidId: asteroid.id, cost: asteroid.cost, resources: asteroid.resources }),
                    })
                      .then(res => res.json())
                      .then(() => {
                        setCs((prev) => prev - asteroid.cost);
                        setAsteroids((prev) => [...prev, asteroid.id]);
                        setAsteroidResources((prev) => prev + asteroid.resources);
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
                  fetch('https://cosmo-click.vercel.app/buy-asteroid', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, asteroidId: asteroid.id, cost: asteroid.cost, resources: asteroid.resources }),
                  })
                    .then(res => res.json())
                    .then(() => {
                      setCs((prev) => prev - asteroid.cost);
                      setAsteroids((prev) => [...prev, asteroid.id]);
                      setAsteroidResources((prev) => prev + asteroid.resources);
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
                    fetch('https://cosmo-click.vercel.app/buy-drone', {
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
                disabled={cs < cargo.cost || cargoLevel > cargo.level || cargo.level === 1}
                onClick={() => {
                  fetch('https://cosmo-click.vercel.app/upgrade-cargo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, level: cargo.level + 1, cost: cargo.cost }),
                  })
                    .then(res => res.json())
                    .then(() => {
                      setCs((prev) => prev - cargo.cost);
                      setCargoLevel(cargo.level + 1);
                    })
                    .catch(err => console.error('Error upgrading cargo:', err));
                }}
              >
                Уровень {cargo.level} ({cargo.capacity} CCC) - {cargo.cost === 0 ? "Бесплатно" : `${cargo.cost} CS`}
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
                  fetch('https://cosmo-click.vercel.app/complete-task', {
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
        return (
          <div className="tab-content exchange">
            <h2>Обмен</h2>
            <div className="exchange-buttons">
              <button
                className="exchange-button neon-border"
                onClick={() => {
                  const amountCCC = 100;
                  fetch('https://cosmo-click.vercel.app/exchange-ccc-to-cs', {
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
                      } else {
                        alert(data.error);
                      }
                    })
                    .catch(err => console.error('Error exchanging CCC to CS:', err));
                }}
              >
                Обменять 100 CCC на 1 CS
              </button>
              <button
                className="exchange-button neon-border"
                onClick={() => {
                  const amountCS = 1;
                  fetch('https://cosmo-click.vercel.app/exchange-cs-to-ccc', {
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
                      } else {
                        alert(data.error);
                      }
                    })
                    .catch(err => console.error('Error exchanging CS to CCC:', err));
                }}
              >
                Обменять 1 CS на 50 CCC
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