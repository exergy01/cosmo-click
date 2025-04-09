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