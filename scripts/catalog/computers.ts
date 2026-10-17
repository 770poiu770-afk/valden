import { CatalogItem, LITHIUM, MFR_WARRANTY } from "./types";

const GPU_PRICE: Record<string, number> = {
  "GeForce RTX 5090": 2400, "GeForce RTX 5080": 1150, "GeForce RTX 5070 Ti": 850, "GeForce RTX 5070": 600,
  "RTX PRO 6000 Blackwell": 8500, "RTX PRO 5000 Blackwell": 4600, "RTX PRO 4500 Blackwell": 2700, "RTX PRO 4000 Blackwell": 1600,
};
const CPU_PRICE: Record<string, number> = {
  "AMD Ryzen 9 9950X3D": 700, "AMD Ryzen 7 9800X3D": 480, "AMD Ryzen 9 9900X3D": 600, "AMD Ryzen 9 9950X": 600,
  "Intel Core Ultra 9 285K": 600, "Intel Core Ultra 7 265K": 400,
};

export function computers(): CatalogItem[] {
  const out: CatalogItem[] = [];

  /* ---------- Brand gaming desktops ---------- */
  type GD = { mfr: string; model: string; configs: { cpu: string; gpu: string; ram: number; ssd: number; usd: number }[]; chassis: string; psu: string; cooling: string };
  const gds: GD[] = [
    { mfr: "Dell", model: "Alienware Area-51 Gaming Desktop", chassis: "Alienware Area-51 full tower, positive-pressure airflow", psu: "1500W 80 PLUS Platinum", cooling: "360mm AIO liquid cooler",
      configs: [{ cpu: "Intel Core Ultra 9 285K", gpu: "GeForce RTX 5090", ram: 64, ssd: 4096, usd: 5299 }, { cpu: "Intel Core Ultra 9 285K", gpu: "GeForce RTX 5080", ram: 32, ssd: 2048, usd: 3699 }, { cpu: "Intel Core Ultra 7 265K", gpu: "GeForce RTX 5070 Ti", ram: 32, ssd: 2048, usd: 2999 }] },
    { mfr: "Corsair", model: "VENGEANCE a7500", chassis: "Corsair 5000D-series mid tower", psu: "1000W 80 PLUS Gold", cooling: "360mm iCUE LINK AIO",
      configs: [{ cpu: "AMD Ryzen 9 9950X3D", gpu: "GeForce RTX 5090", ram: 64, ssd: 4096, usd: 5499 }, { cpu: "AMD Ryzen 7 9800X3D", gpu: "GeForce RTX 5080", ram: 32, ssd: 2048, usd: 3699 }] },
    { mfr: "Corsair", model: "VENGEANCE i7500", chassis: "Corsair 5000D-series mid tower", psu: "1000W 80 PLUS Gold", cooling: "360mm iCUE LINK AIO",
      configs: [{ cpu: "Intel Core Ultra 9 285K", gpu: "GeForce RTX 5090", ram: 64, ssd: 4096, usd: 5299 }, { cpu: "Intel Core Ultra 7 265K", gpu: "GeForce RTX 5070 Ti", ram: 32, ssd: 2048, usd: 2699 }] },
    { mfr: "NZXT", model: "Player: Three Prime", chassis: "NZXT H9 Flow dual-chamber", psu: "1200W 80 PLUS Gold", cooling: "NZXT Kraken 360mm",
      configs: [{ cpu: "AMD Ryzen 7 9800X3D", gpu: "GeForce RTX 5090", ram: 64, ssd: 2048, usd: 4999 }, { cpu: "Intel Core Ultra 7 265K", gpu: "GeForce RTX 5080", ram: 32, ssd: 2048, usd: 3399 }] },
    { mfr: "Lenovo", model: "Legion Tower 7i Gen 10", chassis: "Legion 32L tower", psu: "1000W 80 PLUS Platinum", cooling: "360mm liquid cooling",
      configs: [{ cpu: "Intel Core Ultra 9 285K", gpu: "GeForce RTX 5090", ram: 64, ssd: 2048, usd: 4999 }, { cpu: "Intel Core Ultra 9 285K", gpu: "GeForce RTX 5080", ram: 32, ssd: 2048, usd: 3299 }, { cpu: "Intel Core Ultra 7 265K", gpu: "GeForce RTX 5070 Ti", ram: 32, ssd: 1024, usd: 2499 }] },
    { mfr: "HP", model: "OMEN MAX 45L", chassis: "OMEN 45L with Cryo Chamber", psu: "1500W 80 PLUS Gold", cooling: "OMEN Cryo Chamber 360mm AIO",
      configs: [{ cpu: "AMD Ryzen 9 9950X3D", gpu: "GeForce RTX 5090", ram: 64, ssd: 4096, usd: 5399 }, { cpu: "Intel Core Ultra 9 285K", gpu: "GeForce RTX 5080", ram: 32, ssd: 2048, usd: 3599 }] },
    { mfr: "MSI", model: "MEG Trident X2", chassis: "Compact 14L chassis with touch-display panel", psu: "1100W 80 PLUS Gold SFX", cooling: "Silent Storm Cooling 4",
      configs: [{ cpu: "Intel Core Ultra 9 285K", gpu: "GeForce RTX 5090", ram: 64, ssd: 2048, usd: 5499 }, { cpu: "Intel Core Ultra 9 285K", gpu: "GeForce RTX 5080", ram: 32, ssd: 2048, usd: 3999 }] },
    { mfr: "MSI", model: "MPG Infinite X3 AI", chassis: "MPG mid tower", psu: "1000W 80 PLUS Gold", cooling: "360mm AIO",
      configs: [{ cpu: "Intel Core Ultra 9 285K", gpu: "GeForce RTX 5080", ram: 32, ssd: 2048, usd: 3499 }, { cpu: "Intel Core Ultra 7 265K", gpu: "GeForce RTX 5070 Ti", ram: 32, ssd: 1024, usd: 2599 }] },
    { mfr: "ASUS", model: "ROG G700 Gaming Desktop", chassis: "ROG G700 tool-less tower", psu: "1200W 80 PLUS Platinum", cooling: "360mm AIO",
      configs: [{ cpu: "Intel Core Ultra 9 285K", gpu: "GeForce RTX 5090", ram: 64, ssd: 4096, usd: 5299 }, { cpu: "AMD Ryzen 9 9950X3D", gpu: "GeForce RTX 5080", ram: 32, ssd: 2048, usd: 3599 }] },
    { mfr: "Acer", model: "Predator Orion 7000", chassis: "Predator FrostBlade tower", psu: "1000W 80 PLUS Gold", cooling: "Liquid cooling",
      configs: [{ cpu: "Intel Core Ultra 9 285K", gpu: "GeForce RTX 5080", ram: 32, ssd: 2048, usd: 3299 }, { cpu: "Intel Core Ultra 7 265K", gpu: "GeForce RTX 5070 Ti", ram: 32, ssd: 1024, usd: 2499 }] },
    { mfr: "Origin PC", model: "Millennium Custom", chassis: "Corsair 7000D airflow full tower", psu: "1600W 80 PLUS Titanium", cooling: "420mm AIO",
      configs: [{ cpu: "AMD Ryzen 9 9950X3D", gpu: "GeForce RTX 5090", ram: 96, ssd: 8192, usd: 6499 }, { cpu: "AMD Ryzen 7 9800X3D", gpu: "GeForce RTX 5080", ram: 64, ssd: 4096, usd: 4299 }] },
    { mfr: "Maingear", model: "MG-1 Ultimate", chassis: "MG-1 premium mid tower", psu: "1200W 80 PLUS Gold", cooling: "360mm AIO",
      configs: [{ cpu: "AMD Ryzen 7 9800X3D", gpu: "GeForce RTX 5090", ram: 64, ssd: 4096, usd: 5199 }, { cpu: "AMD Ryzen 7 9800X3D", gpu: "GeForce RTX 5070 Ti", ram: 32, ssd: 2048, usd: 2899 }] },
  ];
  for (const g of gds) {
    for (const c of g.configs) {
      out.push({
        category: "gaming-desktops", subcategory: c.gpu.includes("5090") ? "Flagship (RTX 5090)" : c.gpu.includes("5080") ? "Enthusiast (RTX 5080)" : "Performance",
        manufacturer: g.mfr, model: g.model,
        name: `${g.mfr} ${g.model} — ${c.cpu.replace("AMD ", "").replace("Intel ", "")}, ${c.gpu.replace("GeForce ", "")}, ${c.ram}GB`,
        summary: `Factory-built ${g.mfr} gaming desktop configured with ${c.cpu} and NVIDIA ${c.gpu}.`,
        specs: [["Processor", "CPU", c.cpu], ["Graphics", "GPU", `NVIDIA ${c.gpu}`], ["Memory", "RAM", `${c.ram}GB DDR5`], ["Storage", "SSD", `${c.ssd >= 1024 ? c.ssd / 1024 + "TB" : c.ssd + "GB"} NVMe PCIe`], ["Chassis", "Case", g.chassis], ["Power", "PSU", g.psu], ["Cooling", "CPU cooling", g.cooling], ["Software", "OS", "Windows 11 Home or Pro (per regional SKU)"]],
        attributes: { cpu: c.cpu, gpu: c.gpu, ramGb: c.ram, storageGb: c.ssd, formFactor: "Tower" },
        referenceUsd: c.usd, moq: 2, availability: "ON_REQUEST", imageKey: "desktop",
        variants: [{ label: "US power cord / keyboard layout", region: "US" }, { label: "EU power cord / layout", region: "EU" }, { label: "UK/IL power configuration", region: "UK-IL" }],
        warrantyInfo: MFR_WARRANTY, regionCompatibility: "Power cord, keyboard layout and OS language depend on regional SKU.",
      });
    }
  }

  /* ---------- Valden build-to-order configurations ---------- */
  const series = [
    { name: "VX Apex", tier: "Extreme", case: "Lian Li O11 Dynamic EVO XL", cool: "420mm AIO (Arctic Liquid Freezer III Pro 420)", psu: "1600W 80 PLUS Titanium (ATX 3.1)", board: "X870E / Z890 flagship", build: 450 },
    { name: "VX Vanguard", tier: "Enthusiast", case: "Fractal Design North XL", cool: "360mm AIO", psu: "1200W 80 PLUS Platinum (ATX 3.1)", board: "X870E / Z890 performance", build: 300 },
    { name: "VX Compact", tier: "Small form factor", case: "Premium 15L SFF chassis", cool: "280mm AIO", psu: "1000W SFX-L 80 PLUS Platinum", board: "Mini-ITX X870I / Z890I", build: 380 },
  ];
  const cpus = ["AMD Ryzen 9 9950X3D", "AMD Ryzen 7 9800X3D", "Intel Core Ultra 9 285K", "AMD Ryzen 9 9900X3D"];
  const gpus = ["GeForce RTX 5090", "GeForce RTX 5080", "GeForce RTX 5070 Ti"];
  for (const s of series) {
    for (const cpu of cpus) {
      for (const gpu of gpus) {
        if (s.name === "VX Compact" && (cpu.includes("9900X3D") || gpu.includes("5070"))) continue;
        if (s.name === "VX Apex" && gpu.includes("5070")) continue;
        const ram = gpu.includes("5090") ? 96 : 64;
        const ssd = gpu.includes("5090") ? 4096 : 2048;
        const usd = CPU_PRICE[cpu] + GPU_PRICE[gpu] + (ram === 96 ? 380 : 240) + (ssd === 4096 ? 420 : 220) + 650 + s.build;
        out.push({
          category: "custom-gaming-pcs", subcategory: `${s.name} (${s.tier})`, manufacturer: "Valden Configured", model: s.name,
          name: `${s.name} — ${cpu.replace("AMD ", "").replace("Intel ", "")} / ${gpu.replace("GeForce ", "")} / ${ram}GB`,
          summary: `Build-to-order ${s.tier.toLowerCase()} configuration. Component brands, assembly, burn-in testing and lead time are confirmed per order in the commercial offer.`,
          specs: [["Processor", "CPU", cpu], ["Graphics", "GPU", `NVIDIA ${gpu} (board partner confirmed per order)`], ["Memory", "RAM", `${ram}GB DDR5-6000 (2 modules)`], ["Storage", "SSD", `${ssd / 1024}TB PCIe 5.0 NVMe`], ["Platform", "Motherboard", s.board], ["Chassis", "Case", s.case], ["Cooling", "CPU cooling", s.cool], ["Power", "PSU", s.psu], ["Software", "OS", "Windows 11 Pro (optional, per order)"]],
          attributes: { cpu, gpu, ramGb: ram, storageGb: ssd, formFactor: s.name === "VX Compact" ? "SFF" : "Tower" },
          referenceUsd: usd, moq: 2, availability: "BUILD_TO_ORDER", leadTime: "Indicative only — confirmed per order after component allocation", imageKey: "desktop-custom",
          variants: [{ label: "Black chassis", color: "Black" }, { label: "White chassis", color: "White" }],
          warrantyInfo: "Component manufacturer warranties apply; system-level warranty terms are set out in the commercial offer.",
        });
      }
    }
  }

  /* ---------- Workstations ---------- */
  type WS = { mfr: string; model: string; sub: string; cpu: string; gpu: string; ram: number; ssd: number; usd: number; extra: string; img?: string };
  const wss: WS[] = [
    { mfr: "Dell", model: "Pro Max Tower T2", sub: "Single-socket towers", cpu: "Intel Core Ultra 9 285K", gpu: "RTX PRO 4500 Blackwell", ram: 128, ssd: 4096, usd: 7299, extra: "1000W PSU, tool-less chassis" },
    { mfr: "Dell", model: "Pro Max Tower T2", sub: "Single-socket towers", cpu: "Intel Core Ultra 9 285K", gpu: "RTX PRO 6000 Blackwell", ram: 128, ssd: 4096, usd: 13499, extra: "1350W PSU, tool-less chassis" },
    { mfr: "HP", model: "Z8 Fury G5", sub: "High-core-count towers", cpu: "Intel Xeon w9-3595X (60 cores)", gpu: "RTX PRO 6000 Blackwell", ram: 256, ssd: 8192, usd: 22999, extra: "Up to 4 double-width GPUs, 2250W PSU" },
    { mfr: "HP", model: "Z8 Fury G5", sub: "High-core-count towers", cpu: "Intel Xeon w7-3565X (32 cores)", gpu: "RTX PRO 5000 Blackwell", ram: 128, ssd: 4096, usd: 13999, extra: "2250W PSU" },
    { mfr: "HP", model: "Z4 G5", sub: "Single-socket towers", cpu: "Intel Xeon w5-2565X (18 cores)", gpu: "RTX PRO 4000 Blackwell", ram: 64, ssd: 2048, usd: 5299, extra: "1125W PSU" },
    { mfr: "HP", model: "Z2 Tower G1i", sub: "Entry workstations", cpu: "Intel Core Ultra 9 285K", gpu: "RTX PRO 4000 Blackwell", ram: 64, ssd: 2048, usd: 4199, extra: "ISV-certified" },
    { mfr: "Lenovo", model: "ThinkStation PX", sub: "Dual-socket towers", cpu: "2× Intel Xeon Platinum 8580 (60 cores each)", gpu: "RTX PRO 6000 Blackwell", ram: 512, ssd: 8192, usd: 39999, extra: "Rack-convertible chassis, 1850W PSU" },
    { mfr: "Lenovo", model: "ThinkStation P8", sub: "High-core-count towers", cpu: "AMD Threadripper PRO 9985WX (64 cores)", gpu: "RTX PRO 6000 Blackwell", ram: 256, ssd: 4096, usd: 24999, extra: "1400W PSU" },
    { mfr: "Lenovo", model: "ThinkStation P8", sub: "High-core-count towers", cpu: "AMD Threadripper PRO 9975WX (32 cores)", gpu: "RTX PRO 5000 Blackwell", ram: 128, ssd: 4096, usd: 15999, extra: "1400W PSU" },
    { mfr: "Lenovo", model: "ThinkStation P5", sub: "Single-socket towers", cpu: "Intel Xeon w7-2595X (26 cores)", gpu: "RTX PRO 4500 Blackwell", ram: 128, ssd: 2048, usd: 8999, extra: "1000W PSU" },
    { mfr: "Lenovo", model: "ThinkStation P3 Ultra SFF Gen 2", sub: "Compact workstations", cpu: "Intel Core Ultra 9 285", gpu: "RTX PRO 4000 Blackwell SFF", ram: 64, ssd: 2048, usd: 3999, extra: "3.6L chassis" },
    { mfr: "Puget Systems", model: "Threadripper PRO Workstation", sub: "High-core-count towers", cpu: "AMD Threadripper PRO 9995WX (96 cores)", gpu: "RTX PRO 6000 Blackwell", ram: 512, ssd: 8192, usd: 34999, extra: "Configured to order" },
    { mfr: "BOXX", model: "APEXX W4", sub: "High-core-count towers", cpu: "AMD Threadripper PRO 9965WX (24 cores)", gpu: "RTX PRO 5000 Blackwell", ram: 256, ssd: 4096, usd: 16999, extra: "Configured to order" },
    { mfr: "Supermicro", model: "SYS-551A-T", sub: "Dual-socket towers", cpu: "Intel Xeon w9-3595X (60 cores)", gpu: "2× RTX PRO 6000 Blackwell Max-Q", ram: 512, ssd: 7680, usd: 42999, extra: "Tower/4U convertible" },
  ];
  for (const w of wss) {
    out.push({
      category: "workstations", subcategory: w.sub, manufacturer: w.mfr, model: w.model,
      name: `${w.mfr} ${w.model} — ${w.cpu.split(" (")[0].replace("Intel ", "").replace("AMD ", "")}, ${w.gpu}, ${w.ram}GB`,
      summary: `Professional workstation for simulation, rendering, AI development and media pipelines. Configuration confirmed against current manufacturer build options at quotation.`,
      specs: [["Processor", "CPU", w.cpu], ["Graphics", "GPU", `NVIDIA ${w.gpu}`], ["Memory", "RAM", `${w.ram}GB DDR5 ECC`], ["Storage", "SSD", `${w.ssd >= 1024 ? (w.ssd / 1024).toFixed(w.ssd % 1024 ? 2 : 0) + "TB" : w.ssd + "GB"} NVMe`], ["Platform", "Notes", w.extra], ["Software", "OS", "Windows 11 Pro for Workstations or Linux (per order)"]],
      attributes: { cpu: w.cpu, gpu: w.gpu, ramGb: w.ram, storageGb: w.ssd, formFactor: "Tower" },
      referenceUsd: w.usd, moq: 1, availability: "ON_REQUEST", imageKey: "workstation", warrantyInfo: MFR_WARRANTY,
      variants: [{ label: "Standard configuration", region: "GLOBAL" }],
    });
  }
  const macs: { model: string; chip: string; mem: number; ssd: number; usd: number }[] = [
    { model: "Mac Studio (2025)", chip: "M4 Max 16-core CPU / 40-core GPU", mem: 64, ssd: 1024, usd: 2899 },
    { model: "Mac Studio (2025)", chip: "M4 Max 16-core CPU / 40-core GPU", mem: 128, ssd: 2048, usd: 4099 },
    { model: "Mac Studio (2025)", chip: "M3 Ultra 28-core CPU / 60-core GPU", mem: 96, ssd: 1024, usd: 3999 },
    { model: "Mac Studio (2025)", chip: "M3 Ultra 32-core CPU / 80-core GPU", mem: 256, ssd: 4096, usd: 7499 },
    { model: "Mac Studio (2025)", chip: "M3 Ultra 32-core CPU / 80-core GPU", mem: 512, ssd: 8192, usd: 11699 },
    { model: "Mac Pro (Tower)", chip: "M2 Ultra 24-core CPU / 76-core GPU", mem: 192, ssd: 4096, usd: 9799 },
  ];
  for (const m of macs) {
    out.push({
      category: "workstations", subcategory: "Apple desktops", manufacturer: "Apple", model: m.model,
      name: `Apple ${m.model} — ${m.chip.split(" ")[0]} ${m.chip.split(" ")[1]}, ${m.mem}GB, ${m.ssd / 1024}TB`,
      summary: `Apple ${m.model} configured with ${m.chip}, ${m.mem}GB unified memory and ${m.ssd / 1024}TB SSD.`,
      specs: [["Processor", "Chip", m.chip], ["Memory", "Unified memory", `${m.mem}GB`], ["Storage", "SSD", `${m.ssd / 1024}TB`], ["Connectivity", "Ports", "Thunderbolt 5 / Thunderbolt 4 (model dependent), 10Gb Ethernet, HDMI"]],
      attributes: { cpu: m.chip.split(" ").slice(0, 2).join(" "), ramGb: m.mem, storageGb: m.ssd, formFactor: "Desktop" },
      referenceUsd: m.usd, moq: 2, availability: "ON_REQUEST", imageKey: "mac-desktop", warrantyInfo: MFR_WARRANTY,
      variants: [{ label: "US power configuration", region: "US" }, { label: "EU power configuration", region: "EU" }, { label: "UK/IL power configuration", region: "UK-IL" }],
    });
  }

  /* ---------- Laptops ---------- */
  type LP = { mfr: string; model: string; sub: string; cpu: string; gpu: string; ram: number; ssd: number; screen: number; display: string; usd: number; colors: string[] };
  const lps: LP[] = [
    { mfr: "Apple", model: "MacBook Pro 14 (M5)", sub: "MacBook Pro", cpu: "Apple M5 10-core", gpu: "10-core GPU", ram: 16, ssd: 512, screen: 14.2, display: "14.2-inch Liquid Retina XDR", usd: 1599, colors: ["Space Black", "Silver"] },
    { mfr: "Apple", model: "MacBook Pro 14 (M5)", sub: "MacBook Pro", cpu: "Apple M5 10-core", gpu: "10-core GPU", ram: 16, ssd: 1024, screen: 14.2, display: "14.2-inch Liquid Retina XDR", usd: 1799, colors: ["Space Black", "Silver"] },
    { mfr: "Apple", model: "MacBook Pro 14 (M5)", sub: "MacBook Pro", cpu: "Apple M5 10-core", gpu: "10-core GPU", ram: 24, ssd: 1024, screen: 14.2, display: "14.2-inch Liquid Retina XDR", usd: 1999, colors: ["Space Black", "Silver"] },
    { mfr: "Apple", model: "MacBook Pro 14 (M4 Pro)", sub: "MacBook Pro", cpu: "Apple M4 Pro 12-core", gpu: "16-core GPU", ram: 24, ssd: 512, screen: 14.2, display: "14.2-inch Liquid Retina XDR", usd: 1999, colors: ["Space Black", "Silver"] },
    { mfr: "Apple", model: "MacBook Pro 14 (M4 Pro)", sub: "MacBook Pro", cpu: "Apple M4 Pro 14-core", gpu: "20-core GPU", ram: 48, ssd: 1024, screen: 14.2, display: "14.2-inch Liquid Retina XDR", usd: 2799, colors: ["Space Black", "Silver"] },
    { mfr: "Apple", model: "MacBook Pro 14 (M4 Max)", sub: "MacBook Pro", cpu: "Apple M4 Max 14-core", gpu: "32-core GPU", ram: 36, ssd: 1024, screen: 14.2, display: "14.2-inch Liquid Retina XDR", usd: 3199, colors: ["Space Black", "Silver"] },
    { mfr: "Apple", model: "MacBook Pro 16 (M4 Pro)", sub: "MacBook Pro", cpu: "Apple M4 Pro 14-core", gpu: "20-core GPU", ram: 24, ssd: 512, screen: 16.2, display: "16.2-inch Liquid Retina XDR", usd: 2499, colors: ["Space Black", "Silver"] },
    { mfr: "Apple", model: "MacBook Pro 16 (M4 Pro)", sub: "MacBook Pro", cpu: "Apple M4 Pro 14-core", gpu: "20-core GPU", ram: 48, ssd: 512, screen: 16.2, display: "16.2-inch Liquid Retina XDR", usd: 2899, colors: ["Space Black", "Silver"] },
    { mfr: "Apple", model: "MacBook Pro 16 (M4 Max)", sub: "MacBook Pro", cpu: "Apple M4 Max 14-core", gpu: "32-core GPU", ram: 36, ssd: 1024, screen: 16.2, display: "16.2-inch Liquid Retina XDR", usd: 3499, colors: ["Space Black", "Silver"] },
    { mfr: "Apple", model: "MacBook Pro 16 (M4 Max)", sub: "MacBook Pro", cpu: "Apple M4 Max 16-core", gpu: "40-core GPU", ram: 48, ssd: 1024, screen: 16.2, display: "16.2-inch Liquid Retina XDR", usd: 3999, colors: ["Space Black", "Silver"] },
    { mfr: "Apple", model: "MacBook Pro 16 (M4 Max)", sub: "MacBook Pro", cpu: "Apple M4 Max 16-core", gpu: "40-core GPU", ram: 128, ssd: 2048, screen: 16.2, display: "16.2-inch Liquid Retina XDR", usd: 5399, colors: ["Space Black", "Silver"] },
    { mfr: "Apple", model: "MacBook Air 15 (M4)", sub: "MacBook Air", cpu: "Apple M4 10-core", gpu: "10-core GPU", ram: 24, ssd: 512, screen: 15.3, display: "15.3-inch Liquid Retina", usd: 1599, colors: ["Midnight", "Starlight", "Sky Blue", "Silver"] },
    { mfr: "Razer", model: "Blade 16 (2025)", sub: "Gaming laptops", cpu: "AMD Ryzen AI 9 HX 370", gpu: "GeForce RTX 5090 Laptop GPU (24GB)", ram: 64, ssd: 4096, screen: 16, display: "16-inch QHD+ 240Hz OLED", usd: 4499, colors: ["Black"] },
    { mfr: "Razer", model: "Blade 16 (2025)", sub: "Gaming laptops", cpu: "AMD Ryzen AI 9 HX 370", gpu: "GeForce RTX 5080 Laptop GPU (16GB)", ram: 32, ssd: 2048, screen: 16, display: "16-inch QHD+ 240Hz OLED", usd: 3499, colors: ["Black"] },
    { mfr: "ASUS", model: "ROG Zephyrus G16 (2025)", sub: "Gaming laptops", cpu: "Intel Core Ultra 9 285H", gpu: "GeForce RTX 5090 Laptop GPU (24GB)", ram: 32, ssd: 2048, screen: 16, display: "16-inch 2.5K 240Hz OLED", usd: 3999, colors: ["Eclipse Gray"] },
    { mfr: "ASUS", model: "ROG Strix SCAR 18 (2025)", sub: "Gaming laptops", cpu: "Intel Core Ultra 9 275HX", gpu: "GeForce RTX 5090 Laptop GPU (24GB)", ram: 64, ssd: 4096, screen: 18, display: "18-inch 2.5K 240Hz Mini LED", usd: 4499, colors: ["Off Black"] },
    { mfr: "Lenovo", model: "Legion Pro 7i Gen 10", sub: "Gaming laptops", cpu: "Intel Core Ultra 9 275HX", gpu: "GeForce RTX 5080 Laptop GPU (16GB)", ram: 32, ssd: 2048, screen: 16, display: "16-inch WQXGA 240Hz OLED", usd: 3199, colors: ["Eclipse Black"] },
    { mfr: "MSI", model: "Titan 18 HX AI", sub: "Gaming laptops", cpu: "Intel Core Ultra 9 285HX", gpu: "GeForce RTX 5090 Laptop GPU (24GB)", ram: 96, ssd: 6144, screen: 18, display: "18-inch 4K 120Hz Mini LED", usd: 5999, colors: ["Core Black"] },
    { mfr: "MSI", model: "Raider 18 HX AI", sub: "Gaming laptops", cpu: "Intel Core Ultra 9 285HX", gpu: "GeForce RTX 5080 Laptop GPU (16GB)", ram: 32, ssd: 2048, screen: 18, display: "18-inch QHD+ 240Hz Mini LED", usd: 3699, colors: ["Core Black"] },
    { mfr: "Alienware", model: "18 Area-51", sub: "Gaming laptops", cpu: "Intel Core Ultra 9 275HX", gpu: "GeForce RTX 5090 Laptop GPU (24GB)", ram: 64, ssd: 4096, screen: 18, display: "18-inch QHD+ 300Hz", usd: 4799, colors: ["Liquid Teal"] },
    { mfr: "Dell", model: "Pro Max 16 Premium", sub: "Mobile workstations", cpu: "Intel Core Ultra 9 285H", gpu: "NVIDIA RTX PRO 5000 Blackwell Laptop GPU", ram: 64, ssd: 2048, screen: 16, display: "16-inch UHD+ tandem OLED", usd: 5999, colors: ["Magnetite"] },
    { mfr: "HP", model: "ZBook Ultra G1a 14", sub: "Mobile workstations", cpu: "AMD Ryzen AI Max+ PRO 395", gpu: "Radeon 8060S (integrated)", ram: 128, ssd: 2048, screen: 14, display: "14-inch 2.8K 120Hz OLED touch", usd: 4999, colors: ["Silver"] },
    { mfr: "HP", model: "ZBook Fury G1i 16", sub: "Mobile workstations", cpu: "Intel Core Ultra 9 285HX", gpu: "NVIDIA RTX PRO 5000 Blackwell Laptop GPU", ram: 64, ssd: 2048, screen: 16, display: "16-inch WQUXGA", usd: 6299, colors: ["Silver"] },
    { mfr: "Lenovo", model: "ThinkPad P1 Gen 8", sub: "Mobile workstations", cpu: "Intel Core Ultra 9 285H", gpu: "NVIDIA RTX PRO 2000 Blackwell Laptop GPU", ram: 64, ssd: 2048, screen: 16, display: "16-inch 3.2K tandem OLED", usd: 4299, colors: ["Black"] },
    { mfr: "Lenovo", model: "ThinkPad X1 Carbon Gen 13 Aura Edition", sub: "Business ultraportables", cpu: "Intel Core Ultra 7 268V", gpu: "Intel Arc 140V (integrated)", ram: 32, ssd: 1024, screen: 14, display: "14-inch 2.8K OLED", usd: 2399, colors: ["Black"] },
    { mfr: "Dell", model: "XPS 14", sub: "Premium ultraportables", cpu: "Intel Core Ultra 7", gpu: "Intel Arc (integrated)", ram: 32, ssd: 1024, screen: 14, display: "14-inch 3.2K OLED touch", usd: 1999, colors: ["Graphite"] },
    { mfr: "Microsoft", model: "Surface Laptop 7th Edition 15\"", sub: "Premium ultraportables", cpu: "Snapdragon X Elite", gpu: "Adreno (integrated)", ram: 32, ssd: 1024, screen: 15, display: "15-inch PixelSense Flow touch", usd: 2399, colors: ["Platinum", "Black"] },
    { mfr: "ASUS", model: "ProArt P16 (H7606)", sub: "Creator laptops", cpu: "AMD Ryzen AI 9 HX 370", gpu: "GeForce RTX 5070 Laptop GPU (8GB)", ram: 64, ssd: 2048, screen: 16, display: "16-inch 4K 120Hz OLED touch", usd: 3299, colors: ["Nano Black"] },
  ];
  for (const l of lps) {
    out.push({
      category: "laptops", subcategory: l.sub, manufacturer: l.mfr, model: l.model,
      name: `${l.mfr} ${l.model} — ${l.ram}GB / ${l.ssd >= 1024 ? l.ssd / 1024 + "TB" : l.ssd + "GB"}${l.mfr === "Apple" ? `, ${l.cpu.replace("Apple ", "")}` : `, ${l.gpu.split(" Laptop")[0].replace("GeForce ", "").replace("NVIDIA ", "")}`}`,
      summary: `${l.mfr} ${l.model} with ${l.display} display, ${l.cpu} and ${l.ram}GB memory.`,
      specs: [["Display", "Panel", l.display], ["Processor", "CPU", l.cpu], ["Graphics", "GPU", l.gpu], ["Memory", "RAM", `${l.ram}GB`], ["Storage", "SSD", l.ssd >= 1024 ? `${l.ssd / 1024}TB` : `${l.ssd}GB`]],
      attributes: { cpu: l.cpu, gpu: l.gpu, ramGb: l.ram, storageGb: l.ssd, screenIn: l.screen },
      referenceUsd: l.usd, moq: 5, availability: l.mfr === "Apple" ? "INDICATIVE_AVAILABLE" : "ON_REQUEST", imageKey: "laptop",
      variants: l.colors.flatMap((c) => [{ label: `${c} · US English keyboard`, color: c, region: "US" }, { label: `${c} · International English keyboard`, color: c, region: "INTL" }]),
      shippingRestrictions: LITHIUM, warrantyInfo: MFR_WARRANTY, regionCompatibility: "Keyboard layout and power adapter plug vary by regional SKU.",
    });
  }
  return out;
}
