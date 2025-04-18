import React, { useState, useEffect } from 'react';
import './App.css';
import cosmoBackground from './images/cosmo-bg.png';
import { useUser } from './contexts/UserContext';
import { useGame } from './contexts/GameContext';
import ColorGuess from './components/games/ColorGuess';
import SpaceTapper from './components/games/SpaceTapper';
import SpaceThimbles from './components/games/SpaceThimbles';

function App() {
  const { userData, setUserData, exchanges, setExchanges, isLoading, error, telegramId } = useUser();
  const { gameData, setGameData } = useGame();
  const [isPortrait, setIsPortrait] = useState(window.matchMedia("(orientation: portrait)").matches);
  const [cccToCsAmount, setCccToCsAmount] = useState('');
  const [csToCccAmount, setCsToCccAmount] = useState('');
  const [localCargoCCC, setLocalCargoCCC] = useState(userData.cargoccc);
  const [localEnergy, setLocalEnergy] = useState(userData.energy);
  const [clicksSinceLastSync, setClicksSinceLastSync] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const BACKEND_URL = 'https://cosmo-click-backend.onrender.com';

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    const handler = () => setIsPortrait(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Синхронизация ресурсов с сервером каждые 10 секунд
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (userData.userId !== null) {
        fetch(`${BACKEND_URL}/user/${userData.userId}`)
          .then((res) => res.json())
          .then((data) => {
            setUserData((prev) => ({
              ...prev,
              ccc: Number(data.ccc) || 0,
              cs: Number(data.cs) || 0,
              energy: Number(data.energy) || 100,
              asteroidresources: Number(data.asteroidresources) || 0,
              cargoccc: Number(data.cargoccc) || 0,
              cargolevel: Number(data.cargolevel) || 1,
              asteroids: data.asteroids ? JSON.parse(data.asteroids) : [],
              drones: data.drones ? JSON.parse(data.drones) : [],
              tasks: data.tasks ? JSON.parse(data.tasks) : Array(10).fill(false),
            }));
            setGameData((prev) => ({
              ...prev,
              displayedResources: Math.floor(Number(data.asteroidresources) || 0),
            }));
            setLocalCargoCCC(Number(data.cargoccc) || 0);
            setLocalEnergy(Number(data.energy) || 100);
          })
          .catch((err) => console.error('Error syncing resources:', err));
      }
    }, 10000);

    return () => clearInterval(syncInterval);
  }, [userData.userId]);

  // Сохранение данных при закрытии приложения
  useEffect(() => {
    const saveDataBeforeUnload = () => {
      if (userData.userId !== null) {
        fetch(`${BACKEND_URL}/update-resources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userData.userId,
            cargoccc: userData.cargoccc,
            asteroidresources: userData.asteroidresources,
            ccc: userData.ccc,
          }),
          keepalive: true,
        }).catch((err) => console.error('Error saving data before unload:', err));
      }
    };

    window.addEventListener('beforeunload', saveDataBeforeUnload);
    return () => window.removeEventListener('beforeunload', saveDataBeforeUnload);
  }, [userData.userId, userData.cargoccc, userData.asteroidresources, userData.ccc]);

  // Синхронизация кликов с сервером каждые 10 секунд
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (clicksSinceLastSync > 0 && userData.userId !== null) {
        fetch(`${BACKEND_URL}/click-seif`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userData.userId,
            clicks: clicksSinceLastSync,
            cargoccc: localCargoCCC,
            energy: localEnergy,
            lastClickTimestamp: new Date(lastSyncTime).toISOString(),
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setUserData((prev) => ({
                ...prev,
                cargoccc: localCargoCCC,
                energy: localEnergy,
              }));
              setClicksSinceLastSync(0);
              setLastSyncTime(Date.now());
            } else {
              console.error('Server rejected update:', data.error);
              setLocalCargoCCC(userData.cargoccc);
              setLocalEnergy(userData.energy);
              setClicksSinceLastSync(0);
            }
          })
          .catch((err) => {
            console.error('Error syncing with server:', err);
            setLocalCargoCCC(userData.cargoccc);
            setLocalEnergy(userData.energy);
            setClicksSinceLastSync(0);
          });
      }
    }, 10000);

    return () => clearInterval(syncInterval);
  }, [clicksSinceLastSync, localCargoCCC, localEnergy, userData.userId, lastSyncTime]);

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
    const cargo = cargoData[userData.cargolevel - 1];
    return cargo ? cargo.capacity : Infinity;
  };

  const isAutoCollect = () => {
    const cargo = cargoData[userData.cargolevel - 1];
    return cargo ? !!cargo.autoCollect : false;
  };

  const mainMenuItems = [
    { id: "main-resources", label: "РЕСУРСЫ", value: `${gameData.displayedResources} CCC` },
    { id: "main-drones", label: "ДРОНЫ", value: `${userData.drones.length} / 15` },
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
    const totalIncomePerDay = userData.drones.reduce((sum, droneId) => sum + droneData[droneId - 1].income, 0);
    const incomePerHour = totalIncomePerDay / 24;

    return (
      <div className="top-bar">
        <div className="currency neon-border">
          <span className="label">CCC:</span>
          <span className="value">{Math.floor(userData.ccc * 100) / 100}</span>
          <div className="income-rate">{incomePerHour.toFixed(2)} в час</div>
        </div>
        <div className="currency neon-border">
          <span className="label">CS:</span>
          <span className="value">{Math.floor(userData.cs * 100) / 100}</span>
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
            className={`menu-button neon-border ${gameData.activeTab === item.id ? 'active' : ''}`}
            onClick={() => setGameData((prev) => ({ ...prev, activeTab: item.id }))}
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
        <div className="seif-container">
          <img
            src={`${process.env.PUBLIC_URL}/images/seif.png`}
            alt="Сейф"
            className={`seif-image ${localEnergy >= 1 ? 'clickable' : ''}`}
            onClick={() => {
              if (localEnergy >= 1) {
                setLocalCargoCCC((prev) => prev + 1);
                setLocalEnergy((prev) => prev - 1);
                setClicksSinceLastSync((prev) => prev + 1);
              }
              if (localCargoCCC >= 1 && !isAutoCollect() && userData.userId !== null) {
                fetch(`${BACKEND_URL}/collect-ccc`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: userData.userId, amount: localCargoCCC }),
                })
                  .then((res) => res.json())
                  .then(() => {
                    setUserData((prev) => ({
                      ...prev,
                      ccc: prev.ccc + localCargoCCC,
                      cargoccc: 0,
                    }));
                    setLocalCargoCCC(0);
                    setGameData((prev) => ({
                      ...prev,
                      displayedResources: Math.floor(userData.asteroidresources),
                    }));
                  })
                  .catch((err) => console.error('Error collecting CCC:', err));
              }
            }}
          />
        </div>
      </div>
      <div className="action-menu">
        {localCargoCCC > 0 && (
          <div className="cargo-counter">{localCargoCCC.toFixed(4)}</div>
        )}
        <div className="buttons-row">
          {actionMenuItems.map((item) => (
            <div
              key={item.id}
              className={`menu-button neon-border ${gameData.activeTab === item.id ? 'active' : ''}`}
              onClick={() => setGameData((prev) => ({ ...prev, activeTab: item.id }))}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const ShopMenu = () => (
    <div className="menu-buttons">
      {mainMenuItems.map((item) => (
        <div
          key={item.id}
          className={`menu-button neon-border ${gameData.activeTab === item.id ? 'active' : ''}`}
          onClick={() => setGameData((prev) => ({ ...prev, activeTab: item.id }))}
        >
          {item.label}
          <div className="menu-value">{item.value}</div>
        </div>
      ))}
    </div>
  );

  const TabContent = ({ tabId }) => {
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
                  className={`shop-square neon-border ${userData.asteroids.includes(asteroid.id) ? 'purchased' : ''}`}
                  disabled={
                    userData.cs < asteroid.cost ||
                    userData.asteroids.includes(asteroid.id) ||
                    (asteroid.id > 1 && !userData.asteroids.includes(asteroid.id - 1))
                  }
                  onClick={() => {
                    if (userData.userId !== null) {
                      fetch(`${BACKEND_URL}/buy-asteroid`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: userData.userId,
                          asteroidId: asteroid.id,
                          cost: asteroid.cost,
                          resources: asteroid.resources,
                        }),
                      })
                        .then((res) => res.json())
                        .then(() => {
                          setUserData((prev) => ({
                            ...prev,
                            cs: prev.cs - asteroid.cost,
                            asteroids: [...prev.asteroids, asteroid.id],
                            asteroidresources: prev.asteroidresources + asteroid.resources,
                          }));
                          setGameData((prev) => ({
                            ...prev,
                            displayedResources: Math.floor(userData.asteroidresources + asteroid.resources),
                          }));
                        })
                        .catch((err) => console.error('Error buying asteroid:', err));
                    }
                  }}
                >
                  Астероид №{asteroid.id}
                  <br />
                  ({asteroid.resources} CCC)
                  <br />
                  {asteroid.cost} CS
                </button>
              ))}
            </div>
            {asteroidData.slice(12).map((asteroid) => (
              <button
                key={asteroid.id}
                className={`shop-button neon-border ${userData.asteroids.includes(asteroid.id) ? 'purchased' : ''}`}
                disabled={
                  userData.cs < asteroid.cost ||
                  userData.asteroids.includes(asteroid.id) ||
                  (asteroid.id > 1 && !userData.asteroids.includes(asteroid.id - 1))
                }
                onClick={() => {
                  if (userData.userId !== null) {
                    fetch(`${BACKEND_URL}/buy-asteroid`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: userData.userId,
                        asteroidId: asteroid.id,
                        cost: asteroid.cost,
                        resources: asteroid.resources,
                      }),
                    })
                      .then((res) => res.json())
                      .then(() => {
                        setUserData((prev) => ({
                          ...prev,
                          cs: prev.cs - asteroid.cost,
                          asteroids: [...prev.asteroids, asteroid.id],
                          asteroidresources: prev.asteroidresources + asteroid.resources,
                        }));
                        setGameData((prev) => ({
                          ...prev,
                          displayedResources: Math.floor(userData.asteroidresources + asteroid.resources),
                        }));
                      })
                      .catch((err) => console.error('Error buying asteroid:', err));
                    }
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
                  className={`shop-square neon-border ${userData.drones.includes(drone.id) ? 'purchased' : ''}`}
                  disabled={
                    userData.cs < drone.cost ||
                    userData.drones.includes(drone.id) ||
                    (drone.id > 1 && !userData.drones.includes(drone.id - 1))
                  }
                  onClick={() => {
                    if (userData.userId !== null) {
                      fetch(`${BACKEND_URL}/buy-drone`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: userData.userId,
                          droneId: drone.id,
                          cost: drone.cost,
                        }),
                      })
                        .then((res) => res.json())
                        .then(() => {
                          setUserData((prev) => ({
                            ...prev,
                            cs: prev.cs - drone.cost,
                            drones: [...prev.drones, drone.id],
                          }));
                        })
                        .catch((err) => console.error('Error buying drone:', err));
                    }
                  }}
                >
                  Бот №{drone.id}
                  <br />
                  ({drone.income} CCC/сутки)
                  <br />
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
                className={`shop-button neon-border ${userData.cargolevel >= cargo.level ? 'purchased' : ''}`}
                disabled={userData.cs < cargo.cost || userData.cargolevel > cargo.level}
                onClick={() => {
                  if (userData.userId !== null) {
                    fetch(`${BACKEND_URL}/upgrade-cargo`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: userData.userId,
                        level: cargo.level,
                        cost: cargo.cost,
                      }),
                    })
                      .then((res) => res.json())
                      .then(() => {
                        setUserData((prev) => ({
                          ...prev,
                          cs: prev.cs - cargo.cost,
                          cargolevel: cargo.level,
                        }));
                      })
                      .catch((err) => console.error('Error upgrading cargo:', err));
                  }
                }}
              >
                Уровень {cargo.level} {cargo.autoCollect ? "(Авто)" : `(${cargo.capacity} CCC)`} -{' '}
                {cargo.cost === 0 ? "Бесплатно" : `${cargo.cost} CS`}
              </button>
            ))}
          </div>
        );
      case "action-quests":
        return (
          <div className="tab-content tasks">
            <h2>Задания</h2>
            {userData.tasks.map((completed, index) => (
              <button
                key={index}
                className={`task-button neon-border ${completed ? 'completed' : ''}`}
                disabled={completed}
                onClick={() => {
                  if (userData.userId !== null) {
                    fetch(`${BACKEND_URL}/complete-task`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: userData.userId, taskId: index + 1 }),
                    })
                      .then((res) => res.json())
                      .then(() => {
                        setUserData((prev) => {
                          const newTasks = [...prev.tasks];
                          newTasks[index] = true;
                          return { ...prev, cs: prev.cs + 1, tasks: newTasks };
                        });
                      })
                      .catch((err) => console.error('Error completing task:', err));
                  }
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
        const canExchangeCccToCs = parseFloat(cccToCsAmount) > 0 && parseFloat(cccToCsAmount) <= userData.ccc;
        const canExchangeCsToCcc = parseFloat(csToCccAmount) > 0 && parseFloat(csToCccAmount) <= userData.cs;

        return (
          <div className="tab-content exchange">
            <h2>Обмен</h2>
            <div className="exchange-section">
              <h3>Обмен CCC на CS</h3>
              <div className="balance-info">Доступно: {Math.floor(userData.ccc * 100) / 100} CCC</div>
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
                  onClick={() => setCccToCsAmount(userData.ccc.toString())}
                >
                  Максимум
                </button>
              </div>
              <div className="exchange-result">Вы получите: {cccToCsResult.toFixed(2)} CS</div>
              <button
                className="exchange-button neon-border"
                disabled={!canExchangeCccToCs}
                onClick={() => {
                  const amountCCC = parseFloat(cccToCsAmount);
                  if (userData.userId !== null) {
                    fetch(`${BACKEND_URL}/exchange-ccc-to-cs`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: userData.userId, amountCCC }),
                    })
                      .then((res) => res.json())
                      .then((data) => {
                        if (data.success) {
                          setUserData((prev) => ({
                            ...prev,
                            ccc: prev.ccc - amountCCC,
                            cs: prev.cs + data.amountCS,
                          }));
                          setExchanges((prev) => [
                            {
                              type: 'CCC_TO_CS',
                              amount_from: amountCCC,
                              amount_to: data.amountCS,
                              timestamp: new Date().toISOString(),
                            },
                            ...prev,
                          ]);
                          setCccToCsAmount('');
                        } else {
                          alert(data.error);
                        }
                      })
                      .catch((err) => console.error('Error exchanging CCC to CS:', err));
                  }
                }}
              >
                Обменять
              </button>
            </div>

            <div className="exchange-section">
              <h3>Обмен CS на CCC</h3>
              <div className="balance-info">Доступно: {Math.floor(userData.cs * 100) / 100} CS</div>
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
                  onClick={() => setCsToCccAmount(userData.cs.toString())}
                >
                  Максимум
                </button>
              </div>
              <div className="exchange-result">Вы получите: {csToCccResult.toFixed(2)} CCC</div>
              <button
                className="exchange-button neon-border"
                disabled={!canExchangeCsToCcc}
                onClick={() => {
                  const amountCS = parseFloat(csToCccAmount);
                  if (userData.userId !== null) {
                    fetch(`${BACKEND_URL}/exchange-cs-to-ccc`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: userData.userId, amountCS }),
                    })
                      .then((res) => res.json())
                      .then((data) => {
                        if (data.success) {
                          setUserData((prev) => ({
                            ...prev,
                            cs: prev.cs - amountCS,
                            ccc: prev.ccc + data.amountCCC,
                          }));
                          setExchanges((prev) => [
                            {
                              type: 'CS_TO_CCC',
                              amount_from: amountCS,
                              amount_to: data.amountCCC,
                              timestamp: new Date().toISOString(),
                            },
                            ...prev,
                          ]);
                          setCsToCccAmount('');
                        } else {
                          alert(data.error);
                        }
                      })
                      .catch((err) => console.error('Error exchanging CS to CCC:', err));
                  }
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
          <div className="game-selection">
            <h2>Выберите игру</h2>
            <div className="game-buttons">
              <button
                className="menu-button neon-border"
                onClick={() => setGameData((prev) => ({ ...prev, activeTab: 'game-space-tapper' }))}
              >
                Space Tapper
              </button>
              <button
                className="menu-button neon-border"
                onClick={() => setGameData((prev) => ({ ...prev, activeTab: 'game-space-thimbles' }))}
              >
                Spaceсып Thimbles
              </button>
              <button
                className="menu-button neon-border"
                onClick={() => setGameData((prev) => ({ ...prev, activeTab: 'game-color-guess' }))}
              >
                Color Guess
              </button>
              <button
                className="menu-button neon-border"
                onClick={() => setGameData((prev) => ({ ...prev, activeTab: 'bottom-games' }))}
              >
                Назад
              </button>
            </div>
          </div>
        );
      case "game-space-tapper":
        return <SpaceTapper />;
      case "game-space-thimbles":
        return <SpaceThimbles />;
      case "game-color-guess":
        return <ColorGuess />;
      default:
        return <div className="tab-content">Неизвестная вкладка</div>;
    }
  };

  const renderContent = () => {
    if (gameData.activeTab === "bottom-rocket") {
      return <MainContent />;
    }
    return <TabContent tabId={gameData.activeTab} />;
  };

  if (isLoading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error) {
    return <div className="error">Ошибка: {error}</div>;
  }

  return (
    <div
      className="App"
      style={{ backgroundImage: `url(${cosmoBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <TopBar />
      {renderContent()}
      <div className="bottom-menu">
        {bottomMenuItems.map((item) => (
          <div
            key={item.id}
            className={`neon-icon-button ${gameData.activeTab === item.id ? 'active' : ''}`}
            onClick={() => setGameData((prev) => ({ ...prev, activeTab: item.id }))}
          >
            {item.icon}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;