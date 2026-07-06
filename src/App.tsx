import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import ImageUploader from "./components/ImageUploader";
import Controls from "./components/Controls";
import Viewer from "./components/Viewer";
import { PS1Renderer, DEFAULT_SETTINGS, type PSSettings } from "./lib/ps1Renderer";
import { initFaceDetector, detectFace, type FacePoint } from "./lib/faceDetector";

export default function App() {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [settings, setSettings] = useState<PSSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [renderer, setRenderer] = useState<PS1Renderer | null>(null);

  const rendererRef = useRef<PS1Renderer | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointsRef = useRef<FacePoint[] | null>(null);

  const handleImage = useCallback(async (img: HTMLImageElement) => {
    setStatus("loading");
    setStatusMsg("Detecting face...");
    setImageLoaded(true);
    imageRef.current = img;

    try {
      const detector = await initFaceDetector();
      const points = detectFace(detector, img);
      if (!points) {
        setStatus("error");
        setStatusMsg("No face detected. Try another photo.");
        return;
      }
      pointsRef.current = points;
      setStatusMsg("Generating PS1 portrait...");

      const rc = new PS1Renderer(document.createElement("div"));
      rendererRef.current = rc;
      rc.load(img, points);
      setRenderer(rc);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setStatusMsg(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }, []);

  const handleSettingsChange = useCallback((s: PSSettings) => {
    setSettings(s);
    rendererRef.current?.updateSettings(s);
  }, []);

  const handleReset = useCallback(() => {
    setImageLoaded(false);
    setStatus("idle");
    setStatusMsg("");
    rendererRef.current?.dispose();
    rendererRef.current = null;
    setRenderer(null);
    pointsRef.current = null;
    imageRef.current = null;
  }, []);

  useEffect(() => {
    return () => rendererRef.current?.dispose();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>PS1 Portrait</h1>
        <p>Turn your photos into PlayStation 1 era graphics</p>
      </header>

      <main className="main">
        <div className="left">
          {!imageLoaded && (
            <ImageUploader onImage={handleImage} disabled={status === "loading"} />
          )}

          {imageLoaded && status === "loading" && (
            <div className="status">{statusMsg}</div>
          )}

          {imageLoaded && status === "error" && (
            <div className="status error">
              <p>{statusMsg}</p>
              <button onClick={handleReset}>Try another photo</button>
            </div>
          )}

          {status === "ready" && <Viewer renderer={renderer} />}

          {imageLoaded && status !== "loading" && status !== "error" && (
            <button className="reset-btn" onClick={handleReset}>
              Change Photo
            </button>
          )}
        </div>

        <aside className="right">
          <Controls settings={settings} onChange={handleSettingsChange} />

          {status === "ready" && (
            <button
              className="download-btn"
              onClick={() => {
                const dataUrl = rendererRef.current?.snapshotLowRes();
                if (!dataUrl) return;
                const link = document.createElement("a");
                link.download = "ps1-portrait.png";
                link.href = dataUrl;
                link.click();
              }}
            >
              Download PNG
            </button>
          )}
        </aside>
      </main>
    </div>
  );
}
