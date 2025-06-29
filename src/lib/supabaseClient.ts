
// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

console.log('---------------------------------------------------------------------');
console.log('[supabaseClient] Initializing Supabase client module...');
console.log(`[supabaseClient] Node.js version: ${process.version}`);
console.log(`[supabaseClient] Current working directory (process.cwd()): ${process.cwd()}`);
try {
  console.log(`[supabaseClient] __dirname (if available): ${__dirname}`);
} catch (e) {
  console.log('[supabaseClient] __dirname is not available.');
}

// --- Environment Variable Loading ---
const projectRoot = process.cwd();
const isProduction = process.env.NODE_ENV === 'production';

// Construct paths to .env and .env.local
const envPath = path.resolve(projectRoot, '.env');
const envLocalPath = path.resolve(projectRoot, '.env.local');

console.log(`[supabaseClient] Attempting to load .env from: ${envPath}`);
const dotenvResultGlobal = dotenvConfig({ path: envPath, override: true, debug: !isProduction });

if (dotenvResultGlobal.error) {
  console.warn(`[supabaseClient] Warning: Could not load .env file from ${envPath}. Error: ${dotenvResultGlobal.error.message}`);
} else {
  if (dotenvResultGlobal.parsed && Object.keys(dotenvResultGlobal.parsed).length > 0) {
    console.log(`[supabaseClient] Successfully loaded and parsed .env file from ${envPath}.`);
    const parsedKeys = Object.keys(dotenvResultGlobal.parsed);
    console.log(`[supabaseClient]   Variables found in parsed .env: ${parsedKeys.join(', ')}`);
    console.log(`[supabaseClient]     SUPABASE_URL in parsed .env: ${dotenvResultGlobal.parsed.SUPABASE_URL ? '******' : 'NOT FOUND'}`);
    console.log(`[supabaseClient]     NEXT_PUBLIC_SUPABASE_URL in parsed .env: ${dotenvResultGlobal.parsed.NEXT_PUBLIC_SUPABASE_URL ? '******' : 'NOT FOUND'}`);
    console.log(`[supabaseClient]     SUPABASE_ANON_KEY in parsed .env: ${dotenvResultGlobal.parsed.SUPABASE_ANON_KEY ? '******' : 'NOT FOUND'}`);
    console.log(`[supabaseClient]     NEXT_PUBLIC_SUPABASE_ANON_KEY in parsed .env: ${dotenvResultGlobal.parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '******' : 'NOT FOUND'}`);
  } else {
    console.log(`[supabaseClient] Loaded .env file from ${envPath}, but it was empty or no new variables were parsed from its content.`);
  }
}

console.log(`[supabaseClient] Attempting to load .env.local from: ${envLocalPath}`);
const dotenvResultLocal = dotenvConfig({ path: envLocalPath, override: true, debug: !isProduction });

if (dotenvResultLocal.error) {
  console.warn(`[supabaseClient] Warning: Could not load .env.local file from ${envLocalPath}. Error: ${dotenvResultLocal.error.message}`);
} else {
  if (dotenvResultLocal.parsed && Object.keys(dotenvResultLocal.parsed).length > 0) {
    console.log(`[supabaseClient] Successfully loaded and parsed .env.local file from ${envLocalPath}.`);
    const parsedKeysLocal = Object.keys(dotenvResultLocal.parsed);
    console.log(`[supabaseClient]   Variables found in parsed .env.local: ${parsedKeysLocal.join(', ')}`);
    console.log(`[supabaseClient]     SUPABASE_URL in parsed .env.local: ${dotenvResultLocal.parsed.SUPABASE_URL ? '******' : 'NOT FOUND'}`);
    console.log(`[supabaseClient]     NEXT_PUBLIC_SUPABASE_URL in parsed .env.local: ${dotenvResultLocal.parsed.NEXT_PUBLIC_SUPABASE_URL ? '******' : 'NOT FOUND'}`);
    console.log(`[supabaseClient]     SUPABASE_ANON_KEY in parsed .env.local: ${dotenvResultLocal.parsed.SUPABASE_ANON_KEY ? '******' : 'NOT FOUND'}`);
    console.log(`[supabaseClient]     NEXT_PUBLIC_SUPABASE_ANON_KEY in parsed .env.local: ${dotenvResultLocal.parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '******' : 'NOT FOUND'}`);
  } else {
    console.log(`[supabaseClient] Loaded .env.local file from ${envLocalPath}, but it was empty or no new variables were parsed from its content.`);
  }
}

console.log('[supabaseClient] Values from process.env *after* dotenv attempts and *before* Supabase client specific checks:');
console.log(`[supabaseClient]   process.env.SUPABASE_URL: ${process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0,20) + '...' : 'undefined'}`);
console.log(`[supabaseClient]   process.env.NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0,20) + '...' : 'undefined'}`);
console.log(`[supabaseClient]   process.env.SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '****** (exists in process.env)' : 'undefined (in process.env)'}`);
console.log(`[supabaseClient]   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '****** (exists in process.env)' : 'undefined (in process.env)'}`);
console.log(`[supabaseClient]   process.env.NODE_ENV: ${process.env.NODE_ENV}`);


// --- Supabase Client Initialization ---

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('[supabaseClient] Final values selected for Supabase client initialization:');
console.log(`[supabaseClient]   Attempting to use supabaseUrl: ${supabaseUrl ? supabaseUrl.substring(0, Math.min(supabaseUrl.length, 20)) + (supabaseUrl.length > 20 ? '...' : '') : 'undefined'}`);
console.log(`[supabaseClient]   Attempting to use supabaseAnonKey: ${supabaseAnonKey ? '****** (exists)' : 'undefined'}`);


if (!supabaseUrl) {
  const errorMessage = `CRITICAL: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is missing.
Please ensure that either 'SUPABASE_URL' (for server-side code) or 'NEXT_PUBLIC_SUPABASE_URL' (for client-side code) is correctly set.
1. Check your .env or .env.local file in the project root. Example:
   SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
2. If you recently added/changed this, YOU MUST RESTART your Next.js development server.
3. CRITICALLY: Check Firebase Studio specific settings for environment variables. Platform settings often override local .env files for server-side code.
Current detected process.env.SUPABASE_URL: ${process.env.SUPABASE_URL}, process.env.NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

if (!supabaseAnonKey) {
  const errorMessage = `CRITICAL: SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.
Please ensure that either 'SUPABASE_ANON_KEY' (for server-side code) or 'NEXT_PUBLIC_SUPABASE_ANON_KEY' (for client-side code) is correctly set.
1. Check your .env or .env.local file in the project root. Example:
   SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
2. If you recently added/changed this, YOU MUST RESTART your Next.js development server.
3. CRITICALLY: Check Firebase Studio specific settings for environment variables. Platform settings often override local .env files for server-side code.
Current detected process.env.SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '******' : 'undefined'}, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '******' : 'undefined'}`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

export const supabase: SupabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);

console.log('[supabaseClient] Supabase client initialized successfully using URL:', supabaseUrl!.substring(0, supabaseUrl!.indexOf('.supabase.co') > 0 ? supabaseUrl!.indexOf('.supabase.co') + 12 : Math.min(supabaseUrl!.length, 40)) + (supabaseUrl!.length > 40 ? '...' : ''));
console.log('---------------------------------------------------------------------');
