import { watch, type Ref } from 'vue';

const RU: Record<string, string> = {
  'Select — V': 'Выбрать — V',
  'Hand — H': 'Рука — H',
  'Draw — D': 'Рисовать — D',
  'Highlight — I': 'Маркер — I',
  'Eraser — E': 'Ластик — E',
  'Laser — K': 'Лазер — K',
  'Line — L': 'Линия — L',
  'Arrow — A': 'Стрелка — A',
  'Shape — G': 'Фигура — G',
  'Text — T': 'Текст — T',
  'Sticky note — N': 'Стикер — N',
  'Insert image': 'Вставить изображение',
  'Undo — ⌘Z': 'Отменить — ⌘Z',
  'Redo — ⇧⌘Z': 'Повторить — ⇧⌘Z',
  'Board menu': 'Меню доски',
  'More tools': 'Ещё инструменты',
  Tools: 'Инструменты',
  'Duplicate — ⌘D': 'Дублировать — ⌘D',
  'Delete — ⌫': 'Удалить — ⌫',
  'Color & style': 'Цвет и стиль',
  'No grid': 'Без сетки',
  'Grid lines': 'Линии сетки',
  'Ruled paper': 'Линейка',
  'Grid dots': 'Точки',
  Crosses: 'Крестики',
  Isometric: 'Изометрия',
  None: 'Нет',
  Lines: 'Линии',
  Ruled: 'Линейка',
  Dots: 'Точки',
  'Export as PNG': 'Экспорт PNG',
  'Export — transparent': 'Экспорт — прозрачный',
  'Export selection': 'Экспорт выделения',
  'Copy selection as image': 'Копировать выделение как изображение',
  'Copy as image': 'Копировать как изображение',
  'Delete selection': 'Удалить выделение',
  'Zoom to fit': 'Вписать в экран',
  'Clear board': 'Очистить доску',
  Grid: 'Сетка',
  Theme: 'Тема',
  'Light theme': 'Светлая тема',
  'Dark theme': 'Тёмная тема',
  'Keyboard shortcuts': 'Горячие клавиши',
  Close: 'Закрыть',
  Edit: 'Правка',
  Arrange: 'Упорядочить',
  View: 'Вид',
  Board: 'Доска',
  Help: 'Помощь',
  Select: 'Выбрать',
  'Hand (hold Space)': 'Рука (удерживайте пробел)',
  Draw: 'Рисовать',
  Highlight: 'Маркер',
  Eraser: 'Ластик',
  Laser: 'Лазер',
  Arrow: 'Стрелка',
  Line: 'Линия',
  Shape: 'Фигура',
  Rectangle: 'Прямоугольник',
  Ellipse: 'Эллипс',
  Text: 'Текст',
  'Sticky note': 'Стикер',
  Undo: 'Отменить',
  Redo: 'Повторить',
  'Select all': 'Выбрать всё',
  Copy: 'Копировать',
  Cut: 'Вырезать',
  Paste: 'Вставить',
  Duplicate: 'Дублировать',
  'Bring to front': 'На передний план',
  'Send to back': 'На задний план',
  Nudge: 'Сдвиг',
  'Reset zoom': 'Сбросить масштаб',
  'Zoom in / out': 'Масштаб + / −',
  'Edit / finish text': 'Изменить / завершить текст',
  'Cancel / deselect': 'Отмена / снять выделение',
  'hand-drawn': 'от руки',
  black: 'чёрный',
  grey: 'серый',
  'light-violet': 'светло-фиолетовый',
  violet: 'фиолетовый',
  blue: 'синий',
  'light-blue': 'голубой',
  yellow: 'жёлтый',
  orange: 'оранжевый',
  green: 'зелёный',
  'light-green': 'светло-зелёный',
  'light-red': 'светло-красный',
  red: 'красный',
  solid: 'сплошной',
  dashed: 'пунктир',
  dotted: 'точечный',
  semi: 'полупрозрачный',
  pattern: 'узор',
};

const EN = Object.fromEntries(
  Object.entries(RU).map(([english, russian]) => [russian, english]),
);

function translateValue(value: string, locale: string): string {
  if (!value) return value;

  if (locale === 'ru') {
    if (RU[value]) return RU[value];
    const size = value.match(/^Size ([A-Z]+)$/);
    if (size) return `Размер ${size[1]}`;
    if (value.startsWith('fill: ')) {
      return `заливка: ${translateValue(value.slice(6), locale)}`;
    }
    return value;
  }

  if (EN[value]) return EN[value];
  const size = value.match(/^Размер ([A-Z]+)$/);
  if (size) return `Size ${size[1]}`;
  if (value.startsWith('заливка: ')) {
    return `fill: ${translateValue(value.slice(9), locale)}`;
  }
  return value;
}

function translateTree(root: HTMLElement, locale: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.nodeValue?.trim();
    if (text) {
      const translated = translateValue(text, locale);
      if (translated !== text) node.nodeValue = translated;
    }
    node = walker.nextNode();
  }

  root.querySelectorAll<HTMLElement>('[title], [aria-label]').forEach((el) => {
    for (const attribute of ['title', 'aria-label'] as const) {
      const value = el.getAttribute(attribute);
      if (!value) continue;
      const translated = translateValue(value, locale);
      if (translated !== value) el.setAttribute(attribute, translated);
    }
  });
}

/** Keep Quickdraw's DOM chrome in sync with the app locale. */
export function localizeQuickdraw(root: HTMLElement, locale: Ref<string>) {
  let active = true;
  const apply = () => {
    if (active) translateTree(root, locale.value);
  };

  const observer = new MutationObserver(apply);
  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['title', 'aria-label'],
  });
  const stopWatch = watch(locale, apply);
  apply();

  return () => {
    active = false;
    observer.disconnect();
    stopWatch();
  };
}
