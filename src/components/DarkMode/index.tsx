import React, { useContext } from 'react';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './index.scss';
import { SettingsContext } from 'context/SettingsContext';

const DarkMode = () => {
  const { interfaceTheme, setInterfaceTheme } = useContext(SettingsContext);
  const isDark = interfaceTheme === 'Dusa';

  const toggleTheme = () => {
    setInterfaceTheme(isDark ? 'Winter' : 'Dusa');
  };

  return (
    <button className='DarkMode' onClick={toggleTheme}>
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
    </button>
  );
};

export default DarkMode;
