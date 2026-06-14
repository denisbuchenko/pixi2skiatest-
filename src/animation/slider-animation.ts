import * as PIXI from 'pixi.js-legacy';
import { SLIDE_DURATION_MS } from '../core/constants';
import { PixiRenderer } from '../pixi/pixi-renderer';
import { convertPixiContainerToSkia } from '../core/pixi-to-skia';
import { SkiaRenderer } from '../skia/skia-renderer';

export class SliderAnimation {
  private shapes: PIXI.Container[] = [];
  private currentIndex = 0;
  private animationFrame = 0;
  onChange?: (currentIndex: number, total: number) => void;

  constructor(
    private pixiRenderer: PixiRenderer,
    private skiaRenderer: SkiaRenderer,
  ) {}

  setShapes(shapes: PIXI.Container[]): void {
    this.shapes = shapes;
    this.currentIndex = Math.min(this.currentIndex, Math.max(0, shapes.length - 1));
    this.renderCurrent();
    this.emitChange();
  }

  addShape(shape: PIXI.Container): void {
    this.shapes.push(shape);
    this.currentIndex = this.shapes.length - 1;
    this.renderCurrent();
    this.emitChange();
  }

  next(): void {
    if (this.shapes.length < 2) {
      return;
    }
    this.animateTo((this.currentIndex + 1) % this.shapes.length);
  }

  prev(): void {
    if (this.shapes.length < 2) {
      return;
    }
    this.animateTo((this.currentIndex - 1 + this.shapes.length) % this.shapes.length);
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getCurrentShape(): PIXI.Container | null {
    return this.shapes[this.currentIndex] ?? null;
  }

  private renderCurrent(): void {
    const current = this.getCurrentShape();
    if (!current) {
      return;
    }
    current.alpha = 1;
    this.pixiRenderer.render(current);
    const { tree, interactiveObjects } = convertPixiContainerToSkia(current);
    this.pixiRenderer.updateInteractionData(tree, interactiveObjects);
    this.skiaRenderer.render(tree, interactiveObjects);
  }

  private animateTo(nextIndex: number): void {
    cancelAnimationFrame(this.animationFrame);

    const previous = this.shapes[this.currentIndex];
    const next = this.shapes[nextIndex];
    const transition = new PIXI.Container();
    previous.alpha = 1;
    next.alpha = 0;
    transition.addChild(previous, next);

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / SLIDE_DURATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      previous.alpha = 1 - eased;
      next.alpha = eased;

      this.pixiRenderer.render(transition);
      const { tree, interactiveObjects } = convertPixiContainerToSkia(transition);
      this.skiaRenderer.render(tree, interactiveObjects);

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(tick);
        return;
      }

      previous.alpha = 1;
      next.alpha = 1;
      this.currentIndex = nextIndex;
      this.renderCurrent();
      this.emitChange();
    };

    this.animationFrame = requestAnimationFrame(tick);
  }

  private emitChange(): void {
    this.onChange?.(this.currentIndex, this.shapes.length);
  }
}
