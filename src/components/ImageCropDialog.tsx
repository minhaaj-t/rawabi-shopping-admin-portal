import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { X } from "../lib/icons";

type Props = {
  file: File;
  aspect?: number;
  title?: string;
  outputSize?: number;
  onCancel: () => void;
  onCropped: (file: File) => void | Promise<void>;
};

type CropBox = { x: number; y: number; size: number };
type Handle = "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function fitContain(nw: number, nh: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / nw, maxH / nh);
  return { w: nw * scale, h: nh * scale, scale };
}

function initialCrop(dispW: number, dispH: number): CropBox {
  const size = Math.min(dispW, dispH) * 0.82;
  return {
    x: (dispW - size) / 2,
    y: (dispH - size) / 2,
    size,
  };
}

function clampCrop(box: CropBox, dispW: number, dispH: number): CropBox {
  const minSize = 48;
  const size = clamp(box.size, minSize, Math.min(dispW, dispH));
  return {
    size,
    x: clamp(box.x, 0, Math.max(0, dispW - size)),
    y: clamp(box.y, 0, Math.max(0, dispH - size)),
  };
}

async function exportCrop(
  image: HTMLImageElement,
  crop: CropBox,
  dispW: number,
  outputSize: number,
  mime: string,
): Promise<Blob> {
  const scale = image.naturalWidth / dispW;
  const sx = crop.x * scale;
  const sy = crop.y * scale;
  const sSize = crop.size * scale;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.drawImage(image, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize);

  const type = mime === "image/png" || mime === "image/webp" ? mime : "image/jpeg";
  const quality = type === "image/jpeg" ? 0.92 : undefined;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop export failed"))),
      type,
      quality,
    );
  });
}

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function ImageCropDialog({
  file,
  aspect = 1,
  title = "Crop featured image",
  outputSize = 1080,
  onCancel,
  onCropped,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    origin: CropBox;
  } | null>(null);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [display, setDisplay] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<CropBox | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let alive = true;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setNatural(null);
    setDisplay(null);
    setCrop(null);
    setError("");
    setBusy(false);

    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      if (!img.naturalWidth || !img.naturalHeight) {
        setError("Could not open this image for cropping");
        return;
      }
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      if (alive) setError("Could not open this image for cropping");
    };
    img.src = url;

    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (!natural) return;

    const layout = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const maxW = Math.min(560, stage.clientWidth || 560);
      const maxH = Math.min(420, Math.max(280, window.innerHeight * 0.5));
      const fitted = fitContain(natural.w, natural.h, maxW, maxH);
      setDisplay({ w: fitted.w, h: fitted.h });
      setCrop((prev) =>
        prev
          ? clampCrop(prev, fitted.w, fitted.h)
          : initialCrop(fitted.w, fitted.h),
      );
    };

    layout();
    window.addEventListener("resize", layout);
    return () => window.removeEventListener("resize", layout);
  }, [natural]);

  const applyHandle = useCallback(
    (handle: Handle, origin: CropBox, dx: number, dy: number, dispW: number, dispH: number): CropBox => {
      if (handle === "move") {
        return clampCrop({ ...origin, x: origin.x + dx, y: origin.y + dy }, dispW, dispH);
      }

      const minSize = 48;
      const maxSize = Math.min(dispW, dispH);
      let x = origin.x;
      let y = origin.y;
      let size = origin.size;

      if (handle === "e" || handle === "w") {
        const midY = origin.y + origin.size / 2;
        size = handle === "e" ? origin.size + dx : origin.size - dx;
        size = clamp(size, minSize, maxSize);
        x = handle === "e" ? origin.x : origin.x + origin.size - size;
        y = midY - size / 2;
      } else if (handle === "n" || handle === "s") {
        const midX = origin.x + origin.size / 2;
        size = handle === "s" ? origin.size + dy : origin.size - dy;
        size = clamp(size, minSize, maxSize);
        y = handle === "s" ? origin.y : origin.y + origin.size - size;
        x = midX - size / 2;
      } else {
        const anchorX = handle.includes("w") ? origin.x + origin.size : origin.x;
        const anchorY = handle.includes("n") ? origin.y + origin.size : origin.y;
        const pointerX = handle.includes("w")
          ? origin.x + dx
          : origin.x + origin.size + dx;
        const pointerY = handle.includes("n")
          ? origin.y + dy
          : origin.y + origin.size + dy;
        size = clamp(
          Math.max(Math.abs(pointerX - anchorX), Math.abs(pointerY - anchorY)),
          minSize,
          maxSize,
        );
        x = handle.includes("w") ? anchorX - size : anchorX;
        y = handle.includes("n") ? anchorY - size : anchorY;
      }

      return clampCrop({ x, y, size }, dispW, dispH);
    },
    [],
  );

  const onPointerDown = (handle: Handle) => (e: ReactPointerEvent<HTMLElement>) => {
    if (!crop || !stageRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    stageRef.current.setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origin: crop,
    };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !display) return;
    const { handle, startX, startY, origin } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setCrop(applyHandle(handle, origin, dx, dy, display.w, display.h));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    try {
      stageRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  async function applyCrop() {
    if (!crop || !display || !objectUrl) return;
    setBusy(true);
    setError("");
    try {
      const image = imgRef.current;
      if (!image || !image.complete || !image.naturalWidth) {
        throw new Error("Image is still loading");
      }
      const blob = await exportCrop(image, crop, display.w, outputSize, file.type || "image/jpeg");
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const base = file.name.replace(/\.[^.]+$/, "") || "featured";
      const cropped = new File([blob], `${base}.${ext}`, { type: blob.type });
      await onCropped(cropped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crop failed");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-card pf-crop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pf-crop-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pf-crop-head">
          <div>
            <h2 id="pf-crop-title">{title}</h2>
            <p className="muted small">
              Drag the selection or handles · Locked {aspect}:1 · Drag corners/sides to resize
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" aria-label="Close crop dialog" onClick={onCancel}>
            <X size={16} />
          </button>
        </div>

        <div className="pf-crop-body">
          <div
            ref={stageRef}
            className={`pf-crop-stage${dragging ? " is-dragging" : ""}`}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {objectUrl && natural && display && crop ? (
              <div className="pf-crop-canvas" style={{ width: display.w, height: display.h }}>
                <img
                  ref={imgRef}
                  src={objectUrl}
                  alt=""
                  draggable={false}
                  className="pf-crop-image"
                  width={display.w}
                  height={display.h}
                />
                <div className="pf-crop-shade" aria-hidden>
                  <div
                    className="pf-crop-shade-piece"
                    style={{ left: 0, top: 0, width: "100%", height: crop.y }}
                  />
                  <div
                    className="pf-crop-shade-piece"
                    style={{ left: 0, top: crop.y, width: crop.x, height: crop.size }}
                  />
                  <div
                    className="pf-crop-shade-piece"
                    style={{
                      left: crop.x + crop.size,
                      top: crop.y,
                      width: Math.max(0, display.w - crop.x - crop.size),
                      height: crop.size,
                    }}
                  />
                  <div
                    className="pf-crop-shade-piece"
                    style={{
                      left: 0,
                      top: crop.y + crop.size,
                      width: "100%",
                      height: Math.max(0, display.h - crop.y - crop.size),
                    }}
                  />
                </div>
                <div
                  className="pf-crop-selection"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.size,
                    height: crop.size,
                  }}
                  onPointerDown={onPointerDown("move")}
                >
                  <div className="pf-crop-grid" aria-hidden />
                  {HANDLES.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`pf-crop-handle pf-crop-handle-${h}`}
                      aria-label={`Resize crop ${h}`}
                      onPointerDown={onPointerDown(h)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <span className="muted small">{error || "Loading image…"}</span>
            )}
          </div>

          {error ? <p className="error">{error}</p> : null}
        </div>

        <div className="pf-crop-foot">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!crop || !natural || busy}
            onClick={() => void applyCrop()}
          >
            {busy ? "Uploading…" : "Crop & upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
