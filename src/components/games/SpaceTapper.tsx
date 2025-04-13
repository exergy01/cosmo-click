import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useGame } from '../../contexts/GameContext';
import asteroidImage from '../../assets/images/asteroid.png';

const SpaceTapper: React.FC = () => {
  const { userData, setUserData, isLoading } = useUser();
  const { gameData, setGameData } = useGame();

  const [energy, setEnergy] = useState(userData?.energy ?? 1000);
  const [earnedCCC, setEarnedCCC] = useState(() => {
    const savedCCC = localStorage.getItem('spaceTapperEarnedCCC');
    return savedCCC ? parseFloat(savedCCC) : 0;
  });

  const energyPerTap = 1;
  const tapAmount = 0.01;
  const cargoCapacity = userData?.cargoLevel === 5 ? 1000 : userData?.cargoLevel === 4 ? 500 : userData?.cargoLevel === 3 ? 100 : userData?.cargoLevel === 2 ? 50 : 10;

  useEffect(() => {
    setEnergy(userData?.energy ?? 1000);
  }, [userData?.energy]);

  const handleTap = () => {
    console.log('HandleTap called with:');
    console.log(`Energy: ${energy}, EnergyPerTap: ${energyPerTap}`);
    console.log(`Asteroid Resources: ${userData?.asteroidResources ?? 0}, TapAmount: ${tapAmount}`);
    console.log(`Cargo: userData.cargoCCC=${userData?.cargoCCC ?? 0}, earnedCCC=${earnedCCC}, tapAmount=${tapAmount}, cargoCapacity=${cargoCapacity}`);

    if (energy < energyPerTap) {
      console.log('Not enough energy to tap');
      return;
    }
    if ((userData?.asteroidResources ?? 0) < tapAmount) {
      console.log('Not enough asteroid resources to tap');
      return;
    }
    if (((userData?.cargoCCC ?? 0) + earnedCCC + tapAmount) > cargoCapacity) {
      console.log('Cargo capacity exceeded');
      return;
    }

    const newEnergy = energy - energyPerTap;
    setEnergy(newEnergy);
    setEarnedCCC((prev) => {
      const newEarnedCCC = prev + tapAmount;
      localStorage.setItem('spaceTapperEarnedCCC', newEarnedCCC.toString());
      return newEarnedCCC;
    });

    fetch('http://localhost:3001/update-energy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userData ? parseInt(userData.userId) : 0,
        energy: newEnergy,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        if (userData) {
          setUserData((prev) => {
            if (!prev) return prev;
            return { ...prev, energy: newEnergy };
          });
        }
      })
      .catch((err) => console.error('Error updating energy:', err));
  };

  const handleClaim = () => {
    if (earnedCCC <= 0 || (userData?.asteroidResources ?? 0) < earnedCCC || ((userData?.cargoCCC ?? 0) + earnedCCC) > cargoCapacity) {
      return;
    }

    const newCargoCCC = (userData?.cargoCCC ?? 0) + earnedCCC;
    const newAsteroidResources = (userData?.asteroidResources ?? 0) - earnedCCC;

    if (userData) {
      setUserData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          asteroidResources: newAsteroidResources,
          cargoCCC: newCargoCCC,
        };
      });
    }

    setGameData((prev) => ({
      ...prev,
      displayedResources: Math.floor(newAsteroidResources),
    }));

    fetch('http://localhost:3001/update-resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userData ? parseInt(userData.userId) : 0,
        asteroidResources: newAsteroidResources,
        cargoCCC: newCargoCCC,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setEarnedCCC(0);
        localStorage.setItem('spaceTapperEarnedCCC', '0');
      })
      .catch((err) => console.error('Error claiming resources:', err));
  };

  const handleBackToMainMenu = () => {
    setGameData((prev) => ({ ...prev, activeTab: 'bottom-rocket' }));
  };

  if (isLoading || !userData) {
    return <div className="space-tapper">Загрузка...</div>;
  }

  return (
    <div className="space-tapper">
      <div className="resource-info">
        <p>Энергия: {energy} / 1000</p>
        <p>Ресурсы астероида: {(userData.asteroidResources ?? 0).toFixed(2)}</p>
        <p>Накоплено CCC: {earnedCCC.toFixed(2)}</p>
        <p>Карго: {(userData.cargoCCC ?? 0).toFixed(2)} / {cargoCapacity}</p>
      </div>
      <img src={asteroidImage} alt="Астероид" className="asteroid-image" onClick={handleTap} />
      <button className="claim-button" onClick={handleClaim} disabled={earnedCCC <= 0}>
        Забрать CCC
      </button>
      <button className="menu-button" onClick={handleBackToMainMenu}>
        В главное меню
      </button>
    </div>
  );
};

export default SpaceTapper;
