# TravelLog

Kişisel seyahat geçmişini Firebase Auth, Firestore, grafikler ve harita görünümüyle yönetmek için hazırlanmış web uygulaması.

## Çalıştırma

```bash
npm install
npm run dev
```

Yerel adres: `http://localhost:5173/`

## Firebase ayarları

`.env.example` dosyasını `.env.local` olarak kopyalayıp Firebase web app değerlerini doldurun:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Env değerleri yoksa uygulama demo/localStorage modunda açılır. Gerçek veritabanı için Firestore rules dosyasındaki kuralları Firebase Console üzerinden yayınlayın.

## Harita ve rota sistemi

TravelLog harita tarafında ücretli API gerektirmez. Konum arama için OpenStreetMap Nominatim, çok duraklı gerçek yol rotası ve km/süre hesabı için OSRM, görsel harita için Leaflet/CARTO tile kullanılır.

Not: Nominatim ve OSRM herkese açık servislerdir; yoğun/kurumsal kullanımda kendi instance'ınızı veya uygun bir servis sağlayıcıyı kullanmanız önerilir. Servis yanıt vermezse uygulama çökmez; manuel km/süre girişi açık kalır.

## Koleksiyonlar

- `users`
- `trips`
- `companies`
- `vehicles`
- `expenses`
- `settings`

## Notlar

- CSV dışa aktarma hazır.
- Obilet, Enuygun, THY ve AJet için mock entegrasyon servisleri eklendi.
- TODO alanları: Excel import akışı ve Firebase Storage ile bilet görseli yükleme.
