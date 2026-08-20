import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const failures = [];

const bytes = (file) => fs.statSync(file).size;
const assertMax = (file, maxBytes, label) => {
  if (!fs.existsSync(file)) {
    failures.push(`${label}: missing file ${path.relative(root, file)}`);
    return;
  }
  const actual = bytes(file);
  if (actual > maxBytes) {
    failures.push(`${label}: ${actual} bytes exceeds ${maxBytes} bytes`);
  }
  console.log(`${label}: ${actual} bytes / ${maxBytes} budget`);
};

assertMax(path.join(dist, "index.html"), 15_000, "homepage HTML");
assertMax(path.join(dist, "blog", "index.html"), 20_000, "blog HTML");
assertMax(
  path.join(dist, "blog", "best-chrome-extensions-for-web-accessibility-testing", "index.html"),
  30_000,
  "sample article HTML",
);

const assetDir = path.join(dist, "assets");
if (fs.existsSync(assetDir)) {
  for (const file of fs.readdirSync(assetDir)) {
    const fullPath = path.join(assetDir, file);
    if (!fs.statSync(fullPath).isFile()) continue;
    if (/\.js$/i.test(file)) assertMax(fullPath, 450_000, `JavaScript asset ${file}`);
    if (/\.css$/i.test(file)) assertMax(fullPath, 150_000, `CSS asset ${file}`);
  }
}

if (failures.length) {
  console.error("\nPerformance budget failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Performance budgets passed.");
