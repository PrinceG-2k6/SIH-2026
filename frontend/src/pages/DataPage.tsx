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
      setStatus(`Imported ${result.imported_rows} rows from ${result.filename}. Models successfully retrained.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const schemaColumns = [
    { name: "well_id", type: "STRING", desc: "Identifier e.g. BGW-01" },
    { name: "timestamp", type: "ISO-8601", desc: "Date/time of log" },
    { name: "reservoir_temperature", type: "FLOAT (°C)", desc: "Bottom-hole temperature" },
    { name: "oil_viscosity", type: "FLOAT (cP)", desc: "Dynamic heavy oil viscosity" },
    { name: "steam_volume", type: "FLOAT (t)", desc: "Steam injected this cycle" },
    { name: "injection_pressure", type: "FLOAT (bar)", desc: "Wellhead steam pressure" },
    { name: "oil_rate_bopd", type: "FLOAT (bbl/d)", desc: "Measured surface crude rate" },
    { name: "stroke_length", type: "FLOAT (m)", desc: "Polish rod stroke length" },
    { name: "spm", type: "FLOAT (1/min)", desc: "Surface strokes per minute" },
    { name: "sor", type: "FLOAT", desc: "Steam-to-oil mass ratio" },
    { name: "failure_probability", type: "FLOAT (0-1)", desc: "Calculated fatigue hazard" },
  ];

  return (
    <div className="fade-in space-y-10">
      {/* Title Banner */}
      <div className="border-b-2 border-[#111111] pb-4">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
          DISPATCH ARCHIVE & TELEMETRY INGESTION
        </span>
        <h2 className="mt-1 font-serif text-4xl sm:text-5xl font-black text-[#111111] uppercase">
          Data Intake & Model Retraining
        </h2>
        <p className="mt-2 font-body text-sm text-[#525252] max-w-2xl leading-relaxed">
          Ingest new production CSV logs conforming to the Baghewala schema.
          Upon successful verification, surrogate regression and failure models automatically retrain.
        </p>
      </div>

      {/* Upload Box */}
      <section className="border-2 border-[#111111] bg-white p-6 sm:p-8 hard-shadow">
        <div className="border-b border-[#111111] pb-3 mb-6">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
            FILE TRANSFER PROTOCOL
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#111111]">
            Upload Production History (.CSV)
          </h3>
        </div>

        <div className="border-2 border-dashed border-[#111111] bg-[#F9F9F7] p-8 text-center">
          <input
            type="file"
            id="csv-file-input"
            accept=".csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <label
            htmlFor="csv-file-input"
            className="cursor-pointer inline-flex flex-col items-center"
          >
            <span className="btn-secondary mb-3">
              {file ? file.name : "Select CSV File"}
            </span>
            <span className="font-mono text-xs text-[#737373]">
              {file ? "File selected — ready to import & retrain" : "Click to browse local files"}
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={upload}
            disabled={!file || loading}
            className="btn-primary py-3 px-8 text-xs"
          >
            {loading ? "Ingesting & Retraining Models…" : "Import & Retrain Pipeline"}
          </button>

          {status && (
            <div className="border border-[#1b6a38] bg-[#F5FFF8] px-4 py-2 font-mono text-xs text-[#1b6a38] font-bold">
              ✓ {status}
            </div>
          )}

          {error && (
            <div className="border border-[#CC0000] bg-[#FFF5F5] px-4 py-2 font-mono text-xs text-[#CC0000] font-bold">
              ✗ {error}
            </div>
          )}
        </div>
      </section>

      {/* Schema Reference Table */}
      <section className="border border-[#111111] bg-white p-6">
        <div className="border-b border-[#111111] pb-3 mb-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
            BAGHEWALA FIELD SPECIFICATION
          </span>
          <h4 className="font-serif text-xl font-bold text-[#111111]">
            Required Column Schema
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left font-mono text-xs border border-[#111111]">
            <thead>
              <tr className="border-b border-[#111111] bg-[#111111] text-[#F9F9F7]">
                <th className="px-4 py-2 font-bold uppercase">Column Key</th>
                <th className="px-4 py-2 font-bold uppercase">Data Type</th>
                <th className="px-4 py-2 font-bold uppercase">Physical Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E0]">
              {schemaColumns.map((col, idx) => (
                <tr key={col.name} className={idx % 2 === 0 ? "bg-white" : "bg-[#F9F9F7]"}>
                  <td className="px-4 py-2 font-bold text-[#111111] border-r border-[#E5E5E0]">
                    {col.name}
                  </td>
                  <td className="px-4 py-2 text-[#CC0000] font-semibold border-r border-[#E5E5E0]">
                    {col.type}
                  </td>
                  <td className="px-4 py-2 text-[#525252]">
                    {col.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Official Disclaimer Notice */}
      <div className="border-l-4 border-[#CC0000] bg-[#F9F9F7] p-4 font-mono text-xs text-[#525252]">
        <strong className="text-[#CC0000] uppercase font-bold">OFFICIAL NOTICE:</strong> Ingested CSV records replace active SQLite database tables and trigger retraining of surrogate models. Predictions and Pareto alternatives remain synthetic approximations for decision-support and do not replace certified Oil India Limited field operating limits.
      </div>
    </div>
  );
}
