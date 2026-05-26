import darkTheme from './darkTheme';
import lightTheme from './lightTheme';
import minimalTheme from './minimalTheme';

export const mapThemes = {
  dark: darkTheme,
  light: lightTheme,
  minimal: minimalTheme,
};

export const getMapTheme = (theme = 'dark') => mapThemes[theme] || mapThemes.dark;
