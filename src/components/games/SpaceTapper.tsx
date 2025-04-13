import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';

const SpaceTapper: React.FC = () => {
  const { userData, setUserData } = useUser();
  const [clicks, setClicks] = useState<number>(0);

  const handleTap = () => {
    if (userData.energy < 1) {
      alert('Недостаточно энергии для добычи!');
      return;
    }

    const newEnergy = userData.energy - 1;
    const newAsteroidResources = userData.asteroidResources + 0.1;
    const newClicks = clicks + 1;

    setUserData((prev) => ({
      ...prev,
      energy: newEnergy,
      asteroidResources: newAsteroidResources,
    }));

    setClicks(newClicks);

    if (userData.userId !== null) {
      fetch('http://localhost:3001/update-energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.userId,
          energy: newEnergy,
        }),
      }).catch((err) => console.error('Error updating energy:', err));

      fetch('http://localhost:3001/update-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.userId,
          asteroidResources: newAsteroidResources,
          cargoCCC: userData.cargoCCC,
        }),
      }).catch((err) => console.error('Error updating resources:', err));
    } else {
      console.error('User ID is null, cannot update energy or resources');
    }
  };

  const handleClaim = () => {
    if (userData.userId !== null) {
      fetch('http://localhost:3001/update-currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.userId,
          ccc: userData.ccc + userData.asteroidResources,
          cs: userData.cs,
        }),
      })
        .then(() => {
          setUserData((prev) => ({
            ...prev,
            ccc: prev.ccc + prev.asteroidResources,
            asteroidResources: 0,
          }));
          setClicks(0);
        })
        .catch((err) => console.error('Error claiming resources:', err));
    } else {
      console.error('User ID is null, cannot claim resources');
    }
  };

  return (
    <div className="space-tapper">
      <div className="resource-info">
        <p>Энергия: {userData.energy}</p>
        <p>Ресурсы: {userData.asteroidResources.toFixed(2)} CCC</p>
        <p>Клики: {clicks}</p>
      </div>
      <img
        src={`${process.env.PUBLIC_URL}/images/asteroid.png`}
        alt="Asteroid"
        className="asteroid-image"
        onClick={handleTap}
      />
      <button
        className="claim-button neon-border"
        onClick={handleClaim}
        disabled={userData.asteroidResources < 1}
      >
        Забрать ресурсы
      </button>
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

export default SpaceTapper;