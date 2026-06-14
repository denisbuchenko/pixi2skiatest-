import type {
  SkiaGraphicsNode,
  SkiaMatrix,
  SkiaPathCommand,
  SkiaPathData,
  SkiaSceneNode,
  SkiaSpriteNode,
} from '../types/skia-types';

export interface Point {
  x: number;
  y: number;
}

function multiply(left: SkiaMatrix, right: SkiaMatrix): SkiaMatrix {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    tx: left.a * right.tx + left.c * right.ty + left.tx,
    ty: left.b * right.tx + left.d * right.ty + left.ty,
  };
}

function invert(matrix: SkiaMatrix): SkiaMatrix | null {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(determinant) < 0.000001) {
    return null;
  }

  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    tx: (matrix.c * matrix.ty - matrix.d * matrix.tx) / determinant,
    ty: (matrix.b * matrix.tx - matrix.a * matrix.ty) / determinant,
  };
}

function transformPoint(matrix: SkiaMatrix, point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.tx,
    y: matrix.b * point.x + matrix.d * point.y + matrix.ty,
  };
}

function identity(): SkiaMatrix {
  return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function commandBounds(command: SkiaPathCommand): { x: number; y: number; width: number; height: number } | null {
  if (command.type === 'rect') {
    const [x, y, width, height] = command.args;
    return { x, y, width, height };
  }
  if (command.type === 'ellipse') {
    const [x, y, width, height] = command.args;
    return { x: x - width, y: y - height, width: width * 2, height: height * 2 };
  }
  return null;
}

function pointInPolygon(point: Point, points: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

function hitPath(path: SkiaPathData, point: Point): boolean {
  const strokeTolerance = Math.max((path.strokeWidth ?? 0) / 2, 6);
  const polygon: Point[] = [];
  let lastPoint: Point | null = null;

  for (const command of path.commands) {
    const bounds = commandBounds(command);
    if (bounds) {
      const withinBounds =
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height;

      if (command.type === 'rect') {
        return withinBounds;
      }

      if (command.type !== 'ellipse') {
        return false;
      }

      const [centerX, centerY, radiusX, radiusY] = command.args;
      const normalizedX = (point.x - centerX) / radiusX;
      const normalizedY = (point.y - centerY) / radiusY;
      return withinBounds && normalizedX * normalizedX + normalizedY * normalizedY <= 1;
    }

    if (command.type === 'moveTo') {
      lastPoint = { x: command.args[0], y: command.args[1] };
      polygon.push(lastPoint);
    } else if (command.type === 'lineTo') {
      const nextPoint = { x: command.args[0], y: command.args[1] };
      if (lastPoint && distanceToSegment(point, lastPoint, nextPoint) <= strokeTolerance) {
        return true;
      }
      polygon.push(nextPoint);
      lastPoint = nextPoint;
    }
  }

  return path.fillColor !== undefined && polygon.length >= 3 && pointInPolygon(point, polygon);
}

function hitGraphics(node: SkiaGraphicsNode, point: Point): boolean {
  return node.paths.some((path) => hitPath(path, point));
}

function hitSprite(node: SkiaSpriteNode, point: Point): boolean {
  const minX = -node.anchorX * node.frameWidth;
  const minY = -node.anchorY * node.frameHeight;

  return (
    point.x >= minX &&
    point.x <= minX + node.frameWidth &&
    point.y >= minY &&
    point.y <= minY + node.frameHeight
  );
}

function findHitNode(node: SkiaSceneNode, worldMatrix: SkiaMatrix, screenPoint: Point): number | null {
  if (!node.visible || node.alpha <= 0) {
    return null;
  }

  const nextMatrix = multiply(worldMatrix, node.transform);

  for (let index = (node.children?.length ?? 0) - 1; index >= 0; index -= 1) {
    const hitChild = findHitNode(node.children![index] as SkiaSceneNode, nextMatrix, screenPoint);
    if (hitChild !== null) {
      return hitChild;
    }
  }

  const inverse = invert(nextMatrix);
  if (!inverse) {
    return null;
  }

  const localPoint = transformPoint(inverse, screenPoint);
  if (node.type === 'graphics' && hitGraphics(node, localPoint)) {
    return node.id;
  }
  if (node.type === 'sprite' && hitSprite(node, localPoint)) {
    return node.id;
  }

  return null;
}

export function hitTestSkiaTree(tree: SkiaSceneNode, point: Point): number | null {
  return findHitNode(tree, identity(), point);
}
