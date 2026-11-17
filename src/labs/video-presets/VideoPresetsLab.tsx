// The Lab's island. Server-rendered as the static poster; once hydrated (when it
// scrolls into view, `client:visible`) it loads the editor and React/Remotion.
// Nothing from Remotion is imported at module scope, so the SSR pass stays plain HTML.
import React, { useEffect, useState } from "react";
import "./lab-frame.css";

export type VideoPresetsLabProps = { poster?: { src: string; alt: string } };

export default function VideoPresetsLab({ poster }: VideoPresetsLabProps) {
  const [Editor, setEditor] = useState<React.ComponentType | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    import("./Editor")
      .then((m) => live && setEditor(() => m.Editor))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div>
      {/* Server-rendered with the poster, so it is there before the editor loads and nothing shifts. */}
      <p className="lab-intro">Pick a look, set its intensity, then tweak a single beat by hand.</p>
      {Editor ? (
        <Editor />
      ) : (
        <>
          {poster && (
            <img src={poster.src} alt={poster.alt} className="lab-frame card-img aspect-video w-full rounded-md object-cover" />
          )}
          {failed && <p className="mt-2 font-sans text-sm text-muted">The editor could not load. Reload the page to try again.</p>}
        </>
      )}
    </div>
  );
}
