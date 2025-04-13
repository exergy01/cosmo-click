import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Без .tsx
import './index.css';
import { UserProvider } from './contexts/UserContext'; // Без .tsx
import { GameProvider } from './contexts/GameContext'; // Без .tsx

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <UserProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </UserProvider>
  </React.StrictMode>
);