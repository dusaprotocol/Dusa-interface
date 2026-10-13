import { useContext } from 'react';
import { SettingsContext } from 'context/SettingsContext';
import './index.scss';

const SnowOverlay = () => {
  const { interfaceTheme, isOverlay } = useContext(SettingsContext);
  const isWinter = interfaceTheme === 'Winter';

  const flakes = Array.from({ length: 30 });

  if (!isWinter || !isOverlay) return null;
  return (
    <div className='SnowOverlay' key={isWinter ? 'winter-on' : 'winter-off'}>
      {flakes.map((_, i) => {
        const leftPosition = Math.random() * 100;
        const animationDelay = Math.random() * 16;
        const animationDuration = 16 + Math.random() * 10;

        const style = {
          left: `${leftPosition}%`,
          animationDelay: `${animationDelay}s`,
          animationDuration: `${animationDuration}s`
        };

        return (
          <div key={i} className='snowflake' style={style}>
            ❄
          </div>
        );
      })}
    </div>
  );
};

export default SnowOverlay;
