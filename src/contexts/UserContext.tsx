import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Exchange {
  type: 'CCC_TO_CS' | 'CS_TO_CCC';
  amount_from: number;
  amount_to: number;
  timestamp: string;
}

interface UserData {
  userId: number | null;
  ccc: number;
  cs: number;
  energy: number;
  asteroidresources: number;
  cargoccc: number;
  cargolevel: number;
  asteroids: number[];
  drones: number[];
  tasks: boolean[];
}

interface UserContextType {
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  exchanges: Exchange[];
  setExchanges: React.Dispatch<React.SetStateAction<Exchange[]>>;
  isLoading: boolean;
  error: string | null;
  telegramId: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<UserData>({
    userId: null,
    ccc: 0,
    cs: 0,
    energy: 100,
    asteroidresources: 0,
    cargoccc: 0,
    cargolevel: 1,
    asteroids: [],
    drones: [],
    tasks: Array(10).fill(false),
  });
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [telegramId, setTelegramId] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем, запущено ли приложение через Telegram Web App
    let telegramIdFromUrl: string | null = null;

    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      // Если запущено через Telegram Web App, получаем telegramId из initDataUnsafe
      telegramIdFromUrl = window.Telegram.WebApp.initDataUnsafe.user.id.toString();
    } else {
      // Запасной вариант: извлекаем telegramId из URL (для отладки)
      // Пример: https://cosmo-click.vercel.app/?telegramId=DEBUG_ID
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      telegramIdFromUrl = urlParams.get('telegramId') || hashParams.get('telegramId');
    }

    // Проверяем, есть ли telegramId
    if (!telegramIdFromUrl) {
      setError('Не указан Telegram ID. Пожалуйста, откройте приложение через Telegram-бот или добавьте параметр telegramId в URL для отладки (например, ?telegramId=DEBUG_ID).');
      setIsLoading(false);
      return;
    }

    setTelegramId(telegramIdFromUrl);

    fetch(`https://cosmo-click-backend.onrender.com/user/${telegramIdFromUrl}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch user data');
        return res.json();
      })
      .then((data) => {
        console.log('User data fetched:', data);
        setUserData({
          userId: data.id,
          ccc: Number(data.ccc) || 0,
          cs: Number(data.cs) || 0,
          energy: Number(data.energy) || 100,
          asteroidresources: Number(data.asteroidresources) || 0,
          cargoccc: Number(data.cargoccc) || 0,
          cargolevel: Number(data.cargolevel) || 1,
          asteroids: data.asteroids ? JSON.parse(data.asteroids) : [],
          drones: data.drones ? JSON.parse(data.drones) : [],
          tasks: data.tasks ? JSON.parse(data.tasks) : Array(10).fill(false),
        });

        fetch(`https://cosmo-click-backend.onrender.com/exchange-history/${telegramIdFromUrl}`)
          .then((res) => {
            if (!res.ok) throw new Error('Failed to fetch exchange history');
            return res.json();
          })
          .then((exchangeData) => {
            console.log('Exchange history fetched:', exchangeData);
            setExchanges(exchangeData);
            setIsLoading(false);
          })
          .catch((err) => {
            console.error('Error fetching exchange history:', err);
            setError('Failed to load exchange history');
            setIsLoading(false);
          });
      })
      .catch((err) => {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
        setIsLoading(false);
      });
  }, []);

  return (
    <UserContext.Provider value={{ userData, setUserData, exchanges, setExchanges, isLoading, error, telegramId }}>
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