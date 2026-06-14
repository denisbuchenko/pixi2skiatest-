import * as PIXI from 'pixi.js-legacy';
import type {
  SkiaColor,
  SkiaContainerNode,
  SkiaGraphicsNode,
  SkiaMatrix,
  SkiaPathCommand,
  SkiaPathData,
  SkiaSceneNode,
  SkiaSpriteNode,
} from '../types/skia-types';

export interface PixiToSkiaResult {
  tree: SkiaContainerNode;
  interactiveObjects: Map<number, PIXI.DisplayObject>;
}

let nodeId = 1;

function convertMatrix(pixiMatrix: PIXI.Matrix): SkiaMatrix {
  return {
    a: pixiMatrix.a,
    b: pixiMatrix.b,
    c: pixiMatrix.c,
    d: pixiMatrix.d,
    tx: pixiMatrix.tx,
    ty: pixiMatrix.ty,
  };
}

function convertColor(color: number | string | undefined, alpha = 1): SkiaColor | undefined {
  if (color === undefined) return undefined;

  const hexValue = typeof color === 'string' 
    ? parseInt(color.replace('#', ''), 16) 
    : color;

  return {
    r: ((hexValue >> 16) & 255) / 255,
    g: ((hexValue >> 8) & 255) / 255,
    b: (hexValue & 255) / 255,
    a: alpha,
  };
}

function isStyleVisible(style: { visible?: boolean; alpha?: number; color?: number }): boolean {
  const isVisible = style.visible !== false;
  const hasAlpha = (style.alpha ?? 1) > 0;
  const hasColor = style.color !== undefined;
  return isVisible && hasAlpha && hasColor;
}

function extractRectangleCommands(shape: PIXI.Rectangle): SkiaPathCommand[] {
  return [{ type: 'rect', args: [shape.x, shape.y, shape.width, shape.height] }];
}

function extractEllipseCommands(shape: PIXI.Ellipse): SkiaPathCommand[] {
  return [{ type: 'ellipse', args: [shape.x, shape.y, shape.width, shape.height] }];
}

function extractPolygonCommands(shape: { points: number[]; closeStroke?: boolean }): SkiaPathCommand[] {
  const commands: SkiaPathCommand[] = [];
  
  for (let i = 0; i < shape.points.length; i += 2) {
    const commandType = i === 0 ? 'moveTo' : 'lineTo';
    commands.push({ 
      type: commandType, 
      args: [shape.points[i], shape.points[i + 1]] 
    });
  }
  
  if (shape.closeStroke) {
    commands.push({ type: 'close', args: [] });
  }
  
  return commands;
}

function extractShapeCommands(shape: any): SkiaPathCommand[] {
  if (shape instanceof PIXI.Rectangle || shape?.type === PIXI.SHAPES?.RECT) {
    return extractRectangleCommands(shape);
  }

  if (shape instanceof PIXI.Ellipse || shape?.type === PIXI.SHAPES?.ELIP) {
    return extractEllipseCommands(shape);
  }

  if (shape instanceof PIXI.Polygon || shape?.type === PIXI.SHAPES?.POLY || Array.isArray(shape?.points)) {
    return extractPolygonCommands(shape);
  }

  if (Array.isArray(shape)) {
    return extractPolygonCommands({ points: shape });
  }

  return [];
}

function extractPathData(graphicsData: any[]): SkiaPathData[] {  
  return graphicsData
    .map((data) => {
      const fillStyle = data.fillStyle ?? data.fill ?? {};
      const lineStyle = data.lineStyle ?? data.stroke ?? {};
      
      const commands = extractShapeCommands(data.shape);

      const result = {
        commands,
        fillColor: isStyleVisible(fillStyle) 
          ? convertColor(fillStyle.color, fillStyle.alpha) 
          : undefined,
        strokeColor: isStyleVisible(lineStyle) 
          ? convertColor(lineStyle.color, lineStyle.alpha) 
          : undefined,
        strokeWidth: isStyleVisible(lineStyle) ? lineStyle.width ?? 1 : undefined,
      };

      return result;
    })
    .filter((path) => {
      const hasCommands = path.commands.length > 0;
      const hasFill = path.fillColor !== undefined;
      const hasStroke = path.strokeColor !== undefined;
      
      if (hasCommands && !hasFill && !hasStroke) {
      }
      
      return hasCommands && (hasFill || hasStroke);
    });
}

function convertGraphics(graphics: PIXI.Graphics, id: number): SkiaGraphicsNode | null {
  const geometry = graphics.geometry as any;
  const graphicsData = geometry?.graphicsData ?? [];
  const paths = extractPathData(graphicsData);

  if (paths.length === 0) {
    return null;
  }

  return {
    id,
    type: 'graphics',
    transform: convertMatrix(graphics.transform.localTransform),
    alpha: graphics.alpha,
    visible: graphics.visible,
    paths,
  };
}

function extractSpriteSource(sprite: PIXI.Sprite): string {
  const baseTexture = sprite.texture.baseTexture as any;
  const resource = baseTexture?.resource;
  const source = resource?.source;

  if (typeof source?.src === 'string') return source.src;
  if (typeof resource?.url === 'string') return resource.url;
  
  return '';
}

function convertSprite(sprite: PIXI.Sprite, id: number): SkiaSpriteNode {
  const { orig } = sprite.texture;

  return {
    id,
    type: 'sprite',
    transform: convertMatrix(sprite.transform.localTransform),
    alpha: sprite.alpha,
    visible: sprite.visible,
    imageSource: extractSpriteSource(sprite),
    frameWidth: orig.width,
    frameHeight: orig.height,
    anchorX: sprite.anchor.x,
    anchorY: sprite.anchor.y,
  };
}

function registerInteractiveObject(
  object: PIXI.DisplayObject,
  id: number,
  registry: Map<number, PIXI.DisplayObject>
): void {
  const eventMode = object.eventMode;
  if (eventMode === 'static' || eventMode === 'dynamic') {
    registry.set(id, object);
  }
}

function convertContainer(
  container: PIXI.Container,
  id: number,
  registry: Map<number, PIXI.DisplayObject>
): SkiaContainerNode {
  const children = container.children
    .map((child) => convertDisplayObject(child, registry))
    .filter((child): child is SkiaSceneNode => child !== null);

  return {
    id,
    type: 'container',
    transform: convertMatrix(container.transform.localTransform),
    alpha: container.alpha,
    visible: container.visible,
    children,
  };
}

function convertDisplayObject(
  object: PIXI.DisplayObject,
  registry: Map<number, PIXI.DisplayObject>
): SkiaSceneNode | null {
  const id = nodeId++;
  registerInteractiveObject(object, id, registry);

  if (object instanceof PIXI.Graphics) {
    return convertGraphics(object, id);
  }

  if (object instanceof PIXI.Sprite) {
    return convertSprite(object, id);
  }

  if (object instanceof PIXI.Container) {
    return convertContainer(object, id, registry);
  }

  return null;
}

export function convertPixiContainerToSkia(container: PIXI.Container): PixiToSkiaResult {
  container.updateTransform();
  
  const interactiveObjects = new Map<number, PIXI.DisplayObject>();
  const tree = convertDisplayObject(container, interactiveObjects) as SkiaContainerNode;

  return { tree, interactiveObjects };
}
