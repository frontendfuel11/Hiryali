import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, LoaderCircle, Send, X } from "lucide-react";
import { formatFileSize, prepareImages, validateImageFiles } from "../lib/imageUtils";

const CROPS = ["Wheat", "Rice", "Cotton", "Sugarcane", "Vegetables", "Other"];

export default function ChatComposer({
  onSend,
  language = "en",
  busy = false,
  onError,
  onClearError,
  initialText = "",
}) {
  const [text, setText] = useState(initialText);
  const [crop, setCrop] = useState("");
  const [photos, setPhotos] = useState([]);
  const [dragging, setDragging] = useState(false);

  const attach = useRef(null);
  const camera = useRef(null);
  const area = useRef(null);
  const photosRef = useRef(photos);
  const busyRef = useRef(busy);
  
  const ur = language === "ur";

  useEffect(() => {
    setText(initialText || "");
  }, [initialText]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    return () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
  }, []);

  useEffect(() => {
    if (area.current) {
      area.current.style.height = "auto";
      area.current.style.height = `${Math.min(area.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  function add(list) {
    if (busyRef.current) return;
    
    const r = validateImageFiles(list, photosRef.current.length);
    if (r.errors.length) {
      onError?.(r.errors.join(" "));
    } else {
      onClearError?.();
    }

    const adds = r.accepted.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos((old) => [...old, ...adds].slice(0, 4));
  }

  function remove(id) {
    setPhotos((old) => {
      const p = old.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.preview);
      return old.filter((x) => x.id !== id);
    });
  }

  async function submit(e) {
    e.preventDefault();
    if (busy || (!photos.length && !text.trim())) return;
    
    try {
      const images = photos.length
        ? await prepareImages(photos.map((p) => p.file))
        : [];
      
      await onSend({ images, message: text.trim(), crop, language });
      
      setPhotos((old) => {
        old.forEach((p) => URL.revokeObjectURL(p.preview));
        return [];
      });
      setText("");
      setCrop("");
      onClearError?.();
    } catch (err) {
      onError?.(err.message || "Could not prepare photos.");
    }
  }

  function paste(e) {
    if (busy) return;
    const f = Array.from(e.clipboardData?.items || [])
      .filter((x) => x.kind === "file")
      .map((x) => x.getAsFile())
      .filter(Boolean);
      
    if (f.length) {
      e.preventDefault();
      add(f);
    }
  }

  return (
    <form
      className={`composer relative border border-[var(--gray-300)] bg-white p-3 sm:p-4 ${
        dragging ? "outline outline-2 outline-[var(--green)]" : ""
      }`}
      dir={ur ? "rtl" : "ltr"}
      onSubmit={submit}
      onPaste={paste}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!busy) add(e.dataTransfer.files);
      }}
    >
      {dragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95">
          Drop photos here
        </div>
      )}

      <input
        ref={attach}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose crop photos"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-label="Take a crop photo"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />

      {photos.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="min-w-0">
              <div className="relative overflow-hidden border border-[var(--gray-200)]">
                <img
                  src={p.preview}
                  alt={`Selected photo: ${p.file.name}`}
                  width="320"
                  height="240"
                  className="h-24 w-full object-cover"
                />
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Remove ${p.file.name}`}
                  onClick={() => remove(p.id)}
                  className="absolute right-1 top-1 flex min-h-11 min-w-11 items-center justify-center bg-white"
                >
                  <X size={17} />
                </button>
              </div>
              <p className="mt-1 truncate text-xs">{p.file.name}</p>
              <p className="text-xs text-[var(--gray-700)]">
                {formatFileSize(p.file.size)}
              </p>
            </div>
          ))}
        </div>
      )}

      <label htmlFor="crop-description" className="sr-only">
        Describe what you see
      </label>
      <textarea
        id="crop-description"
        ref={area}
        rows={1}
        maxLength={2000}
        disabled={busy}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          ur ? "اپنی فصل کے بارے میں بتائیں (اختیاری)" : "Describe what you see (optional)"
        }
        className="field-input min-h-12 resize-none border-0 px-1 py-3 focus:ring-0"
        style={{ maxHeight: 180, lineHeight: ur ? 2.2 : 1.7 }}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--gray-200)] pt-3">
        <span className="mr-1 text-xs text-[var(--gray-700)]">Crop (optional)</span>
        {CROPS.map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            aria-pressed={crop === n}
            onClick={() => setCrop((c) => (c === n ? "" : n))}
            className={`min-h-9 border px-3 py-1 text-sm ${
              crop === n
                ? "border-[var(--green)] bg-[var(--green)] text-white"
                : "border-[var(--gray-300)] hover:border-[var(--green)]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={busy || photos.length >= 4}
            onClick={() => attach.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 px-2 text-sm"
          >
            <ImagePlus size={18} />
            Attach photos
          </button>
          <button
            type="button"
            disabled={busy || photos.length >= 4}
            onClick={() => camera.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 px-2 text-sm"
          >
            <Camera size={18} />
            Take photo
          </button>
        </div>
        <button
          type="submit"
          disabled={busy || (!photos.length && !text.trim())}
          aria-label={busy ? "Sending crop photos" : "Send photo and message"}
          className="primary-button min-h-11 disabled:opacity-50"
        >
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
          {busy ? "Checking…" : "Send photo"}
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--gray-700)]">
        JPG, PNG, WebP or HEIC · Up to 4 photos · 8 MB each
      </p>
    </form>
  );
}