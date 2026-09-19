type Props = {
  selectedFilename: string;
  selectedPreview: string | null;
  busy?: boolean;
  emptyLabel?: string;
  previewWide?: boolean;
  onUpload: (file: File | null) => void;
  onClear: () => void;
};

export function CategoryIconPicker({
  selectedFilename,
  selectedPreview,
  busy = false,
  emptyLabel = "Upload an icon",
  previewWide = false,
  onUpload,
  onClear,
}: Props) {
  return (
    <div className={`cat-icon-picker${previewWide ? " is-wide" : ""}`}>
      <div className="cat-icon-picker-head">
        <div className="cat-icon-selected">
          {selectedPreview ? (
            <img
              src={selectedPreview}
              alt=""
              className={`cat-icon-selected-img${previewWide ? " is-wide" : ""}`}
            />
          ) : (
            <span className={`cat-icon-selected-empty${previewWide ? " is-wide" : ""}`}>No icon</span>
          )}
          <div className="cat-icon-selected-meta">
            <strong>{selectedFilename || emptyLabel}</strong>
            {selectedFilename ? (
              <button type="button" className="cat-icon-clear" onClick={onClear} disabled={busy}>
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="cat-upload-block">
        <input
          type="file"
          accept="image/*,.svg"
          className="banner-file-input"
          disabled={busy}
          onChange={(e) => {
            void onUpload(e.target.files?.[0] ?? null);
            e.currentTarget.value = "";
          }}
        />
      </div>
    </div>
  );
}
