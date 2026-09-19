import { useEffect, useState } from "react";
import { Download, Eye, Mail, Phone, X } from "../lib/icons";
import { adminApi } from "../lib/api";
import { isImageCv, isPdfCv } from "../lib/media";
import { LoadingIndicator } from "./LoadingIndicator";

function str(v: unknown): string {
  return v == null || v === "" ? "—" : String(v);
}

function initials(name: unknown): string {
  return String(name || "A")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function fileLabel(path: string): string {
  const clean = path.split("?")[0];
  const base = clean.split("/").pop() || clean;
  return base || "CV file";
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function downloadCareerCvFile(careerId: number): Promise<void> {
  const { blob, filename } = await adminApi.downloadCareerCv(careerId);
  triggerBlobDownload(blob, filename || `career-${careerId}-cv.pdf`);
}

type CvPreviewState = {
  careerId: number;
  path: string;
  name?: string;
  job?: string;
};

export function ApplicantDetailModal({
  detail,
  onClose,
  onChanged,
  onPreviewCv,
}: {
  detail: Record<string, unknown>;
  onClose: () => void;
  onChanged: (next: Record<string, unknown>) => void;
  onPreviewCv: (cv: CvPreviewState) => void;
}) {
  const reviewed = Number(detail.career_status) === 1;
  const cvPath = detail.career_cv ? String(detail.career_cv) : "";
  const careerId = Number(detail.career_id);
  const [dlBusy, setDlBusy] = useState(false);
  const [dlError, setDlError] = useState("");
  const fields: Array<[string, unknown]> = [
    ["Mobile", detail.career_mobile],
    ["Email", detail.career_email],
    ["Gender", detail.career_gender],
    ["Location", detail.career_location],
    ["Nationality", detail.career_nationality],
    ["Applied", detail.career_date || detail.career_created_at],
    ["Qualification", detail.career_qualification],
    ["Experience", detail.career_experience],
    ["GCC experience", detail.career_gcc],
    ["Applied for", detail.career_job],
  ];

  async function onDownload() {
    if (!careerId) return;
    setDlBusy(true);
    setDlError("");
    try {
      await downloadCareerCvFile(careerId);
    } catch (e) {
      setDlError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDlBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card applicant-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="applicant-modal-head">
          <div className="applicant-modal-identity">
            <div className="applicant-avatar" aria-hidden>
              {initials(detail.career_name)}
            </div>
            <div>
              <h2>{str(detail.career_name)}</h2>
              <p>{str(detail.career_job)}</p>
            </div>
          </div>
          <div className="applicant-modal-head-actions">
            <span className={`access-perm-tag${reviewed ? "" : " is-warn"}`}>
              {reviewed ? "Reviewed" : "Pending review"}
            </span>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="applicant-modal-body">
          <section className="applicant-section">
            <h3>Contact &amp; profile</h3>
            <dl className="applicant-facts">
              {fields.map(([label, value]) => (
                <div key={label} className="applicant-fact">
                  <dt>{label}</dt>
                  <dd>{str(value)}</dd>
                </div>
              ))}
            </dl>
          </section>

          {detail.career_msg ? (
            <section className="applicant-section">
              <h3>Message</h3>
              <p className="applicant-message">{String(detail.career_msg)}</p>
            </section>
          ) : null}

          <section className="applicant-section">
            <h3>CV file</h3>
            {cvPath ? (
              <div className="applicant-cv-card">
                <div>
                  <strong>{fileLabel(cvPath)}</strong>
                  <p className="muted">{isPdfCv(cvPath) ? "PDF document" : isImageCv(cvPath) ? "Image" : "Attachment"}</p>
                  {dlError ? <p className="error">{dlError}</p> : null}
                </div>
                <div className="orders-row-actions">
                  <button
                    type="button"
                    className="btn btn-green btn-sm"
                    onClick={() =>
                      onPreviewCv({
                        careerId,
                        path: cvPath,
                        name: String(detail.career_name || ""),
                        job: String(detail.career_job || ""),
                      })
                    }
                  >
                    <Eye size={14} aria-hidden />
                    Preview
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={dlBusy} onClick={() => void onDownload()}>
                    <Download size={14} aria-hidden />
                    {dlBusy ? "Downloading…" : "Download"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="muted">No CV uploaded.</p>
            )}
          </section>
        </div>

        <footer className="applicant-modal-foot">
          {detail.career_email ? (
            <a className="btn btn-secondary" href={`mailto:${String(detail.career_email)}`}>
              <Mail size={14} aria-hidden />
              Email
            </a>
          ) : null}
          {detail.career_mobile ? (
            <a className="btn btn-secondary" href={`tel:${String(detail.career_mobile)}`}>
              <Phone size={14} aria-hidden />
              Call
            </a>
          ) : null}
          <button
            type="button"
            className="btn btn-green"
            onClick={() =>
              void adminApi
                .updateCareerStatus(Number(detail.career_id), reviewed ? 0 : 1)
                .then(() => adminApi.career(Number(detail.career_id)))
                .then(onChanged)
            }
          >
            {reviewed ? "Mark pending" : "Mark reviewed"}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function CvPreviewModal({
  cv,
  onClose,
}: {
  cv: CvPreviewState;
  onClose: () => void;
}) {
  const [src, setSrc] = useState<string>("");
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dlBusy, setDlBusy] = useState(false);
  const pdf = isPdfCv(cv.path);
  const image = isImageCv(cv.path);

  useEffect(() => {
    let revoked = false;
    let objectUrl = "";
    setLoading(true);
    setFailed(false);
    setError("");
    setSrc("");

    void adminApi
      .downloadCareerCv(cv.careerId, { inline: true })
      .then(({ blob }) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setLoading(false);
      })
      .catch((e) => {
        if (revoked) return;
        setFailed(true);
        setLoading(false);
        setError(e instanceof Error ? e.message : "Preview failed");
      });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cv.careerId, cv.path]);

  async function onDownload() {
    setDlBusy(true);
    setError("");
    try {
      await downloadCareerCvFile(cv.careerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDlBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card cv-preview-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="CV preview"
      >
        <header className="cv-preview-head">
          <div>
            <h2>CV preview</h2>
            <p className="muted">
              {cv.name ? `${cv.name}` : "Applicant"}
              {cv.job ? ` · ${cv.job}` : ""}
              {" · "}
              {fileLabel(cv.path)}
            </p>
          </div>
          <div className="orders-row-actions">
            <button type="button" className="btn btn-secondary btn-sm" disabled={dlBusy} onClick={() => void onDownload()}>
              <Download size={14} aria-hidden />
              {dlBusy ? "Downloading…" : "Download"}
            </button>
            {src ? (
              <a className="btn btn-secondary btn-sm" href={src} target="_blank" rel="noreferrer">
                Open tab
              </a>
            ) : null}
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="cv-preview-body">
          {loading ? (
            <div className="cv-preview-empty">
              <LoadingIndicator label="Loading CV" />
            </div>
          ) : failed || !src ? (
            <div className="cv-preview-empty">
              <p>{error || "Preview unavailable for this file."}</p>
              <button type="button" className="btn btn-green" disabled={dlBusy} onClick={() => void onDownload()}>
                <Download size={14} aria-hidden />
                {dlBusy ? "Downloading…" : "Download CV"}
              </button>
            </div>
          ) : pdf ? (
            <iframe title="CV PDF preview" src={src} className="cv-preview-frame" sandbox="allow-same-origin allow-downloads" referrerPolicy="no-referrer" />
          ) : image ? (
            <img src={src} alt="CV" className="cv-preview-image" />
          ) : (
            <div className="cv-preview-empty">
              <p>This file type can’t be embedded. Download or open in a new tab.</p>
              <div className="orders-row-actions">
                <button type="button" className="btn btn-green" disabled={dlBusy} onClick={() => void onDownload()}>
                  <Download size={14} aria-hidden />
                  {dlBusy ? "Downloading…" : "Download"}
                </button>
                <a className="btn btn-secondary" href={src} target="_blank" rel="noreferrer">
                  Open tab
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { CvPreviewState };
