import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState("bottom-rocket");
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

  const mainMenuItems: MenuItem[] = [
    { id: "main-resources", label: "РЕСУРСЫ", value: 0 },
    { id: "main-drones", label: "ДРОНЫ", value: 5 },
    { id: "main-cargo", label: "КАРГО", value: 300 },
  ];

  const actionMenuItems: MenuItem[] = [
    { id: "action-attack", label: "АТАКА" },
    { id: "action-exchange", label: "ОБМЕН" },
    { id: "action-quests", label: "ЗАДАНИЯ" },
  ];

  const bottomMenuItems: BottomMenuItem[] = [
    { id: "bottom-games", icon: "🎮" },
    { id: "bottom-wallet", icon: "💳" },
    { id: "bottom-rocket", icon: "🚀" },
    { id: "bottom-friends", icon: "👥" },
    { id: "bottom-guide", icon: "📖" },
  ];

  interface MenuItem {
    id: string;
    label: string;
    value?: number;
  }

  interface BottomMenuItem {
    id: string;
    icon: string;
  }

  const TopBar = () => (
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
  );

  const MainContent = () => (
    <>
      <div className="menu-buttons">
        {mainMenuItems.map((item: MenuItem) => (
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
      <div className="action-menu">
        {actionMenuItems.map((item: MenuItem) => (
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

  const TabContent = ({ tabId }: { tabId: string }) => {
    switch (tabId) {
      case "main-resources":
        return (
          <div className="tab-content">
            <h2>Магазин</h2>
            <p>Скоро здесь появится магазин ресурсов.</p>
          </div>
        );
      case "main-drones":
        return (
          <div className="tab-content">
            <h2>Дроны</h2>
            <p>Список ваших дронов будет здесь.</p>
          </div>
        );
      case "main-cargo":
        return (
          <div className="tab-content">
            <h2>Карго</h2>
            <p>Информация о грузах скоро появится.</p>
          </div>
        );
      case "action-attack":
        return (
          <div className="tab-content">
            <h2 style={{ color: 'white', textAlign: 'center' }}>В стадии разработки</h2>
          </div>
        );
      case "action-exchange":
        return (
          <div className="tab-content">
            <h2>Обмен</h2>
            <p>Обмен валют будет доступен позже.</p>
          </div>
        );
      case "action-quests":
        return (
          <div className="tab-content">
            <h2>Задания</h2>
            <p>Список заданий в разработке.</p>
          </div>
        );
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
      case "bottom-wallet":
        return (
          <div className="tab-content">
            <h2>Кошелёк</h2>
            <p>Подключение кошелька в процессе.</p>
          </div>
        );
      case "bottom-friends":
        return (
          <div className="tab-content">
            <h2>Друзья</h2>
            <p>Список друзей будет добавлен.</p>
          </div>
        );
      case "bottom-guide":
        return (
          <div className="tab-content">
            <h2>Гайд</h2>
            <p>Руководство пользователя скоро будет доступно.</p>
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
    <div className="App">
      <TopBar />
      {renderContent()}
      <div className="bottom-menu">
        {bottomMenuItems.map((item: BottomMenuItem) => (
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