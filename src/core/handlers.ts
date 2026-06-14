import { SliderAnimation } from '../animation/slider-animation';
import { PDFExporter } from '../pdf/pdf-exporter';
import { convertPixiContainerToSkia } from './pixi-to-skia';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants';

type StatusUpdater = (message: string) => void;
type SliderView = { element: HTMLElement; setState: (idx: number, total: number) => void };

export function createStatusUpdater(statusEl: HTMLDivElement): StatusUpdater {
  return (message: string) => { statusEl.textContent = message; };
}

export async function handleExportPDF(
  slider: SliderAnimation,
  pdfExporter: PDFExporter,
  updateStatus: StatusUpdater
): Promise<void> {
  const currentShape = slider.getCurrentShape();
  if (!currentShape) return;

  updateStatus('Генерация PDF...');
  try {
    const { tree } = convertPixiContainerToSkia(currentShape);
    const bytes = await pdfExporter.export(tree, CANVAS_WIDTH, CANVAS_HEIGHT);
    const filename = `scene-${slider.getCurrentIndex() + 1}.pdf`;
    pdfExporter.downloadPDF(bytes, filename);
    updateStatus('PDF успешно сохранен.');
  } catch (error) {
    console.error('PDF Export failed:', error);
    updateStatus(error instanceof Error ? error.message : 'Ошибка экспорта PDF.');
  }
}

export function bindSliderEvents(
  slider: SliderAnimation,
  sliderView: SliderView,
  updateStatus: StatusUpdater
): void {
  slider.onChange = (currentIndex, total) => {
    sliderView.setState(currentIndex, total);
    updateStatus(`Сцена: ${currentIndex + 1} из ${total}`);
  };
}
