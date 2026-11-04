import { describe, expect, it } from 'vitest';
import {
  createMapMarkerDataUri,
  createMapMarkerSvg,
} from '@/maps/mapMarkerSvg';

describe('map marker SVG generator', () => {
  it('renders an RPG Awesome icon inside a colored pin', () => {
    const svg = createMapMarkerSvg('ra-castle-emblem', {
      height: 48,
      fill: '#112233',
      iconColor: '#ffcc00',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('fill="#112233"');
    expect(svg).toContain('fill="#ffcc00"');
    expect(svg.match(/<path/g)).toHaveLength(2);
    expect(svg).toContain('width="35"');
    expect(svg).toContain('height="48"');
  });

  it('renders a Font Awesome core icon', () => {
    const svg = createMapMarkerSvg('fa-solid:cloud-rain', {
      fill: '#ffffff',
      iconColor: '#336699',
    });

    expect(svg).toContain('fill="#336699"');
    expect(svg.match(/<path/g)).toHaveLength(2);
  });

  it('renders a plain pin for an unknown or empty icon', () => {
    expect(
      createMapMarkerSvg('ra-not-a-real-icon').match(/<path/g),
    ).toHaveLength(1);
    expect(createMapMarkerSvg(null).match(/<path/g)).toHaveLength(1);
  });

  it('builds an encoded data URI', () => {
    const uri = createMapMarkerDataUri('ra-axe', { fill: '#000000' });

    expect(uri.startsWith('data:image/svg+xml,')).toBe(true);
    expect(decodeURIComponent(uri.split(',')[1])).toContain('<svg');
  });
});
