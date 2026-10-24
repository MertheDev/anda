# Anda: MVP Planı

> **Konsept:** "Şehrinde şu an ne oluyor?" Tek bir haritada işletme etkinlikleri ve insanların açtığı planlar.
> **Pilot şehirler:** İzmir, İstanbul. **Harita:** Avrupa'nın tamamı açık.
> **Diller:** Türkçe, İngilizce.

Durum: ✅ yapıldı · 🟡 prototip (sahte veriyle) · ⏳ planlı · ➖ MVP sonrası

## 1. Ürün özellikleri

| # | Özellik | Öncelik | Durum | Not |
|---|---|---|---|---|
| 1 | Tam ekran harita (liste feed'i yok) | P0 | 🟡 | MapLibre, Avrupa kadrajı, pilot şehirlere hızlı geçiş |
| 2 | Özel etkinlik marker'ları (emoji balonu, avatar, işletme rozeti) | P0 | 🟡 | Zoom'a göre 3 kademe: küme, ikon, zengin marker |
| 3 | Kümeleme | P0 | 🟡 | İstemci tarafı (GeoJSON cluster); sunucu tarafı grid sonraki adım |
| 4 | Filtre butonu + filtre paneli | P0 | 🟡 | Zaman, kategori, tür, fiyat |
| 5 | Kategori çipleri (sayaçlı) | P0 | 🟡 | Haritanın üstünde, görünür alandaki sayıyı gösterir |
| 6 | Etkinlik kartı (bottom sheet) | P0 | 🟡 | Saat, mekân, fiyat, katılımcılar, Gidiyorum, rapor, paylaş, çevir |
| 7 | Kullanıcı planı oluşturma | P0 | ⏳ | Halka açık mekân zorunlu |
| 8 | İşletme hesabı + etkinlik yayınlama | P0 | ⏳ | Onay sonrası yayın |
| 9 | Giriş (e-posta, Apple, Google) | P0 | ⏳ | Supabase Auth |
| 10 | Katılma ("Gidiyorum") | P0 | ⏳ | Kontenjan kontrolü sunucuda |
| 11 | Etkinlik sohbeti (yalnız katılımcılar) | P1 | ⏳ | Supabase Realtime, birebir DM yok |
| 12 | İşletmeyi takip et + push | P1 | ⏳ | Expo Notifications |
| 13 | Kaydet, paylaş (deep link) | P1 | ⏳ | |
| 14 | Rapor et, engelle | P0 | ⏳ | Güvenlik gereği MVP'de zorunlu |
| 15 | Admin paneli (işletme onayı, rapor kuyruğu) | P0 | ⏳ | Basit web paneli |
| 16 | Türkçe / İngilizce arayüz | P0 | 🟡 | i18next, cihaz diline göre |
| 17 | Etkinlik metni otomatik çeviri | P2 | ➖ | Çeviri butonu arayüzde hazır, servis sonra |
| 18 | Uygulama içi bilet/ödeme | P3 | ➖ | İlk sürümde dış link |
| 19 | Selfie doğrulama | P2 | ➖ | MVP'de e-posta/Apple/Google + işletme onayı |
| 20 | Sponsorlu pin, işletme analitiği | P3 | ➖ | Gelir adımı |

## 2. Teknik mimari

| Katman | Seçim | Gerekçe |
|---|---|---|
| Mobil | Expo (SDK 58) + React Native + TypeScript + Expo Router | Tek kod tabanı, iOS + Android |
| Harita | MapLibre (`@maplibre/maplibre-react-native`) + OpenFreeMap stili | Hesap ve API anahtarı gerektirmez, ücretsiz; katman tabanlı çizim Avrupa ölçeğinde akıcı. İstenirse Mapbox'a geçiş kolay. |
| Kart / sheet | `@gorhom/bottom-sheet` + Reanimated | Harita performansından bağımsız, tam özelleştirilebilir |
| Backend | Supabase (Postgres + PostGIS, Auth, Realtime, Storage, Edge Functions) | Coğrafi sorgu, RLS ile güvenlik |
| Çoklu dil | i18next + expo-localization | TR/EN, tüm metinler çeviri anahtarı |
| Doğrulama | zod | Giriş verisi şeması |
| Dağıtım | EAS Build (development build gerekir, Expo Go olmaz) | Native modül (MapLibre) |

### Harita katmanları (zoom'a göre)

| Zoom | Gösterim | Çizim yöntemi |
|---|---|---|
| Uzak | Küme sayıları | `ShapeSource` kümeleme + sayı katmanı |
| Orta | Kategori emoji ikonları | Katman ikonu (GPU) |
| Yakın | Zengin marker (emoji balonu + avatar / işletme rozeti) | Özel React marker, ekranda en fazla ~40 |

## 3. Veri modeli (Supabase)

| Tablo | Amaç | Önemli alanlar |
|---|---|---|
| `profiles` | Kullanıcı profili | `id` (auth.users), `display_name`, `avatar_url`, `role` (`traveler`/`business`), `locale` |
| `businesses` | İşletme | `owner_id`, `name`, `category`, `location` (PostGIS), `verification_status` |
| `events` | Etkinlik | `type` (`user`/`business`), `host_id`, `business_id`, `title`, `category`, `starts_at`, `ends_at`, `location`, `venue_name`, `price_cents`, `currency`, `capacity`, `status` |
| `event_attendees` | Katılım | `event_id`, `user_id`, `status` |
| `event_messages` | Sohbet | `event_id`, `user_id`, `body` |
| `follows` | İşletme takibi | `user_id`, `business_id` |
| `saves` | Kaydedilenler | `user_id`, `event_id` |
| `reports` | Şikayetler | `reporter_id`, `target_type`, `target_id`, `reason` |
| `blocks` | Engeller | `blocker_id`, `blocked_id` |

Şema ve RLS politikaları: `supabase/migrations/`.

## 4. Güvenlik kontrol listesi

| # | Önlem | Durum |
|---|---|---|
| 1 | Her tabloda Row Level Security açık, varsayılan olarak her şey kapalı | ⏳ (SQL hazır, projeye uygulanmadı) |
| 2 | İstemcide yalnızca `anon` anahtar; `service_role` asla uygulamaya girmez | ✅ |
| 3 | Gizli anahtarlar `.env*` dosyalarında, repoya girmez; `.env.example` var | ✅ |
| 4 | Oturum belirteçleri `expo-secure-store` içinde | ⏳ |
| 5 | Girdi doğrulama: istemcide zod, sunucuda CHECK kısıtları ve RLS | 🟡 |
| 6 | Kullanıcı içeriği düz metin olarak gösterilir (HTML/Markdown çalıştırılmaz) | ✅ |
| 7 | Dış bağlantılar yalnızca `https:` şemasıyla açılır | ✅ |
| 8 | Konum: yalnızca uygulama kullanılırken izin; gerçek konum başkalarına gösterilmez | ✅ |
| 9 | Kontenjan ve katılım kuralları sunucuda (RPC/trigger), istemciye güvenilmez | ⏳ |
| 10 | Rapor / engelle akışı; engellenen kullanıcının içeriği gizlenir | ⏳ |
| 11 | Hız sınırı (etkinlik oluşturma, mesaj) Edge Function / DB seviyesinde | ⏳ |
| 12 | İşletme etkinlikleri doğrulanmış işletme olmadan yayınlanmaz | ⏳ |
| 13 | Bağımlılık taraması (`npm audit`) her adımda kontrol edilir | ✅ |
| 14 | KVKK / GDPR: açık rıza, veri silme, gizlilik politikası | ⏳ |
| 15 | Mağaza gereği: içerik moderasyonu ve hesap silme | ⏳ |

## 5. Yol haritası

| Adım | Kapsam | Durum |
|---|---|---|
| 1 | Proje iskeleti, bağımlılıklar, MVP planı | ✅ |
| 2 | Harita prototipi: marker, kümeleme, çipler, filtre, kart, TR/EN | 🟡 |
| 3 | Supabase şeması + RLS migrasyonları (dosya olarak) | ⏳ |
| 4 | Supabase projesi, giriş (Auth), gerçek veri | ⏳ |
| 5 | Etkinlik oluşturma, katılma | ⏳ |
| 6 | İşletme hesabı + admin onayı | ⏳ |
| 7 | Sohbet, push, takip | ⏳ |
| 8 | Rapor/engel, hız sınırı, KVKK, mağaza hazırlığı | ⏳ |
| 9 | Pilot (İzmir, İstanbul), TestFlight / kapalı test | ⏳ |

## 6. Başarı ölçütleri

| Ölçüt | Hedef |
|---|---|
| Pilot şehir başına haftalık etkinlik | 50+ |
| Haftalık geri dönüş oranı | Ana metrik |
| Etkinlik başına ortalama katılımcı | İzlenecek |
| Aktif işletme sayısı | İzlenecek |
| Rapor ilk yanıt süresi | < 24 saat |

## 7. Kararlar

| Konu | Karar |
|---|---|
| Uygulama adı | **Anda** (geçici, değişebilir) |
| Harita sağlayıcı | MapLibre (başlangıç), Mapbox'a geçiş mümkün |
| Backend | Supabase |
| Giriş | E-posta + Apple + Google (SMS maliyeti nedeniyle telefon girişi sonra) |
| Liste feed'i | Yok, yalnızca harita |
