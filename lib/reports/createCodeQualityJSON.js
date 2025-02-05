import { outputDir } from '../utils.js';

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

function createFingerprint(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}

function convertAxeToCodeQuality(axeData) {
  const issues = [];

  for (const page of axeData) {
    const summaryString = `compliance: ${page.compliancePercentage}%, violations: ${page.totalViolations}`;
    const descriptionLines = [`Page URL: ${new URL(page.url).pathname}`, `Scores: ${summaryString}`];

    const issue = {
      type: 'issue',
      check_name: 'Accessibility Tester Summary',
      description: descriptionLines.join('\n'),
      categories: ['Accessibility'],
      severity: page.totalViolations > 0 ? 'major' : 'info',
      fingerprint: createFingerprint(`${page.url}-${summaryString}`),

      location: {
        path: '',
        lines: { begin: 1, end: 1 },
      },
    };

    issues.push(issue);
  }

  return issues;
}

export function generateGitlabCodeQuality(axeJsonPath) {
  const outputPath = path.join(outputDir, 'accessibilityTester-results-qc.json');

  if (!fs.existsSync(axeJsonPath)) {
    console.error(`Accessibility Tester results not found at: ${axeJsonPath}`);
    process.exit(1);
  }

  const axeData = JSON.parse(fs.readFileSync(axeJsonPath, 'utf8'));
  const codeQualityIssues = convertAxeToCodeQuality(axeData);

  fs.writeFileSync(outputPath, JSON.stringify(codeQualityIssues, null, 2), 'utf-8');

  console.log(`GitLab Code Quality JSON created at: ${outputPath}`);
}
