const { spawnSync } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

const runStep = (label, command, args, options = {}) => {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: options.shell ?? false,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

const runNpmStep = (label, args) => {
  if (isWindows) {
    runStep(label, `npm ${args.join(' ')}`, [], { shell: true });
    return;
  }

  runStep(label, 'npm', args);
};

runNpmStep('Apply migrations', ['run', 'db:migrate']);
runNpmStep('Run backend tests', ['test', '--', '--runInBand']);
runNpmStep('Build backend', ['run', 'build']);
runStep(
  'Run live smoke',
  process.execPath,
  [path.resolve(__dirname, 'live-smoke.js')],
  { shell: false }
);

console.log('\nRelease verification completed successfully.');
