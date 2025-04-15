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

  useEffect(() => {
    fetch('https://cosmo-click-backend.onrender.com/user/1')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch user data');
        return res.json();
      })
      .then((data) => {
        console.log('User data fetched:', data);
        setUserData({
          userId: data.id,
          ccc: data.ccc || 0,
          cs: data.cs || 0,
          energy: data.energy || 100,
          asteroidresources: data.asteroidresources || 0,
          cargoccc: data.cargoccc || 0,
          cargolevel: data.cargolevel || 1,
          asteroids: data.asteroids ? JSON.parse(data.asteroids) : [],
          drones: data.drones ? JSON.parse(data.drones) : [],
          tasks: data.tasks ? JSON.parse(data.tasks) : Array(10).fill(false),
        });

        fetch('https://cosmo-click-backend.onrender.com/exchange-history/1')
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
    <UserContext.Provider value={{ userData, setUserData, exchanges, setExchanges, isLoading, error }}>
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