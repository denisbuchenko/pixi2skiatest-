import {
  PDFDocument,
  PDFPage,
  concatTransformationMatrix,
  drawObject,
  fill,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setFillingColor,
  setGraphicsState,
  setLineWidth,
  setStrokingColor,
  stroke,
  PDFName,
} from 'pdf-lib';
import type {
  SkiaColor,
  SkiaGraphicsNode,
  SkiaMatrix,
  SkiaPathData,
  SkiaSceneNode,
  SkiaSpriteNode,
} from '../types/skia-types';
import { buildPathOperators } from './pdf-path-builder';
import { getOrEmbedImage, type PdfImageCache } from './pdf-image-manager';

function toPdfMatrix(transform: SkiaMatrix): [number, number, number, number, number, number] {
  return [transform.a, transform.b, transform.c, transform.d, transform.tx, transform.ty];
}

function getPdfColor(color: SkiaColor, alpha: number) {
  return {
    color: rgb(color.r, color.g, color.b),
    opacity: color.a * alpha,
  };
}

function createExtGState(page: PDFPage, fillOpacity: number, strokeOpacity: number): PDFName {
  const extGState = page.doc.context.obj({
    Type: 'ExtGState',
    ca: fillOpacity,
    CA: strokeOpacity,
  });
  return page.node.newExtGState('GS', extGState);
}

function renderPath(page: PDFPage, pathData: SkiaPathData, alpha: number): void {
  if (pathData.commands.length === 0) return;

  const pathOperators = buildPathOperators(pathData.commands);

  if (pathData.fillColor) {
    const style = getPdfColor(pathData.fillColor, alpha);
    const operators = [pushGraphicsState()];

    if (style.opacity < 1) {
      operators.push(setGraphicsState(createExtGState(page, style.opacity, 1)));
    }

    operators.push(
      setFillingColor(style.color),
      ...pathOperators,
      fill(),
      popGraphicsState()
    );

    page.pushOperators(...operators);
  }

  if (pathData.strokeColor && pathData.strokeWidth && pathData.strokeWidth > 0) {
    const style = getPdfColor(pathData.strokeColor, alpha);
    const operators = [pushGraphicsState()];

    if (style.opacity < 1) {
      operators.push(setGraphicsState(createExtGState(page, 1, style.opacity)));
    }

    operators.push(
      setStrokingColor(style.color),
      setLineWidth(pathData.strokeWidth),
      ...pathOperators,
      stroke(),
      popGraphicsState()
    );

    page.pushOperators(...operators);
  }
}

function renderGraphics(page: PDFPage, node: SkiaGraphicsNode, alpha: number): void {
  for (const path of node.paths) {
    renderPath(page, path, alpha);
  }
}

async function renderSprite(
  page: PDFPage,
  document: PDFDocument,
  node: SkiaSpriteNode,
  imageCache: PdfImageCache,
  alpha: number
): Promise<void> {
  if (!node.imageSource) return;

  const image = await getOrEmbedImage(document, node.imageSource, imageCache);
  if (!image) return;

  const { frameWidth, frameHeight, anchorX, anchorY } = node;
  const xObjectKey = page.node.newXObject('Image', image.ref);
  const operators = [pushGraphicsState()];

  if (alpha < 1) {
    operators.push(setGraphicsState(createExtGState(page, alpha, alpha)));
  }

  operators.push(
    concatTransformationMatrix(
      frameWidth,
      0,
      0,
      -frameHeight,
      -anchorX * frameWidth,
      (1 - anchorY) * frameHeight
    ),
    drawObject(xObjectKey),
    popGraphicsState()
  );

  page.pushOperators(...operators);
}

async function renderNode(
  page: PDFPage,
  document: PDFDocument,
  node: SkiaSceneNode,
  imageCache: PdfImageCache,
  inheritedAlpha = 1
): Promise<void> {
  if (!node.visible || node.alpha <= 0) return;

  const currentAlpha = inheritedAlpha * node.alpha;

  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(...toPdfMatrix(node.transform))
  );

  try {
    if (node.type === 'graphics') {
      renderGraphics(page, node, currentAlpha);
    } else if (node.type === 'sprite') {
      await renderSprite(page, document, node, imageCache, currentAlpha);
    }

    for (const child of node.children ?? []) {
      await renderNode(page, document, child as SkiaSceneNode, imageCache, currentAlpha);
    }
  } finally {
    page.pushOperators(popGraphicsState());
  }
}

export async function renderSkiaTreeToPdfPage(
  page: PDFPage,
  document: PDFDocument,
  tree: SkiaSceneNode,
  pageHeight: number
): Promise<void> {
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(1, 0, 0, -1, 0, pageHeight)
  );

  try {
    await renderNode(page, document, tree, new Map());
  } finally {
    page.pushOperators(popGraphicsState());
  }
}