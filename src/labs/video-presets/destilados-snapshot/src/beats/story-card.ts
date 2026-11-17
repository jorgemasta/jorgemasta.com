// Article-card (`story`) layout: image on the left at its natural aspect, never cropped.
// Antonio, 12 Nov 2026: «mantener la altura pero hacer el tamaño horizontal dinámico para
// mostrar la imagen correctamente siempre.» Keep the card height and size the image width
// from the real aspect (object-fit: contain). If that would squeeze the headline below
// STORY_TEXT_MIN_W, shrink the card/image height (keeping aspect) rather than cropping.
// iw/ih are the file's natural size, filled by enrichVisual (voice.mjs / render.mjs).

export const STORY_CARD_W = 1560;
export const STORY_CARD_H = 560;
// Includes the text block's 56 px horizontal padding. Long words such as «Cram-And-Cancel»
// still fit at the 54 px floor of fitSize.
export const STORY_TEXT_MIN_W = 720;

export type StoryCardLayout = {
  imgW: number;
  imgH: number;
  cardH: number;
  textW: number;
  /** true when iw/ih were missing and a 16:9 fallback was used (contain, still no crop). */
  assumedAspect: boolean;
};

export const storyCardLayout = (iw?: number, ih?: number): StoryCardLayout => {
  const assumedAspect = !(iw && ih && iw > 0 && ih > 0);
  const aspect = assumedAspect ? 16 / 9 : iw / ih;
  let imgH = STORY_CARD_H;
  let imgW = imgH * aspect;
  if (STORY_CARD_W - imgW < STORY_TEXT_MIN_W) {
    imgW = STORY_CARD_W - STORY_TEXT_MIN_W;
    imgH = imgW / aspect;
  }
  const imgWpx = Math.round(imgW);
  const imgHpx = Math.round(imgH);
  return {
    imgW: imgWpx,
    imgH: imgHpx,
    cardH: imgHpx,
    textW: STORY_CARD_W - imgWpx,
    assumedAspect,
  };
};

// A mismatch means the panel is not the image's aspect (cover-fit / a fixed box would crop).
export const storyCardWouldCrop = (
  iw: number,
  ih: number,
  imgW: number,
  imgH: number,
  eps = 0.02,
) => {
  if (!(iw > 0 && ih > 0 && imgW > 0 && imgH > 0)) return true;
  return Math.abs(imgW / imgH - iw / ih) > eps;
};
