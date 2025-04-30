import fs from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";

interface Product {
  reference_OE: string;
  id: string;
  name: string;
  brand: string;
  wvaNumbers?: string[];
  oeNumbers?: string[];
  eanNumber?: string;
  dimensions?: {
    manufacturerRestriction?: string;
    width?: string;
    height?: string;
    thickness?: string;
    checkmark?: string;
    SVHC?: string;
  };
}

// Constants
const ROOT_DIR = "./data/TRW";
const OUTPUT_FILE = "output.xlsx";

// Excel data array
const excelData: any[] = [];

// Recursively get all JSON files
async function getAllJsonFiles(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return getAllJsonFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        return [fullPath];
      }
      return [];
    })
  );

  return files.flat();
}

// Prepare a row for Excel
function prepareRow(json: Product): Record<string, string> {
  const idColumnName = `${json.brand}_ID`;
  const row: Record<string, string> = {
    REFERENCE_OE: json.reference_OE || "",
    [idColumnName]: json.id || "",
    BRAND: json.brand || "",
    EAN: json.eanNumber || "",
    MANUFACTURER_RESTRICTION: json.dimensions?.manufacturerRestriction || "",
    WIDTH: json.dimensions?.width || "",
    HEIGHT: json.dimensions?.height || "",
    THICKNESS: json.dimensions?.thickness || "",
    CHECKMARK: json.dimensions?.checkmark || "",
  };

  // Add WVA numbers
  const wva = json.wvaNumbers || [];
  for (let i = 0; i < 4; i++) {
    row[`WVA_${i + 1}`] = wva[i] || "";
  }

  // Add OE numbers
  const oe = json.oeNumbers || [];
  oe.forEach((num, index) => {
    row[`OE_${index + 1}`] = num;
  });

  return row;
}

// Export data to Excel
function exportToExcel(data: any[], outputPath: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, outputPath);
}

// Main function
async function main() {
  try {
    const jsonFiles = await getAllJsonFiles(ROOT_DIR);

    for (const filePath of jsonFiles) {
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const json: Product = JSON.parse(raw);
        const row = prepareRow(json);
        excelData.push(row);
      } catch (err) {
        console.error(`Invalid JSON file: ${filePath}`, err);
      }
    }

    exportToExcel(excelData, OUTPUT_FILE);
    console.log(`✅ Excel file created: ${OUTPUT_FILE}`);
  } catch (err) {
    console.error("Error during processing:", err);
  }
}

main();
