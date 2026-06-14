import * as PIXI from 'pixi.js-legacy';
import { CANVAS_HEIGHT, CANVAS_WIDTH, SPRITE_IMAGE_URL } from '../core/constants';

const COLOR_PALETTE = [0xe63946, 0x2a9d8f, 0xf4a261, 0x457b9d, 0xffbe0b, 0x8338ec, 0x0ead69];

let shapeCounter = 1;

const getRandomNumber = (min: number, max: number): number => min + Math.random() * (max - min);
const getRandomColor = (): number => COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];

function applyInteractivity(displayObject: PIXI.DisplayObject, label: string): void {
  displayObject.eventMode = 'static';


  displayObject.hitArea = new PIXI.Rectangle(0, 0, 0, 0);

  displayObject.on('pointerdown', () => console.log(`[Interactive] ${label} pointerdown`));
  displayObject.on('pointerup', () => console.log(`[Interactive] ${label} pointerup`));
}

function applyRandomTransform(displayObject: PIXI.DisplayObject): void {
  displayObject.position.set(
    getRandomNumber(90, CANVAS_WIDTH - 180),
    getRandomNumber(80, CANVAS_HEIGHT - 110)
  );
  displayObject.angle = getRandomNumber(-45, 45);
  displayObject.scale.set(
    getRandomNumber(0.75, 1.45),
    getRandomNumber(0.75, 1.45)
  );
}

function createRandomRectangle(): PIXI.Graphics {
  const graphics = new PIXI.Graphics();
  graphics.lineStyle(getRandomNumber(2, 10), getRandomColor(), 1);
  graphics.beginFill(getRandomColor(), 0.85);
  graphics.drawRect(getRandomNumber(-70, -10), getRandomNumber(-60, -10), getRandomNumber(80, 170), getRandomNumber(60, 150));
  graphics.endFill();
  return graphics;
}

function createRandomEllipse(): PIXI.Graphics {
  const graphics = new PIXI.Graphics();
  graphics.lineStyle(getRandomNumber(2, 8), getRandomColor(), 1);
  graphics.beginFill(getRandomColor(), 0.8);
  graphics.drawEllipse(0, 0, getRandomNumber(40, 110), getRandomNumber(30, 90));
  graphics.endFill();
  return graphics;
}

function createRandomPolyline(): PIXI.Graphics {
  const graphics = new PIXI.Graphics();
  graphics.lineStyle(getRandomNumber(4, 12), getRandomColor(), 1);
  
  const p1 = { x: getRandomNumber(-90, -30), y: getRandomNumber(-60, 50) };
  const p2 = { x: getRandomNumber(-20, 80), y: getRandomNumber(-70, 70) };
  const p3 = { x: getRandomNumber(60, 140), y: getRandomNumber(-40, 90) };
  
  graphics.moveTo(p1.x, p1.y);
  graphics.lineTo(p2.x, p2.y);
  graphics.lineTo(p3.x, p3.y);
  
  graphics.moveTo(p3.x, p3.y);
  
  return graphics;
}

function generateRandomGraphics(): PIXI.Graphics {
  const shapeType = Math.floor(getRandomNumber(0, 3));
  
  switch (shapeType) {
    case 0: return createRandomRectangle();
    case 1: return createRandomEllipse();
    default: return createRandomPolyline();
  }
}

function buildRandomGraphicsNode(label: string): PIXI.Graphics {
  const graphics = generateRandomGraphics();
  applyRandomTransform(graphics);
  applyInteractivity(graphics, label);
  return graphics;
}

function buildRandomSprite(label: string): PIXI.Sprite {
  const sprite = PIXI.Sprite.from(SPRITE_IMAGE_URL);
  
  sprite.anchor.set(0.5);
  sprite.width = getRandomNumber(42, 76);
  sprite.height = getRandomNumber(42, 76);
  sprite.position.set(
    getRandomNumber(90, CANVAS_WIDTH - 90),
    getRandomNumber(80, CANVAS_HEIGHT - 90)
  );
  sprite.angle = getRandomNumber(-35, 35);
  
  applyInteractivity(sprite, label);
  return sprite;
}

export function createRandomShape(): PIXI.Container {
  const container = new PIXI.Container();
  container.name = `Shape_${shapeCounter++}`;

  const childCount = Math.floor(getRandomNumber(3, 6));

  for (let i = 0; i < childCount; i++) {
    const label = `${container.name}_child_${i + 1}`;
    
    const isSprite = Math.random() > 0.78;
    const child = isSprite ? buildRandomSprite(label) : buildRandomGraphicsNode(label);

    container.addChild(child);
  }

  return container;
}