import React, { useState, useEffect } from 'react';
import './App.css';
import galaxyBackground from './images/galaxy_background.jpg';
import { useUser } from './contexts/UserContext';
import { useGame } from './contexts/GameContext';
import ColorGuess from './components/games/ColorGuess';
import SpaceTapper from './components/games/SpaceTapper';
import SpaceThimbles from './components/games/SpaceThimbles';

function App() {
  const { userData, setUserData, exchanges, setExchanges, isLoading } = useUser();
  const { gameData, setGameData } = useGame();
  const [isPortrait, setIsPortrait] = useState(window.matchMedia("(orientation: portrait)").matches);
  const [cccToCsAmount, setCccToCsAmount] = useState('');
  const [csToCccAmount, setCsToCccAmount] = useState('');

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    const handler = () => setIsPortrait(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Логика добычи CCC дронами и автоматического сбора
  useEffect(() => {
    if (userData.drones.length > 0 && userData.asteroids.length > 0 && userData.asteroidResources > 0) {
      const interval = setInterval(() => {
        const totalIncomePerDay = userData.drones.reduce((sum, droneId) => sum + droneData[droneId - 1].income, 0);
        const incomePerSecond = totalIncomePerDay / 86400;
        let newCargoCCC = userData.cargoCCC + incomePerSecond;
        let newAsteroidResources = Math.max(userData.asteroidResources - incomePerSecond, 0);

        console.log(`Добыча CCC: cargoLevel=${userData.cargoLevel}, newCargoCCC=${newCargoCCC}`);

        // Автоматический сбор на 5 уровне
        if (userData.cargoLevel === 5 && newCargoCCC >= 100) {
          console.log(`Автоматический сбор срабатывает: cargoCCC=${newCargoCCC}`);
          const amountToCollect = Math.floor(newCargoCCC / 100) * 100;
          newCargoCCC -= amountToCollect;

          setUserData((prev) => ({
            ...prev,
            ccc: prev.ccc + amountToCollect,
            cargoCCC: newCargoCCC,
            asteroidResources: newAsteroidResources,
          }));

          if (userData.userId !== null) {
            fetch('http://localhost:3001/collect-ccc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: userData.userId, amount: amountToCollect }),
            }).catch((err) => console.error('Error collecting CCC:', err));
          }
        } else if (userData.cargoLevel !== 5) {
          // Для уровней 1-4 ограничиваем вместимостью
          newCargoCCC = Math.min(newCargoCCC, getCargoCapacity());
        }

        setUserData((prev) => ({
          ...prev,
          cargoCCC: newCargoCCC,
          asteroidResources: newAsteroidResources,
        }));

        if (userData.userId !== null) {
          fetch('http://localhost:3001/update-resources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userData.userId,
              cargoCCC: newCargoCCC,
              asteroidResources: newAsteroidResources,
            }),
          }).catch((err) => console.error('Error updating resources:', err));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [userData.drones, userData.asteroids, userData.cargoCCC, userData.asteroidResources, userData.userId, userData.cargoLevel]);

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
    const cargo = cargoData[userData.cargoLevel - 1];
    return cargo ? cargo.capacity : Infinity;
  };

  const isAutoCollect = () => {
    const cargo = cargoData[userData.cargoLevel - 1];
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
        <img src={`${process.env.PUBLIC_URL}/images/space_bot_1.png`} alt="Дрон" className="drone-image" />
        <div className="seif-container">
          <img
            src={`${process.env.PUBLIC_URL}/images/seif.png`}
            alt="Сейф"
            className={`seif-image ${userData.cargoCCC >= 1 && !isAutoCollect() ? 'clickable' : ''}`}
            onClick={() => {
              if (userData.cargoCCC >= 1 && !isAutoCollect() && userData.userId !== null) {
                fetch('http://localhost:3001/collect-ccc', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: userData.userId, amount: userData.cargoCCC }),
                })
                  .then((res) => res.json())
                  .then(() => {
                    setUserData((prev) => ({
                      ...prev,
                      ccc: prev.ccc + prev.cargoCCC,
                      cargoCCC: 0,
                    }));
                    setGameData((prev) => ({
                      ...prev,
                      displayedResources: Math.floor(userData.asteroidResources),
                    }));
                  })
                  .catch((err) => console.error('Error collecting CCC:', err));
              }
            }}
          />
        </div>
        <div className="cargo-counter">{userData.cargoCCC.toFixed(4)}</div>
      </div>
      <div className="action-menu">
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
                  className={`shop-square neon-border ${userData.asteroids.includes(asteroid.id) ? 'purchased' : ''}`}
                  disabled={
                    userData.cs < asteroid.cost ||
                    userData.asteroids.includes(asteroid.id) ||
                    (asteroid.id > 1 && !userData.asteroids.includes(asteroid.id - 1))
                  }
                  onClick={() => {
                    if (userData.userId !== null) {
                      fetch('http://localhost:3001/buy-asteroid', {
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
                            asteroidResources: prev.asteroidResources + asteroid.resources,
                          }));
                          setGameData((prev) => ({
                            ...prev,
                            displayedResources: Math.floor(userData.asteroidResources + asteroid.resources),
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
                    fetch('http://localhost:3001/buy-asteroid', {
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
                          asteroidResources: prev.asteroidResources + asteroid.resources,
                        }));
                        setGameData((prev) => ({
                          ...prev,
                          displayedResources: Math.floor(userData.asteroidResources + asteroid.resources),
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
                      fetch('http://localhost:3001/buy-drone', {
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
                className={`shop-button neon-border ${userData.cargoLevel >= cargo.level ? 'purchased' : ''}`}
                disabled={userData.cs < cargo.cost || userData.cargoLevel > cargo.level}
                onClick={() => {
                  if (userData.userId !== null) {
                    fetch('http://localhost:3001/upgrade-cargo', {
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
                          cargoLevel: cargo.level,
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
                    fetch('http://localhost:3001/complete-task', {
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
                    fetch('http://localhost:3001/exchange-ccc-to-cs', {
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
                    fetch('http://localhost:3001/exchange-cs-to-ccc', {
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
                Space Thimbles
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

  return (
    <div
      className="App"
      style={{ backgroundImage: `url(${galaxyBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <TopBar />
      {renderContent()}
      <div className="bottom-menu">
        {bottomMenuItems.map((item) => (
          <button
            key={item.id}
            className={`neon-icon-button ${gameData.activeTab === item.id ? 'active' : ''}`}
            onClick={() => setGameData((prev) => ({ ...prev, activeTab: item.id }))}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;