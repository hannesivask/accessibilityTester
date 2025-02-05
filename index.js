import config from '../../accessibilityTester.config.mjs';

import { generateHtmlReport } from './lib/reports/generateHtmlReport.js';
import { generateGitlabCodeQuality } from './lib/reports/createCodeQualityJSON.js';
import { shutdownServer, initGracefulShutdown, initServer } from './lib/server.js';
import { crawlAndAnalyze } from './lib/crawl.js';
import { configFilePath, outputDir, resultsJsonPath } from './lib/utils.js';

import { performance } from 'node:perf_hooks';
import fs from 'node:fs';

(async () => {
  const startTime = performance.now();
  const { baseUrl } = config;

  let allResults = [];

  if (!fs.existsSync(configFilePath)) {
    console.error(`Configuration file not found at ${configFilePath}`);
    process.exit(1);
  }

  if (!baseUrl || baseUrl.trim() === '') {
    console.error('Error: baseUrl is not defined or empty.');
    process.exit(1);
  }

  await initServer();

  initGracefulShutdown();

  try {
    allResults = await crawlAndAnalyze();
  } catch (error) {
    console.error(`Error during crawlAndAnalyze: ${error}`);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(resultsJsonPath, JSON.stringify(allResults, null, 2));
  console.log(`Accessibility test results saved to ${resultsJsonPath}`);

  generateHtmlReport(allResults);
  generateGitlabCodeQuality(resultsJsonPath);

  shutdownServer();

  const totalMs = performance.now() - startTime;

  console.log(`Total execution time: ${totalMs.toFixed(0)} ms => ~${(totalMs / 1000).toFixed(2)} s\n`);
})();
