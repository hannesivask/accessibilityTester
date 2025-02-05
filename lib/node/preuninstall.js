import fs from 'node:fs';
import path from 'node:path';

const projectRootPath = path.resolve('../../');
const packageJsonPath = path.join(projectRootPath, 'package.json');
const configFileName = 'accessibilityTester.config.mjs';
const configFilePath = path.join(projectRootPath, configFileName);

function revertPackageJson() {
  try {
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      if (packageJson.scripts && packageJson.scripts['test:accessibility']) {
        delete packageJson.scripts['test:accessibility'];
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log(`Removed test:accessibility script from ${packageJsonPath}`);
      } else {
        console.log(`No test:accessibility script found in ${packageJsonPath}`);
      }
    } else {
      console.log(`No package.json found at ${packageJsonPath}`);
    }
  } catch (error) {
    console.error(`Error updating ${packageJsonPath}:`, error);
  }
}

function deleteConfigFile() {
  try {
    if (fs.existsSync(configFilePath)) {
      fs.unlinkSync(configFilePath);
      console.log(`Deleted ${configFileName} from the project root directory.`);
    } else {
      console.log(`${configFileName} not found in the project root directory.`);
    }
  } catch (error) {
    console.error(`Error deleting ${configFileName}:`, error);
  }
}

function deleteAccessibilityResultsFolder() {
  const accessibilityDir = path.resolve(projectRootPath, 'accessibilityTester-results');
  if (fs.existsSync(accessibilityDir)) {
    fs.rmSync(accessibilityDir, { recursive: true, force: true });
    console.log(`Deleted accessibilityTester-results folder from project root.`);
  } else {
    console.log(`No accessibilityTester-results folder found in project root.`);
  }
}

try {
  revertPackageJson();
  deleteConfigFile();
  deleteAccessibilityResultsFolder();
} catch (error) {
  console.error('Error during preuninstall script:', error);
  process.exit(1);
}
