/**
 * Consumer-electronics families: audio, smartwatches, chargers & power, game consoles.
 * Reference prices are indicative SAMPLE figures (approximate launch list prices in US$) — NOT verified
 * market data or supplier quotes. Replace with verified pricing before launch (docs/CATALOG.md).
 */
import { LITHIUM, MFR_WARRANTY, type CatalogItem, type Spec } from "./types";

type Row = [mfr: string, model: string, sub: string, summary: string, usd: number, img: string, specs: Spec[], colors?: string[]];

function build(category: string, rows: Row[], o: { moq: number; inc: number; lithium?: boolean }): CatalogItem[] {
  return rows.map(([mfr, model, sub, summary, usd, img, specs, colors]) => ({
    category, subcategory: sub, manufacturer: mfr, model, name: `${mfr} ${model}`,
    summary: `${summary}.`, specs, attributes: { formFactor: sub },
    referenceUsd: usd, moq: usd >= 600 ? Math.max(2, Math.round(o.moq / 4)) : o.moq, orderIncrement: usd >= 600 ? 1 : o.inc,
    availability: "INDICATIVE_AVAILABLE", leadTime: "Indicative 5–10 business days after payment; confirmed per order",
    imageKey: img, warrantyInfo: MFR_WARRANTY,
    variants: (colors?.length ? colors : ["Standard"]).map((c) => ({ label: c === "Standard" ? "Standard" : c, color: c === "Standard" ? undefined : c, region: "GLOBAL" })),
    regionCompatibility: "Plug type, language and regional features vary by market version. Confirm the destination market before ordering.",
    shippingRestrictions: o.lithium ? LITHIUM : undefined,
  }));
}

export function audio(): CatalogItem[] {
  const rows: Row[] = [
    ["Apple", "AirPods Pro 3", "Earbuds", "Active noise cancelling earbuds with USB-C charging case", 249, "earbuds", [["Audio", "Noise control", "Active noise cancellation, Transparency"], ["Battery", "Charging", "USB-C case"], ["Connectivity", "Pairing", "Bluetooth"]]],
    ["Apple", "AirPods 4 with Active Noise Cancellation", "Earbuds", "Open-fit earbuds with ANC and USB-C case", 179, "earbuds", [["Audio", "Noise control", "Active noise cancellation"], ["Battery", "Charging", "USB-C case"]]],
    ["Apple", "AirPods Max (USB-C)", "Headphones", "Over-ear headphones with ANC and spatial audio", 549, "headset", [["Audio", "Noise control", "Active noise cancellation"], ["Connectivity", "Port", "USB-C"]], ["Midnight", "Starlight", "Blue"]],
    ["Sony", "WH-1000XM6", "Headphones", "Wireless over-ear noise cancelling headphones", 449, "headset", [["Audio", "Noise control", "Adaptive noise cancellation"], ["Connectivity", "Pairing", "Bluetooth, multipoint"]], ["Black", "Platinum Silver"]],
    ["Sony", "WF-1000XM5", "Earbuds", "Noise cancelling true wireless earbuds", 299, "earbuds", [["Audio", "Noise control", "Active noise cancellation"], ["Battery", "Charging", "USB-C and Qi wireless case"]], ["Black", "Silver"]],
    ["Bose", "QuietComfort Ultra Headphones (2nd Gen)", "Headphones", "Over-ear headphones with immersive audio and ANC", 449, "headset", [["Audio", "Noise control", "Active noise cancellation"], ["Connectivity", "Port", "USB-C (audio and charging)"]], ["Black", "White Smoke"]],
    ["Bose", "QuietComfort Ultra Earbuds (2nd Gen)", "Earbuds", "Noise cancelling earbuds with immersive audio", 299, "earbuds", [["Audio", "Noise control", "Active noise cancellation"]], ["Black", "White Smoke"]],
    ["Samsung", "Galaxy Buds3 Pro", "Earbuds", "ANC earbuds with blade design", 249, "earbuds", [["Audio", "Noise control", "Adaptive ANC"], ["Battery", "Charging", "USB-C and wireless case"]], ["Silver", "White"]],
    ["Sennheiser", "MOMENTUM 4 Wireless", "Headphones", "Wireless headphones with long battery life", 349, "headset", [["Audio", "Noise control", "Adaptive ANC"], ["Battery", "Rated", "Up to 60 hours (manufacturer figure)"]], ["Black", "White"]],
    ["JBL", "Charge 6", "Portable speakers", "Waterproof portable Bluetooth speaker", 199, "speaker", [["Durability", "Rating", "IP68 (manufacturer rating)"], ["Connectivity", "Pairing", "Bluetooth"]], ["Black", "Blue", "Red"]],
    ["JBL", "Flip 7", "Portable speakers", "Compact waterproof Bluetooth speaker", 149, "speaker", [["Durability", "Rating", "IP68 (manufacturer rating)"]], ["Black", "Blue", "Red"]],
    ["JBL", "PartyBox 320", "Party speakers", "Portable party speaker with lights and replaceable battery", 499, "speaker", [["Power", "Battery", "Replaceable"], ["Inputs", "Mic/guitar", "Dual inputs"]]],
    ["Sonos", "Era 100", "Home speakers", "Compact smart speaker with stereo sound", 199, "speaker", [["Connectivity", "Network", "Wi-Fi, Bluetooth"]], ["Black", "White"]],
    ["Sonos", "Move 2", "Portable speakers", "Portable smart speaker with Wi-Fi and Bluetooth", 449, "speaker", [["Connectivity", "Network", "Wi-Fi, Bluetooth"], ["Durability", "Rating", "IP56 (manufacturer rating)"]], ["Black", "Olive"]],
    ["Sonos", "Arc Ultra", "Soundbars", "Premium Dolby Atmos soundbar", 999, "speaker", [["Audio", "Format", "Dolby Atmos"], ["Connectivity", "TV", "HDMI eARC"]], ["Black", "White"]],
    ["Bose", "SoundLink Max", "Portable speakers", "Large portable Bluetooth speaker", 399, "speaker", [["Durability", "Rating", "IP67 (manufacturer rating)"]], ["Black", "Blue Dusk"]],
    ["Marshall", "Stanmore III", "Home speakers", "Bluetooth home speaker", 379, "speaker", [["Connectivity", "Inputs", "Bluetooth, RCA, 3.5 mm"]], ["Black", "Cream"]],
  ];
  return build("audio", rows, { moq: 10, inc: 5, lithium: true });
}

export function smartwatches(): CatalogItem[] {
  const rows: Row[] = [
    ["Apple", "Watch Series 11 GPS 46mm", "Smartwatches", "Apple Watch with health and fitness tracking", 429, "watch", [["Display", "Case", "46 mm aluminium"], ["Connectivity", "Network", "GPS"], ["Compatibility", "Phone", "iPhone required"]], ["Jet Black", "Silver", "Rose Gold"]],
    ["Apple", "Watch Series 11 GPS 42mm", "Smartwatches", "Apple Watch with health and fitness tracking", 399, "watch", [["Display", "Case", "42 mm aluminium"], ["Connectivity", "Network", "GPS"], ["Compatibility", "Phone", "iPhone required"]], ["Jet Black", "Silver", "Rose Gold"]],
    ["Apple", "Watch Ultra 3", "Outdoor watches", "Rugged titanium Apple Watch with cellular", 799, "watch", [["Display", "Case", "49 mm titanium"], ["Connectivity", "Network", "GPS + Cellular"]], ["Natural", "Black"]],
    ["Apple", "Watch SE 3 GPS 44mm", "Smartwatches", "Entry Apple Watch", 279, "watch", [["Display", "Case", "44 mm aluminium"], ["Compatibility", "Phone", "iPhone required"]], ["Midnight", "Starlight"]],
    ["Samsung", "Galaxy Watch8 44mm", "Smartwatches", "Wear OS smartwatch with health sensors", 379, "watch", [["Display", "Case", "44 mm"], ["Compatibility", "Phone", "Android"]], ["Graphite", "Silver"]],
    ["Samsung", "Galaxy Watch8 Classic", "Smartwatches", "Smartwatch with rotating bezel", 499, "watch", [["Display", "Case", "46 mm"], ["Controls", "Bezel", "Rotating"]], ["Black", "White"]],
    ["Samsung", "Galaxy Watch Ultra", "Outdoor watches", "Rugged titanium Wear OS watch", 649, "watch", [["Display", "Case", "47 mm titanium"], ["Connectivity", "Network", "LTE"]], ["Titanium Gray", "Titanium Silver"]],
    ["Google", "Pixel Watch 4 45mm", "Smartwatches", "Wear OS smartwatch with Fitbit health", 399, "watch", [["Display", "Case", "45 mm"], ["Compatibility", "Phone", "Android"]], ["Obsidian", "Moonstone"]],
    ["Garmin", "fēnix 8 AMOLED 47mm", "Outdoor watches", "Multisport GPS watch with AMOLED display", 999, "watch", [["Display", "Type", "AMOLED"], ["Navigation", "Maps", "Preloaded topo maps"]]],
    ["Garmin", "Forerunner 970", "Sports watches", "Premium running GPS watch", 749, "watch", [["Display", "Type", "AMOLED"], ["Sport", "Focus", "Running and triathlon"]]],
    ["Garmin", "Venu X1", "Smartwatches", "Large-screen fitness smartwatch", 799, "watch", [["Display", "Type", "AMOLED"]]],
  ];
  return build("smartwatches", rows, { moq: 10, inc: 5, lithium: true });
}

export function chargers(): CatalogItem[] {
  const rows: Row[] = [
    ["Apple", "20W USB-C Power Adapter", "Wall chargers", "Compact single-port USB-C charger", 19, "charger", [["Output", "Max", "20 W USB-C PD"]]],
    ["Apple", "35W Dual USB-C Port Compact Power Adapter", "Wall chargers", "Two-port compact USB-C charger", 59, "charger", [["Output", "Max", "35 W shared across 2× USB-C"]]],
    ["Apple", "MagSafe Charger (25W, 1 m)", "Wireless chargers", "Magnetic wireless charger for iPhone", 49, "charger", [["Output", "Max", "Up to 25 W with compatible iPhone and adapter"]]],
    ["Apple", "240W USB-C Charge Cable (2 m)", "Cables", "Woven USB-C charging cable", 29, "dock", [["Cable", "Rating", "240 W"], ["Cable", "Length", "2 m"]]],
    ["Samsung", "45W Power Adapter", "Wall chargers", "Super Fast Charging 2.0 USB-C charger", 49, "charger", [["Output", "Max", "45 W USB-C PD (PPS)"]]],
    ["Anker", "Prime Charger (100W, 3 ports, GaN)", "Wall chargers", "Three-port GaN charger", 85, "charger", [["Output", "Max", "100 W total"], ["Ports", "Layout", "2× USB-C, 1× USB-A"]]],
    ["Anker", "Nano Charger (30W)", "Wall chargers", "Ultra-compact USB-C charger", 25, "charger", [["Output", "Max", "30 W USB-C PD"]]],
    ["Anker", "Prime Power Bank (26,250mAh, 300W)", "Power banks", "High-output laptop power bank", 179, "powerbank", [["Capacity", "Rated", "26,250 mAh"], ["Output", "Max", "300 W total"]]],
    ["Anker", "MagGo Power Bank (10K)", "Power banks", "Magnetic Qi2 power bank with stand", 89, "powerbank", [["Capacity", "Rated", "10,000 mAh"], ["Wireless", "Standard", "Qi2"]]],
    ["Belkin", "BoostCharge Pro 3-in-1 with Qi2 15W", "Wireless chargers", "Charging stand for phone, watch and earbuds", 129, "charger", [["Output", "Phone", "Up to 15 W (Qi2)"], ["Devices", "Simultaneous", "3"]]],
    ["UGREEN", "Nexode 300W GaN Desktop Charger", "Desktop chargers", "Five-port desktop charging station", 169, "charger", [["Output", "Max", "300 W total"], ["Ports", "Layout", "4× USB-C, 1× USB-A"]]],
    ["UGREEN", "Nexode 100W USB-C Charger", "Wall chargers", "Four-port GaN charger", 69, "charger", [["Output", "Max", "100 W total"]]],
    ["Samsung", "25W Power Adapter", "Wall chargers", "Super Fast Charging USB-C adapter", 19, "charger", [["Output", "Max", "25 W USB-C PD (PPS)"]]],
  ];
  // Power banks contain lithium cells; chargers and cables do not.
  return build("chargers", rows, { moq: 50, inc: 10 }).map((it) => it.subcategory === "Power banks" ? { ...it, shippingRestrictions: "Standalone lithium-ion battery (UN3480). Restricted on passenger aircraft; ships by sea/road or cargo air with DG handling." } : it);
}

export function consoles(): CatalogItem[] {
  const rows: Row[] = [
    ["Sony", "PlayStation 5 Pro", "Consoles", "PS5 Pro console with 2 TB SSD", 749, "console", [["Storage", "SSD", "2 TB"], ["Video", "Output", "Up to 4K / 8K-capable (title dependent)"]]],
    ["Sony", "PlayStation 5 Digital Edition (Slim)", "Consoles", "Disc-free PS5 console", 499, "console", [["Storage", "SSD", "825 GB"]]],
    ["Sony", "DualSense Edge Wireless Controller", "Controllers", "Pro controller for PS5", 199, "controller", [["Connectivity", "Pairing", "Wireless, USB-C"]]],
    ["Microsoft", "Xbox Series X (1TB)", "Consoles", "Xbox Series X console", 649, "console", [["Storage", "SSD", "1 TB"], ["Video", "Output", "4K"]]],
    ["Microsoft", "Xbox Wireless Controller", "Controllers", "Wireless controller for Xbox and PC", 65, "controller", [["Connectivity", "Pairing", "Xbox Wireless, Bluetooth"]], ["Carbon Black", "Robot White"]],
    ["Nintendo", "Switch 2", "Consoles", "Hybrid home/handheld console", 449, "handheld", [["Display", "Size", "7.9-inch"], ["Storage", "Internal", "256 GB"]]],
    ["Valve", "Steam Deck OLED 1TB", "Handheld PCs", "Handheld gaming PC with OLED display", 649, "handheld", [["Display", "Panel", "7.4-inch HDR OLED"], ["Storage", "SSD", "1 TB"]]],
    ["ASUS", "ROG Xbox Ally X", "Handheld PCs", "Windows handheld gaming PC", 999, "handheld", [["Display", "Size", "7-inch 120 Hz"], ["Storage", "SSD", "1 TB"]]],
    ["Meta", "Quest 3 512GB", "VR headsets", "Mixed-reality headset", 499, "headset", [["Storage", "Internal", "512 GB"]]],
  ];
  return build("consoles", rows, { moq: 10, inc: 5, lithium: true }).map((it) => it.imageKey === "console" ? { ...it, shippingRestrictions: undefined } : it);
}
