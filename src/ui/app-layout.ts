import { applyCanvasBufferSize } from '../core/canvas-display';

export interface AppDOMRefs {
  controlsSlot: HTMLDivElement;
  sliderSlot: HTMLDivElement;
  pixiCanvas: HTMLCanvasElement;
  skiaCanvas: HTMLCanvasElement;
  statusEl: HTMLDivElement;
}

function createEl<T extends keyof HTMLElementTagNameMap>(
  tag: T, className?: string, text?: string, ...children: HTMLElement[]
): HTMLElementTagNameMap[T] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  if (children.length) el.append(...children);
  return el;
}

function createViewport(title: string): HTMLElement {
  const canvas = document.createElement('canvas');
  applyCanvasBufferSize(canvas);
  return createEl('section', 'viewport', undefined,
    createEl('div', 'viewport-header', title),
    createEl('div', 'canvas-frame', undefined, canvas)
  );
}

export function initAppLayout(): AppDOMRefs {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) throw new Error('Root element #app not found');

  const statusEl = createEl('div', 'status', 'Инициализация системы...');

  const appShell = createEl('main', 'app-shell', undefined,
    createEl('div', 'topbar', undefined,
      createEl('h1', 'title', 'Pixi.js + Skia Renderer'),
      createEl('div', 'toolbar controls-slot')
    ),
    createEl('div', 'workspace', undefined,
      createViewport('Pixi.js Canvas'),
      createViewport('Skia CanvasKit')
    ),
    createEl('div', 'topbar footer', undefined,
      createEl('div', 'slider-slot'),
      statusEl
    )
  );

  root.innerHTML = '';
  root.append(appShell);

  return {
    controlsSlot: appShell.querySelector('.controls-slot') as HTMLDivElement,
    sliderSlot: appShell.querySelector('.slider-slot') as HTMLDivElement,
    pixiCanvas: appShell.querySelectorAll('canvas')[0] as HTMLCanvasElement,
    skiaCanvas: appShell.querySelectorAll('canvas')[1] as HTMLCanvasElement,
    statusEl,
  };
}
