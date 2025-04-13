import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { UserProvider } from './contexts/UserContext.tsx';
import { GameProvider } from './contexts/GameContext.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </UserProvider>
  </React.StrictMode>
);
