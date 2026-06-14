import './ui/styles.css';
import { INITIAL_SHAPES_COUNT, SPRITE_IMAGE_URL } from './core/constants';
import { preloadImage } from './core/image-source';
import { initAppLayout } from './ui/app-layout';
import { SliderAnimation } from './animation/slider-animation';
import { createRandomShape } from './pixi/shape-factory';
import { PixiRenderer } from './pixi/pixi-renderer';
import { initCanvasKit } from './skia/canvaskit-init';
import { SkiaRenderer } from './skia/skia-renderer';
import { PDFExporter } from './pdf/pdf-exporter';
import { createControls } from './ui/components/controls';
import { createSlider } from './ui/components/slider';
import { createStatusUpdater, handleExportPDF, bindSliderEvents } from './core/handlers';

async function main(): Promise<void> {
  const dom = initAppLayout();
  const updateStatus = createStatusUpdater(dom.statusEl);

  const canvasKit = await initCanvasKit();
  await preloadImage(SPRITE_IMAGE_URL);
  updateStatus('Система готова.');

  const pixiRenderer = new PixiRenderer(dom.pixiCanvas);
  const skiaRenderer = new SkiaRenderer(dom.skiaCanvas, canvasKit);

  const pdfExporter = new PDFExporter(canvasKit);
  const slider = new SliderAnimation(pixiRenderer, skiaRenderer);

  const sliderView = createSlider({
    onNext: () => slider.next(),
    onPrev: () => slider.prev(),
  });

  const controls = createControls({
    onGenerateShape: () => {
      slider.addShape(createRandomShape());
      updateStatus('Добавлена новая фигура.');
    },
    onExportPDF: () => handleExportPDF(slider, pdfExporter, updateStatus),
  });

  dom.controlsSlot.append(controls);
  dom.sliderSlot.append(sliderView.element);
  bindSliderEvents(slider, sliderView, updateStatus);

  slider.setShapes(
    Array.from({ length: INITIAL_SHAPES_COUNT }, () => createRandomShape())
  );
}

main().catch((error) => {
  console.error('Critical App Error:', error);
  const root = document.querySelector<HTMLDivElement>('#app');
  if (root) {
    root.innerHTML = `<div class="error-state"><h2>Ошибка запуска</h2><p>${error instanceof Error ? error.message : 'Неизвестная ошибка'}</p></div>`;
  }
});

export {};