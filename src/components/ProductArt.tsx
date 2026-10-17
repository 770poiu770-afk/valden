/**
 * Neutral technical line illustrations used until licensed product photography is supplied
 * (set `imageUrl` on a product to use a real image). Deliberately generic: no manufacturer marks.
 */
type Kind = keyof typeof SHAPES;
const S = { stroke: "#13335E", strokeWidth: 2.2, fill: "none", strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const F = { fill: "#FFFFFF", stroke: "#13335E", strokeWidth: 2.2, strokeLinejoin: "round" as const };
const T = { fill: "#D9E3F0" };

const SHAPES = {
  phone: (
    <g>
      <rect x="88" y="22" width="64" height="136" rx="12" {...F} />
      <rect x="94" y="30" width="52" height="120" rx="7" {...T} />
      <rect x="110" y="34" width="20" height="6" rx="3" fill="#13335E" />
      <rect x="156" y="52" width="3" height="18" rx="1.5" fill="#13335E" />
    </g>
  ),
  foldable: (
    <g>
      <rect x="62" y="34" width="116" height="112" rx="10" {...F} />
      <rect x="69" y="41" width="102" height="98" rx="5" {...T} />
      <line x1="120" y1="38" x2="120" y2="142" {...S} strokeDasharray="3 4" />
    </g>
  ),
  flip: (
    <g>
      <rect x="90" y="20" width="60" height="68" rx="10" {...F} />
      <rect x="90" y="92" width="60" height="68" rx="10" {...F} />
      <rect x="97" y="27" width="46" height="40" rx="6" {...T} />
      <circle cx="104" cy="78" r="4" {...S} /><circle cx="117" cy="78" r="4" {...S} />
    </g>
  ),
  tablet: (
    <g>
      <rect x="52" y="30" width="136" height="120" rx="10" {...F} />
      <rect x="60" y="38" width="120" height="104" rx="4" {...T} />
      <circle cx="120" cy="34" r="1.6" fill="#13335E" />
    </g>
  ),
  laptop: (
    <g>
      <rect x="62" y="36" width="116" height="80" rx="6" {...F} />
      <rect x="69" y="43" width="102" height="66" rx="2" {...T} />
      <path d="M44 124h152l-10 16H54z" {...F} />
      <line x1="106" y1="130" x2="134" y2="130" {...S} />
    </g>
  ),
  desktop: (
    <g>
      <rect x="82" y="22" width="76" height="138" rx="5" {...F} />
      <rect x="90" y="32" width="60" height="88" rx="2" {...T} />
      {[0, 1, 2].map((i) => <circle key={i} cx="120" cy={56 + i * 22} r="8" {...S} />)}
      <line x1="92" y1="134" x2="148" y2="134" {...S} /><line x1="92" y1="144" x2="128" y2="144" {...S} />
    </g>
  ),
  workstation: (
    <g>
      <rect x="74" y="20" width="92" height="140" rx="5" {...F} />
      {Array.from({ length: 9 }).map((_, i) => <line key={i} x1="84" y1={34 + i * 10} x2="156" y2={34 + i * 10} {...S} strokeWidth={1.6} />)}
      <rect x="84" y="128" width="40" height="8" rx="2" {...T} />
      <circle cx="148" cy="140" r="5" {...S} />
    </g>
  ),
  macdesktop: (
    <g>
      <rect x="66" y="78" width="108" height="46" rx="10" {...F} />
      <line x1="80" y1="112" x2="104" y2="112" {...S} />
      <circle cx="160" cy="110" r="3" fill="#13335E" />
      <ellipse cx="120" cy="132" rx="46" ry="5" {...T} />
    </g>
  ),
  gpu: (
    <g>
      <rect x="30" y="56" width="180" height="62" rx="6" {...F} />
      {[0, 1, 2].map((i) => (<g key={i}><circle cx={68 + i * 52} cy="87" r="22" {...S} /><circle cx={68 + i * 52} cy="87" r="6" {...T} stroke="#13335E" strokeWidth={2} /></g>))}
      <path d="M44 118v14h90v-14" {...S} />
      {Array.from({ length: 10 }).map((_, i) => <line key={i} x1={48 + i * 8} y1="124" x2={48 + i * 8} y2="130" {...S} strokeWidth={1.4} />)}
    </g>
  ),
  cpu: (
    <g>
      <rect x="72" y="42" width="96" height="96" rx="6" {...F} />
      <rect x="92" y="62" width="56" height="56" rx="3" {...T} stroke="#13335E" strokeWidth={2} />
      <path d="M72 50l8-8" {...S} />
    </g>
  ),
  motherboard: (
    <g>
      <rect x="52" y="24" width="136" height="136" rx="4" {...F} />
      <rect x="66" y="40" width="40" height="40" rx="2" {...T} stroke="#13335E" strokeWidth={2} />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={120 + i * 13} y="36" width="6" height="56" rx="1" {...S} strokeWidth={1.8} />)}
      {[0, 1].map((i) => <rect key={i} x="64" y={104 + i * 22} width="110" height="8" rx="1" {...S} strokeWidth={1.8} />)}
    </g>
  ),
  ram: (
    <g>
      {[0, 1].map((k) => (
        <g key={k} transform={`translate(0 ${k * 40})`}>
          <rect x="26" y="58" width="188" height="32" rx="3" {...F} />
          {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={36 + i * 22} y="64" width="16" height="14" rx="1" {...T} />)}
          <line x1="118" y1="86" x2="118" y2="90" {...S} />
        </g>
      ))}
    </g>
  ),
  ssd: (
    <g>
      <rect x="22" y="72" width="196" height="36" rx="3" {...F} />
      <rect x="34" y="78" width="40" height="24" rx="2" {...T} /><rect x="82" y="78" width="40" height="24" rx="2" {...T} /><rect x="130" y="80" width="24" height="20" rx="2" {...S} />
      <path d="M206 82a8 8 0 1 0 0 16" {...S} />
      {Array.from({ length: 6 }).map((_, i) => <line key={i} x1="26" y1={78 + i * 5} x2="22" y2={78 + i * 5} {...S} strokeWidth={1.3} />)}
    </g>
  ),
  ssdbox: (
    <g>
      <rect x="62" y="40" width="116" height="100" rx="8" {...F} />
      <rect x="74" y="52" width="92" height="20" rx="2" {...T} />
      <circle cx="160" cy="124" r="3" fill="#13335E" />
    </g>
  ),
  monitor: (
    <g>
      <rect x="40" y="28" width="160" height="100" rx="5" {...F} />
      <rect x="47" y="35" width="146" height="86" rx="2" {...T} />
      <path d="M110 128l-6 24h32l-6-24" {...S} /><line x1="88" y1="152" x2="152" y2="152" {...S} />
    </g>
  ),
  ultrawide: (
    <g>
      <path d="M14 40q106-16 212 0v70q-106-16-212 0z" {...F} />
      <path d="M22 48q98-14 196 0v54q-98-14-196 0z" {...T} />
      <path d="M112 104l-6 30h28l-6-30" {...S} /><line x1="92" y1="134" x2="148" y2="134" {...S} />
    </g>
  ),
  rack: (
    <g>
      <rect x="20" y="66" width="200" height="40" rx="3" {...F} />
      {Array.from({ length: 12 }).map((_, i) => <rect key={i} x={34 + i * 12} y="78" width="9" height="8" rx="1" {...T} stroke="#13335E" strokeWidth={1.4} />)}
      {Array.from({ length: 12 }).map((_, i) => <rect key={`b${i}`} x={34 + i * 12} y="90" width="9" height="8" rx="1" {...T} stroke="#13335E" strokeWidth={1.4} />)}
      <circle cx="194" cy="86" r="4" {...S} /><circle cx="206" cy="86" r="4" {...S} />
    </g>
  ),
  ap: (
    <g>
      <rect x="66" y="66" width="108" height="48" rx="24" {...F} />
      <circle cx="120" cy="90" r="5" fill="#13335E" />
      <path d="M96 52q24-18 48 0M84 40q36-28 72 0" {...S} />
    </g>
  ),
  camera: (
    <g>
      <rect x="40" y="56" width="120" height="84" rx="8" {...F} />
      <rect x="56" y="44" width="40" height="14" rx="3" {...F} />
      <circle cx="108" cy="98" r="30" {...S} /><circle cx="108" cy="98" r="18" {...T} stroke="#13335E" strokeWidth={2} />
      <rect x="160" y="74" width="40" height="48" rx="4" {...F} />
    </g>
  ),
  mic: (
    <g>
      <rect x="98" y="24" width="44" height="78" rx="22" {...F} />
      {Array.from({ length: 5 }).map((_, i) => <line key={i} x1="104" y1={40 + i * 10} x2="136" y2={40 + i * 10} {...S} strokeWidth={1.5} />)}
      <path d="M86 86q34 40 68 0" {...S} /><line x1="120" y1="112" x2="120" y2="146" {...S} /><line x1="96" y1="148" x2="144" y2="148" {...S} />
    </g>
  ),
  controller: (
    <g>
      <rect x="40" y="48" width="160" height="84" rx="8" {...F} />
      {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={54 + (i % 4) * 26} y={60 + Math.floor(i / 4) * 26} width="20" height="20" rx="3" {...T} stroke="#13335E" strokeWidth={1.6} />)}
      {[0, 1].map((i) => <circle key={i} cx={170} cy={72 + i * 34} r="11" {...S} />)}
    </g>
  ),
  light: (
    <g>
      <rect x="58" y="30" width="124" height="80" rx="6" {...F} />
      <rect x="66" y="38" width="108" height="64" rx="3" {...T} />
      <line x1="120" y1="110" x2="120" y2="150" {...S} /><line x1="98" y1="152" x2="142" y2="152" {...S} />
    </g>
  ),
  psu: (
    <g>
      <rect x="44" y="44" width="152" height="92" rx="5" {...F} />
      <circle cx="104" cy="90" r="32" {...S} />
      {[0, 60, 120].map((r) => <path key={r} d="M104 90l0-26" {...S} transform={`rotate(${r} 104 90)`} />)}
      <rect x="152" y="66" width="30" height="20" rx="2" {...T} />
    </g>
  ),
  case: (
    <g>
      <rect x="62" y="20" width="116" height="140" rx="6" {...F} />
      <rect x="72" y="30" width="72" height="120" rx="3" {...T} />
      {[0, 1, 2].map((i) => <circle key={i} cx="161" cy={56 + i * 34} r="10" {...S} />)}
    </g>
  ),
  cooler: (
    <g>
      <rect x="22" y="60" width="196" height="50" rx="4" {...F} />
      {[0, 1, 2].map((i) => <circle key={i} cx={58 + i * 62} cy="85" r="20" {...S} />)}
      <path d="M100 110q-4 30 20 36" {...S} /><circle cx="128" cy="148" r="10" {...F} />
    </g>
  ),
  peripheral: (
    <g>
      <rect x="28" y="84" width="140" height="52" rx="6" {...F} />
      {Array.from({ length: 14 }).map((_, i) => <rect key={i} x={36 + (i % 7) * 18} y={92 + Math.floor(i / 7) * 18} width="14" height="12" rx="2" {...T} />)}
      <path d="M190 74c14 0 20 12 20 30s-6 34-20 34-20-16-20-34 6-30 20-30z" {...F} /><line x1="190" y1="76" x2="190" y2="96" {...S} />
    </g>
  ),
  headset: (
    <g>
      <path d="M70 110V92a50 50 0 0 1 100 0v18" {...S} />
      <rect x="58" y="100" width="28" height="44" rx="10" {...F} /><rect x="154" y="100" width="28" height="44" rx="10" {...F} />
    </g>
  ),
  dock: (
    <g>
      <rect x="40" y="74" width="160" height="34" rx="6" {...F} />
      {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={54 + i * 22} y="86" width="14" height="10" rx="2" {...T} stroke="#13335E" strokeWidth={1.4} />)}
      <path d="M186 74q20-26 0-46" {...S} />
    </g>
  ),
  generic: (
    <g>
      <rect x="62" y="48" width="116" height="84" rx="6" {...F} />
      <path d="M62 70h116" {...S} /><rect x="74" y="82" width="40" height="36" rx="2" {...T} />
    </g>
  ),
};

const ALIASES: Record<string, Kind> = {
  "desktop-custom": "desktop", "mac-desktop": "macdesktop", "gpu-pro": "gpu", "ssd-portable": "ssdbox", "ssd-enterprise": "ssdbox",
  "monitor-wide": "ultrawide", switch: "rack", router: "rack", nas: "rack", "camera-360": "camera", webcam: "camera", recorder: "camera",
  "mic-wireless": "mic", mixer: "controller", switcher: "controller", streamdeck: "controller", capture: "dock", gimbal: "camera",
  "cooler-air": "cooler", fan: "cooler", mouse: "peripheral", keyboard: "peripheral", ups: "psu", paste: "generic",
};

export function ProductArt({ kind, className = "", label }: { kind: string; className?: string; label?: string }) {
  const k: Kind = (kind in SHAPES ? kind : ALIASES[kind] ?? "generic") as Kind;
  return (
    <svg viewBox="0 0 240 180" className={className} style={{ background: "#EEF3F9" }} role="img" aria-label={label ?? "Product illustration"}>
      <rect width="240" height="180" fill="#EEF3F9" />
      <path d="M0 160h240" stroke="#D6DDE3" strokeWidth="1" />
      {SHAPES[k]}
    </svg>
  );
}
