import check from '@tabler/icons/outline/check.svg?raw';
import alertTriangle from '@tabler/icons/outline/alert-triangle.svg?raw';
import infoCircle from '@tabler/icons/outline/info-circle.svg?raw';
import alertCircle from '@tabler/icons/outline/alert-circle.svg?raw';
import arrowUp from '@tabler/icons/outline/arrow-up.svg?raw';
import arrowRight from '@tabler/icons/outline/arrow-right.svg?raw';
import arrowDown from '@tabler/icons/outline/arrow-down.svg?raw';
import arrowLeft from '@tabler/icons/outline/arrow-left.svg?raw';
import chevronDown from '@tabler/icons/outline/chevron-down.svg?raw';
import chevronLeft from '@tabler/icons/outline/chevron-left.svg?raw';
import chevronRight from '@tabler/icons/outline/chevron-right.svg?raw';
import chevronUp from '@tabler/icons/outline/chevron-up.svg?raw';
import circle from '@tabler/icons/outline/circle.svg?raw';
import x from '@tabler/icons/outline/x.svg?raw';
import clock from '@tabler/icons/outline/clock.svg?raw';
import calendarCheck from '@tabler/icons/outline/calendar-check.svg?raw';
import colorPicker from '@tabler/icons/outline/color-picker.svg?raw';
import adjustments from '@tabler/icons/outline/adjustments.svg?raw';
import palette from '@tabler/icons/outline/palette.svg?raw';
import refresh from '@tabler/icons/outline/refresh.svg?raw';
import bold from '@tabler/icons/outline/bold.svg?raw';
import italic from '@tabler/icons/outline/italic.svg?raw';
import strikethrough from '@tabler/icons/outline/strikethrough.svg?raw';
import underline from '@tabler/icons/outline/underline.svg?raw';
import list from '@tabler/icons/outline/list.svg?raw';
import listNumbers from '@tabler/icons/outline/list-numbers.svg?raw';
import subscript from '@tabler/icons/outline/subscript.svg?raw';
import superscript from '@tabler/icons/outline/superscript.svg?raw';
import link from '@tabler/icons/outline/link.svg?raw';
import maximize from '@tabler/icons/outline/maximize.svg?raw';
import quote from '@tabler/icons/outline/quote.svg?raw';
import alignLeft from '@tabler/icons/outline/align-left.svg?raw';
import alignCenter from '@tabler/icons/outline/align-center.svg?raw';
import alignRight from '@tabler/icons/outline/align-right.svg?raw';
import alignJustified from '@tabler/icons/outline/align-justified.svg?raw';
import printer from '@tabler/icons/outline/printer.svg?raw';
import indentDecrease from '@tabler/icons/outline/indent-decrease.svg?raw';
import indentIncrease from '@tabler/icons/outline/indent-increase.svg?raw';
import clearFormatting from '@tabler/icons/outline/clear-formatting.svg?raw';
import heading from '@tabler/icons/outline/heading.svg?raw';
import textSize from '@tabler/icons/outline/text-size.svg?raw';
import minus from '@tabler/icons/outline/minus.svg?raw';
import rotateClockwise from '@tabler/icons/outline/rotate-clockwise.svg?raw';
import rotateClockwise2 from '@tabler/icons/outline/rotate-clockwise-2.svg?raw';
import code from '@tabler/icons/outline/code.svg?raw';
import typography from '@tabler/icons/outline/typography.svg?raw';
import star from '@tabler/icons/outline/star.svg?raw';
import pencil from '@tabler/icons/outline/pencil.svg?raw';
import playerPlay from '@tabler/icons/outline/player-play.svg?raw';
import squarePlus from '@tabler/icons/outline/square-plus.svg?raw';
import upload from '@tabler/icons/outline/upload.svg?raw';
import clipboardCheck from '@tabler/icons/outline/clipboard-check.svg?raw';
import arrowBarToLeft from '@tabler/icons/outline/arrow-bar-to-left.svg?raw';
import arrowBarToRight from '@tabler/icons/outline/arrow-bar-to-right.svg?raw';
import plus from '@tabler/icons/outline/plus.svg?raw';

const TABLER_STYLE =
  'fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round';

/**
 * Convert a Tabler SVG into the raw path format QIcon understands:
 * `path@@style&&path@@style|viewBox`.
 */
function svgPath(raw: string): string {
  const viewBox = raw.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 24 24';
  const paths = [...raw.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path !== 'M0 0h24v24H0z');
  return `${paths.map((path) => `${path}@@${TABLER_STYLE}`).join('&&')}|${viewBox}`;
}

const icons: Record<string, string> = {
  check: svgPath(check),
  'alert-triangle': svgPath(alertTriangle),
  'info-circle': svgPath(infoCircle),
  'alert-circle': svgPath(alertCircle),
  'arrow-up': svgPath(arrowUp),
  'arrow-right': svgPath(arrowRight),
  'arrow-down': svgPath(arrowDown),
  'arrow-left': svgPath(arrowLeft),
  'chevron-down': svgPath(chevronDown),
  'chevron-left': svgPath(chevronLeft),
  'chevron-right': svgPath(chevronRight),
  'chevron-up': svgPath(chevronUp),
  circle: svgPath(circle),
  x: svgPath(x),
  clock: svgPath(clock),
  'calendar-check': svgPath(calendarCheck),
  'color-picker': svgPath(colorPicker),
  adjustments: svgPath(adjustments),
  palette: svgPath(palette),
  refresh: svgPath(refresh),
  bold: svgPath(bold),
  italic: svgPath(italic),
  strikethrough: svgPath(strikethrough),
  underline: svgPath(underline),
  list: svgPath(list),
  'list-numbers': svgPath(listNumbers),
  subscript: svgPath(subscript),
  superscript: svgPath(superscript),
  link: svgPath(link),
  maximize: svgPath(maximize),
  quote: svgPath(quote),
  'align-left': svgPath(alignLeft),
  'align-center': svgPath(alignCenter),
  'align-right': svgPath(alignRight),
  'align-justified': svgPath(alignJustified),
  printer: svgPath(printer),
  'indent-decrease': svgPath(indentDecrease),
  'indent-increase': svgPath(indentIncrease),
  'clear-formatting': svgPath(clearFormatting),
  heading: svgPath(heading),
  'text-size': svgPath(textSize),
  minus: svgPath(minus),
  'rotate-clockwise': svgPath(rotateClockwise),
  'rotate-clockwise-2': svgPath(rotateClockwise2),
  code: svgPath(code),
  typography: svgPath(typography),
  star: svgPath(star),
  pencil: svgPath(pencil),
  'player-play': svgPath(playerPlay),
  'square-plus': svgPath(squarePlus),
  upload: svgPath(upload),
  'clipboard-check': svgPath(clipboardCheck),
  'arrow-bar-to-left': svgPath(arrowBarToLeft),
  'arrow-bar-to-right': svgPath(arrowBarToRight),
  plus: svgPath(plus),
};

const quasarTablerIconSet = {
  name: 'tabler',
  type: {
    positive: icons.check,
    negative: icons['alert-triangle'],
    info: icons['info-circle'],
    warning: icons['alert-circle'],
  },
  arrow: {
    up: icons['arrow-up'],
    right: icons['arrow-right'],
    down: icons['arrow-down'],
    left: icons['arrow-left'],
    dropdown: icons['chevron-down'],
  },
  chevron: {
    left: icons['chevron-left'],
    right: icons['chevron-right'],
  },
  colorPicker: {
    spectrum: icons['color-picker'],
    tune: icons.adjustments,
    palette: icons.palette,
  },
  pullToRefresh: {
    icon: icons.refresh,
  },
  carousel: {
    left: icons['chevron-left'],
    right: icons['chevron-right'],
    up: icons['chevron-up'],
    down: icons['chevron-down'],
    navigationIcon: icons.circle,
  },
  chip: {
    remove: icons.x,
    selected: icons.check,
  },
  datetime: {
    arrowLeft: icons['chevron-left'],
    arrowRight: icons['chevron-right'],
    now: icons.clock,
    today: icons['calendar-check'],
  },
  editor: {
    bold: icons.bold,
    italic: icons.italic,
    strikethrough: icons.strikethrough,
    underline: icons.underline,
    unorderedList: icons.list,
    orderedList: icons['list-numbers'],
    subscript: icons.subscript,
    superscript: icons.superscript,
    hyperlink: icons.link,
    toggleFullscreen: icons.maximize,
    quote: icons.quote,
    left: icons['align-left'],
    center: icons['align-center'],
    right: icons['align-right'],
    justify: icons['align-justified'],
    print: icons.printer,
    outdent: icons['indent-decrease'],
    indent: icons['indent-increase'],
    removeFormat: icons['clear-formatting'],
    formatting: icons.heading,
    fontSize: icons['text-size'],
    align: icons['align-left'],
    hr: icons.minus,
    undo: icons['rotate-clockwise'],
    redo: icons['rotate-clockwise-2'],
    heading: icons.heading,
    code: icons.code,
    size: icons['text-size'],
    font: icons.typography,
    viewSource: icons.code,
  },
  expansionItem: {
    icon: icons['chevron-down'],
    denseIcon: icons['chevron-down'],
  },
  fab: {
    icon: icons.plus,
    activeIcon: icons.x,
  },
  field: {
    clear: icons['alert-circle'],
    error: icons['alert-circle'],
  },
  pagination: {
    first: icons['arrow-bar-to-left'],
    prev: icons['chevron-left'],
    next: icons['chevron-right'],
    last: icons['arrow-bar-to-right'],
  },
  rating: {
    icon: icons.star,
  },
  stepper: {
    done: icons.check,
    active: icons.pencil,
    error: icons['alert-triangle'],
  },
  tabs: {
    left: icons['chevron-left'],
    right: icons['chevron-right'],
    up: icons['chevron-up'],
    down: icons['chevron-down'],
  },
  table: {
    arrowUp: icons['arrow-up'],
    warning: icons['alert-triangle'],
    firstPage: icons['arrow-bar-to-left'],
    prevPage: icons['chevron-left'],
    nextPage: icons['chevron-right'],
    lastPage: icons['arrow-bar-to-right'],
  },
  tree: {
    icon: icons['player-play'],
  },
  uploader: {
    done: icons.check,
    clear: icons.x,
    add: icons['square-plus'],
    upload: icons.upload,
    removeQueue: icons.list,
    removeUploaded: icons['clipboard-check'],
  },
};

export function tablerIconMapFn(name: string) {
  if (!name.startsWith('tabler-')) return undefined;
  const icon = icons[name.slice('tabler-'.length)];
  return icon ? { icon } : undefined;
}

export default quasarTablerIconSet;
