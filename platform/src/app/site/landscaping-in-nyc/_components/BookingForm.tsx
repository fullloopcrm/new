"use client";

import { useEffect, useRef, useState } from "react";
import { services } from "@/app/site/landscaping-in-nyc/_lib/siteData";
import { PHONE } from "@/app/site/landscaping-in-nyc/_lib/siteData";

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

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = /^image\/(jpeg|png|webp|heic|heif)$/;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getDefaultVisit(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getMinVisit(): string {
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

export function BookingForm() {
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

  const [visitAt, setVisitAt] = useState(getDefaultVisit());

  const [files, setFiles] = useState<PendingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (addressBoxRef.current && !addressBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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

  async function uploadOne(pf: PendingFile): Promise<void> {
    let signed: { signedUrl: string; publicUrl: string };
    try {
      const signedRes = await fetch("/api/upload/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "photo", filename: pf.file.name, contentType: pf.file.type }),
      });
      if (!signedRes.ok) {
        const errData = await signedRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to prepare upload");
      }
      signed = await signedRes.json();
    } catch (err) {
      setFiles((prev) =>
        prev.map((p) => (p.id === pf.id ? { ...p, status: "error", error: err instanceof Error ? err.message : "Failed to prepare upload" } : p))
      );
      return;
    }

    return new Promise((resolve) => {
      const fd = new FormData();
      fd.append("cacheControl", "3600");
      fd.append("", pf.file);

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signed.signedUrl);
      xhr.setRequestHeader("x-upsert", "false");

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        setFiles((prev) => prev.map((p) => (p.id === pf.id ? { ...p, progress: pct } : p)));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setFiles((prev) =>
            prev.map((p) => (p.id === pf.id ? { ...p, status: "done", progress: 100, url: signed.publicUrl } : p))
          );
        } else {
          setFiles((prev) => prev.map((p) => (p.id === pf.id ? { ...p, status: "error", error: `Upload failed (${xhr.status})` } : p)));
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
        setError(`${file.name}: too large (max 25MB)`);
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
      setError("Photos are still uploading. Give it a sec, then try again.");
      return;
    }

    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const mediaUrls = files.filter((f) => f.status === "done" && f.url).map((f) => f.url as string);

    const payload = {
      type: "booking" as const,
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || ""),
      address,
      city: addressMeta?.city,
      state: addressMeta?.state,
      zip: addressMeta?.postcode,
      service: String(fd.get("service") || ""),
      visitAt: visitAt ? new Date(visitAt).toISOString() : undefined,
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
      setError(`${msg}. Please call ${PHONE} instead.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <p className="text-2xl font-bold font-heading text-green-700">Consultation requested!</p>
        <p className="mt-2 text-base text-slate-600">Our team will call or text you to confirm your on-site visit.</p>
      </div>
    );
  }

  const labelClass = "block text-sm font-semibold mb-1 font-cta text-slate-700";
  const tipClass = "mt-1 text-xs text-slate-500";
  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-md">
      <h2 className="text-xl font-bold text-slate-900 font-heading mb-4">Book a Free On-Site Consultation</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Name</label>
          <input type="text" name="name" required autoComplete="name" placeholder="Your name" className={inputClass} />
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
          <p className={tipClass}>We&apos;ll text to confirm your visit.</p>
        </div>
      </div>

      <div className="mt-4">
        <label className={labelClass}>Email</label>
        <input type="email" name="email" autoComplete="email" placeholder="you@example.com" className={inputClass} />
      </div>

      <div className="mt-4" ref={addressBoxRef}>
        <label className={labelClass}>Property Address</label>
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
          {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">searching...</span>}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button type="button" onClick={() => pickSuggestion(s)} className="block w-full px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-green-50">
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className={tipClass}>Where the work would happen. Pick from the list so we route the right crew.</p>
      </div>

      <div className="mt-4">
        <label className={labelClass}>Service Interested In</label>
        <select name="service" required className={inputClass}>
          <option value="">Select a service...</option>
          {services.map((s) => (
            <option key={s.slug} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className={labelClass}>Preferred Visit (date & time)</label>
        <input
          type="datetime-local"
          name="visitAt"
          value={visitAt}
          onChange={(e) => setVisitAt(e.target.value)}
          min={getMinVisit()}
          required
          className={inputClass}
        />
        <p className={tipClass}>Pick a window when someone can walk the property with our designer. We confirm within 1 business day.</p>
      </div>

      <div className="mt-4">
        <label className={labelClass}>Photos of the space (optional but recommended)</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-600 transition-colors hover:bg-slate-100"
        >
          <p className="text-sm font-semibold">Tap to add photos of your yard or property</p>
          <p className="mt-1 text-xs opacity-75">JPEG, PNG, WebP, HEIC &middot; up to 25MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              handleFiles(e.target.files);
              e.currentTarget.value = "";
            }}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {files.map((f) => (
              <li key={f.id} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                <img src={f.previewUrl} alt={f.file.name} className="h-24 w-full object-cover" />
                <div className="px-2 py-1 text-[10px] text-slate-600">
                  <p className="truncate">{f.file.name}</p>
                  <p className="opacity-70">{formatSize(f.file.size)}</p>
                  {f.status === "uploading" && (
                    <>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full bg-green-500 transition-all duration-150" style={{ width: `${f.progress}%` }} />
                      </div>
                      <p className="text-green-600">{f.progress}%</p>
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
        <label className={labelClass}>Tell us about your project</label>
        <textarea
          name="details"
          rows={4}
          placeholder="e.g., backyard is roughly 20x30, want a patio + native plantings, no existing irrigation..."
          className={inputClass}
        />
      </div>

      {error && <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 w-full rounded-lg bg-green-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-60 font-cta"
      >
        {submitting ? "Sending..." : "Book Free Consultation"}
      </button>
    </form>
  );
}
