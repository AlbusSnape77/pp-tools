import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import BeautyControls from "./BeautyControls";
import CameraStage from "./CameraStage";
import CapturePreview from "./CapturePreview";
import { BEAUTY_DEFAULTS, createBeautyRenderer } from "./beautyRenderer";
import { createVideoFrameLoop } from "./frameScheduler";
import { useCameraStream } from "./useCameraStream";
import { createVisionRuntime } from "./visionRuntime";
import "./beauty-cam.css";

export default function BeautyCamPage() {
  const { config, t } = useI18n();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const settingsRef = useRef(BEAUTY_DEFAULTS);
  const filterRef = useRef("cream");
  const compareRef = useRef(false);
  const captureRef = useRef("");
  const { stream, status, error, startCamera, stopCamera, switchCamera } = useCameraStream();
  const [settings, setSettings] = useState(BEAUTY_DEFAULTS);
  const [filterId, setFilterId] = useState("cream");
  const [collapsed, setCollapsed] = useState(false);
  const [capture, setCapture] = useState("");
  const [modelStatus, setModelStatus] = useState("modelIdle");
  const [modelAttempt, setModelAttempt] = useState(0);
  const [fps, setFps] = useState(0);
  const [gestureLabel, setGestureLabel] = useState("gestureIdle");

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    filterRef.current = filterId;
  }, [filterId]);

  useEffect(() => {
    captureRef.current = capture;
  }, [capture]);

  useEffect(() => {
    if (!videoRef.current || !stream) return undefined;
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => {});
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    if (status !== "running" || !canvasRef.current || !videoRef.current) return undefined;
    const renderer = createBeautyRenderer(canvasRef.current, videoRef.current);
    rendererRef.current = renderer;
    if (!renderer) return undefined;
    let active = true;
    let stopFrameLoop = () => {};
    let runtime = null;
    let latest = { faceLandmarks: null, hands: [] };
    let frames = 0;
    let lastFpsAt = performance.now();
    let lastGestureLabel = "gestureIdle";
    const supportsRuntime = typeof window.MediaStream === "function";

    if (supportsRuntime) {
      setModelStatus("modelLoading");
      createVisionRuntime(config.assetBaseUrl).then((createdRuntime) => {
        if (!active) return createdRuntime.close();
        runtime = createdRuntime;
        setModelStatus("modelReady");
      }).catch(() => {
        if (active) setModelStatus("modelFailed");
      });
    } else {
      setModelStatus("modelIdle");
    }

    function draw(now) {
      if (!active) return;
      const video = videoRef.current;
      if (!document.hidden && !captureRef.current && video?.readyState >= 2) {
        try {
          if (runtime) latest = runtime.detect(video, now);
          const gesture = renderer.render({
            settings: settingsRef.current,
            filterId: filterRef.current,
            compare: compareRef.current,
            faceLandmarks: latest.faceLandmarks,
            hands: latest.hands,
          });
          let nextGestureLabel = "gestureIdle";
          if (gesture?.bothOpen) nextGestureLabel = "gestureHeart";
          else if (gesture?.entries.some((entry) => entry.pinch)) nextGestureLabel = "gesturePinch";
          else if (gesture?.openCount) nextGestureLabel = "gesturePalm";
          if (nextGestureLabel !== lastGestureLabel) {
            lastGestureLabel = nextGestureLabel;
            setGestureLabel(nextGestureLabel);
          }
          frames += 1;
          if (now - lastFpsAt >= 1000) {
            setFps(Math.round(frames * 1000 / (now - lastFpsAt)));
            frames = 0;
            lastFpsAt = now;
          }
        } catch {
          setModelStatus("modelPaused");
          runtime?.close();
          runtime = null;
        }
      }
    }
    stopFrameLoop = createVideoFrameLoop(videoRef.current, draw);

    return () => {
      active = false;
      stopFrameLoop();
      runtime?.close();
      renderer.reset();
      rendererRef.current = null;
    };
  }, [config.assetBaseUrl, status, modelAttempt]);

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function takePhoto() {
    const image = rendererRef.current?.capture() ?? canvasRef.current?.toDataURL("image/png") ?? "";
    if (image) setCapture(image);
  }

  function closeCamera() {
    setCapture("");
    setFps(0);
    setModelStatus("modelIdle");
    stopCamera();
  }

  return (
    <main className="beauty-cam-page">
      <header className="beauty-cam-intro">
        <div>
          <span className="beauty-kicker">GESTURE BEAUTY CAM</span>
          <h1>{t("camera.title")}</h1>
          <p>{t("camera.intro")}</p>
        </div>
        <div className="privacy-note"><span aria-hidden="true">●</span> {t("camera.privacy")}</div>
      </header>
      <div className="beauty-workspace">
        <CameraStage
          videoRef={videoRef}
          canvasRef={canvasRef}
          status={status}
          error={error}
          modelStatus={modelStatus}
          fps={fps}
          gestureLabel={gestureLabel}
          onStart={() => startCamera()}
          onRetry={() => startCamera()}
          onModelRetry={() => setModelAttempt((value) => value + 1)}
        />
        <BeautyControls
          settings={settings}
          filterId={filterId}
          status={status}
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
          onSettingChange={updateSetting}
          onFilterChange={setFilterId}
          onCompareChange={(value) => { compareRef.current = value; }}
          onCapture={takePhoto}
          onSwitchCamera={switchCamera}
          onStop={closeCamera}
        />
      </div>
      <CapturePreview image={capture} onRetake={() => setCapture("")} />
    </main>
  );
}
