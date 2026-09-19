import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Printer } from "../lib/icons";
import { adminApi } from "../lib/api";
import { LoadingIndicator } from "../components/LoadingIndicator";

export function InvoicePreviewPage() {
  const { invoiceNumber = "" } = useParams();
  const navigate = useNavigate();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceNumber) {
      setError("Invoice number is missing");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    adminApi
      .orderInvoiceHtml(decodeURIComponent(invoiceNumber))
      .then(setHtml)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load invoice"))
      .finally(() => setLoading(false));
  }, [invoiceNumber]);

  function printInvoice() {
    frameRef.current?.contentWindow?.focus();
    frameRef.current?.contentWindow?.print();
  }

  async function downloadInvoice() {
    setError("");
    try {
      const ref = decodeURIComponent(invoiceNumber);
      const { blob, filename } = await adminApi.downloadOrderInvoiceByRef(ref, "pdf");
      const pdfName = filename.endsWith(".pdf") ? filename : `${filename.replace(/\.html$/i, "")}.pdf`;
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF download failed");
    }
  }

  const label = decodeURIComponent(invoiceNumber);

  return (
    <div className="invoice-preview-shell">
      <header className="invoice-preview-toolbar no-print">
        <div className="invoice-preview-toolbar-left">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} />
            Back
          </button>
          <strong>Invoice {label}</strong>
        </div>
        <div className="invoice-preview-toolbar-actions">
          <button type="button" className="btn btn-secondary" disabled={!html || loading} onClick={() => void downloadInvoice()}>
            <Download size={14} />
            Download PDF
          </button>
          <button type="button" className="btn" disabled={!html || loading} onClick={printInvoice}>
            <Printer size={14} />
            Print
          </button>
          <Link className="btn btn-secondary" to="/orders">
            Orders
          </Link>
        </div>
      </header>

      {error ? <div className="invoice-preview-error no-print">{error}</div> : null}
      {loading ? <div className="invoice-preview-loading no-print"><LoadingIndicator label="Loading invoice" /></div> : null}

      {!loading && html ? (
        <iframe
          ref={frameRef}
          title={`Invoice ${label}`}
          className="invoice-preview-frame"
          srcDoc={html}
          sandbox="allow-same-origin allow-modals allow-popups"
          referrerPolicy="no-referrer"
        />
      ) : null}
    </div>
  );
}
