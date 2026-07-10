"use client";

import { useEffect, useRef, useState } from "react";

interface AddressSuggestion {
  label: string;
  street?: string;
  housenumber?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface PendingFile {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  progress: number;
  url?: string;
  error?: string;
  previewUrl: string;
}

const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED_TYPES = /^(image\/(jpeg|png|webp|heic|heif)|video\/(mp4|quicktime|webm))$/;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getDefaultPickup(): string {
  // Tomorrow at 10:00 local, formatted for datetime-local input.
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getMinPickup(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function BookingForm({ variant = "default" }: { variant?: "default" | "hero" | "dark" }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressMeta, setAddressMeta] = useState<AddressSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const addressBoxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [pickupAt, setPickupAt] = useState(getDefaultPickup());

  const [files, setFiles] = useState<PendingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = variant === "dark" || variant === "hero";

  // Debounced address autocomplete via Photon (free, OpenStreetMap-based, no key).
  useEffect(() => {
    if (address.length < 3 || addressMeta?.label === address) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const ctl = new AbortController();
        abortRef.current = ctl;
        setSearching(true);
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=5&lang=en&osm_tag=:!boundary`;
        const res = await fetch(url, { signal: ctl.signal });
        if (!res.ok) throw new Error("search failed");
        const json = (await res.json()) as { features?: Array<{ properties: Record<string, string> }> };
        const features = json.features ?? [];
        const items: AddressSuggestion[] = features
          .filter((f) => f.properties.country === "United States" || !f.properties.country)
          .map((f) => {
            const p = f.properties;
            const parts = [
              [p.housenumber, p.street].filter(Boolean).join(" "),
              p.city || p.name,
              [p.state, p.postcode].filter(Boolean).join(" "),
            ].filter(Boolean);
            return {
              label: parts.join(", "),
              street: p.street,
              housenumber: p.housenumber,
              city: p.city || p.name,
              state: p.state,
              postcode: p.postcode,
              country: p.country,
            };
          })
          .filter((s) => s.label.length > 0);
        setSuggestions(items);
        setShowSuggestions(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [address, addressMeta]);

  // Click-outside to close suggestion panel.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (addressBoxRef.current && !addressBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickSuggestion(s: AddressSuggestion) {
    setAddress(s.label);
    setAddressMeta(s);
    setShowSuggestions(false);
  }

  function uploadOne(pf: PendingFile): Promise<void> {
    return new Promise((resolve) => {
      const fd = new FormData();
      fd.append("file", pf.file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        setFiles((prev) => prev.map((p) => (p.id === pf.id ? { ...p, progress: pct } : p)));
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText) as { success: boolean; url?: string; error?: string };
          if (xhr.status >= 200 && xhr.status < 300 && data.success && data.url) {
            setFiles((prev) =>
              prev.map((p) => (p.id === pf.id ? { ...p, status: "done", progress: 100, url: data.url } : p))
            );
          } else {
            const msg = data.error || `Upload failed (${xhr.status})`;
            setFiles((prev) => prev.map((p) => (p.id === pf.id ? { ...p, status: "error", error: msg } : p)));
          }
        } catch {
          setFiles((prev) => prev.map((p) => (p.id === pf.id ? { ...p, status: "error", error: "Bad response" } : p)));
        }
        resolve();
      };

      xhr.onerror = () => {
        setFiles((prev) => prev.map((p) => (p.id === pf.id ? { ...p, status: "error", error: "Network error" } : p)));
        resolve();
      };

      xhr.onabort = () => {
        setFiles((prev) => prev.map((p) => (p.id === pf.id ? { ...p, status: "error", error: "Aborted" } : p)));
        resolve();
      };

      xhr.send(fd);
    });
  }

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const accepted: PendingFile[] = [];
    for (const file of Array.from(list)) {
      if (!ALLOWED_TYPES.test(file.type)) {
        setError(`${file.name}: unsupported type`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name}: too large (max 100MB)`);
        continue;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: "uploading",
        progress: 0,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (accepted.length === 0) return;
    setFiles((prev) => [...prev, ...accepted]);
    await Promise.all(accepted.map(uploadOne));
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const stillUploading = files.some((f) => f.status === "uploading");
    if (stillUploading) {
      setError("Photos/videos are still uploading. Give it a sec, then try again.");
      return;
    }

    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const mediaUrls = files.filter((f) => f.status === "done" && f.url).map((f) => f.url as string);

    const payload = {
      type: "booking" as const,
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      address,
      city: addressMeta?.city,
      state: addressMeta?.state,
      zip: addressMeta?.postcode,
      pickupAt: pickupAt ? new Date(pickupAt).toISOString() : undefined,
      mediaUrls,
      details: String(fd.get("details") || ""),
      source: typeof window !== "undefined" ? window.location.pathname : "",
    };

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(`${msg}. Please call (888) 831-3001 instead.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className={`rounded-xl p-8 text-center ${isDark ? "bg-white/10 backdrop-blur-sm" : "bg-teal-50 border border-teal-200"}`}>
        <p className={`text-2xl font-bold font-heading ${isDark ? "text-white" : "text-teal-700"}`}>We&apos;ll be in touch shortly!</p>
        <p className={`mt-2 text-base ${isDark ? "text-white/70" : "text-slate-600"}`}>Our team will call or text you to confirm your pickup window.</p>
      </div>
    );
  }

  const labelClass = `block text-sm font-semibold mb-1 font-cta ${isDark ? "text-white/80" : "text-slate-700"}`;
  const tipClass = `mt-1 text-xs ${isDark ? "text-white/55" : "text-slate-500"}`;
  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl p-6 ${isDark ? "bg-white/10 backdrop-blur-sm" : "bg-white border border-slate-200 shadow-md"}`}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            name="name"
            required
            autoComplete="name"
            placeholder="Your name"
            className={inputClass}
          />
          <p className={tipClass}>So we know what to call you when we arrive.</p>
        </div>

        <div>
          <label className={labelClass}>Phone</label>
          <input
            type="tel"
            name="phone"
            required
            autoComplete="tel"
            inputMode="tel"
            placeholder="(555) 555-5555"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            maxLength={14}
            className={inputClass}
          />
          <p className={tipClass}>We&apos;ll text to confirm — make sure it can receive SMS.</p>
        </div>
      </div>

      <div className="mt-4" ref={addressBoxRef}>
        <label className={labelClass}>Pickup Address</label>
        <div className="relative">
          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setAddressMeta(null);
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            required
            autoComplete="street-address"
            placeholder="Start typing the address..."
            className={inputClass}
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">searching...</span>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="block w-full px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-teal-50"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className={tipClass}>Where the junk is. Pick from the list so we route the right truck.</p>
      </div>

      <div className="mt-4">
        <label className={labelClass}>Preferred Pickup (date & time)</label>
        <input
          type="datetime-local"
          name="pickupAt"
          value={pickupAt}
          onChange={(e) => setPickupAt(e.target.value)}
          min={getMinPickup()}
          required
          className={inputClass}
        />
        <p className={tipClass}>Pick a 2-hour window when someone can be home. We confirm same-day; flexible windows get faster service.</p>
      </div>

      <div className="mt-4">
        <label className={labelClass}>Photos / Video (optional but recommended)</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
            isDark ? "border-white/30 bg-white/5 text-white/70 hover:bg-white/10" : "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <p className="text-sm font-semibold">Tap to add photos or a quick video</p>
          <p className="mt-1 text-xs opacity-75">JPEG, PNG, WebP, HEIC, MP4, MOV, WebM &middot; up to 100MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => {
              handleFiles(e.target.files);
              e.currentTarget.value = "";
            }}
            className="hidden"
          />
        </div>
        <p className={tipClass}>1-2 photos beats none. Show the items, doorways, stairs — anything tight. Speeds up your quote.</p>

        {files.length > 0 && (
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {files.map((f) => (
              <li key={f.id} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                {f.file.type.startsWith("video/") ? (
                  <video src={f.previewUrl} className="h-24 w-full object-cover" muted playsInline />
                ) : (
                  <img src={f.previewUrl} alt={f.file.name} className="h-24 w-full object-cover" />
                )}
                <div className="px-2 py-1 text-[10px] text-slate-600">
                  <p className="truncate">{f.file.name}</p>
                  <p className="opacity-70">{formatSize(f.file.size)}</p>
                  {f.status === "uploading" && (
                    <>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full bg-teal-500 transition-all duration-150"
                          style={{ width: `${f.progress}%` }}
                        />
                      </div>
                      <p className="text-teal-600">{f.progress}%</p>
                    </>
                  )}
                  {f.status === "done" && <p className="text-emerald-600">✓ Ready</p>}
                  {f.status === "error" && <p className="text-red-600">Failed: {f.error}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
                  aria-label="Remove file"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <label className={labelClass}>Tell us more</label>
        <textarea
          name="details"
          rows={4}
          placeholder="e.g., 1 sectional couch + 1 fridge in the basement. Stairs are narrow. Need it gone before Saturday."
          className={inputClass}
        />
        <p className={tipClass}>
          Useful: roughly what&apos;s going (1 couch, 5 boxes), where it is (basement, 3rd-floor walk-up), any tricky access (narrow halls, no elevator),
          and your deadline if any.
        </p>
      </div>

      {error && (
        <p className={`mt-3 rounded-md p-2 text-sm ${isDark ? "bg-red-500/20 text-red-100" : "bg-red-50 text-red-700"}`}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 w-full rounded-lg bg-accent py-3.5 text-base font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-60 font-cta"
      >
        {submitting ? "Sending..." : "Book Now & Save $10"}
      </button>
      <p className={`mt-2 text-center text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>
        starting at $200/hr &bull; 1 hour minimum &bull; Dump fees included (an industry first) &bull; 50% Resale Credit (when applicable)
      </p>
    </form>
  );
}
