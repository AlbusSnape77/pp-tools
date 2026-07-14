import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";

export function getCameraErrorMessage(error, t = null) {
  const message = (key, fallback) => t ? t(`camera.${key}`) : fallback;
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return message("permission", "请在浏览器地址栏允许摄像头权限，然后重新检测。");
  }
  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
    return message("notFound", "没有找到可用摄像头，请连接设备后重新检测。");
  }
  if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
    return message("busy", "摄像头正在被其他程序占用，请关闭占用程序后重试。");
  }
  if (!globalThis.navigator?.mediaDevices?.getUserMedia) {
    return message("unsupported", "当前浏览器不支持摄像头访问，请使用较新的浏览器。");
  }
  return message("genericError", "摄像头启动失败，请检查设备后重新检测。");
}

function stopTracks(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

export async function applyHighestFrameRate(stream) {
  const track = stream?.getVideoTracks?.()[0];
  if (!track?.getCapabilities || !track?.applyConstraints) return null;
  try {
    const max = Number(track.getCapabilities()?.frameRate?.max);
    if (!Number.isFinite(max) || max <= 0) return null;
    await track.applyConstraints({ frameRate: { ideal: max } });
    return max;
  } catch {
    return null;
  }
}

export function useCameraStream() {
  const { t } = useI18n();
  const streamRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState("user");

  const stopCamera = useCallback(() => {
    stopTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setStatus("idle");
    setError("");
  }, []);

  const startCamera = useCallback(async (nextFacingMode = facingMode) => {
    stopTracks(streamRef.current);
    streamRef.current = null;
    setStatus("starting");
    setError("");
    try {
      if (!globalThis.navigator?.mediaDevices?.getUserMedia) throw { name: "NotSupportedError" };
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: nextFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60 },
        },
      });
      await applyHighestFrameRate(nextStream);
      streamRef.current = nextStream;
      setStream(nextStream);
      setFacingMode(nextFacingMode);
      setStatus("running");
      return nextStream;
    } catch (cameraError) {
      setStatus("error");
      setError(getCameraErrorMessage(cameraError, t));
      return null;
    }
  }, [facingMode, t]);

  const switchCamera = useCallback(() => {
    const nextFacingMode = facingMode === "user" ? "environment" : "user";
    return startCamera(nextFacingMode);
  }, [facingMode, startCamera]);

  useEffect(() => () => stopTracks(streamRef.current), []);

  return { stream, status, error, facingMode, startCamera, stopCamera, switchCamera };
}
