import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useUser } from './UserContext'; // Убрали .tsx

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
  const { userData } = useUser();
  const [gameData, setGameData] = useState<GameData>({
    activeTab: 'bottom-rocket',
    displayedResources: Math.floor(userData.asteroidResources),
  });

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