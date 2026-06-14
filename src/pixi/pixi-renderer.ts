// src/pixi/pixi-renderer.ts
import * as PIXI from 'pixi.js-legacy';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../core/constants';
import { getCanvasPixelRatio } from '../core/canvas-display';
import type { SkiaSceneNode } from '../types/skia-types';
import { hitTestSkiaTree } from '../skia/hit-test';

export class PixiRenderer {
  private readonly app: PIXI.Application;
  private currentTree: SkiaSceneNode | null = null;
  private interactiveObjects = new Map<number, PIXI.DisplayObject>();

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.app = new PIXI.Application({
      view: canvas,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      resolution: getCanvasPixelRatio(),
      autoDensity: true,
      backgroundAlpha: 0,
      forceCanvas: true,
    });

    this.installPointerEvents();
  }

  public render(container: PIXI.Container): void {
    this.app.stage.removeChildren();
    this.app.stage.addChild(container);
  }

  public updateInteractionData(
    tree: SkiaSceneNode,
    interactiveObjects: Map<number, PIXI.DisplayObject>
  ): void {
    this.currentTree = tree;
    this.interactiveObjects = interactiveObjects;
  }

  private installPointerEvents(): void {
    const handlePointer = (event: PointerEvent, pixiEventName: 'pointerdown' | 'pointerup') => {
      if (!this.currentTree) return;

      const rect = this.canvas.getBoundingClientRect();
      const point = {
        x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
      };

      const id = hitTestSkiaTree(this.currentTree, point);
      if (id === null) return;

      const displayObject = this.interactiveObjects.get(id);
      if (displayObject) {
        displayObject.emit(pixiEventName, {
          type: pixiEventName,
          global: point,
          nativeEvent: event,
          target: displayObject,
        } as any);
      }
    };

    this.canvas.addEventListener('pointerdown', (e) => handlePointer(e, 'pointerdown'));
    this.canvas.addEventListener('pointerup', (e) => handlePointer(e, 'pointerup'));
  }

  public destroy(): void {
    this.app.destroy(true, { children: true, texture: true });
  }
}