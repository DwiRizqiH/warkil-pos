import { execFileSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './testEnv.js';

export default function globalSetup() {
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
    // Windows needs a shell to run npx.cmd.
    shell: process.platform === 'win32',
  });
}
