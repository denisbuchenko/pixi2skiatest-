import { UI_TEXT } from '../../core/constants';

export interface SliderCallbacks {
  onNext(): void;
  onPrev(): void;
}

export interface SliderView {
  element: HTMLElement;
  setState(currentIndex: number, total: number): void;
}

export function createSlider(callbacks: SliderCallbacks): SliderView {
  const wrapper = document.createElement('div');
  wrapper.className = 'slider-controls';

  const prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.textContent = UI_TEXT.prev;
  prevButton.addEventListener('click', callbacks.onPrev);

  const counter = document.createElement('output');
  counter.className = 'counter';
  counter.value = '1 / 1';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.textContent = UI_TEXT.next;
  nextButton.addEventListener('click', callbacks.onNext);

  wrapper.append(prevButton, counter, nextButton);

  return {
    element: wrapper,
    setState(currentIndex: number, total: number): void {
      counter.value = `${currentIndex + 1} / ${total}`;
      prevButton.disabled = total <= 1;
      nextButton.disabled = total <= 1;
    },
  };
}
