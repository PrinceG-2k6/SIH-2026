import { useState } from "react";
import { importCsv } from "../services/api";

export function DataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const result = await importCsv(file);
      setStatus(`Imported ${result.imported_rows} rows from ${result.filename}. Models retrained.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <span className="tick-mark" />
          <p className="eyebrow text-[var(--accent)]">Ingest</p>
        </div>
        <h2 className="serif mt-2 text-4xl font-semibold text-[var(--ink)]">Data & assumptions</h2>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-muted)]">
          Import operational CSV compatible with the Baghewala schema. Demo data is used until real
          OIL history is available.
        </p>
      </div>

      <section className="plate p-8">
        <p className="eyebrow text-[var(--accent)]">CSV import</p>
        <p className="mt-3 max-w-2xl text-xs leading-relaxed text-[var(--ink-faint)]">
          Expected columns include well_id, timestamp, reservoir_temperature, oil_viscosity,
          steam_volume, injection_pressure, oil_rate_bopd, stroke_length, spm, sor,
          failure_probability.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <label className="btn-ghost cursor-pointer">
            {file ? file.name : "Choose CSV"}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button type="button" onClick={upload} disabled={!file || loading} className="btn-primary">
            {loading ? "Importing…" : "Import & retrain"}
          </button>
        </div>
        {status && <p className="mt-6 text-sm text-[var(--good)]">{status}</p>}
        {error && <p className="mt-6 text-sm text-[var(--bad)]">{error}</p>}
      </section>

      <section className="border-l-2 border-[var(--accent)] bg-[rgba(212,160,90,0.05)] px-6 py-5 text-sm text-[var(--ink-muted)]">
        <strong className="text-[var(--accent)]">Assumptions.</strong> Imported rows replace SQLite
        records. Synthetic results must not be presented as calibrated OIL field outcomes.
      </section>
    </div>
  );
}
