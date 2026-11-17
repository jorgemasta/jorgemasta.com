// Which vendored file plays a media path the composition references.
//
// The edition's data names images as the pipeline saved them (`real/x.png`).
// Photos are vendored as lighter WebP copies under the same base name, so the
// published data stays untouched (see media/README.md).

const RASTER = /\.(png|jpe?g)$/i;

/** The built URL of `path` (relative to the media folder), or undefined when it is not vendored. */
export const resolveMedia = (path: string, media: ReadonlyMap<string, string>): string | undefined => {
  const clean = path.replace(/^\/+/, "");
  return media.get(clean) ?? (RASTER.test(clean) ? media.get(clean.replace(RASTER, ".webp")) : undefined);
};
