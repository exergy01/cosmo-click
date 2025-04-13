import React, { createContext, useContext, useState, useEffect } from 'react';

interface GameData {
  activeTab: string;
  displayedResources: number;
}

interface GameContextType {
  gameData: GameData;
  setGameData: React.Dispatch<React.SetStateAction<GameData>>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userData } = useUser();
  const [gameData, setGameData] = useState<GameData>({
    activeTab: 'bottom-rocket',
    displayedResources: Math.floor(userData.asteroidResources),
  });

  useEffect(() => {
    setGameData((prev) => ({
      ...prev,
      displayedResources: Math.floor(userData.asteroidResources),
    }));
  }, [gameData.activeTab, userData.asteroidResources]);

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
