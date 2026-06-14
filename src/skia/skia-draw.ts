import type {
  SkiaColor,
  SkiaGraphicsNode,
  SkiaMatrix,
  SkiaPathData,
  SkiaSceneNode,
  SkiaSpriteNode,
} from '../types/skia-types';
import { getCachedImageBytes } from '../core/image-source';
import type { CanvasKitInstance, SkCanvas, SkImage, SkPaint, SkPath } from './canvaskit-init';

export interface ImageCache {
  get(source: string): SkImage | null;
  set(source: string, image: SkImage): void;
}

function toSkiaMatrix(transform: SkiaMatrix): number[] {
  return [transform.a, transform.c, transform.tx, transform.b, transform.d, transform.ty, 0, 0, 1];
}

function colorWithAlpha(canvasKit: CanvasKitInstance, color: SkiaColor, alpha: number): Float32Array {
  return canvasKit.Color(color.r * 255, color.g * 255, color.b * 255, color.a * alpha);
}

function createPath(canvasKit: CanvasKitInstance, pathData: SkiaPathData): SkPath {
  const path = new canvasKit.Path();

  for (const command of pathData.commands) {
    if (command.type === 'moveTo') {
      path.moveTo(command.args[0], command.args[1]);
    } else if (command.type === 'lineTo') {
      path.lineTo(command.args[0], command.args[1]);
    } else if (command.type === 'rect') {
      path.addRect(canvasKit.XYWHRect(command.args[0], command.args[1], command.args[2], command.args[3]));
    } else if (command.type === 'ellipse') {
      const [x, y, width, height] = command.args;
      path.addOval(canvasKit.LTRBRect(x - width, y - height, x + width, y + height));
    } else {
      path.close();
    }
  }

  return path;
}

function drawPath(
  canvasKit: CanvasKitInstance,
  canvas: SkCanvas,
  pathData: SkiaPathData,
  alpha: number,
): void {
  const path = createPath(canvasKit, pathData);

  try {
    if (pathData.fillColor) {
      const paint = new canvasKit.Paint();
      try {
        paint.setAntiAlias(true);
        paint.setStyle(canvasKit.PaintStyle.Fill);
        paint.setColor(colorWithAlpha(canvasKit, pathData.fillColor, alpha));
        canvas.drawPath(path, paint);
      } finally {
        paint.delete();
      }
    }

    if (pathData.strokeColor && pathData.strokeWidth && pathData.strokeWidth > 0) {
      const paint = new canvasKit.Paint();
      try {
        paint.setAntiAlias(true);
        paint.setStyle(canvasKit.PaintStyle.Stroke);
        paint.setStrokeWidth(pathData.strokeWidth);
        paint.setColor(colorWithAlpha(canvasKit, pathData.strokeColor, alpha));
        canvas.drawPath(path, paint);
      } finally {
        paint.delete();
      }
    }
  } finally {
    path.delete();
  }
}

function drawSprite(
  canvasKit: CanvasKitInstance,
  canvas: SkCanvas,
  node: SkiaSpriteNode,
  imageCache: ImageCache,
  alpha: number,
): void {
  if (!node.imageSource) {
    return;
  }

  let image = imageCache.get(node.imageSource);
  if (!image) {
    const encoded = getCachedImageBytes(node.imageSource);
    if (!encoded) {
      return;
    }
    image = canvasKit.MakeImageFromEncoded(encoded);
    if (!image) {
      return;
    }
    imageCache.set(node.imageSource, image);
  }

  const paint = new canvasKit.Paint();
  try {
    paint.setAntiAlias(true);
    paint.setColor(canvasKit.Color(255, 255, 255, alpha));
    const src = canvasKit.XYWHRect(0, 0, image.width(), image.height());
    const dest = canvasKit.XYWHRect(
      -node.anchorX * node.frameWidth,
      -node.anchorY * node.frameHeight,
      node.frameWidth,
      node.frameHeight,
    );
    canvas.drawImageRect(image, src, dest, paint);
  } finally {
    paint.delete();
  }
}

function drawGraphics(
  canvasKit: CanvasKitInstance,
  canvas: SkCanvas,
  node: SkiaGraphicsNode,
  inheritedAlpha: number,
): void {
  for (const path of node.paths) {
    drawPath(canvasKit, canvas, path, inheritedAlpha);
  }
}

export function drawSkiaNode(
  canvasKit: CanvasKitInstance,
  canvas: SkCanvas,
  node: SkiaSceneNode,
  imageCache: ImageCache,
  inheritedAlpha = 1,
): void {
  if (!node.visible || node.alpha <= 0) {
    return;
  }

  const alpha = inheritedAlpha * node.alpha;
  canvas.save();
  try {
    canvas.concat(toSkiaMatrix(node.transform));
    if (node.type === 'graphics') {
      drawGraphics(canvasKit, canvas, node, alpha);
    } else if (node.type === 'sprite') {
      drawSprite(canvasKit, canvas, node, imageCache, alpha);
    }

    for (const child of node.children ?? []) {
      drawSkiaNode(canvasKit, canvas, child as SkiaSceneNode, imageCache, alpha);
    }
  } finally {
    canvas.restore();
  }
}
