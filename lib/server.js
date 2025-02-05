import config from '../../../accessibilityTester.config.mjs';

import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

let serverProcess = null;
const { serverCommand, baseUrl } = config;

export async function initServer() {
  if (serverCommand && baseUrl) {
    startServer(serverCommand);
    const serverOK = await waitForServer(baseUrl);

    if (!serverOK) {
      console.error('Server failed to start, stopping...');

      shutdownServer();
      process.exit(1);
    }
  }
}

function startServer() {
  console.log(`Starting server with command: ${serverCommand}`);

  const parts = serverCommand.split(' ');
  serverProcess = spawn(parts[0], parts.slice(1), {
    stdio: 'inherit',
    shell: true,
  });

  return serverProcess;
}

async function waitForServer(url, maxRetries = 30, intervalMs = 2000) {
  console.log(`Waiting for server at ${url}...`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('Server is ready!');
        return true;
      }
    } catch {}
    await setTimeout(intervalMs);
  }

  console.error('Server did not start in time.');
  return false;
}

export function shutdownServer() {
  if (serverProcess) {
    console.log('\nShutting down server...\n');
    serverProcess.kill();
    serverProcess = null;
  }
}

export function initGracefulShutdown() {
  process.on('SIGINT', () => {
    console.log('Received SIGINT. Gracefully shutting down...');
    shutdownServer();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Gracefully shutting down...');
    shutdownServer();
    process.exit(0);
  });
}
