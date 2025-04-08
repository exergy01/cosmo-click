import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState("resources");
  const [isPortrait, setIsPortrait] = useState(window.matchMedia("(orientation: portrait)").matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    const handler = () => setIsPortrait(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  if (!isPortrait) {
    return (
      <div className="rotate-warning">
        Пожалуйста, поверните устройство в вертикальное положение 📱
      </div>
    );
  }

  const menuItems = [
    { id: "resources", label: "РЕСУРСЫ", value: 0 },
    { id: "drones", label: "ДРОНЫ", value: 5 },
    { id: "cargo", label: "КАРГО", value: 300 },
  ];

  const bottomMenuItems = [
    { id: "game", icon: "🎮" },
    { id: "wallet", icon: "💳" },
    { id: "rocket", icon: "🚀" },
    { id: "friends", icon: "👥" },
    { id: "book", icon: "📖" },
  ];

  return (
    <div className="App">
      {activeTab !== "game" && (
        <div
          className="background"
          style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/images/galaxy_background.jpg)` }}
        />
      )}
      <div className="top-bar">
        <div className="currency neon-border">
          <span className="label">CCC:</span>
          <span className="value">123 456</span>
          <div className="subtext">+5200 в час</div>
        </div>
        <div className="currency neon-border">
          <span className="label">CS:</span>
          <span className="value">89</span>
          <div className="subtext">Курс: 1 CS = 10000 CCC</div>
        </div>
      </div>
      {activeTab !== "game" && (
        <>
          <div className="menu-buttons">
            {menuItems.map((item) => (
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
            <img src={`${process.env.PUBLIC_URL}/images/seif.png`} alt="Сейф" className="seif-image" />
          </div>
          <div className="button-row">
            <button
              className={`neon-button halfwidth ${activeTab === "attack" ? "active" : ""}`}
              onClick={() => setActiveTab("attack")}
            >
              🚀 Начать атаку
            </button>
            <button
              className={`neon-button halfwidth ${activeTab === "exchange" ? "active" : ""}`}
              onClick={() => setActiveTab("exchange")}
            >
              💱 Обмен CCC на CS
            </button>
          </div>
          <button
            className={`neon-button fullwidth ${activeTab === "quests" ? "active" : ""}`}
            onClick={() => setActiveTab("quests")}
          >
            📋 Задания от администрации
          </button>
        </>
      )}
      {activeTab === "game" && (
        <div className="game-icons">
          <span className="game-icon">🎯</span>
          <span className="game-icon">🕹️</span>
          <span className="game-icon">🧩</span>
          <span className="game-icon">🎲</span>
          <span className="game-icon">🏆</span>
        </div>
      )}
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