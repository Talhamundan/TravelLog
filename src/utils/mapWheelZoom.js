// Sayfa kaydırmasını korur; harita yakınlaştırması için platformun kısayol tuşunu ister.
export function guardMapWheelZoom(container, platform) {
  const isMac = /Mac|iPhone|iPad|iPod/i.test(platform);
  const onWheel = (event) => {
    if (!(isMac ? event.metaKey : event.ctrlKey)) {
      // Varsayılan kaydırmayı engellemeden Leaflet'in wheel işleyicisini atla.
      event.stopImmediatePropagation();
    }
  };
  container.addEventListener('wheel', onWheel, { capture: true, passive: true });
  return () => container.removeEventListener('wheel', onWheel, { capture: true });
}
