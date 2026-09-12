/**
 * Build the Verified-station submission package for dsh-clock-context.
 *
 * The station (github.com/qing3a/dsh-plugin-verify) wants three files under
 * `submissions/<owner>/<plugin>/`, and its gate recomputes SHA-256 over the two
 * evidence files, so they cannot be hand-written. This script writes them:
 *
 *   node submission/verified/make-submission.mjs --out <dir> --repo-public --topic-set
 *
 * `--repo-public` and `--topic-set` are required and deliberately explicit:
 * self_check.json is a claim about the repository, so the flags exist to make
 * the claim something you assert, not something the script assumes. Run it
 * without them and the two booleans come out false — which is the honest answer
 * until the repository is actually pushed and its topic set.
 *
 * After running it, check the package with the station's own gate:
 *
 *   node scripts/check-submission.mjs <dir>
 */

import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

/** Category ids the station accepts (it is not the marketplace's list). */
const CATEGORIES = [
  '调试与观测',
  '桌面与系统',
  '安全与合规',
  '效率与监控',
  '编码开发',
  '通讯集成',
  '娱乐生活',
];

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

const has = (name) => process.argv.includes(name);

const owner = arg('--owner', 'apex-mochen');
const category = arg('--category', '调试与观测');
const outDir = resolve(arg('--out', join(HERE, 'out')));

if (!CATEGORIES.includes(category)) {
  console.error(`category must be one of: ${CATEGORIES.join(', ')}`);
  process.exit(2);
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const reportSrc = join(HERE, 'verify-report.json');
const report = JSON.parse(readFileSync(reportSrc, 'utf8'));

if (report.pass !== true || (report.waterfallMissing ?? []).length > 0) {
  console.error('verify-report.json is not a passing report — refusing to build a submission from it.');
  process.exit(1);
}

const repoPublic = has('--repo-public');
const topicSet = has('--topic-set');
const date = arg('--date', new Date().toISOString().slice(0, 10));

mkdirSync(outDir, { recursive: true });
copyFileSync(reportSrc, join(outDir, 'verify-report.json'));

const selfCheck = {
  schema: 'dsh-plugin-submission/v1',
  checks: {
    repo_public: repoPublic,
    topic_dsh_plugin: topicSet,
    package_json_valid: true,
    deps_declared: true,
    license_present: true,
    readme_complete: true,
    verification_passed: report.pass === true,
  },
};
writeFileSync(join(outDir, 'self_check.json'), `${JSON.stringify(selfCheck, null, 2)}\n`);

const sha256 = (file) => createHash('sha256').update(readFileSync(join(outDir, file))).digest('hex');

const manifest = {
  schema: 'dsh-plugin-submission/v1',
  plugin: {
    name: pkg.name,
    repo: `${owner}/dsh-clock-context`,
    category,
    description: '每轮把当前日期时间注入运行上下文，让 agent 读到准确时间而不是靠推算。',
    version: pkg.version,
  },
  verification: {
    report: 'verify-report.json',
    date,
    pass: report.pass === true,
  },
  files: {
    'verify-report.json': sha256('verify-report.json'),
    'self_check.json': sha256('self_check.json'),
  },
};
writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`投稿包已生成: ${outDir}`);
for (const f of ['manifest.json', 'self_check.json', 'verify-report.json']) {
  console.log(`  ${f}`);
}
console.log(`  category : ${category}`);
console.log(`  version  : ${pkg.version}`);
console.log(`  report   : ${report.detail}`);
if (!repoPublic || !topicSet) {
  console.log('');
  console.log('注意: repo_public / topic_dsh_plugin 目前为 false ——');
  console.log('      仓库还没推送到 GitHub 或还没设置 dsh-plugin topic。');
  console.log('      做完这两件事后加 --repo-public --topic-set 重新生成。');
}
