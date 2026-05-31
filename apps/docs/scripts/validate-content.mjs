import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const repoRoot = process.cwd();
const docsRoot = join(repoRoot, "apps/docs");
const contentRoot = join(docsRoot, "content");
const navigationPath = join(docsRoot, "navigation.json");
const bannedPattern =
  /\b(easy|simple|simply|just|seamless|seamlessly|powerful|effortless|beautiful|magical|unlock|leverage|utilise|streamline)\b/iu;
const staleNamePattern =
  /\b(calculateRequest|createEffectClient|PublicCalculationMetadata|PublicErrorEnvelope|PublicCalculationMetadataGroup|PublicCalculationMetadataHandlerLive)\b/u;
const privateNamePattern =
  /\b(adad|SaaS|paid|simulation|private downstream product|private product strategy)\b/iu;

const collectFiles = (directory, predicate) =>
  readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry);
      const stats = statSync(path);

      return stats.isDirectory() ? collectFiles(path, predicate) : [path];
    })
    .filter(predicate);

const mdxFiles = collectFiles(contentRoot, (path) => extname(path) === ".mdx");
const failures = [];

const report = (file, message) => {
  failures.push(`${file.replace(`${repoRoot}/`, "")}: ${message}`);
};

const relativeLinkPattern = /\[[^\]]+\]\(([^)]+)\)/gu;

for (const file of mdxFiles) {
  const text = readFileSync(file, "utf-8");
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/u);

  if (frontmatter) {
    const [, frontmatterBody] = frontmatter;

    if (/^title:\s*".+"/mu.test(frontmatterBody) === false) {
      report(file, "frontmatter missing title");
    }
    if (/^description:\s*".+"/mu.test(frontmatterBody) === false) {
      report(file, "frontmatter missing description");
    }
  } else {
    report(file, "missing frontmatter");
  }

  const fenceCount = (text.match(/```/gu) ?? []).length;
  if (fenceCount % 2 !== 0) {
    report(file, "unbalanced fenced code blocks");
  }

  for (const [pattern, name] of [
    [bannedPattern, "banned marketing language"],
    [staleNamePattern, "stale public API or SDK name"],
    [privateNamePattern, "private downstream product detail"],
  ]) {
    const match = text.match(pattern);
    if (match) {
      report(file, `${name}: ${match[0]}`);
    }
  }

  for (const match of text.matchAll(relativeLinkPattern)) {
    const [, target] = match;
    if (
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:") ||
      target.startsWith("#")
    ) {
      continue;
    }

    const [withoutAnchor] = target.split("#");
    if (withoutAnchor) {
      const resolved = resolve(file, "..", withoutAnchor);

      if (existsSync(resolved)) {
        continue;
      }
      report(file, `broken local link: ${target}`);
    }
  }
}

const navigation = JSON.parse(readFileSync(navigationPath, "utf-8"));
const navItems = navigation.primaryNavigation.flatMap((section) => [
  section,
  ...(section.pages ?? []),
]);

for (const item of navItems) {
  const sourcePath = join(
    docsRoot,
    item.source.replace(/^content\//u, "content/")
  );

  if (existsSync(sourcePath)) {
    continue;
  } else {
    report(navigationPath, `navigation source missing: ${item.source}`);
  }
}

if (failures.length === 0) {
  console.log(
    `Validated ${mdxFiles.length} MDX files, ${navItems.length} navigation entries and local links.`
  );
} else {
  console.error(failures.join("\n"));
  process.exit(1);
}
