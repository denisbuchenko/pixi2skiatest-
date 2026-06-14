import { PDFDocument, PDFImage } from 'pdf-lib';
import { getImageMime, loadImageBytes } from '../core/image-source';

export type PdfImageCache = Map<string, PDFImage>;

export async function getOrEmbedImage(
  document: PDFDocument,
  source: string,
  cache: PdfImageCache
): Promise<PDFImage | null> {
  const cached = cache.get(source);
  if (cached) return cached;

  const bytes = await loadImageBytes(source);
  if (!bytes) return null;

  const mime = getImageMime(source, bytes);
  let image: PDFImage | null = null;

  if (mime === 'image/png') {
    image = await document.embedPng(bytes);
  } else if (mime === 'image/jpeg' || mime === 'image/jpg') {
    image = await document.embedJpg(bytes);
  }

  if (image) {
    const imageDict = document.context.lookup(image.ref);
    if (imageDict && typeof imageDict === 'object' && 'set' in imageDict) {
      (imageDict as any).set(document.context.obj('Interpolate'), document.context.obj(true));
    }
    
    cache.set(source, image);
  }

  return image;
}