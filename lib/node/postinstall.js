import fs from 'node:fs';
import path from 'node:path';

const projectRootPath = path.resolve('../../');
const packageJsonPath = path.join(projectRootPath, 'package.json');
const configFileName = 'accessibilityTester.config.mjs';
const configFilePath = path.join(projectRootPath, configFileName);

const configFileContent = `export default {
      baseUrl: 'http://localhost:4321',
      maxPagesToVisit: 100,
      concurrency: 8,
      maxDepth: 100,
      skipExternalDomain: true,
      exclusions: [],
      relativePaths: [],
      groupPatterns: [],
      serverCommand: 'npm run start'
  }`;

function updatePackageJson() {
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['test:accessibility'] = 'node ./accessibility/accessibilityTester/index.js';

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`Updated scripts in ${packageJsonPath}`);
  } else {
    console.log(`No package.json found at ${packageJsonPath}`);
  }
}

function createConfigFile() {
  if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, configFileContent);
    console.log(`Created ${configFileName} in the project root directory.`);
  } else {
    console.log(`${configFileName} already exists in the project root directory.`);
  }
}

try {
  updatePackageJson();
  createConfigFile();
} catch (error) {
  console.error('Error during preinstall script:', error);
  process.exit(1);
}
