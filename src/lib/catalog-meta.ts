export const CATEGORIES = [
  { slug: "iphone", name: "Apple iPhone", imageKey: "phone", description: "iPhone 17 Pro, 17 Pro Max, iPhone Air and certified refurbished generations." },
  { slug: "galaxy", name: "Samsung Galaxy Ultra & Foldables", imageKey: "foldable", description: "Galaxy S Ultra flagships and Z Fold / Z Flip foldables." },
  { slug: "gaming-desktops", name: "Gaming Desktops", imageKey: "desktop", description: "Factory-built flagship gaming systems from leading OEMs." },
  { slug: "custom-gaming-pcs", name: "Build-to-Order Performance PCs", imageKey: "desktop-custom", description: "Configurable extreme-performance systems, specified per order." },
  { slug: "workstations", name: "Professional Workstations", imageKey: "workstation", description: "Xeon, Threadripper PRO and Apple silicon workstations for professional pipelines." },
  { slug: "laptops", name: "MacBook Pro & Premium Laptops", imageKey: "laptop", description: "MacBook Pro, mobile workstations and flagship gaming laptops." },
  { slug: "graphics-cards", name: "Graphics Cards", imageKey: "gpu", description: "GeForce RTX 50 Series board-partner cards and RTX PRO Blackwell GPUs." },
  { slug: "cpus-motherboards", name: "CPUs & Motherboards", imageKey: "cpu", description: "Desktop, HEDT and workstation processors with matching platforms." },
  { slug: "memory-storage", name: "Memory & Storage", imageKey: "ssd", description: "High-capacity DDR5, ECC RDIMMs, PCIe 5.0 and enterprise NVMe." },
  { slug: "monitors", name: "OLED & Professional Monitors", imageKey: "monitor", description: "QD-OLED gaming displays, ultrawides and reference-grade monitors." },
  { slug: "tablets", name: "iPad Pro & Premium Tablets", imageKey: "tablet", description: "iPad Pro M5, iPad Air and flagship Android and Windows tablets." },
  { slug: "networking", name: "Enterprise Networking", imageKey: "switch", description: "Switching, wireless, security gateways and network storage." },
  { slug: "creator", name: "Streaming & Creator Equipment", imageKey: "camera", description: "Cinema cameras, live production, audio and lighting." },
  { slug: "components", name: "Components & Accessories", imageKey: "psu", description: "Power, cooling, enclosures, peripherals, docks and power protection." },
] as const;

export const AVAILABILITY_LABEL: Record<string, { label: string; tone: "ok" | "warn" | "info" | "muted" }> = {
  INDICATIVE_AVAILABLE: { label: "Indicative availability · confirm", tone: "ok" },
  LIMITED_CONFIRM: { label: "Limited · requires confirmation", tone: "warn" },
  BUILD_TO_ORDER: { label: "Build to order", tone: "info" },
  PRE_ORDER: { label: "Pre-order", tone: "info" },
  ON_REQUEST: { label: "Sourced on request", tone: "muted" },
  UNAVAILABLE: { label: "Currently unavailable", tone: "muted" },
};

export const CONDITION_LABEL: Record<string, string> = { NEW: "New", REFURBISHED: "Refurbished", USED: "Used" };
