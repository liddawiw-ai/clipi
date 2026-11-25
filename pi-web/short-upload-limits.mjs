import {BlobSource, BufferSource, Input, MP4} from 'mediabunny';

export const maxShortBytes = 50 * 1024 * 1024;
export const maxShortSeconds = 180;
export const sizeError = 'اختر فيديو حجمه حتى ٥٠ ميغابايت';
const durationError = 'أقصى مدة للفيديو ثلاث دقائق. قصّر المقطع ثم حاول مجددًا.';
const invalidVideo = 'تعذّرت قراءة مدة الفيديو. اختر ملف MP4 صالحًا.';

// Read the media timeline so unfinalized headers and fragmented MP4s use the same rule.
export async function checkShortVideo(file) {
  if ((file instanceof Blob ? file.size : file.byteLength) > maxShortBytes) {
    return {error: sizeError, status: 413};
  }
  const source = file instanceof Blob ? new BlobSource(file) : new BufferSource(file);
  const input = new Input({formats: [MP4], source});
  try {
    if (await input.getPrimaryVideoTrack()) {
      // Some fragmented MP4s start on a positive timestamp. Encoder priming
      // before zero is not part of the playable clip either.
      const [first, end] = await Promise.all([input.getFirstTimestamp(), input.computeDuration()]);
      const seconds = end - Math.max(0, first);
      if (Number.isFinite(seconds) && seconds > 0) {
        return seconds > maxShortSeconds ? {error: durationError, status: 422} : null;
      }
    }
  } catch {
    // A damaged file cannot be published without a measurable timeline.
  } finally {
    input.dispose();
  }
  return {error: invalidVideo, status: 415};
}
