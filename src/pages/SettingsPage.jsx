// Firebase, güvenlik ve import/export hazırlığına dair uygulama ayar durumunu gösterir.
import { Database, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { firebaseProjectId } from '../config/firebase';

export default function SettingsPage({ hasFirebaseConfig, user, tripsCount, lastError, onSeed }) {
  const [developerMode, setDeveloperMode] = useState(false);
  const [mapTheme, setMapTheme] = useState(() => localStorage.getItem('travellog:mapTheme') || 'dark');

  useEffect(() => {
    localStorage.setItem('travellog:mapTheme', mapTheme);
  }, [mapTheme]);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <h1>Ayarlar</h1>
          <p>Firebase bağlantısı, güvenlik kuralları ve gelecek import altyapısı.</p>
        </div>
      </section>
      <section className="panel settings-list">
        <div>
          <strong>Firebase bağlantısı</strong>
          <span>{hasFirebaseConfig ? 'Env değerleri bulundu, Firestore aktif.' : '.env.local eksik, demo/localStorage modu aktif.'}</span>
        </div>
        <div>
          <strong>Güvenlik kuralları</strong>
          <span>firestore.rules dosyası kullanıcı bazlı trips, companies, vehicles, expenses ve settings erişimi içerir.</span>
        </div>
        <div>
          <strong>Excel import</strong>
          <span>TODO: Eski Excel kayıtları için kolon eşleme ve önizleme akışı eklenecek.</span>
        </div>
        <div>
          <strong>Harita teması</strong>
          <span>Harita sayfasında kullanacağınız varsayılan görünümü seçin.</span>
          <div className="settings-segment">
            {[
              ['dark', 'Dark Map'],
              ['light', 'Light Map'],
              ['minimal', 'Minimal Map'],
            ].map(([value, label]) => (
              <button type="button" key={value} className={mapTheme === value ? 'active' : ''} onClick={() => setMapTheme(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>Bilet görseli</strong>
          <span>TODO: Firebase Storage ile dosya yükleme eklenecek; şimdilik URL alanı hazır.</span>
        </div>
        <div>
          <strong>Geliştirici modu</strong>
          <span>Teknik bağlantı ve hata detaylarını yalnızca gerektiğinde gösterir.</span>
          <button className="secondary-button settings-action" type="button" onClick={() => setDeveloperMode((value) => !value)}>
            <SlidersHorizontal size={17} />
            {developerMode ? 'Teknik Bilgileri Gizle' : 'Teknik Bilgileri Göster'}
          </button>
          {developerMode && (
            <div className="debug-details">
              <span>Aktif userId: {user?.uid || '-'}</span>
              <span>Firebase projectId: {firebaseProjectId || '-'}</span>
              <span>Toplam trips sayısı: {tripsCount}</span>
              <span>Son veri çekme hatası: {lastError || '-'}</span>
            </div>
          )}
        </div>
        <div>
          <strong>Demo veri</strong>
          <span>Giriş yapan kullanıcı için örnek seyahat kayıtları oluşturur.</span>
          <button className="secondary-button settings-action" onClick={onSeed}>
            <Database size={17} />
            Demo Verileri Oluştur
          </button>
        </div>
      </section>
    </div>
  );
}
