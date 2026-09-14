#!/usr/bin/env node
/**
 * fix-theme-colors.mjs
 * ---------------------------------------------------------------
 * One-time codemod: rewrites hardcoded Tailwind grayscale utility
 * classes (neutral / gray / zinc / slate / stone) into the semantic
 * theme tokens defined in globals.css (bg-background, bg-card,
 * bg-muted, border-card-border, text-foreground, text-muted-foreground).
 *
 * This is what makes light/dark mode actually work everywhere at
 * once, instead of file-by-file: the grayscale utilities never
 * respond to `.dark`, the semantic tokens always do.
 *
 * USAGE:
 *   node scripts/fix-theme-colors.mjs [path]
 *   node scripts/fix-theme-colors.mjs src
 *   node scripts/fix-theme-colors.mjs            # defaults to "src"
 *
 * It's a plain-text regex rewrite, not an AST transform — review the
 * diff before committing (git diff). It intentionally does NOT touch:
 *   - text-white / text-black / bg-white / bg-black
 *     (often intentional on a colored accent button — ambiguous to
 *     auto-fix, flagged instead by check-hardcoded-colors.mjs)
 *   - colored badges (rose-300, emerald-500/20, etc.)
 *     (semantic accent colors, not structural grays — handle these
 *     by hand, adding a light value + a dark: override, same pattern
 *     as the grays below)
 *   - any class already carrying a `dark:` prefix (assumed intentional)
 * ---------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'src');
const EXTENSIONS = new Set(['.tsx', '.ts', '.jsx', '.js']);
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', '.git', '.turbo', 'out']);

const COLOR_FAMILIES = ['neutral', 'gray', 'zinc', 'slate', 'stone'];

// util -> shade -> semantic token (no "bg-"/"text-"/etc prefix, that's reattached)
const SHADE_MAP = {
  bg: {
    '950': 'background',
    '900': 'card',
    '800': 'muted',
    '700': 'muted',
    '100': 'card',
    '50': 'card',
  },
  border: {
    '900': 'card-border',
    '800': 'card-border',
    '700': 'card-border',
    '200': 'card-border',
    '300': 'card-border',
  },
  divide: {
    '900': 'card-border',
    '800': 'card-border',
    '700': 'card-border',
  },
  ring: {
    '900': 'card-border',
    '800': 'card-border',
    '700': 'card-border',
  },
  text: {
    '50': 'foreground',
    '100': 'foreground',
    '200': 'foreground',
    '300': 'muted-foreground',
    '400': 'muted-foreground',
    '500': 'muted-foreground',
    '600': 'muted-foreground',
    '700': 'muted-foreground',
  },
};

const UTILS = Object.keys(SHADE_MAP).join('|'); // bg|border|divide|ring|text
const FAMILIES = COLOR_FAMILIES.join('|'); // neutral|gray|zinc|slate|stone

// Captures: optional variant prefix chain (hover:, dark:, group-hover/x:, etc.),
// the utility (bg/border/divide/ring/text), the family, the shade, optional opacity.
const CLASS_RE = new RegExp(
  `((?:[a-zA-Z0-9_-]+(?:/[a-zA-Z0-9_-]+)?:)*)(${UTILS})-(${FAMILIES})-(\\d{2,3})(\\/\\d{1,3})?\\b`,
  'g'
);

let filesChanged = 0;
let replacementsMade = 0;
const unmapped = new Map(); // "util-family-shade" -> count, for manual review

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      continue;
    }
    const ext = path.extname(entry.name);
    if (EXTENSIONS.has(ext)) processFile(path.join(dir, entry.name));
  }
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let fileReplacements = 0;

  const updated = original.replace(CLASS_RE, (match, variantPrefix, util, family, shade, opacity) => {
    // Skip anything already scoped to a dark: variant — assume it's an
    // intentional explicit override, not a stray structural gray.
    if (variantPrefix.includes('dark:')) return match;

    const token = SHADE_MAP[util]?.[shade];
    if (!token) {
      const key = `${util}-${family}-${shade}`;
      unmapped.set(key, (unmapped.get(key) || 0) + 1);
      return match;
    }

    fileReplacements++;
    return `${variantPrefix}${util}-${token}${opacity || ''}`;
  });

  if (fileReplacements > 0) {
    fs.writeFileSync(filePath, updated, 'utf8');
    filesChanged++;
    replacementsMade += fileReplacements;
    console.log(`  fixed ${fileReplacements.toString().padStart(3)}  ${path.relative(process.cwd(), filePath)}`);
  }
}

if (!fs.existsSync(ROOT)) {
  console.error(`Path not found: ${ROOT}`);
  process.exit(1);
}

console.log(`Scanning ${ROOT} ...\n`);
walk(ROOT);

console.log(`\nDone. ${replacementsMade} replacements across ${filesChanged} files.`);

if (unmapped.size > 0) {
  console.log(`\nSkipped shades with no mapping (review these by hand — likely colored\naccents, not structural grays, or a shade this script doesn't cover yet):`);
  for (const [key, count] of [...unmapped.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(3)}x  ${key}`);
  }
}

console.log(`\nNext steps:
  1. Review the diff:  git diff
  2. Run your typecheck/build to confirm nothing broke
  3. Run node scripts/check-hardcoded-colors.mjs and fix anything it flags
  4. Wire that check into a pre-commit hook / CI so this can't regress
`);
