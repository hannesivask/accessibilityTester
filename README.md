# Accessibility Tester

## Overview

The Accessibility Tester is a custom tool that is used to automatically scan and test the accessibility of web pages in a local or a CI/CD environment.

This tool uses [Playwright](https://github.com/microsoft/playwright) and [axe-core](https://github.com/dequelabs/axe-core).

## Features:

- ✅ Automated concurrent crawling
- ✅ WCAG compliance testing
- ✅ Detailed reports as JSON and a HTML interface
- ✅ Code quality JSON for Gitlab

## Configuration

### Configuration File

Before running the tool, configure the URLs you want to test by creating a `accessibilityTester.config.mjs` file in the project root.

```js
export default {
  baseUrl: 'http://localhost:4321', // Entry URL
  maxPagesToVisit: 20, // How many pages to test // default = Infinity
  concurrency: 10, // How many pages are analyzed at the same time // default = 1 //
  maxDepth: 100, // What is the maximum depth that the crawler tries to find links from // default = 10
  skipExternalDomain: true, // Should the crawler skip any external domain links // default = true
  exclusions: ['/assets', '/ibank', '.cfm'], // Patterns to exclude from search.
  relativePaths: [], // Relative paths to scan
  groupPatterns: ['/news/', '/blog/', '/uudised/'], // Patterns to group together as one page // for example if multiple blog sites exist, there is no reason to scan every one of them, so this option allows the tool to scan the first blog item and then move on.
  serverCommand: 'npm run preview', // Command to start the server // OPTIONAL // If left empty then it's presumed that this is not being run on a local server, but on a hosted server instead - baseUrl is set to 'https://google.com' for example
};
```

### Server Setup

Ensure your server is running. If you're running a local server, make sure to specify the correct `localhost` and port (e.g., `3000`) in your configuration.

## Running the Accessibility Tester

Run the Accessibility Tester using the following npm script:

```bash
npm run test:accessibility
```

This command initiates Playwright, visits the pages specified in the configuration file, and analyzes them for accessibility issues using axe-core. Results are saved in the `accessibilityTester-results` folder as:

- accessibilityTester-results.js
- accessibilityTester-results.json
- accessibilityTester-results-qc.json
- index.html

## Running Accessibility Tester in CI

Run Accessibility Tester by adding a job in the Gitlab CI pipeline.

Example `.gitlab-ci.yml` entry:

```yaml
test:accessibility:
  stage: test
  allow_failure: true
  script:
    - npm run preview
    - npm run test:accessibility
  artifacts:
    paths:
      - '${NPM_WORKSPACE_PATH}/accessibilityTester-results'
    reports:
      codequality: '${NPM_WORKSPACE_PATH}/accessibility-results/accessibilityTester-results-qc.json'
    expire_in: 7 day
```

## Example Output

The crawler generates a report in JSON format. Each entry in the report includes details such as:

- **URL**: The full URL of the tested page.
- **Relative Path**: The relative URL path as defined in the configuration.
- **Total Violations**: The number of accessibility violations found.
- **WCAG Compliance**: The breakdown of violations by WCAG level (2.0 A, 2.0 AA, 2.1 A, 2.1 AA, 2.2 A, 2.2 AA).
- **Rule Impact**: Violations categorized by severity: minor, moderate, serious, critical.
- **Violations**: A list of specific violations found, including:
  - Violation description
  - Help URL (for more information about the issue)
  - HTML element(s) causing the issue
  - Impact level
  - XPaths of violating elements

Example JSON:

```json
[
  {
    "url": "http://localhost:3000/",
    "relativePath": "",
    "totalViolations": 5,
    "wcagCompliance": {
      "wcag2a": 3,
      "wcag2aa": 1,
      "wcag21aa": 1
    },
    "ruleImpact": {
      "minor": 1,
      "moderate": 2,
      "serious": 2,
      "critical": 0
    },
    "violations": [
      {
        "id": "color-contrast",
        "impact": "serious",
        "description": "Elements must have sufficient color contrast",
        "help": "Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds.",
        "helpUrl": "https://dequeuniversity.com/rules/axe/4.1/color-contrast?application=axeAPI",
        "nodes": [
          {
            "target": "#header",
            "html": "<div id='header'>Header</div>",
            "failureSummary": "Expected contrast ratio of 4.5:1, but found 3.0:1",
            "xpath": "N/A"
          }
        ]
      }
    ]
  }
]
```

### Viewing Results

1. If running in a CI/CD environment, then download artifacts from the job.
2. Gitlab UI will display info from `accessibilityTester-results-qc.json` in the code quality section.
3. Open the `index.html` file in your browser.
4. The page will load the results from `accessibilityTester-results.js`.
5. You can view a summary of the issues found on each page and click on specific issues to see detailed violation information.

## Dependencies

The project relies on the following npm packages:

- [**@axe-core/playwright**](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md): Integrates axe-core with Playwright to run accessibility checks.
- [**Playwright**](https://github.com/microsoft/playwright): A headless browser automation library.
