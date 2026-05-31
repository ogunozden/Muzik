import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";

const root = process.cwd();
const csvPath = path.join(root, "symb", "Turkish maqam music pieces in time series format_3000 rows x 365 columns.csv");
const outputPath = path.join(root, "src", "data", "symbtr", "catalog.generated.json");

function parseIdentifier(identifier) {
  const [makam = "", form = "", usul = "", title = "", composer = ""] = identifier.split("--");
  return {makam, form, usul, title, composer};
}

const csv = readFileSync(csvPath, "utf8").trim();
const [, ...rows] = csv.split(/\r?\n/);

const entries = rows
  .map((line) => line.split(",", 1)[0]?.trim())
  .filter(Boolean)
  .map((id) => ({
    id,
    ...parseIdentifier(id),
    formats: ["txt", "mid", "xml", "mu2", "pdf"],
  }))
  .sort((left, right) => left.id.localeCompare(right.id));

mkdirSync(path.dirname(outputPath), {recursive: true});
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      source: "SymbTr v3 local CSV and archives",
      generatedAt: new Date().toISOString(),
      count: entries.length,
      entries,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote ${entries.length} SymbTr catalog entries to ${path.relative(root, outputPath)}`);
