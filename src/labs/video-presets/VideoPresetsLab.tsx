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
      {/* Server-rendered with the poster, so it is there before the editor loads and nothing shifts.
          The intro keeps the reading column; only the editor (or its poster) widens. */}
      <p className="lab-intro">Pick a look, tweak a single beat by hand, then try a theme and the story transitions.</p>
      <div className="lab-wide">
        {Editor ? (
          <Editor />
        ) : (
          // The poster sits in the same stage slot the player will take (lab-frame.css).
          <div className="lab-layout">
            <div className="lab-stage">
              {poster && (
                <img src={poster.src} alt={poster.alt} className="lab-frame card-img aspect-video w-full rounded-md object-cover" />
              )}
              {failed && <p className="mt-2 font-sans text-sm text-muted">The editor could not load. Reload the page to try again.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
