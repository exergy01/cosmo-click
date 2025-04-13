import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';

const SpaceThimbles: React.FC = () => {
  const { userData, setUserData } = useUser();
  const [positions, setPositions] = useState<number[]>([0, 1, 2]);
  const [correctPosition, setCorrectPosition] = useState<number>(0);
  const [bet, setBet] = useState<number>(0);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [gameState, setGameState] = useState<'initial' | 'playing' | 'revealed'>('initial');
  const [message, setMessage] = useState<string>('');
  const [gameHistory, setGameHistory] = useState<any[]>([]);

  const images = [
    `${process.env.PUBLIC_URL}/images/ufo.png`,
    `${process.env.PUBLIC_URL}/images/galaxy.png`,
    `${process.env.PUBLIC_URL}/images/black-hole.png`,
  ];

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

  const shufflePositions = () => {
    setIsShuffling(true);
    setTimeout(() => {
      const newPositions = [...positions].sort(() => Math.random() - 0.5);
      setPositions(newPositions);
      setIsShuffling(false);
      setGameState('playing');
    }, 1000);
  };

  const handleGuess = (index: number) => {
    if (gameState !== 'playing') return;

    const isCorrect = positions[index] === correctPosition;
    const multiplier = isCorrect ? 2 : -1;
    const newCS = userData.cs + bet * multiplier;

    setUserData((prev) => ({ ...prev, cs: newCS }));
    setGameState('revealed');

    if (userData.userId !== null) {
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
          gameType: 'SpaceThimbles',
          result: isCorrect ? 'win' : 'loss',
          amount: bet * multiplier,
        }),
      })
        .then(() => fetchGameHistory())
        .catch((err) => console.error('Error saving game history:', err));
    } else {
      console.error('User ID is null, cannot save game history');
    }

    setMessage(isCorrect ? `Вы выиграли ${bet * 2} CS!` : `Вы проиграли ${bet} CS!`);
  };

  const startNewGame = () => {
    if (userData.cs < bet) {
      setMessage('Недостаточно CS для ставки!');
      return;
    }

    setCorrectPosition(Math.floor(Math.random() * 3));
    setPositions([0, 1, 2]);
    setGameState('initial');
    setMessage('');
  };

  return (
    <div className="space-thimbles">
      <div className="resource-info">
        <p>CS: {userData.cs.toFixed(2)}</p>
      </div>
      <div className="bet-section">
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
      </div>
      <div className="game-table">
        <div className="ufo-container">
          {positions.map((pos, index) => (
            <div
              key={index}
              className={`ufo-wrapper ${isShuffling ? 'shuffling' : ''} ${
                gameState === 'revealed'
                  ? pos === correctPosition
                    ? 'win-border'
                    : 'lose-border'
                  : ''
              }`}
              onClick={() => handleGuess(index)}
            >
              <img
                src={images[gameState === 'revealed' ? pos : 0]}
                alt="UFO"
                className={`ufo-image ${
                  gameState === 'revealed'
                    ? pos === correctPosition
                      ? 'win-effect'
                      : 'lose-effect'
                    : ''
                }`}
              />
            </div>
          ))}
        </div>
        {gameState === 'initial' && (
          <button
            className="shuffle-button neon-border"
            onClick={shufflePositions}
            disabled={bet <= 0 || userData.cs < bet}
          >
            Перемешать
          </button>
        )}
        {gameState === 'revealed' && (
          <button className="shuffle-button neon-border" onClick={startNewGame}>
            Новая игра
          </button>
        )}
      </div>
      {message && (
        <div className="result-text">
          <p>{message}</p>
        </div>
      )}
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

export default SpaceThimbles;