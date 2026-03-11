import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Data directories
const DATA_DIR = path.join(process.cwd(), "data");
const ITEMS_DIR = path.join(DATA_DIR, "found_items");
const METADATA_FILE = path.join(DATA_DIR, "found_items_metadata.csv");

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(ITEMS_DIR)) fs.mkdirSync(ITEMS_DIR, { recursive: true });

// Standardized Locations
const VALID_LOCATIONS = [
  "Library",
  "Cafeteria",
  "Gymnasium",
  "Main Hall",
  "Science Lab",
  "Computer Room",
  "Parking Lot",
  "Student Lounge",
  "Other",
];

// Initialize CSV if missing
if (!fs.existsSync(METADATA_FILE)) {
  const headers = [
    "item_id",
    "item_name",
    "found_place",
    "date_found",
    "image_path",
    "finder_full_name",
    "finder_contact_number",
    "finder_person_type",
    "finder_student_id",
    "finder_purpose",
    "finder_purpose_other",
  ];
  fs.writeFileSync(METADATA_FILE, stringify([headers]));
}

app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve uploaded images
app.use("/uploads", express.static(ITEMS_DIR));

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ITEMS_DIR),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

// Helpers
function normalizeText(s: string) {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function normalizePhone(s: string) {
  return (s || "").replace(/\D/g, "");
}

// Save items
app.post("/api/items", upload.array("images"), (req, res) => {
  try {
    const itemsData = JSON.parse(req.body.items);
    const files = req.files as Express.Multer.File[];

    const fileContent = fs.readFileSync(METADATA_FILE, "utf-8");
    const records = parse(fileContent, { columns: false, skip_empty_lines: true, trim: true });

    let fileIndex = 0;
    const newRecords: any[] = [];

    for (const item of itemsData) {
      const itemId = uuidv4().substring(0, 8);

      let imagePath = "";
      if (item.hasImage && files && files[fileIndex]) {
        imagePath = `/uploads/${files[fileIndex].filename}`;
        fileIndex++;
      }

      const contact = normalizePhone(item.finder_contact_number || "");
      const placeInput = (item.found_place || "").trim();
      const place = VALID_LOCATIONS.includes(placeInput) ? placeInput : "Other";

      newRecords.push([
        itemId,
        normalizeText(item.item_name || ""),
        place,
        new Date().toISOString(),
        imagePath,
        (item.finder_full_name || "").trim(),
        contact,
        (item.finder_person_type || "").trim(),
        (item.finder_student_id || "").trim(),
        (item.finder_purpose || "").trim(),
        (item.finder_purpose_other || "").trim(),
      ]);
    }

    fs.writeFileSync(METADATA_FILE, stringify([...records, ...newRecords]));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Search items (text-based)
app.get("/api/items/search", (req, res) => {
  try {
    const { item_name, found_place } = req.query;

    const fileContent = fs.readFileSync(METADATA_FILE, "utf-8");
    const records = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });

    const searchName = normalizeText((item_name as string) || "");
    const searchPlace = normalizeText((found_place as string) || "");

    const SYNONYMS: Record<string, string[]> = {
      phone: ["mobile", "smartphone", "iphone", "android"],
      headphone: ["earphone", "earbuds", "buds", "pods"],
      wallet: ["purse", "bag", "pouch"],
      keys: ["key", "keyring", "keychain"],
    };

    const results = records.filter((r: any) => {
      const dbPlace = normalizeText(r.found_place || "");
      const dbName = normalizeText(r.item_name || "");

      if (searchPlace && !dbPlace.includes(searchPlace)) return false;
      if (!searchName) return false;

      const words = searchName.split(/\s+/).filter(Boolean);
      return words.some((w) => {
        const expanded = [w, ...(SYNONYMS[w] || [])];
        return expanded.some((t) => dbName.includes(t));
      });
    });

    res.json({ success: true, results: results.slice(0, 10) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset storage (dev helper)
app.delete("/api/storage/reset", (_req, res) => {
  try {
    if (fs.existsSync(ITEMS_DIR)) {
      const files = fs.readdirSync(ITEMS_DIR);
      for (const file of files) fs.unlinkSync(path.join(ITEMS_DIR, file));
    }

    const headers = [
      "item_id",
      "item_name",
      "found_place",
      "date_found",
      "image_path",
      "finder_full_name",
      "finder_contact_number",
      "finder_person_type",
      "finder_student_id",
      "finder_purpose",
      "finder_purpose_other",
    ];
    fs.writeFileSync(METADATA_FILE, stringify([headers]));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve("dist")));
    app.get("*", (_req, res) => res.sendFile(path.resolve("dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
