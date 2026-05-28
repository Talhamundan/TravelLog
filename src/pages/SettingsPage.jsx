// Uygulama ayarlarını modern, bölümlü ve okunabilir bir kontrol merkezi olarak sunar.
import {
  Bell,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  FileSpreadsheet,
  Map,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { firebaseProjectId } from '../config/firebase';

const mapThemes = [
  { value: 'dark', label: 'Dark', detail: 'Dashboard ile uyumlu koyu harita' },
  { value: 'light', label: 'Light', detail: 'Detay ve konum işleri için açık görünüm' },
  { value: 'minimal', label: 'Minimal', detail: 'Az etiketli sade rota görünümü' },
];

export default function SettingsPage({ hasFirebaseConfig, user, tripsCount, lastError, onSeed }) {
  const [developerMode, setDeveloperMode] = useState(false);
  const [mapTheme, setMapTheme] = useState(() => localStorage.getItem('travellog:mapTheme') || 'dark');
  const [preferences, setPreferences] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('travellog:preferences') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('travellog:mapTheme', mapTheme);
  }, [mapTheme]);

  useEffect(() => {
    localStorage.setItem('travellog:preferences', JSON.stringify(preferences));
  }, [preferences]);

  const setPreference = (key, value) => setPreferences((current) => ({ ...current, [key]: value }));

  return (
    <div className="page-stack settings-page">
      <section className="page-heading settings-hero">
        <div>
          <span className="settings-eyebrow">TravelLog Control Center</span>
          <h1>Ayarlar</h1>
          <p>Bağlantı, görünüm, bildirim ve veri yönetimini tek yerden düzenleyin.</p>
        </div>
        <div className="settings-user-chip">
          <UserRound size={18} />
          <span>{user?.displayName || user?.email || 'TravelLog kullanıcı'}</span>
        </div>
      </section>

      <section className="settings-status-grid">
        <StatusCard
          icon={Cloud}
          label="Firebase"
          value={hasFirebaseConfig ? 'Aktif' : 'Demo mod'}
          note={hasFirebaseConfig ? 'Firestore bağlantısı hazır.' : '.env.local bulunamadı, demo veri modu kullanılıyor.'}
          tone={hasFirebaseConfig ? 'green' : 'amber'}
        />
        <StatusCard
          icon={ShieldCheck}
          label="Güvenlik"
          value="Kullanıcı bazlı"
          note="Trips, companies, vehicles, expenses ve settings erişimi kullanıcıya bağlı."
          tone="blue"
        />
        <StatusCard
          icon={Database}
          label="Kayıt"
          value={tripsCount}
          note="Seyahat kaydı analitiklerde kullanılıyor."
          tone="purple"
        />
        <StatusCard
          icon={Sparkles}
          label="Sistem"
          value={lastError ? 'Uyarı var' : 'Sağlıklı'}
          note={lastError || 'Son veri akışında hata görünmüyor.'}
          tone={lastError ? 'red' : 'green'}
        />
      </section>

      <section className="settings-layout">
        <div className="settings-main">
          <section className="panel settings-section">
            <SectionHead icon={Map} title="Görünüm ve Harita" text="Harita sayfası ve konum modülleri için varsayılan görünümü seçin." />
            <div className="settings-theme-grid">
              {mapThemes.map((theme) => (
                <button type="button" key={theme.value} className={mapTheme === theme.value ? 'active' : ''} onClick={() => setMapTheme(theme.value)}>
                  <span>{theme.label}</span>
                  <small>{theme.detail}</small>
                  <i />
                </button>
              ))}
            </div>
          </section>

          <section className="panel settings-section">
            <SectionHead icon={Bell} title="Bildirimler" text="Planlayıcı, rezervasyon ve checklist uyarılarının davranışını yönetin." />
            <div className="settings-toggle-list">
              <ToggleRow title="Yaklaşan seyahat hatırlatmaları" text="1 hafta, 1 gün ve kritik hazırlık bildirimleri." checked={preferences.tripReminders !== false} onChange={(value) => setPreference('tripReminders', value)} />
              <ToggleRow title="Rezervasyon uyarıları" text="Firma, PNR veya bilet bilgisi eksik planları bildirir." checked={preferences.reservationAlerts !== false} onChange={(value) => setPreference('reservationAlerts', value)} />
              <ToggleRow title="Checklist uyarıları" text="Eksik hazırlık maddelerini Planlayıcı ve bildirim merkezinde gösterir." checked={preferences.checklistAlerts !== false} onChange={(value) => setPreference('checklistAlerts', value)} />
            </div>
          </section>

          <section className="panel settings-section">
            <SectionHead icon={FileSpreadsheet} title="Veri ve Aktarım" text="Excel import, şablon ve demo veri akışlarını yönetin." />
            <div className="settings-action-grid">
              <InfoAction icon={Upload} title="Excel import" text="Seyahatler sayfasında Excel içe aktarım ve şablon akışı hazır." />
              <InfoAction icon={Download} title="Dışa aktarım" text="Seyahat kayıtlarını CSV veya Excel olarak dışa aktarabilirsiniz." />
              <button type="button" className="settings-demo-card" onClick={onSeed}>
                <Database size={19} />
                <strong>Demo verileri oluştur</strong>
                <span>Giriş yapan kullanıcı için örnek seyahat kayıtları üretir.</span>
              </button>
            </div>
          </section>
        </div>

        <aside className="settings-side">
          <section className="panel settings-profile-card">
            <span className="settings-avatar">{getInitials(user?.displayName || user?.email)}</span>
            <strong>{user?.displayName || 'TravelLog Kullanıcı'}</strong>
            <small>{user?.email || 'E-posta bilgisi yok'}</small>
            <div>
              <span>Project ID</span>
              <b>{firebaseProjectId || '-'}</b>
            </div>
          </section>

          <section className="panel settings-section compact">
            <SectionHead icon={SlidersHorizontal} title="Geliştirici Modu" text="Teknik bağlantı ve hata detaylarını gerektiğinde açın." />
            <button className="secondary-button settings-action" type="button" onClick={() => setDeveloperMode((value) => !value)}>
              <SlidersHorizontal size={17} />
              {developerMode ? 'Teknik bilgileri gizle' : 'Teknik bilgileri göster'}
            </button>
            {developerMode && (
              <div className="debug-details settings-debug-details">
                <span>Aktif userId: {user?.uid || '-'}</span>
                <span>Firebase projectId: {firebaseProjectId || '-'}</span>
                <span>Toplam trips sayısı: {tripsCount}</span>
                <span>Son hata: {lastError || '-'}</span>
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, note, tone }) {
  return (
    <article className={`settings-status-card ${tone}`}>
      <span><Icon size={20} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{note}</em>
      </div>
    </article>
  );
}

function SectionHead({ icon: Icon, title, text }) {
  return (
    <header className="settings-section-head">
      <span><Icon size={18} /></span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </header>
  );
}

function ToggleRow({ title, text, checked, onChange }) {
  return (
    <label className="settings-toggle-row">
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

function InfoAction({ icon: Icon, title, text }) {
  return (
    <article className="settings-info-action">
      <Icon size={18} />
      <strong>{title}</strong>
      <span>{text}</span>
      <CheckCircle2 size={16} />
    </article>
  );
}

function getInitials(value = '') {
  return String(value)
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toLocaleUpperCase('tr-TR'))
    .join('') || 'TL';
}
