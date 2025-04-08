import React, { useState, useEffect } from 'react';
import './App.css';
import bookIcon from "./assets/icons/book.png";
import gameIcon from "./assets/icons/game.png";
import inviteIcon from "./assets/icons/invite.png";
import rocketIcon from "./assets/icons/rocket.png";
import walletIcon from "./assets/icons/wallet.png";

function App() {
  const [activeTab, setActiveTab] = useState("resources");
  const [isPortrait, setIsPortrait] = useState(window.matchMedia("(orientation: portrait)").matches);

  useEffect(() => {
    const handler = () => {
      setIsPortrait(window.matchMedia("(orientation: portrait)").matches);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
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
    { id: "weapon", label: "ОРУЖИЕ", value: "в процессе" }
  ];

  const bottomMenuItems = [
    { id: "game", icon: "🎮" },
    { id: "wallet", icon: "💳" },
    { id: "rocket", icon: "🚀" },
    { id: "friends", icon: "👥" },
    { id: "book", icon: "📖" }
  ];

  return (
    <div className="App">
      <div
        className="background"
        style={{
          backgroundImage: `url(${process.env.PUBLIC_URL}/images/galaxy_background.jpg)`,
        }}
      />

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
        <img src="/images/space_bot_1.png" alt="Дрон" className="drone-image" />
        <img src="/images/seif.png" alt="Сейф" className="seif-image" />
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
