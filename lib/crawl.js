import playwright from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

import config from '../../../accessibilityTester.config.mjs';

import {
  shouldSkip,
  TOTAL_CRITERIA as totalCriteria,
  outputDir,
  resultsJsonPath,
  normalizeUrl,
  getGroupFromUrl,
  logAccessibilityIssues,
  LOG_INTERVAL,
} from './utils.js';

import fs from 'node:fs';

const {
  baseUrl = '',
  maxPagesToVisit = Infinity,
  concurrency = 1,
  maxDepth = 3,
  skipExternalDomain = true,
  exclusions = [],
  relativePaths = [],
  groupPatterns = [],
} = config;

export async function crawlAndAnalyze() {
  const browser = await playwright.chromium.launch({
    headless: true,
  });

  const context = await browser.newContext();

  const state = {
    browser,
    context,
    baseUrlObj: new URL(baseUrl),
    visited: new Set(),
    analyzedGroups: new Set(),
    allResults: [],
    pagesCrawled: 0,
    pagesAnalyzed: 0,
    toVisit: [],
    tasks: [],
  };

  loadExistingResults(state);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  prepareInitialQueue(state);

  await performCrawl(state);

  await state.browser.close();

  logProgress(state, { final: true });
  return state.allResults;
}

function loadExistingResults(state) {
  if (fs.existsSync(resultsJsonPath)) {
    try {
      const stored = JSON.parse(fs.readFileSync(resultsJsonPath, 'utf8'));
      state.allResults = stored;
      for (const entry of stored) {
        state.visited.add(entry.url);
      }
    } catch {
      state.allResults = [];
    }
  }
}

function prepareInitialQueue(state) {
  if (relativePaths.length) {
    state.toVisit = relativePaths.map((rp) => ({
      url: `${baseUrl}${rp}`,
      depth: 0,
    }));
  } else {
    state.toVisit = [{ url: baseUrl, depth: 0 }];
  }
}

function logProgress(state, { final = false } = {}) {
  if (final) {
    console.log(`\nFinished! Crawled: ${state.pagesCrawled}, Analyzed: ${state.pagesAnalyzed}\n`);
    return;
  }

  if (state.pagesAnalyzed !== 0 && state.pagesAnalyzed % LOG_INTERVAL === 0) {
    console.log(`Crawled: ${state.pagesCrawled}, Analyzed: ${state.pagesAnalyzed}`);
  }
}

async function processUrl(state, { url, depth }) {
  const normalizedUrl = normalizeUrl(url, baseUrl);
  if (!normalizedUrl) return;

  if (state.visited.has(normalizedUrl)) {
    return;
  }

  const group = getGroupFromUrl(normalizedUrl, groupPatterns);
  if (group && state.analyzedGroups.has(group)) {
    return;
  }

  state.visited.add(normalizedUrl);
  state.pagesCrawled++;

  if (group) {
    state.analyzedGroups.add(group);
  }

  let page;
  try {
    page = await state.context.newPage();

    await page.goto(normalizedUrl, { waitUntil: 'networkidle', timeout: 30000 });

    const existingResult = state.allResults.find((r) => r.url === normalizedUrl);

    if (!existingResult) {
      const axeResults = await new AxeBuilder({ page }).analyze();

      const violationData = logAccessibilityIssues(axeResults, normalizedUrl, totalCriteria);
      state.allResults.push(violationData);

      state.pagesAnalyzed++;
      logProgress(state);
    }

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map((a) => a.getAttribute('href'))
        .filter((href) => href && !href.startsWith('javascript:') && !href.startsWith('#'))
    );

    for (const link of links) {
      const childUrl = normalizeUrl(link, baseUrl);
      if (!childUrl) continue;

      const skip = shouldSkip({
        urlStr: childUrl,
        baseUrlObj: state.baseUrlObj,
        exclusions,
        skipExternalDomain,
        maxDepth,
        currentDepth: depth + 1,
        analyzedGroups: state.analyzedGroups,
        groupPatterns,
      });

      if (!skip && !state.visited.has(childUrl)) {
        state.toVisit.push({ url: childUrl, depth: depth + 1 });
      }
    }
  } catch (err) {
    console.error(`Error analyzing/crawling ${normalizedUrl}: ${err.message}`);
  } finally {
    if (page) await page.close();
  }
}

async function performCrawl(state) {
  while (state.toVisit.length > 0 || state.tasks.length > 0) {
    if (state.visited.size >= maxPagesToVisit) {
      break;
    }

    while (state.tasks.length < concurrency && state.toVisit.length > 0) {
      const nextObj = state.toVisit.pop();

      const skip = shouldSkip({
        urlStr: nextObj.url,
        baseUrlObj: state.baseUrlObj,
        exclusions,
        skipExternalDomain,
        maxDepth,
        currentDepth: nextObj.depth,
        analyzedGroups: state.analyzedGroups,
        groupPatterns,
      });

      if (!skip) {
        const task = processUrl(state, nextObj).then(() => {
          state.tasks.splice(state.tasks.indexOf(task), 1);
        });
        state.tasks.push(task);
      }
    }

    if (state.tasks.length > 0) {
      await Promise.race(state.tasks);
    }
  }

  await Promise.all(state.tasks);
}
