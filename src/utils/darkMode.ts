import { getInterfaceTheme, setInterfaceTheme } from './storage';

export const isDarkDefaultTheme = (): boolean => {
  const themeFromStorage = getInterfaceTheme();
  return (
    themeFromStorage === 'Dusa' ||
    (themeFromStorage === null &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
};

export const setTheme = (theme: string) => {
  setInterfaceTheme(theme);
  document.documentElement.setAttribute('data-theme', theme);
};
