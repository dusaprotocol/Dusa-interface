import React, { useEffect, useRef, useState } from 'react';
import { faRefresh } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './index.scss';

interface AutoRefreshProps {
  refetchFunction: () => void;
  interval: number;
}

const AutoRefresh = ({ refetchFunction, interval }: AutoRefreshProps) => {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const startTimer = () => {
    setProgress(0);
    startTimeRef.current = Date.now();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / interval) * 100, 100);
      setProgress(newProgress);

      if (newProgress === 100) {
        if (intervalRef.current !== null) clearInterval(intervalRef.current);
        intervalRef.current = null;
        refetchFunction();
        startTimer();
      }
    }, 100);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (progress === 100) {
      startTimer();
    }
  }, [progress]);

  const handleClick = () => {
    startTimer();
    refetchFunction();
  };

  const circleStyle = {
    background: `conic-gradient(#3498db ${progress * 3.6}deg, #e0e0e0 0deg)`
  };

  return (
    <div className='progress-circle' style={circleStyle} onClick={handleClick}>
      <div className='inner-circle'>
        <FontAwesomeIcon icon={faRefresh} />
      </div>
    </div>
  );
};

export default AutoRefresh;
