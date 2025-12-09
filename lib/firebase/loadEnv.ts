/**
 * Load environment variables from .env.local for standalone scripts
 * Next.js automatically loads .env.local, but tsx scripts do not
 */

import * as fs from 'fs';
import * as path from 'path';

export function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  .env.local file not found');
    return;
  }

  const envFile = fs.readFileSync(envPath, 'utf-8');
  const lines = envFile.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Only set if not already in process.env (don't override existing values)
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }

  console.log('✅ Loaded environment variables from .env.local');
}
