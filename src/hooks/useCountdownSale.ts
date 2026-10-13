import { useEffect, useState } from 'react';

const DATE_TO_REACH = new Date(Date.UTC(2024, 3, 15, 17, 30));

const useCountdownSale = () => {
  const [countdown, setCountdown] = useState<string>();
  const [isOverState, setIsOverState] = useState<boolean>(false);
  const isOver = DATE_TO_REACH.getTime() - new Date().getTime() < 0;

  const isFinite = isOver || isOverState;

  useEffect(() => {
    setInterval(() => {
      const now = new Date();
      const diff = DATE_TO_REACH.getTime() - now.getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${days}j ${hours}h ${minutes}m ${seconds}s`);
      } else {
        setIsOverState(true);
      }
    }, 1000);
  }, []);

  return {
    countdown,
    isFinite
  };
};

export default useCountdownSale;
