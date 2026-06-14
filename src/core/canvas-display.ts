import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants';

export function getCanvasPixelRatio(): number {
  return window.devicePixelRatio || 1;
}

export function applyCanvasBufferSize(canvas: HTMLCanvasElement, pixelRatio = getCanvasPixelRatio()): number {
  canvas.width = Math.round(CANVAS_WIDTH * pixelRatio);
  canvas.height = Math.round(CANVAS_HEIGHT * pixelRatio);
  return pixelRatio;
}
