import path from 'node:path';

export const configFilePath = path.resolve('./accessibilityTester.config.mjs');
export const outputDir = path.resolve('./accessibilityTester-results');
export const resultsJsonPath = path.join(outputDir, 'accessibilityTester-results.json');

export const TOTAL_CRITERIA = 55;
export const LOG_INTERVAL = 10;

export function escapeHtml(unsafe = '') {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function normalizeUrl(link, baseUrl) {
  try {
    const url = new URL(link, baseUrl);
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function getGroupFromUrl(url, groupPatterns) {
  try {
    const { pathname } = new URL(url);
    for (const pattern of groupPatterns) {
      if (pathname.includes(pattern)) {
        return pathname.split(pattern)[0] + pattern;
      }
    }
  } catch {}
  return null;
}

export function shouldSkip({
  urlStr,
  baseUrlObj,
  exclusions,
  skipExternalDomain,
  maxDepth,
  currentDepth,
  analyzedGroups,
  groupPatterns,
}) {
  if (maxDepth > 0 && currentDepth >= maxDepth) return true;

  let url;
  try {
    url = new URL(urlStr);
  } catch {
    return true;
  }

  if (skipExternalDomain && url.origin !== baseUrlObj.origin) return true;

  for (const exclude of exclusions) {
    if (url.pathname.startsWith(exclude) || url.pathname.endsWith(exclude)) {
      return true;
    }
  }

  const group = getGroupFromUrl(urlStr, groupPatterns);
  if (group && analyzedGroups.has(group)) return true;

  return false;
}

export function logAccessibilityIssues(axeResults, pageUrl, totalCriteria) {
  const { violations = [] } = axeResults;

  const violationData = {
    url: pageUrl,
    relativePath: new URL(pageUrl).pathname,
    totalViolations: violations.length,
    wcagCompliance: { wcag2a: 0, wcag2aa: 0, wcag21a: 0, wcag21aa: 0 },
    ruleImpact: { minor: 0, moderate: 0, serious: 0, critical: 0 },
    violations: [],
    totalRequirements: totalCriteria,
    compliancePercentage: 0,
  };

  for (const violation of violations) {
    for (const tag of violation.tags) {
      if (Object.hasOwnProperty.call(violationData.wcagCompliance, tag)) {
        violationData.wcagCompliance[tag] += 1;
      }
    }
    if (Object.hasOwnProperty.call(violationData.ruleImpact, violation.impact)) {
      violationData.ruleImpact[violation.impact] += 1;
    }

    violationData.violations.push({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      tags: violation.tags,
      nodes: violation.nodes.map((node) => ({
        target: node.target.join(', '),
        html: escapeHtml(node.html),
        failureSummary: node.failureSummary,
        xpath: node.xpath ? node.xpath.join(', ') : 'N/A',
      })),
    });
  }

  const compliancePct = ((totalCriteria - violationData.totalViolations) / totalCriteria) * 100;
  violationData.compliancePercentage = compliancePct.toFixed(2);

  return violationData;
}
