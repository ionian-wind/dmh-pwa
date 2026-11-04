import type OlMap from 'ol/Map';
import Control from 'ol/control/Control';
import type { MapAreaShape } from '../types';
import {
  dispatchMapAction,
  type MapAction,
  type MapActionDetail,
} from './mapActionEvents';
import './mapPlugins.css';

export interface MapActionsControlLabels {
  title: string;
  addMarker: string;
  drawArea: string;
  shapes: Record<MapAreaShape, string>;
  cancelDrawing: string;
}

const SHAPES: MapAreaShape[] = ['polygon', 'circle', 'square', 'freehand'];

const PENCIL_ICON = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M4 20h4L18.5 9.5a2.828 2.828 0 1 0-4-4L4 16v4" />
    <path d="M13.5 6.5l4 4" />
  </svg>
`;

export class MapActionsControl extends Control {
  private readonly triggerButton: HTMLButtonElement;
  private readonly menuElement: HTMLDivElement;
  private addMarkerLabel!: HTMLSpanElement;
  private drawAreaLabel!: HTMLSpanElement;
  private cancelDrawingLabel!: HTMLSpanElement;
  private cancelButton!: HTMLButtonElement;
  private readonly shapeLabels = new Map<MapAreaShape, HTMLSpanElement>();
  private menuOpen = false;

  constructor(labels: MapActionsControlLabels) {
    const element = document.createElement('div');
    element.className = 'ol-map-actions ol-unselectable ol-control';

    const triggerButton = document.createElement('button');
    triggerButton.type = 'button';
    triggerButton.className = 'ol-map-actions-trigger';
    triggerButton.innerHTML = PENCIL_ICON;
    element.append(triggerButton);

    const menuElement = document.createElement('div');
    menuElement.className = 'ol-map-actions-menu';
    menuElement.hidden = true;
    element.append(menuElement);

    super({ element });

    this.triggerButton = triggerButton;
    this.menuElement = menuElement;

    this.buildMenu();
    this.setLabels(labels);
    this.setDrawingActive(false);
    triggerButton.addEventListener('click', this.onTriggerClick);
    menuElement.addEventListener('click', this.onMenuClick);
  }

  override setMap(map: OlMap | null): void {
    if (!map) this.closeMenu();
    super.setMap(map);
  }

  getElement(): HTMLElement {
    return this.element!;
  }

  setLabels(labels: MapActionsControlLabels): void {
    this.triggerButton.title = labels.title;
    this.triggerButton.setAttribute('aria-label', labels.title);
    this.addMarkerLabel.textContent = labels.addMarker;
    this.drawAreaLabel.textContent = labels.drawArea;
    this.cancelDrawingLabel.textContent = labels.cancelDrawing;
    for (const shape of SHAPES) {
      const label = this.shapeLabels.get(shape);
      if (label) label.textContent = labels.shapes[shape];
    }
  }

  setDrawingActive(active: boolean): void {
    this.cancelButton.hidden = !active;
    this.cancelButton.previousElementSibling?.toggleAttribute(
      'hidden',
      !active,
    );
  }

  closeMenu(): void {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.menuElement.hidden = true;
    this.triggerButton.classList.remove('is-active');
    document.removeEventListener(
      'pointerdown',
      this.onDocumentPointerDown,
      true,
    );
  }

  setVisible(visible: boolean): void {
    this.element!.style.display = visible ? '' : 'none';
    if (!visible) this.closeMenu();
  }

  private buildMenu(): void {
    const addMarkerButton = this.createItem('add-marker');
    this.addMarkerLabel = document.createElement('span');
    addMarkerButton.append(this.addMarkerLabel);
    this.menuElement.append(addMarkerButton);

    this.menuElement.append(this.createDivider());

    this.drawAreaLabel = document.createElement('span');
    this.drawAreaLabel.className = 'ol-map-actions-label';
    this.menuElement.append(this.drawAreaLabel);

    for (const shape of SHAPES) {
      const button = this.createItem('draw-area', shape);
      const label = document.createElement('span');
      this.shapeLabels.set(shape, label);
      button.append(label);
      this.menuElement.append(button);
    }

    this.menuElement.append(this.createDivider());

    const cancelButton = this.createItem('cancel-drawing');
    cancelButton.classList.add('ol-map-actions-item-danger');
    this.cancelDrawingLabel = document.createElement('span');
    cancelButton.append(this.cancelDrawingLabel);
    this.cancelButton = cancelButton;
    this.menuElement.append(cancelButton);
  }

  private createItem(
    action: MapAction,
    shape?: MapAreaShape,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ol-map-actions-item';
    button.dataset.action = action;
    if (shape) button.dataset.shape = shape;
    return button;
  }

  private createDivider(): HTMLDivElement {
    const divider = document.createElement('div');
    divider.className = 'ol-map-actions-divider';
    return divider;
  }

  private openMenu(): void {
    this.menuOpen = true;
    this.menuElement.hidden = false;
    this.triggerButton.classList.add('is-active');
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
  }

  private emitAction(detail: MapActionDetail): void {
    const map = this.getMap();
    this.closeMenu();
    if (map) dispatchMapAction(map, detail);
  }

  private readonly onTriggerClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (this.menuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  };

  private readonly onMenuClick = (event: MouseEvent): void => {
    const target = (
      event.target as HTMLElement | null
    )?.closest<HTMLButtonElement>('[data-action]');
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    this.emitAction({
      action: target.dataset.action as MapAction,
      shape: target.dataset.shape as MapAreaShape | undefined,
    });
  };

  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    if (!this.menuOpen) return;
    const target = event.target as Node | null;
    if (target && !this.element?.contains(target)) this.closeMenu();
  };
}
