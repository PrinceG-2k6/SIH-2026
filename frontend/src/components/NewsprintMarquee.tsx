interface Props {
  wellId?: string;
  bopd?: number;
  temp?: number;
  sor?: number;
  alertCount?: number;
}

export function NewsprintMarquee({
  wellId = "BGW-01",
  bopd,
  temp,
  sor,
  alertCount = 0,
}: Props) {
  const items = [
    { label: "RECORD DISPATCH", value: "BAGHEWALA CSS CYCLE IV ACTIVE", highlight: true },
    { label: "TARGET WELL", value: wellId },
    { label: "OIL OFFTAKE", value: bopd ? `${bopd.toFixed(1)} BOPD` : "142.8 BOPD" },
    { label: "THERMAL CORE", value: temp ? `${temp.toFixed(1)} °C` : "52.4 °C" },
    { label: "SOR RATIO", value: sor ? `${sor.toFixed(2)}` : "3.18" },
    { label: "AI LIFT", value: "+18.4% NET RECOVERY", highlight: true },
    { label: "EQUIPMENT STATUS", value: alertCount > 0 ? `${alertCount} ACTIVE ALERTS` : "NOMINAL / NO DRIFT", alert: alertCount > 0 },
    { label: "CRUDE SPEC", value: "HEAVY OIL 16.5° API · 1,120 cP" },
    { label: "MOMENTUM", value: "SPM 5.8 · STROKE 2.60 m" },
    { label: "SYSTEM", value: "STRATA · OIL INDIA LIMITED · SIH-2026" },
  ];

  return (
    <div className="relative overflow-hidden border-y border-[#111111] bg-[#111111] py-1.5 text-[#FAF7EE]">
      <div className="flex w-max animate-marquee space-x-8 whitespace-nowrap">
        {[...items, ...items, ...items].map((item, idx) => (
          <div key={idx} className="flex items-center space-x-2 text-[11px] font-mono tracking-wider">
            {item.highlight ? (
              <span className="bg-[#C41212] px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                {item.label}
              </span>
            ) : item.alert ? (
              <span className="bg-[#C41212] px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                {item.label}
              </span>
            ) : (
              <span className="text-[#8C867A] uppercase">{item.label}:</span>
            )}
            <span className={item.highlight ? "font-bold text-[#FAF7EE]" : "text-[#DED6C4]"}>
              {item.value}
            </span>
            <span className="text-[#6B655A] select-none">/</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-marquee {
          animation: marquee 35s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
