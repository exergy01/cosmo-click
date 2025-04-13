import React, { createContext, useContext, useState, useEffect } from 'react';

interface TelegramWebApp {
  ready: () => void;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
}

interface Telegram {
  WebApp: TelegramWebApp;
}

declare global {
  interface Window {
    Telegram: Telegram;
  }
}

interface UserData {
  userId: number | null;
  ccc: number;
  cs: number;
  tasks: boolean[];
  drones: number[];
  asteroids: number[];
  cargoLevel: number;
  cargoCCC: number;
  asteroidResources: number;
}

interface UserContextType {
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  exchanges: any[];
  setExchanges: React.Dispatch<React.SetStateAction<any[]>>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<UserData>({
    userId: null,
    ccc: 0,
    cs: 0,
    tasks: Array(15).fill(false),
    drones: [],
    asteroids: [],
    cargoLevel: 1,
    cargoCCC: 0,
    asteroidResources: 0,
  });
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let userId: number | null = null;

    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      const telegramUser = window.Telegram.WebApp.initDataUnsafe?.user;
      if (telegramUser && telegramUser.id) {
        userId = telegramUser.id;
      } else {
        console.error('Не удалось получить userId из Telegram');
        userId = 1; // Fallback для тестов
      }
    } else {
      console.warn('Telegram Web App API недоступен, использую userId = 1');
      userId = 1; // Fallback для локальной разработки
    }

    setUserData((prev) => ({ ...prev, userId }));

    if (userId !== null) {
      fetch(`http://localhost:3001/user/${userId}`)
        .then((res) => res.json())
        .then((data) => {
          setUserData({
            userId,
            ccc: data.ccc || 0,
            cs: data.cs || 0,
            tasks: Array.isArray(data.tasks) && data.tasks.length === 15 ? data.tasks : Array(15).fill(false),
            drones: Array.isArray(data.drones) ? data.drones : [],
            asteroids: Array.isArray(data.asteroids) ? data.asteroids : [],
            cargoLevel: data.cargoLevel || 1,
            cargoCCC: data.cargoCCC || 0,
            asteroidResources: data.asteroidResources || 0,
          });
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Error loading user data:', err);
          setIsLoading(false);
        });

      fetch(`http://localhost:3001/exchanges/${userId}`)
        .then((res) => res.json())
        .then((data) => setExchanges(data))
        .catch((err) => console.error('Error loading exchanges:', err));
    }
  }, []);

  return (
    <UserContext.Provider value={{ userData, setUserData, exchanges, setExchanges, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
