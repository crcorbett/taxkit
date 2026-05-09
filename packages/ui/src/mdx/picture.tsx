/*
 * <Picture> — minimal MDX image wrapper. Stub created so post pages compile
 * while the full implementation (responsive srcset, captions) lands later.
 */
type PictureProps = {
  src: string;
  alt: string;
  caption?: string;
};

export function Picture({ src, alt, caption }: PictureProps) {
  return (
    <figure>
      <img src={src} alt={alt} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
