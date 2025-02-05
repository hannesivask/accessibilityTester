import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = path.join(__dirname, 'index.html');
const destinationPath = path.join(process.cwd(), 'accessibilityTester-results', 'index.html');
const jsDestinationPath = path.join(process.cwd(), 'accessibilityTester-results', 'accessibilityTester-results.js');

export function generateHtmlReport(allResults) {
  const fileContent = `window.ACCESSIBILITY_RESULTS = ${JSON.stringify(allResults)};`;

  fs.copyFileSync(sourcePath, destinationPath);
  fs.writeFileSync(jsDestinationPath, fileContent);

  console.log(`HTML report generated at: ${destinationPath}`);
}
