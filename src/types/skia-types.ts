export type SkiaNodeType = 'container' | 'graphics' | 'sprite';

export interface SkiaMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export interface SkiaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type SkiaPathCommand =
  | { type: 'moveTo'; args: [number, number] }
  | { type: 'lineTo'; args: [number, number] }
  | { type: 'rect'; args: [number, number, number, number] }
  | { type: 'ellipse'; args: [number, number, number, number] }
  | { type: 'close'; args: [] };

export interface SkiaPathData {
  commands: SkiaPathCommand[];
  fillColor?: SkiaColor;
  strokeColor?: SkiaColor;
  strokeWidth?: number;
}

export interface SkiaNode {
  id: number;
  type: SkiaNodeType;
  transform: SkiaMatrix;
  alpha: number;
  visible: boolean;
  children?: SkiaNode[];
}

export interface SkiaContainerNode extends SkiaNode {
  type: 'container';
  children: SkiaNode[];
}

export interface SkiaGraphicsNode extends SkiaNode {
  type: 'graphics';
  paths: SkiaPathData[];
}

export interface SkiaSpriteNode extends SkiaNode {
  type: 'sprite';
  imageSource: string;
  frameWidth: number;
  frameHeight: number;
  anchorX: number;
  anchorY: number;
}

export type SkiaSceneNode = SkiaContainerNode | SkiaGraphicsNode | SkiaSpriteNode;
