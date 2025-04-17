import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from './UserContext';

interface GameData {
  activeTab: string;
  displayedResources: number;
}

interface GameContextType {
  gameData: GameData;
  setGameData: React.Dispatch<React.SetStateAction<GameData>>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userData, isLoading } = useUser();
  const [gameData, setGameData] = useState<GameData>({
    activeTab: 'bottom-rocket',
    displayedResources: 0, // Изначально 0, пока данные не загрузятся
  });

  useEffect(() => {
    if (!isLoading) {
      setGameData((prev) => ({
        ...prev,
        displayedResources: Math.floor(userData.asteroidresources || 0),
      }));
    }
  }, [isLoading, userData.asteroidresources]);

  return (
    <GameContext.Provider value={{ gameData, setGameData }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};