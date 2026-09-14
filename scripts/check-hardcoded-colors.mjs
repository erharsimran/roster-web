#!/usr/bin/env node
/**
 * check-hardcoded-colors.mjs
 * ---------------------------------------------------------------
 * Permanent guard: fails (exit code 1) if any hardcoded grayscale
 * or pure white/black Tailwind utility classes are found outside
 * the theme definition file itself.
 *
 * This is what stops the light/dark bug from coming back next month
 * in some new component nobody thought to run the codemod on.
 *
 * USAGE:
 *   node scripts/check-hardcoded-colors.mjs [path]     # defaults to "src"
 *
 * Wire it into a pre-commit hook (e.g. via husky + lint-staged) or a
 * CI step so it runs on every push, not just when someone remembers.
 * See the bottom of this file for a sample husky hook.
 * ---------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'src');
const EXTENSIONS = new Set(['.tsx', '.ts', '.jsx', '.js']);
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', '.git', '.turbo', 'out']);

// Files where hardcoded colors are expected/fine (the token definitions
// themselves, and anywhere you've deliberately opted out).
const ALLOWLIST_SUBSTRINGS = ['globals.css', 'tailwind.config'];

const FAMILIES = 'neutral|gray|zinc|slate|stone';
const UTILS = 'bg|border|divide|ring|text';

const PATTERNS = [
  {
    label: 'hardcoded grayscale utility',
    re: new RegExp(`\\b(${UTILS})-(${FAMILIES})-\\d{2,3}(\\/\\d{1,3})?\\b`, 'g'),
  },
  {
    label: 'hardcoded pure white/black',
    re: /\b(bg|text|border)-(white|black)\b/g,
  },
];

let violations = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      continue;
    }
    const ext = path.extname(entry.name);
    if (!EXTENSIONS.has(ext)) continue;
    if (ALLOWLIST_SUBSTRINGS.some((s) => entry.name.includes(s))) continue;
    checkFile(path.join(dir, entry.name));
  }
}

function checkFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    for (const { label, re } of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        // Allow explicit dark: overrides — those are intentional pairs,
        // not stray structural grays.
        const before = line.slice(Math.max(0, m.index - 5), m.index);
        if (before.includes('dark:')) continue;

        violations++;
        console.log(
          `${path.relative(process.cwd(), filePath)}:${idx + 1}  [${label}]  ${m[0]}`
        );
      }
    }
  });
}

if (!fs.existsSync(ROOT)) {
  console.error(`Path not found: ${ROOT}`);
  process.exit(1);
}

walk(ROOT);

if (violations > 0) {
  console.log(`\n${violations} hardcoded color class(es) found. Use the semantic tokens instead:`);
  console.log(`  bg-neutral-900   -> bg-card`);
  console.log(`  bg-neutral-950   -> bg-background`);
  console.log(`  bg-neutral-800   -> bg-muted`);
  console.log(`  border-neutral-* -> border-card-border`);
  console.log(`  text-white/200   -> text-foreground`);
  console.log(`  text-neutral-400 -> text-muted-foreground`);
  console.log(`\nFor a colored accent that needs to stay a specific hue (badges, brand`);
  console.log(`buttons), pair a light value with a dark: override instead of deleting`);
  console.log(`the check for that line, e.g. bg-rose-100 dark:bg-rose-500/20.\n`);
  process.exit(1);
} else {
  console.log('No hardcoded color classes found.');
  process.exit(0);
}

/* ---------------------------------------------------------------
 * Sample husky pre-commit hook (.husky/pre-commit):
 *
 *   #!/usr/bin/env sh
 *   . "$(dirname "$0")/_/husky.sh"
 *   node scripts/check-hardcoded-colors.mjs
 *
 * Or as a package.json script + CI step:
 *
 *   "scripts": {
 *     "theme:fix": "node scripts/fix-theme-colors.mjs",
 *     "theme:check": "node scripts/check-hardcoded-colors.mjs"
 *   }
 *
 * Then in CI (e.g. GitHub Actions):
 *   - run: npm run theme:check
 * ------------------------------------------------------------- */
