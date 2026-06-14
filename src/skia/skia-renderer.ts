import type * as PIXI from 'pixi.js-legacy';
import type { SkiaSceneNode } from '../types/skia-types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../core/constants';
import { getCanvasPixelRatio } from '../core/canvas-display';
import type { CanvasKitInstance, SkImage, SkSurface } from './canvaskit-init';
import { drawSkiaNode, type ImageCache } from './skia-draw';
import { hitTestSkiaTree, type Point as SkiaPoint } from './hit-test';

export class SkiaRenderer {
  private readonly surface: SkSurface;
  private readonly pixelRatio: number;
  private readonly imageCache = new Map<string, SkImage>();
  private currentTree: SkiaSceneNode | null = null;
  private interactiveObjects = new Map<number, PIXI.DisplayObject>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly canvasKit: CanvasKitInstance,
  ) {
    this.pixelRatio = getCanvasPixelRatio();
  
    const surface = (canvasKit.MakeSWCanvasSurface?.(canvas) ?? canvasKit.MakeCanvasSurface?.(canvas)) as SkSurface | null;
    if (!surface) {
      throw new Error('Не удалось создать CanvasKit surface');
    }

    this.surface = surface;
    this.installPointerEvents();
  }

  render(tree: SkiaSceneNode, interactiveObjects = this.interactiveObjects): void {
    this.currentTree = tree;
    this.interactiveObjects = interactiveObjects;

    const canvas = this.surface.getCanvas();
    canvas.clear(this.canvasKit.Color(0, 0, 0, 0));
    canvas.save();
    try {
      canvas.scale(this.pixelRatio, this.pixelRatio);
      drawSkiaNode(this.canvasKit, canvas, tree, this.imageCache as ImageCache);
    } finally {
      canvas.restore();
    }
    this.surface.flush();
  }

  private installPointerEvents(): void {
    const forward = (event: PointerEvent, pixiEventName: 'pointerdown' | 'pointerup') => {
      if (!this.currentTree) {
        return;
      }

      const rect = this.canvas.getBoundingClientRect();

      const point: SkiaPoint = {
        x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
      };

      const id = hitTestSkiaTree(this.currentTree, point);

      if (id === null) {
        return;
      }

      const displayObject = this.interactiveObjects.get(id);

      displayObject?.emit(pixiEventName, {
        type: pixiEventName,
        global: point,
        nativeEvent: event,
        target: displayObject,
      } as any);
    };

    this.canvas.addEventListener('pointerdown', (event) => forward(event, 'pointerdown'));
    this.canvas.addEventListener('pointerup', (event) => forward(event, 'pointerup'));
  }
}
