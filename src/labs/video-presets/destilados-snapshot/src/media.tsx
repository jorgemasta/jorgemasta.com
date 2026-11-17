// LAB FILE (not in the pipeline): resolves the snapshot's media through the Lab's
// media folder and renders explicit placeholders for files that are not there yet.
//
// Drop-in replacements for Remotion's `staticFile`, `Img`, `OffthreadVideo` and
// `Audio`. Remotion's `<Img>` throws when a file fails to load, which would crash
// the whole composition, so nothing is ever pointed at a missing file: a file
// exists only if it is in `src/labs/video-presets/media/` at build time.
import React from "react";
import {
  Audio as RemotionAudio,
  Img as RemotionImg,
  OffthreadVideo as RemotionVideo,
} from "remotion";
import { resolveMedia } from "../../media-path";

const PREFIX = "../../media/";
const files = import.meta.glob<string>("../../media/**/*.{png,jpg,jpeg,webp,gif,svg,mp4,webm,mp3,m4a,wav}", {
  query: "?url",
  import: "default",
  eager: true,
});

/** Paths (relative to the media folder) that are available, mapped to their built URL. */
export const MEDIA: ReadonlyMap<string, string> = new Map(
  Object.entries(files).map(([k, url]) => [k.slice(PREFIX.length), url]),
);

const PENDING = "pending:";

/** Like Remotion's `staticFile`: the built URL, or a `pending:<path>` marker when missing. */
export const staticFile = (path: string): string =>
  resolveMedia(path, MEDIA) ?? `${PENDING}${path.replace(/^\/+/, "")}`;

export const isPending = (src: string | undefined) => !src || src.startsWith(PENDING);

const Placeholder: React.FC<{ src: string | undefined; kind: string; style?: React.CSSProperties }> = ({ src, kind, style }) => {
  const name = (src ?? "").replace(PENDING, "").split("/").pop() || "unknown";
  return (
    <div
      data-pending-media={name}
      style={{
        ...style,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        boxSizing: "border-box",
        overflow: "hidden",
        background: "repeating-linear-gradient(135deg, #1b1924 0 24px, #14121b 24px 48px)",
        outline: "3px dashed #8d89a0",
        outlineOffset: -12,
        color: "#d2cfdc",
        fontFamily: "'JetBrains Mono', monospace",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#ffb547" }}>{kind} pending</div>
      <div style={{ fontSize: 26, wordBreak: "break-all" }}>{name}</div>
    </div>
  );
};

/**
 * The visitor's look for the beat being rendered, as a CSS `filter` (empty = as
 * generated). Report provides it per beat; every image and clip below reads it.
 */
export const BeatFilterContext = React.createContext("");

/** Adds the beat's look after the element's own filter (blurred backdrops keep their blur). */
const useGraded = (style: React.CSSProperties | undefined): React.CSSProperties | undefined => {
  const look = React.useContext(BeatFilterContext);
  if (!look) return style;
  return { ...style, filter: style?.filter ? `${style.filter} ${look}` : look };
};

type ImgProps = React.ComponentProps<typeof RemotionImg>;
export const Img: React.FC<ImgProps> = (props) => {
  const style = useGraded(props.style);
  return isPending(props.src) ? <Placeholder src={props.src} kind="image" style={style} /> : <RemotionImg {...props} style={style} />;
};

type VideoProps = React.ComponentProps<typeof RemotionVideo>;
export const OffthreadVideo: React.FC<VideoProps> = (props) => {
  const style = useGraded(props.style);
  return isPending(props.src) ? <Placeholder src={props.src} kind="clip" style={style} /> : <RemotionVideo {...props} style={style} />;
};

type AudioProps = React.ComponentProps<typeof RemotionAudio>;
/** Missing audio is simply left out: the composition plays silently on its timing. */
export const Audio: React.FC<AudioProps> = (props) => (isPending(props.src) ? null : <RemotionAudio {...props} />);
