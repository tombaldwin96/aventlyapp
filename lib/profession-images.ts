/**
 * Profession/category images for home sections. Same names as website (assets/images/).
 * Use Image source={PROFESSION_IMAGES[slug] ?? PROFESSION_IMAGES.dj} for cards.
 */
import type { ImageSourcePropType } from 'react-native';

export const PROFESSION_IMAGES: Record<string, ImageSourcePropType> = {
  dj: require('@/assets/images/dj.png'),
  singer: require('@/assets/images/singer.png'),
  band: require('@/assets/images/band.png'),
  magician: require('@/assets/images/magician.png'),
  'childrens-entertainer': require('@/assets/images/entertainer.png'),
  entertainer: require('@/assets/images/entertainer.png'),
  instrumentalist: require('@/assets/images/instrumentalist.png'),
  comedian: require('@/assets/images/comedian.jpeg'),
  'event-host-presenter': require('@/assets/images/host.jpg'),
  saxophonist: require('@/assets/images/instrumentalist.png'),
};

const DEFAULT = require('@/assets/images/dj.png');

export function getProfessionImage(slug: string): ImageSourcePropType {
  return PROFESSION_IMAGES[slug] ?? DEFAULT;
}
