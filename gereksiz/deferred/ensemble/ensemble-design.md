# Ensemble Modu — Konsept Tasarım

> **Tarih:** 2026-04-12
> **Durum:** Konsept tasarım — uygulanacak

---

## 1. GENEL BAKIŞ

Ensemble modu, birden fazla kullanıcının aynı makam ve usül üzerinde **gerçek zamanlı birlikte çalmasını** sağlar. Her kullanıcı farklı bir enstrüman seçer ve çaldığı notalar diğer tüm katılımcılara anında iletilir.

---

## 2. KULLANIM SENARYOSU

```
Kullanıcı A (Ney)    Kullanıcı B (Ud)    Kullanıcı C (Bendir)
      |                    |                    |
      |--- playNote(G4) --->|                    |
      |                    |<-- playNote(C4) ---|
      |<--- playNote(E4) --|                    |
      |                    |                    |
      |     <--- hepsinin sesleri aynı anda duyulur --->|
```

---

## 3. MIMARI

### 3.1 İki Seçenek

| Yaklaşım | Avantaj | Dezavantaj |
|----------|---------|------------|
| **WebSocket (Sunucu)** | Merkezi kontrol, kolay ölçekleme | Sunucu maliyeti, gecikme |
| **WebRTC (P2P)** | Düşük gecikme, sunucusuz | Karmaşık NAT traversal, 3+ kişi zor |

**Öneri:** Başlangıçta **WebSocket (Socket.io)** ile başla. WebRTC ikinci fazda eklenir.

### 3.2 Veri Modeli

```typescript
interface EnsembleRoom {
  id: string;
  name: string;
  makamId: string;
  usulId: string;
  bpm: number;
  participants: Participant[];
  sharedNotes: SharedNote[];
  createdBy: string;
  createdAt: number;
}

interface Participant {
  id: string;
  name: string;
  instrument: InstrumentType;
  color: string; // UI'da ayırt etmek için
  isOnline: boolean;
}

interface SharedNote {
  id: string;
  participantId: string;
  midiNumber: number;
  instrument: InstrumentType;
  duration: number;
  gain: number;
  startTime: number; // room clock'a göre offset
  timestamp: number;
}
```

### 3.3 Room Clock

- Her oda kendi **room clock**'una sahip — oda oluşturulduğunda `performance.now()` referans alınır
- `startTime = performance.now() - roomReferenceTime`
- Bu sayede notalar senkronize edilir

---

## 4. SOKET OLAYLARI

### Client → Server

| Olay | Payload | Açıklama |
|------|---------|----------|
| `join_room` | `{roomId, userName, instrument}` | Odaya katıl |
| `leave_room` | `{roomId}` | Odadan ayrıl |
| `play_note` | `{roomId, midiNumber, duration, gain}` | Nota çal |
| `stop_note` | `{roomId}` | Tüm notaları durdur |
| `change_instrument` | `{roomId, instrument}` | Enstrüman değiştir |
| `change_makam` | `{roomId, makamId}` | Makam değiştir (oda geneli) |
| `change_usul` | `{roomId, usulId}` | Usül değiştir (oda geneli) |

### Server → Client

| Olay | Payload | Açıklama |
|------|---------|----------|
| `room_joined` | `{room, participantId}` | Odaya katılınca bilgi |
| `participant_joined` | `{participant}` | Yeni katılımcı |
| `participant_left` | `{participantId}` | Ayrılan katılımcı |
| `note_played` | `{participantId, midiNumber, ...}` | Başka kullanıcı nota çaldı |
| `instrument_changed` | `{participantId, instrument}` | Enstrüman değişti |
| `makam_changed` | `{makamId}` | Makam değişti |
| `usul_changed` | `{usulId}` | Usül değişti |
| `room_closed` | `{roomId}` | Oda sahibi ayrıldı, oda kapandı |

---

## 5. API ROTELERİ

```
POST   /api/ensemble/rooms          → Oda oluştur
GET    /api/ensemble/rooms          → Aktif odaları listele
GET    /api/ensemble/rooms/:id      → Oda detayı
DELETE /api/ensemble/rooms/:id      → Odayı sil (sahibi)
```

### Oluşturma Request

```json
{
  "name": "Cazibesiz Perşembe",
  "makamId": "huzam",
  "usulId": "aksaksemai",
  "bpm": 80
}
```

### Response

```json
{
  "id": "room_abc123",
  "name": "Cazibesiz Perşembe",
  "joinUrl": "https://muzik.app/ensemble/room_abc123",
  "socketUrl": "wss://muzik.app/api/ensemble/socket",
  "participantId": "user_xyz",
  "participantToken": "pt_xyz_abc"
}
```

---

## 6. GÜVENLIK

### 6.1 Participant Token

- Odaya katılınca sunucu bir `participantToken` üretir
- Bu token WebSocket handshake'inde gönderilir
- Socket.io'un `auth` objesi ile doğrulanır
- Token süresi 24 saat

### 6.2 Rate Limiting

- `play_note`: Maks 20 mesaj/saniye / katılımcı
- `join_room`: Maks 5 / dakika / IP

### 6.3 Oda Limiti

- Oda başına maks 8 katılımcı
- Her kullanıcı maks 3 odaya katılabilir

---

## 7. UI BILEŞENLERI

### 7.1 Ensemble Lobby (`/ensemble`)

```
┌─────────────────────────────────────────┐
│ 🎻 Ensemble Lobisi                       │
├─────────────────────────────────────────┤
│                                         │
│  [Oda Listesi]                          │
│  ┌─────────────────────────────────┐    │
│  │ Cazibesiz Perşembe    3/8 👥   │    │
│  │ Huzam • Aksak Semai • 80 BPM   │    │
│  │ [Katıl]                         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  + Yeni Oda Oluştur                      │
│                                         │
└─────────────────────────────────────────┘
```

### 7.2 Ensemble Room (`/ensemble/[roomId]`)

```
┌──────────────────────────────────────────────────────┐
│ 🎻 Cazibesiz Perşembe              [Paylaş] [Ayır]  │
│ Huzam • Aksak Semai • 80 BPM                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [Piyanist Rulosu — tüm katılımcıların notaları]    │
│                                                      │
│  🟢 Sen (Ney)        │  🔵 Ali (Ud)                  │
│  [G4 ●] [A4 ●]       │  [C4 ●] [E4 ●]                │
│                      │                               │
│  🟡 Ayşe (Bendir)    │  🔴 Deniz (Def)               │
│  [● ○ ● ○]           │  [● ○ ○ ●]                    │
│                                                      │
├──────────────────────────────────────────────────────┤
│  [Piyao Tuşları / Enstrüman Paneli]                 │
└──────────────────────────────────────────────────────┘
```

### 7.3 Participant Color Coding

Her katılımcıya sabit bir renk atanır:

| Katılımcı Sırası | Renk | Hex |
|-----------------|------|-----|
| 1 | Yeşil | `#22c55e` |
| 2 | Mavi | `#3b82f6` |
| 3 | Sarı | `#eab308` |
| 4 | Kırmızı | `#ef4444` |
| 5 | Mor | `#a855f7` |
| 6 | Turuncu | `#f97316` |
| 7 | Cyan | `#06b6d4` |
| 8 | Pembe | `#ec4899` |

---

## 8. ORCHESTRATOR ENTEGRASYONU

Mevcut `useOrchestrator` hook'u genişletilmeli:

```typescript
interface EnsembleState {
  mode: "solo" | "ensemble";
  room: EnsembleRoom | null;
  participants: Participant[];
  localParticipantId: string;
  isConnected: boolean;
}

// Yeni hook: useEnsemble
function useEnsemble(roomId: string) {
  // Socket.io bağlantısı
  // Room state yönetimi
  // Remote note playback (diğerlerinin notalarını çal)
  // Enstrüman değişikliği yayını
}
```

### Kritik: Remote Note Çalma

```typescript
// Başka kullanıcı nota çaldığında:
socket.on("note_played", ({ participantId, midiNumber, instrument, duration, gain, startTime }) => {
  if (participantId === localParticipantId) return;

  // Room clock'a göre gecikme hesapla
  const roomNow = performance.now() - roomReferenceTime;
  const noteStartOffset = startTime - roomNow;

  if (noteStartOffset > 0) {
    // Gelecekte çalacak — scheduler kullan
    setTimeout(() => {
      playInstrumentNote(midiNumber, instrument, duration, gain);
    }, noteStartOffset);
  } else {
    // Zaten çalmış — direkt çal (veya atla)
    playInstrumentNote(midiNumber, instrument, duration, gain);
  }
});
```

---

## 9. IMPLEMENTASYON SIRASI

### Faz 1 —基础设施 (1-2 gün)
- [ ] Socket.io server kurulumu (`src/app/api/ensemble/socket/route.ts`)
- [ ] Room CRUD API roteları
- [ ] Basit room state yönetimi

### Faz 2 — Çekirdek (2-3 gün)
- [ ] WebSocket bağlantısı ve reconnection
- [ ] Note yayını (play_note olayı)
- [ ] Participant listesi ve renk kodlaması
- [ ] Enstrüman değişikliği yayını

### Faz 3 — UI (2 gün)
- [ ] Ensemble lobby sayfası
- [ ] Room sayfası ve participant görünümü
- [ ] Room clock senkronizasyonu

### Faz 4 — İyileştirme (1 gün)
- [ ] Rate limiting
- [ ] Reconnection handling
- [ ] Mobil uyumluluk

---

## 10. TEKNIK NOTLAR

### 10.1 Socket.io Rooms

```typescript
// Sunucu tarafı
io.on("connection", (socket) => {
  socket.on("join_room", ({ roomId, ... }) => {
    socket.join(roomId);
    socket.to(roomId).emit("participant_joined", { ... });
  });

  socket.on("play_note", ({ roomId, ... }) => {
    // Broadcast to everyone ELSE in the room
    socket.to(roomId).emit("note_played", { ... });
  });
});
```

### 10.2 Note Scheduler

Gecikme toleransı: 100ms. Bundan fazla gecikme olursa nota atlanır.

```typescript
const MAX_NOTE_LATENCY = 100; // ms

if (noteStartOffset > MAX_NOTE_LATENCY) {
  console.warn("Note skipped: too much latency");
  return;
}
```

### 10.3 Ortalama Gecikme Hesabı

- WebSocket round-trip: ~20-50ms (aynı bölge)
- Room clock drift: ~5-10ms/saniye (NTP ile düzeltilebilir)
- Toplam beklenen gecikme: ~50-100ms

---

## 11. DIŞ BAĞIMLILIKLAR

```json
{
  "socket.io": "^4.6.0",
  "socket.io-client": "^4.6.0"
}
```

Serverless ortamda Socket.io: **Vercel** için `@vercel/socket.io` veya ayrı bir Node.js server gerekli.
