import { UI_TEXT } from '../../core/constants';

export interface ControlCallbacks {
  onGenerateShape(): void;
  onExportPDF(): void;
}

export function createControls(callbacks: ControlCallbacks): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'toolbar';

  const generateButton = document.createElement('button');
  generateButton.type = 'button';
  generateButton.textContent = UI_TEXT.generate;
  generateButton.addEventListener('click', callbacks.onGenerateShape);

  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.className = 'primary';
  exportButton.textContent = UI_TEXT.exportPdf;
  exportButton.addEventListener('click', callbacks.onExportPDF);

  wrapper.append(generateButton, exportButton);
  return wrapper;
}
