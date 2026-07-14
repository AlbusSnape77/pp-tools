import { useCallback, useEffect, useRef, useState } from "react";
import { compareCompanionVersion } from "../../api/deltaCompanionClient";

const STATES = new Set([
  "checking",
  "unavailable",
  "launching",
  "permission_denied",
  "pairing_required",
  "pairing",
  "ready",
  "version_incompatible",
  "error",
]);
const DEFAULT_REQUIREMENTS = { min_version: "1.0.0", api_version: 1 };

function stateForError(error) {
  if (error?.code === "companion_unavailable") return "unavailable";
  if (error?.code === "origin_denied") return "permission_denied";
  if (error?.code === "token_invalid") return "pairing_required";
  if (error?.code === "version_incompatible") return "version_incompatible";
  return "error";
}

function defaultLaunchProtocol(protocolUrl) {
  const anchor = document.createElement("a");
  anchor.href = protocolUrl;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function useDeltaCompanion({
  client,
  protocolUrl = "delta-stats://start",
  launchProtocol = defaultLaunchProtocol,
  requirements = DEFAULT_REQUIREMENTS,
} = {}) {
  const [state, setStateValue] = useState("checking");
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const launchPollTimer = useRef(null);

  const setState = useCallback((next) => {
    if (!STATES.has(next)) throw new Error(`Unknown Companion state: ${next}`);
    setStateValue(next);
  }, []);

  const detect = useCallback(async () => {
    if (!client) {
      setState("unavailable");
      return "unavailable";
    }
    setState("checking");
    setError(null);
    try {
      const status = await client.health();
      setHealth(status);
      if (compareCompanionVersion(status, requirements) !== "compatible") {
        setState("version_incompatible");
        return "version_incompatible";
      }
      if (!client.hasToken()) {
        setState("pairing_required");
        return "pairing_required";
      }
      await client.getUsage();
      setState("ready");
      return "ready";
    } catch (caught) {
      setError(caught);
      const next = stateForError(caught);
      setState(next);
      return next;
    }
  }, [client, requirements, setState]);

  useEffect(() => {
    detect();
    return () => {
      if (launchPollTimer.current) window.clearTimeout(launchPollTimer.current);
    };
  }, [detect]);

  const launch = useCallback(() => {
    setState("launching");
    launchProtocol(protocolUrl);
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      const result = await detect();
      if (result === "unavailable" && attempts < 20) {
        launchPollTimer.current = window.setTimeout(poll, 500);
      }
    };
    launchPollTimer.current = window.setTimeout(poll, 500);
  }, [detect, launchProtocol, protocolUrl, setState]);

  const pair = useCallback(async (code) => {
    setState("pairing");
    setError(null);
    try {
      await client.pair(code);
      await client.getUsage?.();
      setState("ready");
      return true;
    } catch (caught) {
      setError(caught);
      setState(stateForError(caught));
      return false;
    }
  }, [client, setState]);

  const disconnect = useCallback(async () => {
    await client.revokePairing();
    setState("pairing_required");
  }, [client, setState]);

  return { state, error, health, detect, launch, pair, disconnect };
}
