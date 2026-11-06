import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npmCli = process.env.npm_execpath;
const children = [];
let shuttingDown = false;

function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach(stop);
  setTimeout(() => process.exit(code), 800).unref();
}

function start(label, script, extraArgs = []) {
  const command = npmCli ? process.execPath : isWindows ? 'npm.cmd' : 'npm';
  const baseArgs = npmCli ? [npmCli, 'run', script] : ['run', script];
  const args = extraArgs.length ? [...baseArgs, '--', ...extraArgs] : baseArgs;
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    detached: !isWindows,
    shell: !npmCli && isWindows,
  });

  child.on('error', (error) => {
    console.error(`[dev] failed to start ${label}:`, error.message);
    shutdown(1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.error(
      `[dev] ${label} stopped (${reason}); stopping the other process.`,
    );
    shutdown(typeof code === 'number' ? code : 1);
  });

  children.push(child);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('app', 'dev:app', process.argv.slice(2));
start('help', 'help:dev');
