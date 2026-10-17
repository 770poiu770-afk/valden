import { CatalogItem, LITHIUM, MFR_WARRANTY, PHONE_REGION, REFURB_WARRANTY, Spec } from "./types";

const st = (gb: number) => (gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`);
const regions = [{ label: "International / EU model", region: "INTL" }, { label: "US model (eSIM only)", region: "US" }];

function withColors(colors: string[], regionList = regions) {
  return colors.flatMap((c) => regionList.map((r) => ({ label: `${c} · ${r.label}`, color: c, region: r.region })));
}

export function mobile(): CatalogItem[] {
  const out: CatalogItem[] = [];

  /* ---------------- Apple iPhone ---------------- */
  type IP = { model: string; sizes: [number, number][]; colors: string[]; specs: Spec[]; screen: number; chip: string; cond?: "NEW" | "REFURBISHED" | "USED"; summary: string };
  const iphones: IP[] = [
    {
      model: "iPhone 17 Pro Max", screen: 6.9, chip: "A19 Pro", colors: ["Silver", "Cosmic Orange", "Deep Blue"],
      sizes: [[256, 1199], [512, 1399], [1024, 1599], [2048, 1999]],
      summary: "Apple's largest Pro model: 6.9-inch ProMotion display, A19 Pro, triple 48MP Fusion camera system and an aluminium unibody with vapour-chamber cooling.",
      specs: [["Display", "Size", "6.9-inch Super Retina XDR (OLED)"], ["Display", "Refresh", "ProMotion up to 120Hz, Always-On"], ["Performance", "Chip", "A19 Pro"], ["Camera", "Rear", "48MP Fusion main, 48MP Ultra Wide, 48MP Telephoto"], ["Camera", "Front", "18MP Center Stage"], ["Build", "Frame", "Aluminium unibody"], ["Connectivity", "Port", "USB-C (USB 3)"]],
    },
    {
      model: "iPhone 17 Pro", screen: 6.3, chip: "A19 Pro", colors: ["Silver", "Cosmic Orange", "Deep Blue"],
      sizes: [[256, 1099], [512, 1299], [1024, 1499]],
      summary: "6.3-inch Pro model with A19 Pro, ProMotion display and triple 48MP Fusion camera system.",
      specs: [["Display", "Size", "6.3-inch Super Retina XDR (OLED)"], ["Display", "Refresh", "ProMotion up to 120Hz, Always-On"], ["Performance", "Chip", "A19 Pro"], ["Camera", "Rear", "48MP Fusion main, 48MP Ultra Wide, 48MP Telephoto"], ["Camera", "Front", "18MP Center Stage"], ["Build", "Frame", "Aluminium unibody"], ["Connectivity", "Port", "USB-C (USB 3)"]],
    },
    {
      model: "iPhone Air", screen: 6.5, chip: "A19 Pro", colors: ["Space Black", "Cloud White", "Light Gold", "Sky Blue"],
      sizes: [[256, 999], [512, 1199], [1024, 1399]],
      summary: "Apple's thinnest iPhone with a 6.5-inch ProMotion display, titanium frame and A19 Pro.",
      specs: [["Display", "Size", "6.5-inch Super Retina XDR (OLED)"], ["Display", "Refresh", "ProMotion up to 120Hz"], ["Performance", "Chip", "A19 Pro"], ["Camera", "Rear", "48MP Fusion"], ["Build", "Frame", "Titanium"], ["Connectivity", "SIM", "eSIM only"]],
    },
    {
      model: "iPhone 17", screen: 6.3, chip: "A19", colors: ["Black", "White", "Mist Blue", "Sage", "Lavender"],
      sizes: [[256, 799], [512, 999]],
      summary: "6.3-inch iPhone 17 with ProMotion display, A19 chip and dual 48MP Fusion cameras.",
      specs: [["Display", "Size", "6.3-inch Super Retina XDR (OLED)"], ["Display", "Refresh", "ProMotion up to 120Hz"], ["Performance", "Chip", "A19"], ["Camera", "Rear", "48MP Fusion main, 48MP Ultra Wide"], ["Connectivity", "Port", "USB-C"]],
    },
    {
      model: "iPhone 16 Pro Max", cond: "REFURBISHED", screen: 6.9, chip: "A18 Pro", colors: ["Black Titanium", "Natural Titanium", "Desert Titanium"],
      sizes: [[256, 949], [512, 1099]],
      summary: "Refurbished iPhone 16 Pro Max with 6.9-inch display and A18 Pro. Cosmetic grade confirmed in the offer.",
      specs: [["Display", "Size", "6.9-inch Super Retina XDR (OLED)"], ["Performance", "Chip", "A18 Pro"], ["Camera", "Rear", "48MP Fusion, 48MP Ultra Wide, 12MP 5x Telephoto"], ["Build", "Frame", "Titanium"]],
    },
    {
      model: "iPhone 16 Pro", cond: "REFURBISHED", screen: 6.3, chip: "A18 Pro", colors: ["Black Titanium", "Natural Titanium", "White Titanium"],
      sizes: [[256, 849], [512, 999]],
      summary: "Refurbished iPhone 16 Pro with 6.3-inch display and A18 Pro. Cosmetic grade confirmed in the offer.",
      specs: [["Display", "Size", "6.3-inch Super Retina XDR (OLED)"], ["Performance", "Chip", "A18 Pro"], ["Camera", "Rear", "48MP Fusion, 48MP Ultra Wide, 12MP 5x Telephoto"], ["Build", "Frame", "Titanium"]],
    },
    {
      model: "iPhone 15 Pro Max", cond: "USED", screen: 6.7, chip: "A17 Pro", colors: ["Natural Titanium", "Black Titanium"],
      sizes: [[256, 699]],
      summary: "Used, tested iPhone 15 Pro Max. Battery-health and cosmetic grading are disclosed per lot before acceptance.",
      specs: [["Display", "Size", "6.7-inch Super Retina XDR (OLED)"], ["Performance", "Chip", "A17 Pro"], ["Build", "Frame", "Titanium"]],
    },
  ];
  for (const p of iphones) {
    for (const [gb, usd] of p.sizes) {
      const cond = p.cond ?? "NEW";
      out.push({
        category: "iphone", subcategory: p.model.includes("Pro") ? "iPhone Pro" : "iPhone", manufacturer: "Apple", model: p.model,
        name: `Apple ${p.model} ${st(gb)}${cond === "NEW" ? "" : cond === "REFURBISHED" ? " — Refurbished" : " — Used"}`,
        condition: cond, summary: p.summary,
        specs: [...p.specs, ["Storage", "Capacity", st(gb)]],
        attributes: { storageGb: gb, screenIn: p.screen, cpu: p.chip },
        referenceUsd: usd, moq: cond === "NEW" ? 20 : 10, orderIncrement: 5,
        availability: cond === "NEW" ? "INDICATIVE_AVAILABLE" : "LIMITED_CONFIRM",
        imageKey: "phone", variants: withColors(p.colors, p.model === "iPhone Air" ? [{ label: "eSIM model", region: "GLOBAL" }] : regions),
        regionCompatibility: PHONE_REGION, shippingRestrictions: LITHIUM,
        warrantyInfo: cond === "NEW" ? MFR_WARRANTY : REFURB_WARRANTY,
      });
    }
  }

  /* ---------------- Samsung Galaxy ---------------- */
  type SG = { model: string; sub: string; img: string; sizes: [number, number, number][]; colors: string[]; specs: Spec[]; screen: number; chip: string; cond?: "NEW" | "REFURBISHED"; summary: string };
  const galaxy: SG[] = [
    {
      model: "Galaxy S26 Ultra", sub: "Galaxy S Ultra", img: "phone", screen: 6.9, chip: "Snapdragon 8 Elite Gen 5 for Galaxy",
      colors: ["Black", "White", "Cobalt Violet", "Sky Blue"], sizes: [[256, 12, 1299], [512, 12, 1499], [1024, 16, 1799]],
      summary: "Samsung's 2026 flagship with 6.9-inch QHD+ display, built-in S Pen and 200MP main camera.",
      specs: [["Display", "Panel", "6.9-inch QHD+ Dynamic AMOLED 2X, 120Hz"], ["Performance", "Chipset", "Snapdragon 8 Elite Gen 5 for Galaxy"], ["Camera", "Main", "200MP wide"], ["Input", "Stylus", "Built-in S Pen"], ["Battery", "Capacity", "5,000mAh"]],
    },
    {
      model: "Galaxy S25 Ultra", sub: "Galaxy S Ultra", img: "phone", screen: 6.9, chip: "Snapdragon 8 Elite for Galaxy",
      colors: ["Titanium Black", "Titanium Silverblue", "Titanium Gray", "Titanium Whitesilver"], sizes: [[256, 12, 1299], [512, 12, 1419], [1024, 12, 1659]],
      summary: "Galaxy S25 Ultra with titanium frame, 6.9-inch QHD+ display, S Pen and 200MP camera.",
      specs: [["Display", "Panel", "6.9-inch QHD+ Dynamic AMOLED 2X, 1–120Hz"], ["Performance", "Chipset", "Snapdragon 8 Elite for Galaxy"], ["Camera", "Main", "200MP wide; 50MP ultra-wide; 50MP 5x; 10MP 3x"], ["Build", "Frame", "Titanium"], ["Battery", "Capacity", "5,000mAh"]],
    },
    {
      model: "Galaxy S25 Ultra", cond: "REFURBISHED", sub: "Galaxy S Ultra", img: "phone", screen: 6.9, chip: "Snapdragon 8 Elite for Galaxy",
      colors: ["Titanium Black", "Titanium Gray"], sizes: [[256, 12, 1049], [512, 12, 1149]],
      summary: "Refurbished Galaxy S25 Ultra. Grading and warranty terms are confirmed in the offer.",
      specs: [["Display", "Panel", "6.9-inch QHD+ Dynamic AMOLED 2X"], ["Performance", "Chipset", "Snapdragon 8 Elite for Galaxy"], ["Camera", "Main", "200MP wide"]],
    },
    {
      model: "Galaxy Z Fold7", sub: "Foldables", img: "foldable", screen: 8.0, chip: "Snapdragon 8 Elite for Galaxy",
      colors: ["Blue Shadow", "Silver Shadow", "Jetblack"], sizes: [[256, 12, 1999], [512, 12, 2119], [1024, 16, 2419]],
      summary: "Book-style foldable with an 8.0-inch main display, 6.5-inch cover screen and 200MP main camera.",
      specs: [["Display", "Main", "8.0-inch QXGA+ Dynamic AMOLED 2X, 120Hz"], ["Display", "Cover", "6.5-inch FHD+ Dynamic AMOLED 2X"], ["Performance", "Chipset", "Snapdragon 8 Elite for Galaxy"], ["Camera", "Main", "200MP wide"], ["Battery", "Capacity", "4,400mAh"]],
    },
    {
      model: "Galaxy Z Flip7", sub: "Foldables", img: "flip", screen: 6.9, chip: "Exynos 2500",
      colors: ["Blue Shadow", "Jetblack", "Coralred"], sizes: [[256, 12, 1099], [512, 12, 1219]],
      summary: "Clamshell foldable with a 6.9-inch main display and edge-to-edge 4.1-inch FlexWindow.",
      specs: [["Display", "Main", "6.9-inch FHD+ Dynamic AMOLED 2X, 120Hz"], ["Display", "Cover", "4.1-inch Super AMOLED FlexWindow"], ["Performance", "Chipset", "Exynos 2500"], ["Battery", "Capacity", "4,300mAh"]],
    },
    {
      model: "Galaxy Z Fold6", cond: "REFURBISHED", sub: "Foldables", img: "foldable", screen: 7.6, chip: "Snapdragon 8 Gen 3 for Galaxy",
      colors: ["Silver Shadow", "Navy"], sizes: [[256, 12, 1299], [512, 12, 1399]],
      summary: "Refurbished Galaxy Z Fold6 with 7.6-inch main display. Grading confirmed per lot.",
      specs: [["Display", "Main", "7.6-inch QXGA+ Dynamic AMOLED 2X"], ["Performance", "Chipset", "Snapdragon 8 Gen 3 for Galaxy"]],
    },
  ];
  for (const p of galaxy) {
    for (const [gb, ram, usd] of p.sizes) {
      const cond = p.cond ?? "NEW";
      out.push({
        category: "galaxy", subcategory: p.sub, manufacturer: "Samsung", model: p.model,
        name: `Samsung ${p.model} ${st(gb)} / ${ram}GB${cond === "REFURBISHED" ? " — Refurbished" : ""}`,
        condition: cond, summary: p.summary,
        specs: [...p.specs, ["Memory", "RAM", `${ram}GB`], ["Storage", "Capacity", st(gb)]],
        attributes: { storageGb: gb, ramGb: ram, screenIn: p.screen, cpu: p.chip },
        referenceUsd: usd, moq: cond === "NEW" ? 20 : 10, orderIncrement: 5,
        availability: cond === "NEW" ? "INDICATIVE_AVAILABLE" : "LIMITED_CONFIRM",
        imageKey: p.img,
        variants: p.colors.flatMap((c) => [{ label: `${c} · International (Dual SIM)`, color: c, region: "INTL" }, { label: `${c} · US (unlocked)`, color: c, region: "US" }]),
        regionCompatibility: PHONE_REGION, shippingRestrictions: LITHIUM,
        warrantyInfo: cond === "NEW" ? MFR_WARRANTY : REFURB_WARRANTY,
      });
    }
  }

  /* ---------------- Tablets ---------------- */
  const ipadSizes: [number, number, number][] = [[256, 12, 0], [512, 12, 200], [1024, 16, 600], [2048, 16, 1000]];
  for (const size of [11, 13] as const) {
    for (const cell of [false, true]) {
      for (const [gb, ram, add] of ipadSizes) {
        const base = size === 11 ? 999 : 1299;
        out.push({
          category: "tablets", subcategory: "iPad Pro", manufacturer: "Apple", model: `iPad Pro ${size}-inch (M5)`,
          name: `Apple iPad Pro ${size}" M5 ${st(gb)} ${cell ? "Wi-Fi + Cellular" : "Wi-Fi"}`,
          summary: `iPad Pro ${size}-inch with M5 chip and Ultra Retina XDR tandem OLED display${gb >= 1024 ? "; 1TB/2TB configurations include 16GB unified memory" : ""}.`,
          specs: [["Display", "Panel", `${size}-inch Ultra Retina XDR (tandem OLED), ProMotion`], ["Performance", "Chip", "Apple M5"], ["Memory", "Unified memory", `${ram}GB`], ["Storage", "Capacity", st(gb)], ["Connectivity", "Network", cell ? "Wi-Fi 7 + 5G cellular" : "Wi-Fi 7"], ["Connectivity", "Port", "Thunderbolt / USB 4"]],
          attributes: { storageGb: gb, ramGb: ram, screenIn: size, cpu: "Apple M5" },
          referenceUsd: base + add + (cell ? 200 : 0), moq: 10, orderIncrement: 5, availability: "INDICATIVE_AVAILABLE", imageKey: "tablet",
          variants: [{ label: "Space Black", color: "Space Black" }, { label: "Silver", color: "Silver" }],
          shippingRestrictions: LITHIUM, warrantyInfo: MFR_WARRANTY,
          regionCompatibility: cell ? "Cellular band support varies by regional model; confirm destination market." : undefined,
        });
      }
    }
  }
  for (const [gb, usd] of [[128, 799], [256, 899], [512, 1099]] as const) {
    out.push({
      category: "tablets", subcategory: "iPad Air", manufacturer: "Apple", model: "iPad Air 13-inch (M3)",
      name: `Apple iPad Air 13" M3 ${st(gb)} Wi-Fi`, summary: "13-inch iPad Air with M3 chip and Liquid Retina display.",
      specs: [["Display", "Panel", "13-inch Liquid Retina"], ["Performance", "Chip", "Apple M3"], ["Storage", "Capacity", st(gb)]],
      attributes: { storageGb: gb, screenIn: 13, cpu: "Apple M3" }, referenceUsd: usd, moq: 10, orderIncrement: 5,
      availability: "INDICATIVE_AVAILABLE", imageKey: "tablet", variants: [{ label: "Space Gray", color: "Space Gray" }, { label: "Blue", color: "Blue" }, { label: "Starlight", color: "Starlight" }],
      shippingRestrictions: LITHIUM, warrantyInfo: MFR_WARRANTY,
    });
  }
  for (const [gb, ram, usd] of [[256, 12, 1199], [512, 12, 1319], [1024, 16, 1599]] as const) {
    out.push({
      category: "tablets", subcategory: "Android tablets", manufacturer: "Samsung", model: "Galaxy Tab S11 Ultra",
      name: `Samsung Galaxy Tab S11 Ultra ${st(gb)} / ${ram}GB Wi-Fi`, summary: "14.6-inch Dynamic AMOLED 2X Android tablet with included S Pen.",
      specs: [["Display", "Panel", "14.6-inch Dynamic AMOLED 2X, 120Hz"], ["Performance", "Chipset", "MediaTek Dimensity 9400+"], ["Memory", "RAM", `${ram}GB`], ["Storage", "Capacity", st(gb)], ["Input", "Stylus", "S Pen included"]],
      attributes: { storageGb: gb, ramGb: ram, screenIn: 14.6, cpu: "Dimensity 9400+" }, referenceUsd: usd, moq: 10, orderIncrement: 5,
      availability: "INDICATIVE_AVAILABLE", imageKey: "tablet", variants: [{ label: "Gray", color: "Gray" }, { label: "Silver", color: "Silver" }],
      shippingRestrictions: LITHIUM, warrantyInfo: MFR_WARRANTY,
    });
  }
  out.push({
    category: "tablets", subcategory: "Windows tablets", manufacturer: "Microsoft", model: "Surface Pro 11th Edition",
    name: "Microsoft Surface Pro 13\" OLED, Snapdragon X Elite, 16GB / 1TB", summary: "Windows 2-in-1 with 13-inch OLED display and Snapdragon X Elite processor; keyboard sold separately.",
    specs: [["Display", "Panel", "13-inch OLED PixelSense Flow, 120Hz"], ["Performance", "Processor", "Snapdragon X Elite"], ["Memory", "RAM", "16GB LPDDR5x"], ["Storage", "SSD", "1TB"]],
    attributes: { storageGb: 1024, ramGb: 16, screenIn: 13, cpu: "Snapdragon X Elite" }, referenceUsd: 1799, moq: 10,
    availability: "ON_REQUEST", imageKey: "tablet", variants: [{ label: "Platinum", color: "Platinum" }, { label: "Black", color: "Black" }],
    shippingRestrictions: LITHIUM, warrantyInfo: MFR_WARRANTY,
  });
  return out;
}
