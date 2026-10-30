import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { guardMapWheelZoom } from '../../utils/mapWheelZoom';

export default function ModifierWheelZoom() {
  const map = useMap();
  useEffect(
    () => guardMapWheelZoom(map.getContainer(), navigator.userAgentData?.platform || navigator.platform),
    [map],
  );
  return null;
}
