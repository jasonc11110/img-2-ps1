import { useEffect, useRef } from "react";
import { PS1Renderer } from "../lib/ps1Renderer";

interface Props {
  renderer: PS1Renderer | null;
}

export default function Viewer({ renderer }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!renderer || !ref.current) return;
    const container = ref.current;
    container.appendChild(renderer.renderer.domElement);

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) renderer.resize(width, height);
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (renderer.renderer.domElement.parentElement === container) {
        container.removeChild(renderer.renderer.domElement);
      }
    };
  }, [renderer]);

  return <div ref={ref} className="viewer" />;
}
