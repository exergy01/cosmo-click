import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useGame } from '../../contexts/GameContext';

const ColorGuess: React.FC = () => {
  const { userData, setUserData, isLoading } = useUser();
  const { gameData, setGameData } = useGame();

  const colors = ['red', 'yellow', 'green'];
  const [targetColor, setTargetColor] = useState<string>('');
  const [fieldColors, setFieldColors] = useState<string[]>([]);
  const [selectedField, setSelectedField] = useState<number | null>(null);
  const [result, setResult] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('');
  const [lastCustomBet, setLastCustomBet] = useState<string>('');
  const [showDoubleBetPrompt, setShowDoubleBetPrompt] = useState<boolean>(false);
  const [gameHistory, setGameHistory] = useState<any[]>([]); // История игр из базы данных

  // Загрузка истории игр при монтировании компонента
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

  const startNewGame = () => {
    const newTargetColor = colors[Math.floor(Math.random() * colors.length)];
    const newFieldColors = Array(3).fill('').map(() => colors[Math.floor(Math.random() * colors.length)]);
    newFieldColors[Math.floor(Math.random() * 3)] = newTargetColor;

    setTargetColor(newTargetColor);
    setFieldColors(newFieldColors);
    setSelectedField(null);
    setResult('');
    setShowDoubleBetPrompt(false);
    if (!lastCustomBet) setBetAmount('');
  };

  useEffect(() => {
    startNewGame();
  }, []);

  const handleFieldClick = async (index: number) => {
    if (selectedField !== null || !betAmount || !userData) return;

    const bet = parseFloat(betAmount);
    if (isNaN(bet)) return;

    setSelectedField(index);

    const won = fieldColors[index] === targetColor;
    let newCS = userData.cs;

    try {
      if (won) {
        newCS += bet * 2;
        setResult(`Вы выиграли! +${(bet * 2).toFixed(2)} CS`);
        await fetch('http://localhost:3001/save-game-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(userData.userId),
            gameType: 'ColorGuess',
            result: 'win',
            amount: bet * 2,
          }),
        });
        setGameHistory((prev) => [
          { result: 'win', amount: bet * 2, timestamp: new Date().toISOString() },
          ...prev.slice(0, 9),
        ]);
      } else {
        newCS -= bet;
        setResult(`Вы проиграли. -${bet.toFixed(2)} CS`);
        setShowDoubleBetPrompt(true);
        await fetch('http://localhost:3001/save-game-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(userData.userId),
            gameType: 'ColorGuess',
            result: 'lose',
            amount: bet,
          }),
        });
        setGameHistory((prev) => [
          { result: 'lose', amount: bet, timestamp: new Date().toISOString() },
          ...prev.slice(0, 9),
        ]);
      }

      console.log('Sending update-currencies request:', {
        userId: parseInt(userData.userId),
        ccc: userData.ccc,
        cs: newCS,
      });

      const response = await fetch('http://localhost:3001/update-currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(userData.userId),
          ccc: userData.ccc,
          cs: newCS,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Server response:', data);

      setUserData((prev) =>
        prev
          ? {
              ...prev,
              cs: newCS,
            }
          : prev
      );
    } catch (err) {
      console.error('Error syncing currencies:', err);
      setResult('Ошибка при обновлении баланса. Попробуйте снова.');
      setGameHistory((prev) => [
        { result: 'error', amount: 0, timestamp: new Date().toISOString() },
        ...prev.slice(0, 9),
      ]);
    }
  };

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userData) return;

    const value = e.target.value;
    const numValue = parseFloat(value);

    if (numValue < 1) setBetAmount('1');
    else if (numValue > 100) setBetAmount('100');
    else if (numValue > userData.cs) setBetAmount(userData.cs.toString());
    else setBetAmount(value);

    setLastCustomBet(value);
  };

  const handleQuickBet = (amount: number | 'max') => {
    if (!userData) return;

    let newBet: number;
    if (amount === 'max') {
      newBet = Math.min(userData.cs, 100);
    } else {
      newBet = Math.min(amount, userData.cs, 100);
    }
    setBetAmount(newBet.toString());
    setLastCustomBet('');
  };

  const handleDoubleBet = () => {
    if (!userData) return;

    const currentBet = parseFloat(betAmount);
    const doubledBet = currentBet * 2;
    const newBet = Math.min(doubledBet, 100, userData.cs);

    if (doubledBet > 100) {
      alert('Максимальная ставка 100 CS. Установлена максимальная ставка.');
    }

    setBetAmount(newBet.toString());
    setShowDoubleBetPrompt(false);
    setLastCustomBet('');
    startNewGame();
  };

  const handlePlaceBet = () => {
    if (!betAmount || parseFloat(betAmount) <= 0) return;
    setSelectedField(null);
    setResult('');
    setShowDoubleBetPrompt(false);
  };

  const handleBackToSystem = () => {
    setGameData((prev) => ({ ...prev, activeTab: 'bottom-rocket' }));
  };

  const handleBackToGames = () => {
    setGameData((prev) => ({ ...prev, activeTab: 'bottom-games' }));
  };

  const canPlay = userData && userData.cs >= 1;

  if (isLoading || !userData) {
    return <div className="color-guess">Загрузка данных...</div>;
  }

  return (
    <div className="color-guess">
      <div className="game-field">
        {fieldColors.map((color, index) => (
          <div
            key={index}
            className={`color-field ${selectedField === index ? color : 'gray'}`}
            onClick={() => handleFieldClick(index)}
          />
        ))}
      </div>
      <div className="task-text">
        Найди {targetColor === 'red' ? 'красный' : targetColor === 'yellow' ? 'жёлтый' : 'зелёный'}
      </div>
      <div className="bet-input">
        <input
          type="number"
          value={betAmount}
          onChange={handleBetChange}
          placeholder="Ставка (1-100 CS)"
          disabled={!canPlay || selectedField !== null}
        />
        <button
          className="menu-button"
          onClick={handlePlaceBet}
          disabled={!canPlay || !betAmount || parseFloat(betAmount) <= 0 || selectedField !== null}
        >
          Сделать ставку
        </button>
      </div>
      <div className="quick-bet-buttons">
        <button className="quick-bet-button" onClick={() => handleQuickBet(1)}>1</button>
        <button className="quick-bet-button" onClick={() => handleQuickBet(10)}>10</button>
        <button className="quick-bet-button" onClick={() => handleQuickBet(50)}>50</button>
        <button className="quick-bet-button" onClick={() => handleQuickBet(100)}>100</button>
        <button className="quick-bet-button" onClick={() => handleQuickBet('max')}>MAX</button>
      </div>
      {result && (
        <div className="result-text">
          {result}
          {showDoubleBetPrompt && (
            <button className="menu-button" onClick={handleDoubleBet}>
              Удвоить ставку ({Math.min(parseFloat(betAmount) * 2, 100, userData.cs).toFixed(2)} CS)
            </button>
          )}
          <button className="menu-button" onClick={startNewGame}>
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
        <button className="menu-button" onClick={handleBackToSystem}>
          Вернуться в систему
        </button>
        <button className="menu-button" onClick={handleBackToGames}>
          К выбору игр
        </button>
      </div>
    </div>
  );
};

export default ColorGuess;
