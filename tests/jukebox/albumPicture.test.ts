import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AlbumPicture from '@/jukebox/components/AlbumPicture.vue';

describe('AlbumPicture', () => {
  it('renders artwork from a track picture and custom size', () => {
    const wrapper = mount(AlbumPicture, {
      props: {
        track: {
          id: 't1',
          title: 'Track',
          picture: 'data:image/png;base64,abc',
        } as any,
        artworkSize: '120px',
      },
    });

    expect(wrapper.find('.track-artwork-container').attributes('size')).toBe(
      '120px',
    );
    expect(wrapper.find('.track-artwork').exists()).toBe(true);
    expect(wrapper.find('.track-artwork-placeholder').exists()).toBe(false);
    wrapper.unmount();
  });

  it('renders a music placeholder without a picture', () => {
    const wrapper = mount(AlbumPicture, {
      props: { track: { id: 't2', title: 'Track' } as any },
    });

    expect(wrapper.find('.track-artwork-container').attributes('size')).toBe(
      '200px',
    );
    expect(wrapper.find('.track-artwork-placeholder').exists()).toBe(true);
    wrapper.unmount();
  });
});
