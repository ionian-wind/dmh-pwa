export type MapPointTuple = [number, number];

/**
 * OpenLayers image extents use a bottom-left origin, while map records store
 * top-left image pixels so coordinates match what users see in the image.
 */
export function imageToMapPoint(
  point: MapPointTuple,
  height: number,
): MapPointTuple {
  return [point[0], height - point[1]];
}

export function mapToImagePoint(
  point: MapPointTuple,
  height: number,
): MapPointTuple {
  return [point[0], height - point[1]];
}

export function mapToImagePoints(
  points: MapPointTuple[],
  height: number,
): MapPointTuple[] {
  return points.map((point) => mapToImagePoint(point, height));
}

export function imageToMapPoints(
  points: MapPointTuple[],
  height: number,
): MapPointTuple[] {
  return points.map((point) => imageToMapPoint(point, height));
}
