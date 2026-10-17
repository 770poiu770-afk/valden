import { CatalogItem, EXPORT_REVIEW, MFR_WARRANTY, Spec } from "./types";

const W = MFR_WARRANTY;

export function components(): CatalogItem[] {
  const out: CatalogItem[] = [];

  /* ---------- Graphics cards ---------- */
  const gpuBase: Record<string, { vram: number; mem: string; bus: string; cuda: number; tdp: number; base: number }> = {
    "RTX 5090": { vram: 32, mem: "GDDR7", bus: "512-bit", cuda: 21760, tdp: 575, base: 1999 },
    "RTX 5080": { vram: 16, mem: "GDDR7", bus: "256-bit", cuda: 10752, tdp: 360, base: 999 },
    "RTX 5070 Ti": { vram: 16, mem: "GDDR7", bus: "256-bit", cuda: 8960, tdp: 300, base: 749 },
    "RTX 5070": { vram: 12, mem: "GDDR7", bus: "192-bit", cuda: 6144, tdp: 250, base: 549 },
    "RTX 5060 Ti": { vram: 16, mem: "GDDR7", bus: "128-bit", cuda: 4608, tdp: 180, base: 429 },
  };
  const boards: [string, string, string, number][] = [
    // [gpu, manufacturer, board name, premium over base]
    ["RTX 5090", "ASUS", "ROG Astral GeForce RTX 5090 OC", 1100], ["RTX 5090", "ASUS", "TUF Gaming GeForce RTX 5090 OC", 500],
    ["RTX 5090", "MSI", "GeForce RTX 5090 SUPRIM LIQUID SOC", 900], ["RTX 5090", "MSI", "GeForce RTX 5090 GAMING TRIO OC", 450],
    ["RTX 5090", "Gigabyte", "AORUS GeForce RTX 5090 MASTER", 1000], ["RTX 5090", "Gigabyte", "GeForce RTX 5090 WINDFORCE OC", 300],
    ["RTX 5090", "ZOTAC", "GAMING GeForce RTX 5090 AMP Extreme INFINITY", 600], ["RTX 5090", "PNY", "GeForce RTX 5090 ARGB OC Triple Fan", 400],
    ["RTX 5080", "ASUS", "ROG Astral GeForce RTX 5080 OC", 500], ["RTX 5080", "ASUS", "Prime GeForce RTX 5080 OC", 150],
    ["RTX 5080", "MSI", "GeForce RTX 5080 VANGUARD SOC", 350], ["RTX 5080", "MSI", "GeForce RTX 5080 VENTUS 3X OC", 100],
    ["RTX 5080", "Gigabyte", "AORUS GeForce RTX 5080 MASTER ICE", 450], ["RTX 5080", "Palit", "GeForce RTX 5080 GameRock OC", 150],
    ["RTX 5080", "INNO3D", "GeForce RTX 5080 iCHILL FROSTBITE", 400],
    ["RTX 5070 Ti", "ASUS", "TUF Gaming GeForce RTX 5070 Ti OC", 200], ["RTX 5070 Ti", "MSI", "GeForce RTX 5070 Ti GAMING TRIO OC", 180],
    ["RTX 5070 Ti", "Gigabyte", "GeForce RTX 5070 Ti AERO OC", 150], ["RTX 5070 Ti", "ZOTAC", "GAMING GeForce RTX 5070 Ti SOLID", 60],
    ["RTX 5070 Ti", "Gainward", "GeForce RTX 5070 Ti Phoenix GS", 80], ["RTX 5070 Ti", "PNY", "GeForce RTX 5070 Ti OC", 50],
    ["RTX 5070", "ASUS", "Dual GeForce RTX 5070 OC", 30], ["RTX 5070", "MSI", "GeForce RTX 5070 SHADOW 2X OC", 20],
    ["RTX 5070", "Gigabyte", "GeForce RTX 5070 EAGLE OC SFF", 40], ["RTX 5070", "ZOTAC", "GAMING GeForce RTX 5070 Twin Edge OC", 20],
    ["RTX 5060 Ti", "ASUS", "Prime GeForce RTX 5060 Ti 16GB", 40], ["RTX 5060 Ti", "MSI", "GeForce RTX 5060 Ti 16G GAMING TRIO OC", 50],
    ["RTX 5060 Ti", "Gigabyte", "GeForce RTX 5060 Ti WINDFORCE OC 16G", 20],
  ];
  for (const [gpu, mfrRaw, name, prem] of boards) {
    const mfr = mfrRaw;
    const g = gpuBase[gpu];
    out.push({
      category: "graphics-cards", subcategory: `GeForce ${gpu}`, manufacturer: mfr, model: name,
      name: `${mfr} ${name} ${g.vram}GB ${g.mem}`,
      summary: `Board-partner NVIDIA GeForce ${gpu} with ${g.vram}GB ${g.mem}. Clock speeds, dimensions and power connectors per ${mfr} datasheet.`,
      specs: [["GPU", "Chip", `NVIDIA GeForce ${gpu} (Blackwell)`], ["GPU", "CUDA cores", g.cuda.toLocaleString("en-US")], ["Memory", "VRAM", `${g.vram}GB ${g.mem}`], ["Memory", "Bus width", g.bus], ["Power", "Reference total graphics power", `${g.tdp}W`], ["Interface", "Bus", "PCIe 5.0 x16"], ["Outputs", "Display", "HDMI 2.1b, DisplayPort 2.1b (count per board)"]],
      attributes: { gpu: `GeForce ${gpu}`, vramGb: g.vram },
      referenceUsd: g.base + prem, moq: 10, orderIncrement: 1, availability: gpu === "RTX 5090" ? "LIMITED_CONFIRM" : "INDICATIVE_AVAILABLE",
      imageKey: "gpu", warrantyInfo: W, variants: [{ label: "Retail box", region: "GLOBAL" }],
    });
  }
  const pro: [string, number, number, string, number][] = [
    ["RTX PRO 6000 Blackwell Workstation Edition", 96, 24064, "600W", 8565],
    ["RTX PRO 6000 Blackwell Max-Q Workstation Edition", 96, 24064, "300W", 8565],
    ["RTX PRO 5000 Blackwell", 48, 14080, "300W", 4569],
    ["RTX PRO 4500 Blackwell", 32, 10496, "200W", 2623],
    ["RTX PRO 4000 Blackwell", 24, 8960, "140W", 1546],
  ];
  for (const [name, vram, cuda, tdp, usd] of pro) {
    out.push({
      category: "graphics-cards", subcategory: "NVIDIA RTX PRO (Workstation)", manufacturer: "PNY", model: `NVIDIA ${name}`,
      name: `NVIDIA ${name} ${vram}GB GDDR7 ECC (PNY)`,
      summary: `Professional Blackwell GPU with ${vram}GB GDDR7 ECC memory for AI, simulation and rendering. Channel partner and warranty confirmed per order.`,
      specs: [["GPU", "Architecture", "NVIDIA Blackwell"], ["GPU", "CUDA cores", cuda.toLocaleString("en-US")], ["Memory", "VRAM", `${vram}GB GDDR7 with ECC`], ["Power", "Max power", tdp], ["Interface", "Bus", "PCIe 5.0 x16"]],
      attributes: { gpu: `RTX PRO ${name.split(" ")[2]}`, vramGb: vram },
      referenceUsd: usd, moq: 2, availability: "ON_REQUEST", imageKey: "gpu-pro", warrantyInfo: W,
      variants: [{ label: "Retail box", region: "GLOBAL" }],
    });
  }

  /* ---------- CPUs ---------- */
  const cpus: [string, string, string, string, string, number, string][] = [
    // mfr, model, cores/threads, boost, cache, usd, socket
    ["AMD", "Ryzen 9 9950X3D", "16C / 32T", "5.7 GHz", "144MB total (L2+L3)", 699, "AM5"],
    ["AMD", "Ryzen 9 9950X", "16C / 32T", "5.7 GHz", "80MB total", 599, "AM5"],
    ["AMD", "Ryzen 9 9900X3D", "12C / 24T", "5.5 GHz", "140MB total", 599, "AM5"],
    ["AMD", "Ryzen 9 9900X", "12C / 24T", "5.6 GHz", "76MB total", 449, "AM5"],
    ["AMD", "Ryzen 7 9800X3D", "8C / 16T", "5.2 GHz", "104MB total", 479, "AM5"],
    ["AMD", "Ryzen 7 9700X", "8C / 16T", "5.5 GHz", "40MB total", 359, "AM5"],
    ["Intel", "Core Ultra 9 285K", "24C (8P+16E) / 24T", "5.7 GHz", "36MB L3", 589, "LGA 1851"],
    ["Intel", "Core Ultra 7 265K", "20C (8P+12E) / 20T", "5.5 GHz", "30MB L3", 394, "LGA 1851"],
    ["Intel", "Core Ultra 7 265KF", "20C (8P+12E) / 20T", "5.5 GHz", "30MB L3", 379, "LGA 1851"],
    ["Intel", "Core Ultra 5 245K", "14C (6P+8E) / 14T", "5.2 GHz", "24MB L3", 309, "LGA 1851"],
    ["AMD", "Ryzen Threadripper 9980X", "64C / 128T", "5.4 GHz", "320MB total", 4999, "sTR5"],
    ["AMD", "Ryzen Threadripper 9970X", "32C / 64T", "5.4 GHz", "160MB total", 2499, "sTR5"],
    ["AMD", "Ryzen Threadripper PRO 9995WX", "96C / 192T", "5.4 GHz", "480MB total", 11699, "sTR5"],
    ["AMD", "Ryzen Threadripper PRO 9985WX", "64C / 128T", "5.4 GHz", "320MB total", 7999, "sTR5"],
    ["Intel", "Xeon w9-3595X", "60C / 120T", "4.8 GHz", "112.5MB L3", 5889, "LGA 4677"],
  ];
  for (const [mfr, model, ct, boost, cache, usd, socket] of cpus) {
    const hedt = socket === "sTR5" || socket === "LGA 4677";
    out.push({
      category: "cpus-motherboards", subcategory: hedt ? "HEDT & workstation CPUs" : "Desktop CPUs", manufacturer: mfr, model,
      name: `${mfr} ${model} Processor (${socket})`,
      summary: `${mfr} ${model}: ${ct}, up to ${boost} boost. Sold boxed (PIB) or tray — packaging confirmed in the offer.`,
      specs: [["Processor", "Cores / threads", ct], ["Processor", "Max boost", boost], ["Processor", "Cache", cache], ["Platform", "Socket", socket], ["Packaging", "Cooler", "Not included"]],
      attributes: { cpu: `${mfr} ${model}`, socket },
      referenceUsd: usd, moq: hedt ? 2 : 10, availability: hedt ? "ON_REQUEST" : "INDICATIVE_AVAILABLE", imageKey: "cpu", warrantyInfo: W,
      variants: [{ label: "Boxed (PIB)", region: "GLOBAL" }, { label: "Tray (OEM)", region: "GLOBAL" }],
    });
  }
  const boardsMb: [string, string, string, string, number][] = [
    ["ASUS", "ROG Crosshair X870E Hero", "AMD X870E", "AM5 · ATX", 699], ["ASUS", "ROG Strix X870E-E Gaming WiFi", "AMD X870E", "AM5 · ATX", 499],
    ["MSI", "MEG X870E GODLIKE", "AMD X870E", "AM5 · E-ATX", 1299], ["MSI", "MPG X870E CARBON WIFI", "AMD X870E", "AM5 · ATX", 499],
    ["Gigabyte", "X870E AORUS MASTER", "AMD X870E", "AM5 · E-ATX", 499], ["ASRock", "X870E Taichi", "AMD X870E", "AM5 · E-ATX", 499],
    ["ASUS", "ROG Maximus Z890 Hero", "Intel Z890", "LGA 1851 · ATX", 699], ["MSI", "MEG Z890 ACE", "Intel Z890", "LGA 1851 · E-ATX", 699],
    ["Gigabyte", "Z890 AORUS MASTER", "Intel Z890", "LGA 1851 · E-ATX", 549], ["ASUS", "Pro WS TRX50-SAGE WIFI A", "AMD TRX50", "sTR5 · CEB", 899],
    ["ASUS", "Pro WS WRX90E-SAGE SE", "AMD WRX90", "sTR5 · EEB", 1299],
  ];
  for (const [mfr, model, chip, form, usd] of boardsMb) {
    out.push({
      category: "cpus-motherboards", subcategory: "Motherboards", manufacturer: mfr, model,
      name: `${mfr} ${model} (${chip})`,
      summary: `${chip} motherboard (${form}). Full I/O, VRM and slot layout per ${mfr} datasheet.`,
      specs: [["Platform", "Chipset", chip], ["Platform", "Socket / form factor", form], ["Memory", "Type", chip.includes("WRX90") || chip.includes("TRX50") ? "DDR5 RDIMM ECC" : "DDR5 UDIMM"], ["Expansion", "PCIe", "PCIe 5.0 graphics and M.2 (lane layout per datasheet)"]],
      attributes: { socket: form.split(" · ")[0], chipset: chip, formFactor: form.split(" · ")[1] },
      referenceUsd: usd, moq: 10, availability: "INDICATIVE_AVAILABLE", imageKey: "motherboard", warrantyInfo: W,
      variants: [{ label: "Retail box", region: "GLOBAL" }],
    });
  }

  /* ---------- Memory ---------- */
  const mem: [string, string, number, string, string, number, string][] = [
    ["G.SKILL", "Trident Z5 RGB", 64, "2×32GB", "DDR5-6000 CL30", 219, "UDIMM"],
    ["G.SKILL", "Trident Z5 RGB", 96, "2×48GB", "DDR5-6400 CL32", 319, "UDIMM"],
    ["G.SKILL", "Trident Z5 Royal Neo", 64, "2×32GB", "DDR5-6400 CL30", 289, "UDIMM"],
    ["Corsair", "Dominator Titanium RGB", 64, "2×32GB", "DDR5-6600 CL32", 309, "UDIMM"],
    ["Corsair", "Dominator Titanium RGB", 96, "2×48GB", "DDR5-6000 CL30", 339, "UDIMM"],
    ["Corsair", "Vengeance RGB", 192, "4×48GB", "DDR5-5200 CL38", 599, "UDIMM"],
    ["Kingston", "FURY Renegade RGB", 48, "2×24GB", "DDR5-8000 CL38 (CUDIMM)", 289, "CUDIMM"],
    ["Kingston", "FURY Beast", 64, "2×32GB", "DDR5-6000 CL30", 199, "UDIMM"],
    ["Crucial", "Pro", 96, "2×48GB", "DDR5-5600 CL46", 249, "UDIMM"],
    ["Kingston", "Server Premier", 64, "1×64GB", "DDR5-5600 ECC RDIMM", 399, "RDIMM"],
    ["Samsung", "M321R8GA0PB2 (RDIMM)", 64, "1×64GB", "DDR5-6400 ECC RDIMM", 449, "RDIMM"],
    ["Micron", "RDIMM", 128, "1×128GB", "DDR5-5600 ECC RDIMM", 999, "RDIMM"],
  ];
  for (const [mfr, model, cap, kit, speed, usd, type] of mem) {
    out.push({
      category: "memory-storage", subcategory: type === "RDIMM" ? "Server & workstation memory" : "DDR5 desktop memory", manufacturer: mfr, model,
      name: `${mfr} ${model} ${cap}GB (${kit}) ${speed}`,
      summary: `${cap}GB ${type} kit (${kit}) rated ${speed}. Validate against the target platform's QVL.`,
      specs: [["Memory", "Capacity", `${cap}GB (${kit})`], ["Memory", "Speed / timings", speed], ["Memory", "Module type", type], ["Memory", "Profile", type === "RDIMM" ? "JEDEC" : "Intel XMP 3.0 / AMD EXPO (model dependent)"]],
      attributes: { ramGb: cap, memoryType: type },
      referenceUsd: usd, moq: 20, orderIncrement: 5, availability: "INDICATIVE_AVAILABLE", imageKey: "ram", warrantyInfo: W,
      variants: [{ label: type === "RDIMM" ? "Bulk / server pack" : "Retail kit", region: "GLOBAL" }],
    });
  }

  /* ---------- Storage ---------- */
  const ssd: [string, string, number, string, string, number, string][] = [
    ["Samsung", "9100 PRO", 1024, "PCIe 5.0 x4 NVMe", "up to 14,700 MB/s read", 199, "M.2 2280"],
    ["Samsung", "9100 PRO", 2048, "PCIe 5.0 x4 NVMe", "up to 14,700 MB/s read", 299, "M.2 2280"],
    ["Samsung", "9100 PRO", 4096, "PCIe 5.0 x4 NVMe", "up to 14,800 MB/s read", 549, "M.2 2280"],
    ["Samsung", "9100 PRO", 8192, "PCIe 5.0 x4 NVMe", "up to 14,800 MB/s read", 999, "M.2 2280"],
    ["Samsung", "990 PRO", 2048, "PCIe 4.0 x4 NVMe", "up to 7,450 MB/s read", 179, "M.2 2280"],
    ["Samsung", "990 PRO", 4096, "PCIe 4.0 x4 NVMe", "up to 7,450 MB/s read", 319, "M.2 2280"],
    ["Crucial", "T705", 2048, "PCIe 5.0 x4 NVMe", "up to 14,500 MB/s read", 279, "M.2 2280"],
    ["Crucial", "T705", 4096, "PCIe 5.0 x4 NVMe", "up to 14,100 MB/s read", 549, "M.2 2280"],
    ["WD", "WD_BLACK SN8100", 2048, "PCIe 5.0 x4 NVMe", "up to 14,900 MB/s read", 279, "M.2 2280"],
    ["WD", "WD_BLACK SN8100", 4096, "PCIe 5.0 x4 NVMe", "up to 14,900 MB/s read", 499, "M.2 2280"],
    ["Kingston", "FURY Renegade G5", 4096, "PCIe 5.0 x4 NVMe", "up to 14,800 MB/s read", 499, "M.2 2280"],
    ["Sabrent", "Rocket 5", 4096, "PCIe 5.0 x4 NVMe", "up to 14,000 MB/s read", 549, "M.2 2280"],
    ["Seagate", "FireCuda 540", 2048, "PCIe 5.0 x4 NVMe", "up to 10,000 MB/s read", 249, "M.2 2280"],
    ["Solidigm", "D7-PS1010", 7680, "PCIe 5.0 x4 NVMe (enterprise)", "up to 14,500 MB/s read", 1499, "U.2 15mm"],
    ["Samsung", "PM9A3", 3840, "PCIe 4.0 x4 NVMe (enterprise)", "up to 6,900 MB/s read", 549, "U.2 7mm"],
    ["Samsung", "PM9A3", 7680, "PCIe 4.0 x4 NVMe (enterprise)", "up to 6,900 MB/s read", 999, "U.2 7mm"],
    ["Micron", "7500 PRO", 7680, "PCIe 4.0 x4 NVMe (enterprise)", "up to 7,000 MB/s read", 1049, "U.3 15mm"],
    ["Samsung", "T9 Portable SSD", 4096, "USB 3.2 Gen 2x2", "up to 2,000 MB/s", 379, "Portable"],
  ];
  for (const [mfr, model, gb, iface, perf, usd, form] of ssd) {
    const cap = gb >= 1024 ? `${+(gb / 1024).toFixed(2)}TB` : `${gb}GB`;
    out.push({
      category: "memory-storage", subcategory: iface.includes("enterprise") ? "Enterprise NVMe" : form === "Portable" ? "Portable SSD" : "NVMe SSD", manufacturer: mfr, model,
      name: `${mfr} ${model} ${cap} ${form}`,
      summary: `${cap} ${iface} solid-state drive, ${perf}.`,
      specs: [["Storage", "Capacity", cap], ["Storage", "Interface", iface], ["Storage", "Form factor", form], ["Performance", "Sequential", perf]],
      attributes: { capacityGb: gb, storageGb: gb, interface: iface.split(" (")[0] },
      referenceUsd: usd, moq: 20, orderIncrement: 5, availability: "INDICATIVE_AVAILABLE", imageKey: form === "Portable" ? "ssd-portable" : form.startsWith("U.") ? "ssd-enterprise" : "ssd", warrantyInfo: W,
      variants: [{ label: "Retail", region: "GLOBAL" }],
    });
  }

  /* ---------- Monitors ---------- */
  const mons: [string, string, number, string, string, number, string, number, string][] = [
    // mfr, model, size, resolution, panel, hz, sub, usd, extra
    ["ASUS", "ROG Swift OLED PG27UCDM", 27, "3840×2160", "QD-OLED", 240, "Gaming OLED", 999, "DisplayPort 2.1 UHBR20"],
    ["ASUS", "ROG Swift OLED PG32UCDM", 32, "3840×2160", "QD-OLED", 240, "Gaming OLED", 1299, "DisplayPort 1.4 DSC, HDMI 2.1"],
    ["ASUS", "ROG Swift OLED PG27AQDP", 27, "2560×1440", "WOLED", 480, "Gaming OLED", 999, "Esports refresh"],
    ["MSI", "MPG 321URX QD-OLED", 32, "3840×2160", "QD-OLED", 240, "Gaming OLED", 949, "USB-C 90W"],
    ["MSI", "MAG 271QPX QD-OLED E2", 27, "2560×1440", "QD-OLED", 500, "Gaming OLED", 649, "Esports refresh"],
    ["Samsung", "Odyssey OLED G8 (G81SF)", 32, "3840×2160", "QD-OLED", 240, "Gaming OLED", 1299, "Glare-free coating"],
    ["Samsung", "Odyssey OLED G6 (G60SF)", 27, "2560×1440", "QD-OLED", 500, "Gaming OLED", 799, "Esports refresh"],
    ["Samsung", "Odyssey Neo G9 (G95NC)", 57, "7680×2160", "Mini LED VA", 240, "Super ultrawide", 1999, "Dual UHD, 1000R curve"],
    ["LG", "UltraGear 32GS95UE", 32, "3840×2160 / 1920×1080", "WOLED", 240, "Gaming OLED", 1399, "Dual-mode 240Hz/480Hz"],
    ["LG", "UltraGear 27GX790A", 27, "2560×1440", "WOLED", 480, "Gaming OLED", 999, "Esports refresh"],
    ["LG", "UltraGear 45GX950A", 45, "5120×2160", "WOLED", 165, "Super ultrawide", 1999, "800R curve"],
    ["Dell", "Alienware AW3225QF", 32, "3840×2160", "QD-OLED", 240, "Gaming OLED", 1199, "1700R curve"],
    ["Dell", "Alienware AW2725DF", 27, "2560×1440", "QD-OLED", 360, "Gaming OLED", 899, "Esports refresh"],
    ["Dell", "UltraSharp U3225QE", 32, "3840×2160", "IPS Black", 120, "Professional", 1149, "Thunderbolt 4 hub, RJ45"],
    ["Dell", "UltraSharp U4025QW", 40, "5120×2160", "IPS Black", 120, "Professional", 2399, "Thunderbolt 4 hub, curved"],
    ["Apple", "Studio Display (Nano-texture, tilt/height stand)", 27, "5120×2880", "IPS (5K Retina)", 60, "Professional", 2299, "Thunderbolt 3, 12MP camera"],
    ["Apple", "Pro Display XDR (Nano-texture)", 32, "6016×3384", "IPS Mini LED (6K)", 60, "Reference / colour-critical", 5999, "Stand sold separately"],
    ["ASUS", "ProArt PA32UCXR", 32, "3840×2160", "Mini LED IPS", 60, "Reference / colour-critical", 2999, "Built-in colorimeter"],
    ["EIZO", "ColorEdge CG2700X", 27, "3840×2160", "IPS", 60, "Reference / colour-critical", 2899, "Built-in calibration sensor"],
    ["BenQ", "PD3225U", 32, "3840×2160", "IPS", 60, "Professional", 899, "Thunderbolt 3"],
    ["ViewSonic", "VP2788-5K", 27, "5120×2880", "IPS", 60, "Professional", 1099, "Thunderbolt 4"],
    ["Samsung", "ViewFinity S9 (S90PC)", 27, "5120×2880", "IPS", 60, "Professional", 1599, "Thunderbolt 4, matte display"],
  ];
  for (const [mfr, model, size, res, panel, hz, sub, usd, extra] of mons) {
    out.push({
      category: "monitors", subcategory: sub, manufacturer: mfr, model,
      name: `${mfr} ${model} ${size}" ${res.split(" /")[0]} ${hz}Hz`,
      summary: `${size}-inch ${panel} display, ${res} at up to ${hz}Hz. ${extra}.`,
      specs: [["Display", "Size", `${size}-inch`], ["Display", "Resolution", res], ["Display", "Panel", panel], ["Display", "Max refresh", `${hz}Hz`], ["Connectivity", "Notes", extra]],
      attributes: { screenIn: size, resolution: res.split(" /")[0], panel, refreshHz: hz },
      referenceUsd: usd, moq: 5, availability: "INDICATIVE_AVAILABLE", imageKey: size >= 40 ? "monitor-wide" : "monitor", warrantyInfo: W,
      variants: [{ label: "EU power cord", region: "EU" }, { label: "US power cord", region: "US" }, { label: "UK power cord", region: "UK" }],
    });
  }

  /* ---------- Networking ---------- */
  const net: [string, string, string, string, number, string][] = [
    ["Cisco", "Catalyst C9300-48P-E", "Access switches", "48× 1G PoE+ ports, modular uplinks, 715W PSU", 7999, "switch"],
    ["Cisco", "Catalyst C9300-24UX-E", "Access switches", "24× mGig (100M–10G) UPOE ports", 12499, "switch"],
    ["Cisco", "Catalyst C9200L-48P-4X-E", "Access switches", "48× 1G PoE+, 4× 10G SFP+ uplinks", 4999, "switch"],
    ["Cisco", "Catalyst 9500-32C", "Core & aggregation", "32× 100G QSFP28 ports", 29999, "switch"],
    ["Cisco Meraki", "MS250-48FP", "Cloud-managed switches", "48× 1G PoE+ (740W), 4× 10G SFP+; licence required", 7499, "switch"],
    ["Cisco Meraki", "MR57", "Wireless access points", "Wi-Fi 6E tri-band 4×4:4; licence required", 1799, "ap"],
    ["HPE Aruba Networking", "CX 6300M 48G PoE 4SFP56", "Access switches", "48× 1G Class 4 PoE, 4× SFP56", 8999, "switch"],
    ["HPE Aruba Networking", "AP-655", "Wireless access points", "Wi-Fi 6E tri-radio indoor AP", 1499, "ap"],
    ["Juniper Networks", "EX4400-48MP", "Access switches", "36× mGig + 12× 10G PoE ports", 11999, "switch"],
    ["Ubiquiti", "UniFi Pro Max 48 PoE", "Access switches", "48× PoE (16× 2.5G), 4× 10G SFP+", 1299, "switch"],
    ["Ubiquiti", "UniFi Enterprise Campus Aggregation", "Core & aggregation", "28× 25G SFP28, 4× 100G QSFP28", 3999, "switch"],
    ["Ubiquiti", "UniFi Dream Machine Pro Max", "Gateways & firewalls", "Dual-WAN gateway, 10G SFP+, IDS/IPS", 599, "router"],
    ["Ubiquiti", "UniFi U7 Pro Max", "Wireless access points", "Wi-Fi 7 tri-band with spectral scanning", 279, "ap"],
    ["Ubiquiti", "UniFi Enterprise Fortress Gateway", "Gateways & firewalls", "Multi-WAN enterprise gateway, 25G SFP28", 1999, "router"],
    ["Fortinet", "FortiGate 100F", "Gateways & firewalls", "NGFW, 20 Gbps firewall throughput; licences separate", 3299, "router"],
    ["Fortinet", "FortiGate 200F", "Gateways & firewalls", "NGFW, 27 Gbps firewall throughput; licences separate", 7999, "router"],
    ["Palo Alto Networks", "PA-445", "Gateways & firewalls", "Next-generation firewall; subscriptions separate", 3999, "router"],
    ["MikroTik", "CCR2216-1G-12XS-2XQ", "Core & aggregation", "Cloud Core Router, 12× 25G, 2× 100G", 2795, "router"],
    ["MikroTik", "CRS518-16XS-2XQ-RM", "Core & aggregation", "16× 25G SFP28, 2× 100G QSFP28", 1495, "switch"],
    ["NETGEAR", "M4350-48G4XF", "Access switches", "48× 1G PoE+, 4× 25G SFP28; AV-over-IP profiles", 3699, "switch"],
    ["Synology", "RackStation RS2423RP+", "Network storage", "12-bay 2U NAS, redundant PSU (drives not included)", 3699, "nas"],
    ["QNAP", "TS-h1290FX", "Network storage", "12-bay U.2 NVMe all-flash NAS, 25GbE (drives not included)", 7999, "nas"],
  ];
  for (const [mfr, model, sub, desc, usd, img] of net) {
    out.push({
      category: "networking", subcategory: sub, manufacturer: mfr, model,
      name: `${mfr} ${model}`,
      summary: `${desc}. Licensing, support contracts and regional power options are confirmed per order.`,
      specs: [["Overview", "Description", desc], ["Management", "Licensing", "Per manufacturer terms — quoted separately where required"], ["Power", "Supply", "Regional power cords per order"]],
      attributes: { formFactor: img === "ap" ? "Access point" : img === "nas" ? "Rackmount NAS" : "Rackmount" },
      referenceUsd: usd, moq: 2, availability: "ON_REQUEST", imageKey: img, warrantyInfo: W, shippingRestrictions: EXPORT_REVIEW,
      variants: [{ label: "Standard", region: "GLOBAL" }],
    });
  }
  return out;
}

export function creatorAndAccessories(): CatalogItem[] {
  const out: CatalogItem[] = [];
  const creator: [string, string, string, string, number, string, Spec[]][] = [
    ["Sony", "FX3 Cinema Line", "Cameras", "Full-frame cinema camera body, 4K up to 120p", 3899, "camera", [["Sensor", "Type", "Full-frame 12.1MP"], ["Video", "Max", "4K 120p 10-bit 4:2:2"], ["Mount", "Lens", "Sony E-mount"]]],
    ["Sony", "FX30 Cinema Line", "Cameras", "Super 35 cinema camera body", 1799, "camera", [["Sensor", "Type", "APS-C / Super 35 26MP"], ["Video", "Max", "4K 120p (crop)"], ["Mount", "Lens", "Sony E-mount"]]],
    ["Sony", "ZV-E1", "Cameras", "Full-frame vlogging camera body", 2199, "camera", [["Sensor", "Type", "Full-frame 12.1MP"], ["Video", "Max", "4K 120p"]]],
    ["Canon", "EOS R5 Mark II", "Cameras", "Full-frame hybrid body, 8K video", 4299, "camera", [["Sensor", "Type", "Full-frame 45MP stacked"], ["Video", "Max", "8K 60p RAW"]]],
    ["Blackmagic Design", "Pocket Cinema Camera 6K Pro", "Cameras", "Super 35 cinema camera, Blackmagic RAW", 2535, "camera", [["Sensor", "Type", "Super 35 6K"], ["Mount", "Lens", "Canon EF"]]],
    ["Blackmagic Design", "ATEM Mini Extreme ISO G2", "Switchers", "8-input live production switcher with ISO recording", 1495, "switcher", [["Inputs", "Video", "8× HDMI"], ["Recording", "ISO", "All inputs to USB disk"], ["Streaming", "Output", "Built-in streaming"]]],
    ["Blackmagic Design", "ATEM Television Studio HD8 ISO", "Switchers", "8-input broadcast switcher with ISO recording", 2995, "switcher", [["Inputs", "Video", "8× 12G-SDI"], ["Recording", "ISO", "Yes"]]],
    ["Elgato", "Stream Deck +", "Stream control", "8 LCD keys, 4 dials, touch strip", 199, "streamdeck", [["Controls", "Keys", "8 customizable LCD keys"], ["Controls", "Dials", "4"]]],
    ["Elgato", "Stream Deck XL", "Stream control", "32 customizable LCD keys", 249, "streamdeck", [["Controls", "Keys", "32 LCD keys"]]],
    ["Elgato", "4K X", "Capture", "External 4K144 HDR capture card", 219, "capture", [["Capture", "Max", "4K 144Hz HDR10"], ["Interface", "Connection", "USB 3.2 Gen 2"]]],
    ["Elgato", "Facecam Pro", "Cameras", "4K60 webcam with Sony STARVIS sensor", 299, "webcam", [["Video", "Max", "4K 60fps"]]],
    ["Elgato", "Key Light MK.2", "Lighting", "App-controlled LED panel, 3000 lumens", 199, "light", [["Light", "Output", "3000 lumens"], ["Light", "Colour temp", "2900–7000K"]]],
    ["Shure", "SM7dB", "Microphones", "Dynamic vocal mic with built-in preamp", 499, "mic", [["Mic", "Type", "Dynamic, cardioid"], ["Mic", "Preamp", "Built-in +18/+28 dB"], ["Output", "Connector", "XLR"]]],
    ["Shure", "MV7+", "Microphones", "USB-C / XLR podcast microphone", 279, "mic", [["Mic", "Type", "Dynamic"], ["Output", "Connector", "USB-C and XLR"]]],
    ["RØDE", "RØDECaster Pro II", "Audio production", "Integrated audio production studio", 699, "mixer", [["Inputs", "Mic", "4× Neutrik combo with Revolution Preamps"], ["Connectivity", "Ports", "2× USB-C, Bluetooth"]]],
    ["RØDE", "NT1 5th Generation", "Microphones", "Studio condenser with XLR and USB-C", 259, "mic", [["Mic", "Type", "Large-diaphragm condenser"], ["Output", "Connector", "XLR + USB-C (32-bit float)"]]],
    ["RØDE", "Wireless PRO", "Microphones", "Dual-channel wireless mic system with 32-bit float recording", 399, "mic-wireless", [["System", "Channels", "2 TX + 1 RX"], ["Recording", "On-board", "32-bit float"]]],
    ["Universal Audio", "Apollo Twin X DUO Gen 2", "Audio production", "Thunderbolt audio interface with UAD DSP", 1099, "mixer", [["Interface", "Connection", "Thunderbolt 3"], ["DSP", "Cores", "DUO"]]],
    ["Focusrite", "Scarlett 18i20 4th Gen", "Audio production", "18-in/20-out USB-C audio interface", 599, "mixer", [["I/O", "Channels", "18 in / 20 out"]]],
    ["Aputure", "STORM 1200x", "Lighting", "Bi-colour LED point-source light", 2799, "light", [["Light", "Type", "Bi-colour COB"]]],
    ["DJI", "RS 4 Pro Combo", "Stabilizers", "Commercial camera gimbal, 4.5 kg payload", 1099, "gimbal", [["Payload", "Tested", "4.5 kg"]]],
    ["Atomos", "Ninja TX", "Monitor-recorders", "5-inch monitor-recorder", 799, "recorder", [["Display", "Size", "5-inch"], ["Recording", "Formats", "ProRes RAW, ProRes (camera dependent)"]]],
    ["Insta360", "X5", "Cameras", "8K 360° action camera", 549, "camera-360", [["Video", "Max", "8K 360°"]]],
    ["Logitech", "MX Brio Ultra HD 4K", "Cameras", "4K business and streaming webcam", 199, "webcam", [["Video", "Max", "4K 30fps"]]],
  ];
  for (const [mfr, model, sub, desc, usd, img, specs] of creator) {
    out.push({
      category: "creator", subcategory: sub, manufacturer: mfr, model, name: `${mfr} ${model}`,
      summary: `${desc}.`, specs, attributes: { formFactor: sub },
      referenceUsd: usd, moq: usd > 1500 ? 2 : 5, availability: usd > 1500 ? "ON_REQUEST" : "INDICATIVE_AVAILABLE", imageKey: img, warrantyInfo: MFR_WARRANTY,
      variants: [{ label: "Standard kit", region: "GLOBAL" }],
      shippingRestrictions: ["camera", "camera-360", "mic-wireless", "gimbal", "recorder"].includes(img) ? "Battery-powered device or included batteries — lithium shipping rules may apply." : undefined,
    });
  }

  const acc: [string, string, string, string, number, string][] = [
    ["Corsair", "AX1600i Digital ATX PSU", "Power supplies", "1600W 80 PLUS Titanium, fully modular", 599, "psu"],
    ["Corsair", "HX1500i (ATX 3.1)", "Power supplies", "1500W 80 PLUS Platinum, 12V-2x6 native", 379, "psu"],
    ["Seasonic", "PRIME TX-1600 (ATX 3.1)", "Power supplies", "1600W 80 PLUS Titanium, fully modular", 549, "psu"],
    ["be quiet!", "Dark Power Pro 13 1600W", "Power supplies", "1600W 80 PLUS Titanium", 499, "psu"],
    ["ASUS", "ROG Thor 1600W Titanium III", "Power supplies", "1600W 80 PLUS Titanium with OLED display", 599, "psu"],
    ["Lian Li", "O11 Dynamic EVO XL", "Cases", "Full-tower dual-chamber case, E-ATX", 249, "case"],
    ["Fractal Design", "North XL", "Cases", "Full-tower with wood front panel, E-ATX", 199, "case"],
    ["HYTE", "Y70 Touch Infinite", "Cases", "Dual-chamber case with integrated touchscreen", 449, "case"],
    ["Corsair", "9000D RGB Airflow", "Cases", "Super-tower case for dual-system builds", 499, "case"],
    ["Arctic", "Liquid Freezer III Pro 420", "Cooling", "420mm AIO liquid cooler", 159, "cooler"],
    ["NZXT", "Kraken Elite 360 RGB (2024)", "Cooling", "360mm AIO with 2.72-inch LCD", 329, "cooler"],
    ["Noctua", "NH-D15 G2", "Cooling", "Dual-tower air cooler", 149, "cooler-air"],
    ["Corsair", "iCUE LINK TITAN 360 RX RGB", "Cooling", "360mm AIO, iCUE LINK ecosystem", 249, "cooler"],
    ["Logitech G", "PRO X SUPERLIGHT 2 DEX", "Peripherals", "Wireless esports mouse, 60g", 159, "mouse"],
    ["Razer", "BlackWidow V4 Pro 75%", "Peripherals", "Wireless hot-swappable mechanical keyboard with OLED", 299, "keyboard"],
    ["Wooting", "80HE", "Peripherals", "Hall-effect analog keyboard", 199, "keyboard"],
    ["SteelSeries", "Arctis Nova Pro Wireless", "Peripherals", "Wireless headset with hot-swap batteries", 349, "headset"],
    ["Logitech", "MX Master 3S for Business", "Peripherals", "Business wireless mouse with Logi Bolt", 109, "mouse"],
    ["CalDigit", "TS4 Thunderbolt 4 Dock", "Docks & connectivity", "18-port Thunderbolt 4 dock, 98W charging", 399, "dock"],
    ["OWC", "Thunderbolt 5 Hub", "Docks & connectivity", "Thunderbolt 5 hub", 189, "dock"],
    ["APC", "Smart-UPS SMT1500RMI2UC", "Power protection", "1500VA rackmount UPS with SmartConnect", 1199, "ups"],
    ["Eaton", "9PX 3000i RT2U", "Power protection", "3000VA online double-conversion UPS", 2599, "ups"],
    ["Thermal Grizzly", "Kryonaut Extreme 33.84g", "Cooling", "High-performance thermal paste, bulk tube", 79, "paste"],
    ["Corsair", "iCUE LINK RX140 RGB (3-pack)", "Cooling", "140mm fan kit with LINK hub", 169, "fan"],
    ["Elgato", "Wave Neo", "Peripherals", "USB-C condenser microphone for business calls", 149, "mic"],
  ];
  for (const [mfr, model, sub, desc, usd, img] of acc) {
    out.push({
      category: "components", subcategory: sub, manufacturer: mfr, model, name: `${mfr} ${model}`,
      summary: `${desc}.`, specs: [["Overview", "Description", desc]], attributes: { formFactor: sub },
      referenceUsd: usd, moq: usd > 1000 ? 2 : 10, orderIncrement: 1, availability: "INDICATIVE_AVAILABLE", imageKey: img, warrantyInfo: MFR_WARRANTY,
      variants: img === "psu" || img === "ups" ? [{ label: "EU plug", region: "EU" }, { label: "US plug", region: "US" }, { label: "UK plug", region: "UK" }] : [{ label: "Standard", region: "GLOBAL" }],
      shippingRestrictions: img === "ups" ? "Contains sealed lead-acid batteries — freight classification required." : img === "headset" ? "Contains lithium-ion batteries (UN3481)." : undefined,
    });
  }
  return out;
}
