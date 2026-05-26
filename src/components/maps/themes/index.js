import darkMapStyle from './darkMapStyle';
import lightMapStyle from './lightMapStyle';
import minimalMapStyle from './minimalMapStyle';

export const googleMapStyles = {
  dark: darkMapStyle,
  light: lightMapStyle,
  minimal: minimalMapStyle,
};

export const getGoogleMapStyle = (theme = 'dark') => googleMapStyles[theme] || googleMapStyles.dark;
