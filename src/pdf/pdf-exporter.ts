import { PDFDocument } from 'pdf-lib';
import type { SkiaSceneNode } from '../types/skia-types';
import type { CanvasKitInstance, SkImage, SkPDFDocument } from '../skia/canvaskit-init';
import { drawSkiaNode, type ImageCache } from '../skia/skia-draw';
import { renderSkiaTreeToPdfPage } from './pdf-renderer';

export class PDFExporter {
  constructor(private readonly canvasKit: CanvasKitInstance) {}

  async export(tree: SkiaSceneNode, width: number, height: number): Promise<Uint8Array> {
    const createDocument = this.canvasKit.MakePDFDocument ?? this.canvasKit.MakeSkPDFDocument;
    if (createDocument) {
      return this._exportViaCanvasKit(tree, width, height, createDocument);
    }

    return this._exportViaPdfLib(tree, width, height);
  }

  downloadPDF(bytes: Uint8Array, filename = 'pixi-skia-export.pdf'): void {
    const data = bytes.slice().buffer as ArrayBuffer;
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private _exportViaCanvasKit(
    tree: SkiaSceneNode,
    width: number,
    height: number,
    createDocument: () => SkPDFDocument,
  ): Uint8Array {
    const document = createDocument.call(this.canvasKit) as SkPDFDocument;
    const imageCache = new Map<string, SkImage>();

    try {
      const canvas = document.beginPage(width, height);
      drawSkiaNode(this.canvasKit, canvas, tree, imageCache as ImageCache);
      document.endPage();
      document.close();
      return document.save();
    } finally {
      for (const image of imageCache.values()) {
        image.delete();
      }
      document.delete();
    }
  }

  private async _exportViaPdfLib(tree: SkiaSceneNode, width: number, height: number): Promise<Uint8Array> {
    const document = await PDFDocument.create();
    const page = document.addPage([width, height]);
    await renderSkiaTreeToPdfPage(page, document, tree, height);
    return document.save();
  }
}
