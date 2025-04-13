import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useGame } from '../../contexts/GameContext';
import ufoImage from '../../assets/images/ufo.png';
import galaxyImage from '../../assets/images/galaxy.png';
import blackHoleImage from '../../assets/images/black-hole.png';

const SpaceThimbles: React.FC = () => {
  const { userData, setUserData, isLoading } = useUser();
  const { gameData, setGameData } = useGame();

  const [positions, setPositions] = useState<number[]>([0, 1, 2]);
  const [correctPosition, setCorrectPosition] = useState<number>(1);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [betAmount, setBetAmount] = useState<number>(1);
  const [result, setResult] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [gameHistory, setGameHistory] = useState<any[]>([]);

  const balance = userData?.cs ?? 0;

  useEffect(() => {
    if (!userData?.userId) return;

    const fetchGameHistory = async () => {
      try {
        console.log(`Fetching game history for userId: ${userData.userId}`);
        const response = await fetch(`http://localhost:3001/game-history/${userData.userId}`);
        const data = await response.json();
        console.log('Game history received:', data);
        setGameHistory(data);
      } catch (err) {
        console.error('Error fetching game history:', err);
      }
    };

    fetchGameHistory();
  }, [userData?.userId]);

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(balance, parseFloat(e.target.value) || 1));
    setBetAmount(value);
  };

  const shufflePositions = () => {
    setIsShuffling(true);
    setIsRevealed(false);
    setResult(null);
    setSelectedIndex(null);

    const shuffleSteps = 10;
    let step = 0;

    const interval = setInterval(() => {
      setPositions((prev) => {
        const newPositions = [...prev];
        for (let i = newPositions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newPositions[i], newPositions[j]] = [newPositions[j], newPositions[i]];
        }
        return newPositions;
      });
      step++;
      if (step >= shuffleSteps) {
        clearInterval(interval);
        setIsShuffling(false);
        setCorrectPosition(Math.floor(Math.random() * 3));
      }
    }, 300);
  };

  const handleUfoClick = async (index: number) => {
    if (isShuffling || isRevealed || !userData) return;

    setIsRevealed(true);
    setSelectedIndex(index);
    const won = positions[index] === correctPosition;

    try {
      console.log('Sending update-resources request:', {
        userId: parseInt(userData.userId),
        asteroidResources: userData.asteroidResources,
        cargoCCC: userData.cargoCCC,
        cs: won ? userData.cs + betAmount * 2 : userData.cs - betAmount,
      });

      if (won) {
        const winnings = betAmount * 2;
        const newCS = userData.cs + winnings;
        const response = await fetch('http://localhost:3001/update-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(userData.userId),
            asteroidResources: userData.asteroidResources,
            cargoCCC: userData.cargoCCC,
            cs: newCS,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Server response:', data);

        await fetch('http://localhost:3001/save-game-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(userData.userId),
            gameType: 'SpaceThimbles',
            result: 'win',
            amount: winnings,
          }),
        });

        setUserData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            cs: newCS,
          };
        });
        setResult('Галактика спасена!');
        setGameHistory((prev) => [
          { result: 'win', amount: winnings, timestamp: new Date().toISOString() },
          ...prev.slice(0, 9),
        ]);
      } else {
        const newCS = userData.cs - betAmount;
        const response = await fetch('http://localhost:3001/update-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(userData.userId),
            asteroidResources: userData.asteroidResources,
            cargoCCC: userData.cargoCCC,
            cs: newCS,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Server response:', data);

        await fetch('http://localhost:3001/save-game-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(userData.userId),
            gameType: 'SpaceThimbles',
            result: 'lose',
            amount: betAmount,
          }),
        });

        setUserData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            cs: newCS,
          };
        });
        setResult('Вы попали в чёрную дыру!');
        setGameHistory((prev) => [
          { result: 'lose', amount: betAmount, timestamp: new Date().toISOString() },
          ...prev.slice(0, 9),
        ]);
      }
    } catch (err) {
      console.error('Error syncing resources:', err);
      setResult('Ошибка при обновлении баланса. Попробуйте снова.');
      setGameHistory((prev) => [
        { result: 'error', amount: 0, timestamp: new Date().toISOString() },
        ...prev.slice(0, 9),
      ]);
    }
  };

  const handlePlayAgain = () => {
    setIsRevealed(false);
    setResult(null);
    setPositions([0, 1, 2]);
    setCorrectPosition(1);
    setSelectedIndex(null);
  };

  const handleBackToGames = () => {
    setGameData((prev) => ({ ...prev, activeTab: 'bottom-games' }));
  };

  const handleBackToMainMenu = () => {
    setGameData((prev) => ({ ...prev, activeTab: 'bottom-rocket' }));
  };

  if (isLoading || !userData) {
    return <div className="space-thimbles">Загрузка данных...</div>;
  }

  return (
    <div className="space-thimbles">
      <div className="bet-section">
        <div className="balance-info">Ваш баланс: {(userData.cs ?? 0).toFixed(2)} CS</div>
        <div className="bet-input">
          <label>Ставка (CS):</label>
          <input
            type="number"
            value={betAmount}
            onChange={handleBetChange}
            min="1"
            max={balance}
            disabled={isShuffling || isRevealed}
          />
        </div>
      </div>

      <div className="game-table">
        <div className="ufo-container">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`ufo-wrapper ufo-${positions[index]} ${isShuffling ? 'shuffling' : ''} ${
                selectedIndex === index && isRevealed
                  ? positions[index] === correctPosition
                    ? 'win-border'
                    : 'lose-border'
                  : ''
              }`}
              onClick={() => handleUfoClick(index)}
            >
              {!isRevealed && <img src={ufoImage} alt="НЛО" className="ufo-image" />}
              {isRevealed && positions[index] === correctPosition && (
                <img src={galaxyImage} alt="Галактика" className="galaxy-image win-effect" />
              )}
              {isRevealed && positions[index] !== correctPosition && (
                <img src={blackHoleImage} alt="Чёрная дыра" className="black-hole-image lose-effect" />
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        className="shuffle-button"
        onClick={shufflePositions}
        disabled={isShuffling || isRevealed || betAmount > balance || betAmount <= 0}
      >
        Запуск перемешивания
      </button>

      {result && (
        <div className="result-text">
          <p>{result}</p>
          <button className="menu-button" onClick={handlePlayAgain}>
            Играть снова
          </button>
        </div>
      )}

      <div className="game-history">
        <h3>История игр</h3>
        {gameHistory.length > 0 ? (
          gameHistory.map((entry, index) => (
            <div key={index} className="game-history-item">
              {entry.result === 'win'
                ? `Выиграли ${entry.amount.toFixed(2)} CS`
                : entry.result === 'lose'
                ? `Проиграли ${entry.amount.toFixed(2)} CS`
                : 'Ошибка при обновлении баланса'}
            </div>
          ))
        ) : (
          <p>История пуста</p>
        )}
      </div>

      <div className="navigation-buttons">
        <button className="menu-button" onClick={handleBackToGames}>
          Вернуться к играм
        </button>
        <button className="menu-button" onClick={handleBackToMainMenu}>
          В главное меню
        </button>
      </div>
    </div>
  );
};

export default SpaceThimbles;
