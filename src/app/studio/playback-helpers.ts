/**
 * Studio (Nota Editor) kayitli-nota playback yardimcilari — SAF fonksiyonlar.
 *
 * Tekrar (loop): kaydin kendisi kadar ofsetlenmis kopyalar, kullanici
 * secimindeki tekrar sayisi kadar planlanir; imlec kayit boyunca sarar.
 */

export function getSequenceDuration<T extends {startTime: number; duration: number}>(
  notes: readonly T[],
): number {
  return notes.reduce((max, note) => Math.max(max, note.startTime + note.duration), 0);
}

export function repeatScheduledNotes<T extends {startTime: number; duration: number}>(
  notes: readonly T[],
  repeatCount: number,
): T[] {
  const count = Math.max(1, Math.floor(repeatCount));
  const sequenceDuration = getSequenceDuration(notes);
  if (count === 1 || notes.length === 0 || !(sequenceDuration > 0)) return [...notes];
  return notes.flatMap((note) =>
    Array.from({length: count}, (_, index) => ({...note, startTime: note.startTime + index * sequenceDuration})),
  );
}

export function wrapSequencePosition(heardPosition: number, sequenceDuration: number): number {
  if (!(sequenceDuration > 0) || heardPosition < 0) return Math.max(0, heardPosition);
  return heardPosition % sequenceDuration;
}
