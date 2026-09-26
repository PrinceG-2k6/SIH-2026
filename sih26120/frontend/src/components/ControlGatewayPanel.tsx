import React, { useEffect, useState } from "react";
import type { ClosedLoopVerificationResponse, ControlDispatchPayload, OperatingParameters } from "../types";
import { dispatchControl, generateControlPayload, verifyControl } from "../services/api";

interface ControlGatewayPanelProps {
  wellId: string;
  parameters?: OperatingParameters;
  className?: string;
}

export const ControlGatewayPanel: React.FC<ControlGatewayPanelProps> = ({
  wellId,
  parameters,
  className = "",
}) => {
  const [mode, setMode] = useState<"advisory" | "autonomous">("advisory");
  const [targetSpm, setTargetSpm] = useState<number>(5.5);
  const [payload, setPayload] = useState<ControlDispatchPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<Record<string, unknown> | null>(null);
  const [verification, setVerification] = useState<ClosedLoopVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"modbus" | "mqtt" | "opcua">("modbus");

  // Fetch / recalculate payload
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setDispatchResult(null);
    setVerification(null);

    const fetchPayload = async () => {
      try {
        const res = await generateControlPayload(wellId, targetSpm, mode, parameters);
        if (isMounted) {
          setPayload(res);
          setLoading(false);

          // If in Autonomous Mode and interlock is SAFE, auto-dispatch
          if (mode === "autonomous" && res.safety_gate !== "BLOCKED") {
            handleDispatch(res);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to calculate control payload");
          setLoading(false);
        }
      }
    };

    fetchPayload();
    return () => {
      isMounted = false;
    };
  }, [wellId, targetSpm, mode, parameters]);

  const handleDispatch = async (payloadToDispatch?: ControlDispatchPayload) => {
    const target = payloadToDispatch || payload;
    if (!target) return;

    setDispatching(true);
    setError(null);

    try {
      const res = await dispatchControl(wellId, target);
      setDispatchResult(res);

      // Verify closed loop feedback after dispatch
      const ver = await verifyControl(wellId, target.dispatch_id);
      setVerification(ver);
      setDispatching(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Control dispatch failed");
      setDispatching(false);
    }
  };

  if (loading && !payload) {
    return (
      <div className={`plate p-6 rounded-xl bg-slate-900/80 border border-slate-800 text-center ${className}`}>
        <div className="animate-spin inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mb-3"></div>
        <p className="text-slate-400 text-sm font-mono">Evaluating Industrial Control Payloads & Interlocks...</p>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className={`plate p-6 rounded-xl bg-slate-900/80 border border-red-500/30 text-red-400 text-sm font-mono ${className}`}>
        {error || "Control Gateway offline"}
      </div>
    );
  }

  const isBlocked = payload.safety_gate === "BLOCKED";
  const isWarning = payload.safety_gate === "WARNING";

  return (
    <div className={`plate p-6 rounded-xl bg-slate-950/90 border border-slate-800 shadow-2xl text-slate-100 ${className}`}>
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold tracking-tight text-amber-400 font-serif">
              Autonomous Closed-Loop Control & VFD Gateway
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                mode === "autonomous"
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/50"
                  : "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
              }`}
            >
              {mode === "autonomous" ? "AUTONOMOUS CLOSED-LOOP" : "ADVISORY (HUMAN-IN-THE-LOOP)"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Industrial Edge Protocol Dispatch @ {payload.well_name} (Modbus TCP / MQTT / OPC-UA)
          </p>
        </div>

        {/* Target SPM Adjustment & Mode Toggle Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono">
            <span className="text-slate-400">Target SPM:</span>
            <input
              type="number"
              min={3.0}
              max={10.0}
              step={0.5}
              value={targetSpm}
              onChange={(e) => setTargetSpm(Number(e.target.value))}
              className="w-14 bg-slate-950 text-amber-400 font-bold border border-slate-700 rounded px-1.5 py-0.5 text-center outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setMode("advisory")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                mode === "advisory" ? "bg-cyan-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Advisory (HITL)
            </button>
            <button
              onClick={() => setMode("autonomous")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                mode === "autonomous" ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Autonomous Mode
            </button>
          </div>
        </div>
      </div>

      {/* Trigger & Safety Interlock Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Watchdog Trigger */}
        <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800">
          <p className="text-xs text-slate-400 font-mono mb-1">Operational State Watchdog Trigger:</p>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                payload.trigger_condition.includes("RISK") || payload.trigger_condition.includes("SURGE")
                  ? "bg-amber-500 animate-ping"
                  : "bg-emerald-500"
              }`}
            />
            <span className="font-mono text-sm font-bold text-amber-300">{payload.trigger_condition}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Target SPM: <span className="text-amber-400 font-bold">{payload.recommended_spm} SPM</span> ({payload.vfd_frequency_hz} Hz)
          </p>
        </div>

        {/* Rule-Based Safety Interlock */}
        <div className={`p-4 rounded-lg border ${
          isBlocked
            ? "bg-red-950/60 border-red-800 text-red-300"
            : isWarning
            ? "bg-amber-950/60 border-amber-800 text-amber-300"
            : "bg-emerald-950/60 border-emerald-800 text-emerald-300"
        }`}>
          <div className="flex items-center justify-between mb-1 font-mono">
            <p className="text-xs">Hard Safety Interlock Gate:</p>
            <span className="font-bold text-xs uppercase px-2 py-0.5 rounded border border-current">
              {payload.safety_gate}
            </span>
          </div>
          <ul className="text-[11px] font-mono space-y-1 mt-2">
            {payload.safety_reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Industrial Protocol Tabs & Register Inspector */}
      <div className="mb-6">
        <div className="flex border-b border-slate-800 text-xs font-mono mb-3">
          <button
            onClick={() => setActiveTab("modbus")}
            className={`px-4 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === "modbus"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Modbus TCP Register Map
          </button>
          <button
            onClick={() => setActiveTab("mqtt")}
            className={`px-4 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === "mqtt"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            MQTT Industrial JSON Schema
          </button>
          <button
            onClick={() => setActiveTab("opcua")}
            className={`px-4 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === "opcua"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            OPC-UA Node Map
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "modbus" && (
          <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 font-mono text-xs overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-2">Register Address</th>
                  <th className="pb-2">Parameter Description</th>
                  <th className="pb-2">Value</th>
                  <th className="pb-2">Data Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                <tr>
                  <td className="py-2 text-amber-400">Reg 40001</td>
                  <td className="py-2">VFD Speed Setpoint %</td>
                  <td className="py-2 font-bold text-emerald-400">{payload.modbus_tcp.vfd_speed_pct_reg_40001}%</td>
                  <td className="py-2 text-slate-400">Float32</td>
                </tr>
                <tr>
                  <td className="py-2 text-amber-400">Reg 40002</td>
                  <td className="py-2">VFD Motor Frequency (Hz)</td>
                  <td className="py-2 font-bold text-emerald-400">{payload.modbus_tcp.vfd_frequency_hz_reg_40002} Hz</td>
                  <td className="py-2 text-slate-400">Float32</td>
                </tr>
                <tr>
                  <td className="py-2 text-amber-400">Reg 40003</td>
                  <td className="py-2">Target Strokes Per Minute (SPM)</td>
                  <td className="py-2 font-bold text-emerald-400">{payload.modbus_tcp.target_spm_reg_40003} SPM</td>
                  <td className="py-2 text-slate-400">Float32</td>
                </tr>
                <tr>
                  <td className="py-2 text-amber-400">Reg 40004</td>
                  <td className="py-2">Safety Interlock Gate Code</td>
                  <td className="py-2 font-bold text-cyan-400">{payload.modbus_tcp.safety_interlock_code_reg_40004} ({payload.safety_gate})</td>
                  <td className="py-2 text-slate-400">Int16</td>
                </tr>
                <tr>
                  <td className="py-2 text-amber-400">Reg 40005</td>
                  <td className="py-2">Control Mode Code</td>
                  <td className="py-2 font-bold text-purple-400">{payload.modbus_tcp.mode_code_reg_40005} ({payload.mode})</td>
                  <td className="py-2 text-slate-400">Int16</td>
                </tr>
                <tr>
                  <td className="py-2 text-amber-400">Reg 40006</td>
                  <td className="py-2">Transaction Sequence ID</td>
                  <td className="py-2 text-slate-300">#TX-{payload.modbus_tcp.transaction_id_reg_40006}</td>
                  <td className="py-2 text-slate-400">UInt32</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "mqtt" && (
          <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 font-mono text-xs">
            <p className="text-amber-400 font-semibold mb-1">Topic: {payload.mqtt.topic} (QoS 1)</p>
            <pre className="text-slate-300 text-[11px] overflow-x-auto bg-slate-950 p-2.5 rounded border border-slate-800">
              {JSON.stringify(payload.mqtt.payload_json, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === "opcua" && (
          <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 font-mono text-xs space-y-2 text-slate-300">
            <p><span className="text-amber-400 font-semibold">SPM Node:</span> {payload.opc_ua.node_spm}</p>
            <p><span className="text-amber-400 font-semibold">Frequency Node:</span> {payload.opc_ua.node_frequency}</p>
            <p><span className="text-amber-400 font-semibold">Safety Interlock Node:</span> {payload.opc_ua.node_safety_gate}</p>
          </div>
        )}
      </div>

      {/* Dispatch Action & Closed-Loop Feedback Verification */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          {mode === "advisory" ? (
            <button
              onClick={() => handleDispatch()}
              disabled={isBlocked || dispatching}
              className={`px-5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all ${
                isBlocked
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-lg shadow-amber-500/20"
              }`}
            >
              {dispatching ? "Dispatching Control Payload..." : "Approve & Apply Setpoint to Field VFD"}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400 bg-purple-950/40 border border-purple-800/60 px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
              <span>Autonomous Closed-Loop Dispatch Active</span>
            </div>
          )}
        </div>

        {/* Verification & Dispatch Result Status */}
        {(verification || dispatchResult) && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
            <span className="text-slate-400">Closed-Loop Gateway Status:</span>
            <span className={`font-bold ${verification?.status === "VERIFIED_SUCCESS" || dispatchResult?.status === "DISPATCHED_SUCCESS" ? "text-emerald-400" : "text-amber-400"}`}>
              {verification?.status || String(dispatchResult?.status || "DISPATCHED")}
            </span>
            <span className="text-slate-500">| Float Cleared: {verification?.rod_float_cleared ? "YES" : "NO"}</span>
          </div>
        )}
      </div>
    </div>
  );
};
