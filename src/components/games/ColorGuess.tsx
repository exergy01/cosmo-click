import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext'; // Убрали .tsx

const ColorGuess: React.FC = () => {
  const { userData, setUserData } = useUser();
  const [color1, setColor1] = useState<string>('gray');
  const [color2, setColor2] = useState<string>('gray');
  const [task, setTask] = useState<string>('red');
  const [bet, setBet] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [gameHistory, setGameHistory] = useState<any[]>([]);

  const colors = ['red', 'yellow', 'green'];

  const fetchGameHistory = () => {
    if (userData.userId !== null) {
      fetch(`http://localhost:3001/game-history/${userData.userId}`)
        .then((res) => res.json())
        .then((data) => setGameHistory(data))
        .catch((err) => console.error('Error fetching game history:', err));
    }
  };

  useEffect(() => {
    fetchGameHistory();
  }, []);

  const generateColors = () => {
    const newColor1 = colors[Math.floor(Math.random() * colors.length)];
    const newColor2 = colors[Math.floor(Math.random() * colors.length)];
    setColor1(newColor1);
    setColor2(newColor2);
    setTask(colors[Math.floor(Math.random() * colors.length)]);
  };

  const handleGuess = (color: string) => {
    if (userData.cs < bet) {
      setMessage('Недостаточно CS для ставки!');
      return;
    }

    if (userData.userId !== null) {
      const isWin = color === task;
      const newCS = isWin ? userData.cs + bet : userData.cs - bet;

      setUserData((prev) => ({ ...prev, cs: newCS }));

      fetch('http://localhost:3001/update-currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.userId,
          ccc: userData.ccc,
          cs: newCS,
        }),
      }).catch((err) => console.error('Error updating currencies:', err));

      fetch('http://localhost:3001/save-game-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.userId,
          gameType: 'ColorGuess',
          result: isWin ? 'win' : 'loss',
          amount: isWin ? bet : -bet,
        }),
      })
        .then(() => fetchGameHistory())
        .catch((err) => console.error('Error saving game history:', err));

      setMessage(isWin ? `Вы выиграли ${bet} CS!` : `Вы проиграли ${bet} CS!`);
      generateColors();
    } else {
      console.error('User ID is null, cannot process guess');
      setMessage('Ошибка: Не удалось определить пользователя');
    }
  };

  const handleQuickBet = (amount: number) => {
    setBet(amount);
  };

  return (
    <div className="color-guess">
      <div className="resource-info">
        <p>CS: {userData.cs.toFixed(2)}</p>
      </div>
      <div className="game-field">
        <div className={`color-field ${color1}`} onClick={() => handleGuess(color1)}></div>
        <div className={`color-field ${color2}`} onClick={() => handleGuess(color2)}></div>
      </div>
      <div className="task-text">Найдите: {task}</div>
      <div className="bet-input">
        <label>Ставка (CS):</label>
        <input
          type="number"
          value={bet}
          onChange={(e) => setBet(parseFloat(e.target.value))}
          min="0"
          step="0.1"
        />
      </div>
      <div className="quick-bet-buttons">
        <button className="quick-bet-button neon-border" onClick={() => handleQuickBet(1)}>
          1 CS
        </button>
        <button className="quick-bet-button neon-border" onClick={() => handleQuickBet(5)}>
          5 CS
        </button>
        <button className="quick-bet-button neon-border" onClick={() => handleQuickBet(10)}>
          10 CS
        </button>
      </div>
      {message && <div className="result-text">{message}</div>}
      <div className="game-history">
        <h3>История игр</h3>
        {gameHistory.map((entry, index) => (
          <div key={index} className="game-history-item">
            {entry.gameType}: {entry.result === 'win' ? 'Победа' : 'Поражение'} ({entry.amount} CS) -{' '}
            {new Date(entry.timestamp).toLocaleString()}
          </div>
        ))}
      </div>
      <div className="navigation-buttons">
        <button
          className="menu-button neon-border"
          onClick={() => window.location.reload()}
        >
          Назад
        </button>
      </div>
    </div>
  );
};

export default ColorGuess;