/** Robust microphone capture for support WebRTC calls. */

const LAST_MIC_KEY = "rb_support_mic_device";

function isDomException(err: unknown): err is DOMException {
  return typeof err === "object" && err !== null && "name" in err;
}

function errorName(err: unknown): string {
  return isDomException(err) ? err.name : "";
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err || "");
}

async function micPermissionState(): Promise<PermissionState | "unknown"> {
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state;
  } catch {
    return "unknown";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function waitForDeviceChange(md: MediaDevices, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      md.removeEventListener("devicechange", onChange);
      window.clearTimeout(timer);
      resolve();
    };
    const onChange = () => done();
    const timer = window.setTimeout(done, ms);
    md.addEventListener("devicechange", onChange, { once: true });
  });
}

async function listAudioInputs(md: MediaDevices): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await md.enumerateDevices();
    return devices.filter((d) => d.kind === "audioinput");
  } catch {
    return [];
  }
}

function rankMics(inputs: MediaDeviceInfo[]): MediaDeviceInfo[] {
  const preferred = window.sessionStorage.getItem(LAST_MIC_KEY) || "";
  const real = inputs.filter(
    (d) => d.deviceId && d.deviceId !== "default" && d.deviceId !== "communications",
  );
  const aliases = inputs.filter((d) => d.deviceId === "default" || d.deviceId === "communications");
  const unlabeled = inputs.filter((d) => !d.deviceId);
  const ranked = [...real, ...aliases, ...unlabeled];
  if (!preferred) return ranked;
  return ranked.sort((a, b) => Number(b.deviceId === preferred) - Number(a.deviceId === preferred));
}

function rememberMic(stream: MediaStream) {
  const id = stream.getAudioTracks()[0]?.getSettings()?.deviceId;
  if (id) {
    try {
      window.sessionStorage.setItem(LAST_MIC_KEY, id);
    } catch {
      /* ignore */
    }
  }
}

async function gum(md: MediaDevices, constraints: MediaStreamConstraints): Promise<MediaStream> {
  const stream = await md.getUserMedia(constraints);
  rememberMic(stream);
  return stream;
}

function constraintAttempts(deviceId?: string): MediaStreamConstraints[] {
  const out: MediaStreamConstraints[] = [];
  if (deviceId) {
    out.push({ audio: { deviceId: { exact: deviceId } } });
    out.push({ audio: { deviceId: { ideal: deviceId } } });
    out.push({ audio: { deviceId } });
  }
  out.push({ audio: true });
  out.push({ audio: { deviceId: "default" } });
  out.push({ audio: { deviceId: "communications" } });
  out.push({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
  out.push({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  out.push({ audio: {}, video: false });
  return out;
}

export async function acquireLocalAudio(): Promise<MediaStream> {
  if (typeof window === "undefined") {
    throw new Error("Voice calls need a browser window.");
  }
  if (!window.isSecureContext) {
    throw new Error(
      "Voice calls require HTTPS (or localhost). Open the admin portal on a secure URL.",
    );
  }
  const md = navigator.mediaDevices;
  if (!md?.getUserMedia) {
    throw new Error("This browser does not support microphone access for voice calls.");
  }

  const perm = await micPermissionState();
  if (perm === "denied") {
    throw new Error(
      "Microphone permission is blocked for this site. Click the lock icon in the address bar → Site settings → Microphone → Allow, then retry.",
    );
  }

  let lastError: unknown;
  const saved = (() => {
    try {
      return window.sessionStorage.getItem(LAST_MIC_KEY) || "";
    } catch {
      return "";
    }
  })();

  for (const constraints of constraintAttempts(saved || undefined)) {
    try {
      return await gum(md, constraints);
    } catch (err) {
      lastError = err;
      if (errorName(err) === "NotAllowedError" || errorName(err) === "SecurityError") {
        throw mapMediaError(err, 0, perm);
      }
    }
  }

  let inputs = await listAudioInputs(md);
  if (!inputs.length) {
    await waitForDeviceChange(md, 400);
    inputs = await listAudioInputs(md);
  }

  for (const mic of rankMics(inputs)) {
    if (!mic.deviceId) continue;
    for (const constraints of constraintAttempts(mic.deviceId).slice(0, 3)) {
      try {
        return await gum(md, constraints);
      } catch (err) {
        lastError = err;
      }
    }
  }

  // One last generic grab after the device list has settled (labels appear post-permission).
  await sleep(150);
  try {
    return await gum(md, { audio: true });
  } catch (err) {
    lastError = err;
  }

  throw mapMediaError(lastError, inputs.length, perm);
}

function mapMediaError(err: unknown, micCount: number, perm: PermissionState | "unknown" = "unknown"): Error {
  const name = errorName(err);
  const raw = errorText(err);

  if (name === "NotAllowedError" || name === "PermissionDeniedError" || perm === "denied") {
    return new Error(
      "Microphone permission blocked. Click the lock/info icon in the address bar → allow Microphone, then retry.",
    );
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || /Requested device not found/i.test(raw)) {
    if (perm === "granted" && micCount <= 0) {
      return new Error(
        "Windows already has a microphone, but this browser window cannot use it. Open the admin portal in Chrome or Microsoft Edge (http://localhost:5173), click the lock icon → Microphone → Allow, then retry.",
      );
    }
    if (micCount <= 0) {
      return new Error(
        "This window cannot see a microphone. Use Chrome or Edge on localhost, allow the site mic, and confirm Windows Privacy → Microphone is on for browsers.",
      );
    }
    return new Error(
      "Microphone not available. In Windows Sound settings set a Default input device, close apps using the mic (Zoom/Teams), then retry.",
    );
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return new Error(
      "Microphone is locked by another app. Close Zoom/Teams/Discord, then retry.",
    );
  }
  if (name === "OverconstrainedError") {
    return new Error("This microphone cannot be opened with current settings. Pick another input device and retry.");
  }
  if (name === "SecurityError") {
    return new Error("Browser blocked the microphone. Use HTTPS or localhost.");
  }
  if (raw && raw !== "undefined") {
    return new Error(raw);
  }
  return new Error("Could not access the microphone. Check device and permissions, then retry.");
}
