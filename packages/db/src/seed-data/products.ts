/**
 * Hand-written demo catalog data (CLAUDE.md: "Seed data must include: 4 cars,
 * 4 phones, 2 laptops with full SpecDefinitions per category"). The 2 cars in
 * examples/comparison-example.json ship real cutout/logo assets and are
 * seeded separately so `pnpm render` keeps working unmodified; these extra
 * catalog rows exist for the comparison/round-selection engine (Phase 3) and
 * dashboard browsing, and intentionally carry no ProductImage rows since no
 * licensed image assets exist for them yet.
 */
export interface DemoSpecValue {
  numberValue?: number | null;
  textValue?: string | null;
  boolValue?: boolean | null;
  displayValue: string;
}

export interface DemoProduct {
  brand: string;
  name: string;
  variant?: string | null;
  releaseYear: number;
  priceUsd: number;
  accentColor: string;
  specs: Record<string, DemoSpecValue>;
}

export const EXTRA_CAR_PRODUCTS: DemoProduct[] = [
  {
    brand: "Ford",
    name: "Mustang GT",
    releaseYear: 2026,
    priceUsd: 45995,
    accentColor: "#1F4CBE",
    specs: {
      horsepower: { numberValue: 480, displayValue: "480 hp" },
      "0_100_km_h": { numberValue: 4.3, displayValue: "4.3 s" },
      drivetrain: { textValue: "RWD", displayValue: "RWD" },
      torque: { numberValue: 570, displayValue: "570 Nm" },
      weight: { numberValue: 1720, displayValue: "1,720 kg" },
      price: { numberValue: 45995, displayValue: "$45,995" },
      top_speed: { numberValue: 250, displayValue: "250 km/h" },
    },
  },
  {
    brand: "Mazda",
    name: "MX-5",
    variant: "RF",
    releaseYear: 2026,
    priceUsd: 33750,
    accentColor: "#910A2D",
    specs: {
      horsepower: { numberValue: 181, displayValue: "181 hp" },
      "0_100_km_h": { numberValue: 6.5, displayValue: "6.5 s" },
      drivetrain: { textValue: "RWD", displayValue: "RWD" },
      torque: { numberValue: 205, displayValue: "205 Nm" },
      weight: { numberValue: 1075, displayValue: "1,075 kg" },
      price: { numberValue: 33750, displayValue: "$33,750" },
      top_speed: { numberValue: 219, displayValue: "219 km/h" },
    },
  },
];

export const PHONE_PRODUCTS: DemoProduct[] = [
  {
    brand: "Apple",
    name: "iPhone 17 Pro",
    releaseYear: 2026,
    priceUsd: 1099,
    accentColor: "#8A8D8F",
    specs: {
      price: { numberValue: 1099, displayValue: "$1,099" },
      display_size: { numberValue: 6.3, displayValue: "6.3\"" },
      battery_capacity: { numberValue: 3650, displayValue: "3,650 mAh" },
      main_camera_mp: { numberValue: 48, displayValue: "48 MP" },
      ram_gb: { numberValue: 8, displayValue: "8 GB" },
      storage_gb: { numberValue: 256, displayValue: "256 GB" },
      has_5g: { boolValue: true, displayValue: "5G" },
    },
  },
  {
    brand: "Samsung",
    name: "Galaxy S26 Ultra",
    releaseYear: 2026,
    priceUsd: 1299,
    accentColor: "#101828",
    specs: {
      price: { numberValue: 1299, displayValue: "$1,299" },
      display_size: { numberValue: 6.9, displayValue: "6.9\"" },
      battery_capacity: { numberValue: 5000, displayValue: "5,000 mAh" },
      main_camera_mp: { numberValue: 200, displayValue: "200 MP" },
      ram_gb: { numberValue: 12, displayValue: "12 GB" },
      storage_gb: { numberValue: 256, displayValue: "256 GB" },
      has_5g: { boolValue: true, displayValue: "5G" },
    },
  },
  {
    brand: "Google",
    name: "Pixel 10 Pro",
    releaseYear: 2026,
    priceUsd: 999,
    accentColor: "#4285F4",
    specs: {
      price: { numberValue: 999, displayValue: "$999" },
      display_size: { numberValue: 6.4, displayValue: "6.4\"" },
      battery_capacity: { numberValue: 4870, displayValue: "4,870 mAh" },
      main_camera_mp: { numberValue: 50, displayValue: "50 MP" },
      ram_gb: { numberValue: 16, displayValue: "16 GB" },
      storage_gb: { numberValue: 128, displayValue: "128 GB" },
      has_5g: { boolValue: true, displayValue: "5G" },
    },
  },
  {
    brand: "OnePlus",
    name: "13",
    releaseYear: 2026,
    priceUsd: 899,
    accentColor: "#EB0029",
    specs: {
      price: { numberValue: 899, displayValue: "$899" },
      display_size: { numberValue: 6.82, displayValue: "6.82\"" },
      battery_capacity: { numberValue: 6000, displayValue: "6,000 mAh" },
      main_camera_mp: { numberValue: 50, displayValue: "50 MP" },
      ram_gb: { numberValue: 16, displayValue: "16 GB" },
      storage_gb: { numberValue: 512, displayValue: "512 GB" },
      has_5g: { boolValue: true, displayValue: "5G" },
    },
  },
];

export const LAPTOP_PRODUCTS: DemoProduct[] = [
  {
    brand: "Apple",
    name: "MacBook Pro 14",
    variant: "M5 Pro",
    releaseYear: 2026,
    priceUsd: 2199,
    accentColor: "#8A8D8F",
    specs: {
      price: { numberValue: 2199, displayValue: "$2,199" },
      cpu_cores: { numberValue: 14, displayValue: "14 cores" },
      ram_gb: { numberValue: 24, displayValue: "24 GB" },
      storage_gb: { numberValue: 512, displayValue: "512 GB" },
      battery_life_hours: { numberValue: 18, displayValue: "18 h" },
      weight: { numberValue: 1.6, displayValue: "1.6 kg" },
      display_size: { textValue: "14.2\"", displayValue: "14.2\"" },
    },
  },
  {
    brand: "Dell",
    name: "XPS 14",
    releaseYear: 2026,
    priceUsd: 1899,
    accentColor: "#0672CB",
    specs: {
      price: { numberValue: 1899, displayValue: "$1,899" },
      cpu_cores: { numberValue: 16, displayValue: "16 cores" },
      ram_gb: { numberValue: 32, displayValue: "32 GB" },
      storage_gb: { numberValue: 1024, displayValue: "1 TB" },
      battery_life_hours: { numberValue: 13, displayValue: "13 h" },
      weight: { numberValue: 1.65, displayValue: "1.65 kg" },
      display_size: { textValue: "14.5\"", displayValue: "14.5\"" },
    },
  },
];
