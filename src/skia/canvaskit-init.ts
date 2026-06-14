import CanvasKitInit from 'canvaskit-wasm/full';
import wasmUrl from 'canvaskit-wasm/bin/full/canvaskit.wasm?url';

export type CanvasKitInstance = Awaited<ReturnType<typeof CanvasKitInit>> & {
  MakeCanvasSurface?: (canvas: HTMLCanvasElement | string) => SkSurface | null;
  MakeSWCanvasSurface?: (canvas: HTMLCanvasElement | string) => SkSurface | null;
  MakePDFDocument?: () => SkPDFDocument;
  MakeSkPDFDocument?: () => SkPDFDocument;
  PaintStyle: { Fill: number; Stroke: number };
  Color: (r: number, g: number, b: number, a: number) => Float32Array;
  Malloc: (typedArray: typeof Uint8Array, size: number) => SkMalloc;
  MakeImageFromEncoded: (data: Uint8Array | SkMalloc) => SkImage | null;
  Path: new () => SkPath;
  Paint: new () => SkPaint;
  XYWHRect: (x: number, y: number, width: number, height: number) => Float32Array;
  LTRBRect: (left: number, top: number, right: number, bottom: number) => Float32Array;
  TRANSPARENT: Float32Array;
};

export interface SkDeletable {
  delete(): void;
}

export interface SkMalloc extends SkDeletable {
  toTypedArray(): Uint8Array;
}

export interface SkImage extends SkDeletable {
  width(): number;
  height(): number;
}

export interface SkPaint extends SkDeletable {
  setAntiAlias(value: boolean): void;
  setColor(color: Float32Array): void;
  setStyle(style: unknown): void;
  setStrokeWidth(width: number): void;
}

export interface SkPath extends SkDeletable {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  close(): void;
  addRect(rect: Float32Array): void;
  addOval(rect: Float32Array): void;
}

export interface SkCanvas {
  clear(color: Float32Array): void;
  save(): void;
  restore(): void;
  scale(sx: number, sy: number): void;
  concat(matrix: number[]): void;
  drawPath(path: SkPath, paint: SkPaint): void;
  drawImage(image: SkImage, x: number, y: number, paint?: SkPaint): void;
  drawImageRect(image: SkImage, src: Float32Array, dest: Float32Array, paint: SkPaint): void;
}

export interface SkSurface extends SkDeletable {
  getCanvas(): SkCanvas;
  flush(): void;
}

export interface SkPDFDocument extends SkDeletable {
  beginPage(width: number, height: number): SkCanvas;
  endPage(): void;
  close(): void;
  save(): Uint8Array;
}

export async function initCanvasKit(): Promise<CanvasKitInstance> {
  try {
    const canvasKit = await CanvasKitInit({
      locateFile: () => wasmUrl,
    });

    return canvasKit as CanvasKitInstance;
  } catch (error) {
    console.error('CanvasKit initialization failed', error);
    throw new Error('Не удалось загрузить CanvasKit WASM');
  }
}
