// Veri olmayan sayfalarda kullanıcıyı ilk kayıt veya demo veri akışına yönlendirir.
import { Database, Plus } from 'lucide-react';

export default function EmptyState({ title = 'Henüz kayıt yok', primaryLabel = 'İlk seyahatini ekle', onPrimary, onSeed }) {
  return (
    <section className="panel empty-state">
      <Database size={34} />
      <h2>{title}</h2>
      <p>İstersen ilk kaydı manuel ekleyebilir ya da tek tıkla örnek TravelLog verileri oluşturabilirsin.</p>
      <div className="button-row">
        {onPrimary && (
          <button className="primary-button" onClick={onPrimary}>
            <Plus size={17} />
            {primaryLabel}
          </button>
        )}
        {onSeed && (
          <button className="secondary-button" onClick={onSeed}>
            <Database size={17} />
            Demo veriler oluştur
          </button>
        )}
      </div>
    </section>
  );
}
