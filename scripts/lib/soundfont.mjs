/**
 * SF2 (SoundFont 2) OKUYUCU — yalniz ihtiyacimiz kadari.
 *
 * Neden kendi okuyucumuz: `public/samples/` altindaki melodik klasorlerin
 * cogu bu depodaki soundfont'lardan uretilmis (bkz. `public/samples/README.md`)
 * ama ureten betik depoda YOKTU — yani ciktilar yeniden uretilemiyordu.
 * Bu dosya o boslugu kapatir: kaynak, lisansi belli ve depoda duran bir sf2
 * oldugu icin uretim artik tekrarlanabilir ve denetlenebilir.
 *
 * Kapsam bilincli olarak dar: preset -> enstruman -> ornek bolgeleri ve ham
 * PCM. Modulator, envelope, filtre, LFO OKUNMAZ — bunlar calarken uygulanan
 * seylerdir; biz tek bir perdenin ham kaydini cikariyoruz.
 *
 * Spec: SoundFont 2.04, bolum 7 (chunk yapisi) ve 8.1.2 (generator listesi).
 */
import fs from "node:fs";

/** Ihtiyac duyulan generator numaralari (spec 8.1.2). */
export const GEN = {
  KEY_RANGE: 43,
  SAMPLE_ID: 53,
  INSTRUMENT: 41,
  OVERRIDING_ROOT_KEY: 58,
  FINE_TUNE: 52,
  COARSE_TUNE: 51,
};

function readSubChunks(buffer, start, end) {
  const found = {};
  let position = start;
  while (position + 8 <= end) {
    const id = buffer.toString("latin1", position, position + 4);
    const size = buffer.readUInt32LE(position + 4);
    found[id] = {offset: position + 8, size};
    position += 8 + size + (size % 2); // RIFF chunk'lari cift hizalanir
  }
  return found;
}

/**
 * SF2 dosyasini okur. Donen yapi ham kayit dizileridir; anlamlandirma
 * `collectPresetZones` icinde yapilir.
 */
export function readSoundFont(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.toString("latin1", 0, 4) !== "RIFF" || buffer.toString("latin1", 8, 12) !== "sfbk") {
    throw new Error(`SF2 degil: ${file}`);
  }

  const lists = {};
  let position = 12;
  const end = 8 + buffer.readUInt32LE(4);
  while (position + 8 <= end) {
    const id = buffer.toString("latin1", position, position + 4);
    const size = buffer.readUInt32LE(position + 4);
    if (id === "LIST") {
      lists[buffer.toString("latin1", position + 8, position + 12)] = {offset: position + 12, size: size - 4};
    }
    position += 8 + size + (size % 2);
  }
  if (!lists.pdta || !lists.sdta) throw new Error(`pdta/sdta yok: ${file}`);

  const pdta = readSubChunks(buffer, lists.pdta.offset, lists.pdta.offset + lists.pdta.size);
  const sdta = readSubChunks(buffer, lists.sdta.offset, lists.sdta.offset + lists.sdta.size);
  if (!sdta.smpl) throw new Error(`smpl yok: ${file}`);

  const records = (chunk, stride, build) => {
    const out = [];
    for (let p = chunk.offset; p + stride <= chunk.offset + chunk.size; p += stride) out.push(build(p));
    return out;
  };
  const text = (p, length = 20) => buffer.toString("latin1", p, p + length).replace(/\0.*$/, "").trim();

  return {
    buffer,
    smpl: sdta.smpl,
    phdr: records(pdta.phdr, 38, (p) => ({
      name: text(p),
      preset: buffer.readUInt16LE(p + 20),
      bank: buffer.readUInt16LE(p + 22),
      bagIndex: buffer.readUInt16LE(p + 24),
    })),
    pbag: records(pdta.pbag, 4, (p) => ({genIndex: buffer.readUInt16LE(p)})),
    pgen: records(pdta.pgen, 4, (p) => ({op: buffer.readUInt16LE(p), amount: buffer.readUInt16LE(p + 2)})),
    inst: records(pdta.inst, 22, (p) => ({name: text(p), bagIndex: buffer.readUInt16LE(p + 20)})),
    ibag: records(pdta.ibag, 4, (p) => ({genIndex: buffer.readUInt16LE(p)})),
    igen: records(pdta.igen, 4, (p) => ({op: buffer.readUInt16LE(p), amount: buffer.readUInt16LE(p + 2)})),
    shdr: records(pdta.shdr, 46, (p) => ({
      name: text(p),
      start: buffer.readUInt32LE(p + 20),
      end: buffer.readUInt32LE(p + 24),
      loopStart: buffer.readUInt32LE(p + 28),
      loopEnd: buffer.readUInt32LE(p + 32),
      sampleRate: buffer.readUInt32LE(p + 36),
      originalPitch: buffer.readUInt8(p + 40),
      pitchCorrection: buffer.readInt8(p + 41),
    })),
  };
}

/** Dosyadaki preset adlari (bank/preset numaralariyla). */
export function listPresets(soundFont) {
  return soundFont.phdr.filter((entry) => entry.name && entry.name !== "EOP");
}

/**
 * Bir preset'in ornek bolgelerini toplar.
 *
 * Her bolge: hangi tuslarda calinacagi (`keyRange`), hangi ornekten geldigi
 * ve o ornegin KOK PERDESI. Kok perde bir IDDIADIR — dogrulugu olculmeden
 * kabul edilmez; uretimde yalnizca baslangic tahmini olarak kullanilir.
 */
export function collectPresetZones(soundFont, presetName) {
  const index = soundFont.phdr.findIndex((entry) => entry.name === presetName);
  if (index < 0 || index + 1 >= soundFont.phdr.length) return [];

  const instrumentIds = new Set();
  for (let bag = soundFont.phdr[index].bagIndex; bag < soundFont.phdr[index + 1].bagIndex; bag++) {
    for (let gen = soundFont.pbag[bag].genIndex; gen < soundFont.pbag[bag + 1].genIndex; gen++) {
      if (soundFont.pgen[gen].op === GEN.INSTRUMENT) instrumentIds.add(soundFont.pgen[gen].amount);
    }
  }

  const zones = [];
  for (const instrumentId of instrumentIds) {
    if (instrumentId + 1 >= soundFont.inst.length) continue;
    for (let bag = soundFont.inst[instrumentId].bagIndex; bag < soundFont.inst[instrumentId + 1].bagIndex; bag++) {
      let sampleId = null;
      let rootKey = null;
      let keyRange = null;
      let fineTune = 0;
      let coarseTune = 0;

      for (let gen = soundFont.ibag[bag].genIndex; gen < soundFont.ibag[bag + 1].genIndex; gen++) {
        const {op, amount} = soundFont.igen[gen];
        if (op === GEN.SAMPLE_ID) sampleId = amount;
        else if (op === GEN.OVERRIDING_ROOT_KEY) rootKey = amount;
        else if (op === GEN.KEY_RANGE) keyRange = [amount & 0xff, amount >> 8];
        else if (op === GEN.FINE_TUNE) fineTune = (amount << 16) >> 16;
        else if (op === GEN.COARSE_TUNE) coarseTune = (amount << 16) >> 16;
      }

      // sampleId yoksa bu bir "global zone"dur (spec 7.7) — ornek tasimaz.
      if (sampleId === null || sampleId >= soundFont.shdr.length) continue;

      const header = soundFont.shdr[sampleId];
      zones.push({
        sampleId,
        name: header.name,
        keyRange: keyRange ?? [0, 127],
        // Kok perde onceligi: bolge ezmesi > ornek basligi.
        rootKey: rootKey ?? header.originalPitch,
        // Ince akort: basliktaki duzeltme + bolgenin kendi akordu (cent).
        tuneCents: header.pitchCorrection + fineTune + coarseTune * 100,
        header,
      });
    }
  }
  return zones;
}

/** Verilen frekanstaki genlik (tek nokta DFT, Hann pencereli). */
function magnitudeAt(mono, rate, hz) {
  const start = Math.floor(mono.length * 0.3);
  const count = Math.min(Math.floor(rate * 0.3), mono.length - start);
  if (count <= 8 || hz <= 0 || hz >= rate / 2) return 0;

  const omega = (2 * Math.PI * hz) / rate;
  let re = 0;
  let im = 0;
  for (let i = 0; i < count; i++) {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (count - 1));
    re += mono[start + i] * window * Math.cos(omega * i);
    im += mono[start + i] * window * Math.sin(omega * i);
  }
  return Math.sqrt(re * re + im * im) / count;
}

/**
 * OKTAV BELIRSIZLIGINI HARMONIK DIZIDEN COZ.
 *
 * YIN ve HPS uzlassa bile ikisi birden bir oktav kacabilir — nefesli
 * seslerde temel frekans cok zayif oldugu icin bu SIK olur. Olculdu:
 * `Moss_Nay` preset'inin 11 bolgesinden 4'unde uzlasilan deger tam bir
 * oktav pesti.
 *
 * Ayirt eden sey su: **tepeler adayin tam sayi katlari mi?**
 *
 *   Moss_NayB3 tepeleri: 248 496 744 993 1240   -> 248'in 1,2,3,4,5 kati
 *                        124'te tepe YOK          -> temel 248, olcum yanildi
 *
 *   Moss_NayD4 tepeleri: 298 447 595 1043        -> 447 = 298'in 1,5 kati
 *                        yani 298 temel OLAMAZ; hepsi 149'un kati -> temel 149
 *                        (temelde enerji yok — nefeslide olagan)
 *
 * Kural bu gozlemin dogrudan kodlanmisidir:
 *   1. `1,5f`te ciddi enerji varsa `f` temel degildir -> `f/2`ye in.
 *   2. `f`te enerji yok denecek kadar azsa ve `3f`te de yoksa -> `2f`ye cik.
 *      (`3f` sarti sart: D4'te `3f` cok gucluydu ve yukari cikmayi dogru
 *      sekilde ENGELLEDI.)
 *   3. Aksi halde `f` temeldir.
 */
export function resolveFundamental(mono, rate, hz) {
  const SIGNIFICANT = 0.2; // "ciddi enerji" — en guclu harmonige orani
  const NEGLIGIBLE = 0.1; // "yok denecek kadar az"

  let candidate = hz;
  for (let guard = 0; guard < 4; guard++) {
    const atF = magnitudeAt(mono, rate, candidate);
    const atOneAndHalf = magnitudeAt(mono, rate, candidate * 1.5);
    const atTwo = magnitudeAt(mono, rate, candidate * 2);
    const atThree = magnitudeAt(mono, rate, candidate * 3);
    const strongest = Math.max(atF, atTwo, atThree);
    if (strongest <= 0) return candidate;

    if (atOneAndHalf > strongest * SIGNIFICANT) {
      candidate /= 2; // 1,5f varsa temel yarisidir
      continue;
    }
    if (atF < atTwo * NEGLIGIBLE && atThree < strongest * SIGNIFICANT) {
      candidate *= 2; // temelde enerji yok, 3f de bos -> bir oktav yukarisi
      continue;
    }
    return candidate;
  }
  return candidate;
}

/**
 * Bir bolgenin ham PCM'ini mono Float32 olarak cikarir.
 *
 * `smpl` chunk'i 16-bit isaretli, tek kanal, ornekler pespese dizilidir;
 * `start`/`end` CERCEVE cinsindendir, bayt degil.
 */
export function readZoneSamples(soundFont, zone) {
  const {start, end} = zone.header;
  const count = end - start;
  if (count <= 0) return null;

  const mono = new Float32Array(count);
  const base = soundFont.smpl.offset + start * 2;
  for (let i = 0; i < count; i++) mono[i] = soundFont.buffer.readInt16LE(base + i * 2) / 32768;
  return {mono, rate: zone.header.sampleRate};
}
