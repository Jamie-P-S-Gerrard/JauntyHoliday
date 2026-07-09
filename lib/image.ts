// Client-side image preparation for uploads.
//
// Re-encoding through a canvas does three jobs at once: shrinks the file to a
// sane size, normalises everything to webp, and — importantly for shared trip
// photos — strips ALL metadata, including the GPS coordinates phone cameras
// embed in every shot.

const DEFAULT_MAX_DIM = 2048;
const DEFAULT_QUALITY = 0.82;

export async function prepareImage(
  file: File,
  maxDim: number = DEFAULT_MAX_DIM,
  quality: number = DEFAULT_QUALITY,
): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file');
  }

  let bitmap: ImageBitmap;
  try {
    // 'from-image' applies the EXIF orientation before we drop the metadata
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error("Couldn't read that image — try a different one");
  }

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Couldn't process the image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  );
  if (!blob) throw new Error("Couldn't process the image");
  return blob;
}

/** Smaller square-ish variant for avatars. */
export function prepareAvatar(file: File): Promise<Blob> {
  return prepareImage(file, 512, 0.85);
}
