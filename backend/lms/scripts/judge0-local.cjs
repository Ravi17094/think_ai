#!/usr/bin/env node
// Local Judge0 VM control. Runtime paths and private credentials stay in ignored files.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const runFile = promisify(execFile);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalize = value => String(value).replaceAll('\\', '/').toLowerCase();
function inside(root, relative) {
  const result = path.resolve(root, relative);
  if (!normalize(result).startsWith(normalize(path.resolve(root)) + '/')) {
    throw new Error('Runtime file must stay inside the configured runtime directory.');
  }
  return result;
}
function loadConfig(filename) {
  const input = JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
  if (!path.isAbsolute(input.runtimeDir || '')) throw new Error('Configure an absolute runtimeDir.');
  const root = path.resolve(input.runtimeDir);
  const result = {
    root,
    qemu: inside(root, input.qemu || 'qemu/qemu-system-x86_64.exe'),
    qemuImg: inside(root, input.qemuImg || 'qemu/qemu-img.exe'),
    base: inside(root, input.baseImage || 'downloads/ubuntu-22.04-server-cloudimg-amd64.img'),
    disk: inside(root, input.disk || 'private/sandbox.qcow2'),
    seed: inside(root, input.seed || 'private/seed.iso'),
    key: inside(root, input.sshKey || 'private/sandbox_ed25519'),
    knownHosts: inside(root, input.knownHosts || 'private/known_hosts'),
    stateFile: inside(root, 'private/host-state.json'),
    pidFile: inside(root, 'private/qemu.pid'),
    serial: inside(root, 'private/serial.log'),
    credentials: inside(root, 'private/runtime-config.json'),
    sshPort: input.sshPort ?? 22722,
    apiPort: input.apiPort ?? 2358,
    guestState: input.guestStateFile || '/var/lib/think-ai-judge0/state.json',
    startupSeconds: input.startupSeconds ?? 1800,
    ssh: path.join(process.env.SystemRoot || 'C:/Windows', 'System32/OpenSSH/ssh.exe'),
  };
  for (const port of [result.sshPort, result.apiPort]) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local port.');
  }
  if (result.sshPort === result.apiPort) throw new Error('SSH and API ports must differ.');
  if (!/^\/[A-Za-z0-9_./-]+$/.test(result.guestState)) throw new Error('Invalid guest state path.');
  if (!Number.isInteger(result.startupSeconds) || result.startupSeconds < 30 || result.startupSeconds > 7200) {
    throw new Error('startupSeconds must be between 30 and 7200.');
  }
  return result;
}
function processInfo(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  const script = "$ErrorActionPreference='Stop'; $p=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$env:THINKAI_VM_PID); if($p){[pscustomobject]@{pid=[int]$p.ProcessId;executable=$p.ExecutablePath;commandLine=$p.CommandLine;created=$p.CreationDate.ToUniversalTime().ToString('o')}|ConvertTo-Json -Compress}";
  const result = spawnSync(path.join(process.env.SystemRoot || 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'),
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
    { windowsHide: true, encoding: 'utf8', timeout: 15000, env: { ...process.env, THINKAI_VM_PID: String(pid) } });
  if (result.error || result.status !== 0) throw new Error('Cannot verify VM process identity; no process was stopped.');
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}
function matchesVm(config, info, expected) {
  return !!info && normalize(info.executable) === normalize(config.qemu)
    && normalize(info.commandLine).includes(normalize(`file=${config.disk},if=virtio,format=qcow2`))
    && info.commandLine.includes(`hostfwd=tcp:127.0.0.1:${config.sshPort}-:22`)
    && (!expected || expected.created === info.created);
}
function matchesTunnel(config, info, expected) {
  return !!info && normalize(info.executable) === normalize(config.ssh)
    && normalize(info.commandLine).includes(normalize(config.key))
    && info.commandLine.includes(`127.0.0.1:${config.apiPort}:127.0.0.1:2358`)
    && (!expected || expected.created === info.created);
}
function readState(config) {
  return fs.existsSync(config.stateFile) ? JSON.parse(fs.readFileSync(config.stateFile, 'utf8')) : {};
}
function saveState(config, state) {
  const temporary = config.stateFile + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2) + '\n');
  fs.renameSync(temporary, config.stateFile);
}
function sshArgs(config) {
  return ['-F', 'NUL', '-i', config.key, '-p', String(config.sshPort), '-o', 'IdentitiesOnly=yes',
    '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=4', '-o', `UserKnownHostsFile=${config.knownHosts}`,
    '-o', 'StrictHostKeyChecking=accept-new'];
}
function guestCommand(config, command) {
  return spawnSync(config.ssh, [...sshArgs(config), 'ubuntu@127.0.0.1', command],
    { windowsHide: true, encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });
}
async function dockerStatsCommand(config, executable, args, options = {}, execute = runFile) {
  if (executable !== 'docker' || !Array.isArray(args) || args.length !== 5
      || JSON.stringify(args.slice(0, 4)) !== JSON.stringify(['stats', '--no-stream', '--format', '{{json .}}'])
      || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(args[4])) throw new Error('Invalid Judge0 metrics command or container name.');
  const command = "sudo docker stats --no-stream --format '{{json .}}' " + args[4];
  // Asynchronous SSH leaves concurrent HTTP requests and their measured latencies unblocked.
  return await execute(config.ssh, [...sshArgs(config), 'ubuntu@127.0.0.1', command], {
    windowsHide: true, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024,
  });
}
function stressResourceOptions(env = process.env) {
  if (!env.LMS_JUDGE0_RUNTIME_CONFIG || !env.LMS_JUDGE0_CONTAINER) return {};
  const config = loadConfig(path.resolve(env.LMS_JUDGE0_RUNTIME_CONFIG));
  return {
    resourceCommand: dockerStatsCommand.bind(null, config),
    resourceSource: 'docker stats via SSH in local Judge0 VM',
  };
}
function guestState(config) {
  const result = guestCommand(config, 'cat ' + config.guestState);
  if (result.error || result.status !== 0) return null;
  try { return JSON.parse(result.stdout); } catch { return null; }
}
function readyForBoot(guest, created) {
  if (guest?.status !== 'READY' || guest.executionReadiness?.status !== 'PASS'
      || !Number.isFinite(Date.parse(guest.updatedAt)) || !(Date.parse(guest.updatedAt) >= Date.parse(created))) return false;
  const ids = { python: 71, javascript: 63, java: 62, cpp: 54 };
  return Object.entries(ids).every(([language, id]) => {
    const program = guest.executionReadiness.programs?.[language];
    return program?.languageId === id && program.statusId === 3 && program.stdout === '42';
  });
}
async function listening(port) {
  return await new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const finish = value => { socket.destroy(); resolve(value); };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });
}
async function ownVm(config, state) {
  if (state.vm) {
    const info = processInfo(state.vm.pid);
    if (info && !matchesVm(config, info, state.vm)) throw new Error('Tracked VM PID changed; refusing to control it.');
    if (info) return info;
  }
  if (fs.existsSync(config.pidFile)) {
    const info = processInfo(Number(fs.readFileSync(config.pidFile, 'utf8').trim()));
    if (info && matchesVm(config, info)) {
      state.vm = info;
      saveState(config, state);
      return info;
    }
    if (info) throw new Error('VM pidfile belongs to an unexpected process; nothing changed.');
  }
  return null;
}
async function spawnTracked(config, executable, args, logStem, matcher) {
  const logDir = path.dirname(config.stateFile);
  const out = fs.openSync(path.join(logDir, logStem + '-stdout.log'), 'a');
  const err = fs.openSync(path.join(logDir, logStem + '-stderr.log'), 'a');
  const child = spawn(executable, args, { windowsHide: true, detached: true, stdio: ['ignore', out, err] });
  let launchError;
  child.once('error', error => { launchError = error; });
  await new Promise(resolve => { child.once('spawn', resolve); child.once('error', resolve); });
  fs.closeSync(out); fs.closeSync(err);
  if (launchError) throw launchError;
  child.unref();
  for (let attempt = 0; attempt < 8; attempt++) {
    const info = processInfo(child.pid);
    if (info && matcher(config, info)) return info;
    await delay(500);
  }
  throw new Error('Started process could not be verified. Inspect the private runtime log and pidfile.');
}
async function launchVm(config, state) {
  for (const file of [config.qemu, config.qemuImg, config.base, config.seed, config.key]) {
    if (!fs.existsSync(file)) throw new Error('Missing prepared runtime file: ' + path.basename(file));
  }
  if (await listening(config.sshPort)) throw new Error('Local SSH port is already occupied by an untracked process.');
  if (!fs.existsSync(config.disk)) {
    const result = spawnSync(config.qemuImg, ['create', '-f', 'qcow2', '-F', 'qcow2', '-b', config.base, config.disk, '32G'], { windowsHide: true, encoding: 'utf8', timeout: 30000 });
    if (result.error || result.status !== 0) throw new Error('Could not create the separate VM overlay.');
  }
  const args = ['-machine', 'q35', '-accel', 'whpx,kernel-irqchip=off', '-cpu', 'qemu64,-svm', '-smp', '2', '-m', '4096',
    '-drive', `file=${config.disk},if=virtio,format=qcow2`, '-drive', `file=${config.seed},format=raw,media=cdrom,readonly=on`,
    '-netdev', `user,id=net0,hostfwd=tcp:127.0.0.1:${config.sshPort}-:22`, '-device', 'virtio-net-pci,netdev=net0',
    '-object', 'rng-builtin,id=rng0', '-device', 'virtio-rng-pci,rng=rng0', '-display', 'none', '-monitor', 'none',
    '-serial', `file:${config.serial}`, '-pidfile', config.pidFile, '-rtc', 'base=utc', '-no-reboot'];
  state.vm = await spawnTracked(config, config.qemu, args, 'qemu', matchesVm);
  saveState(config, state);
  console.log('Started the dedicated localhost-only VM.');
}
async function start(config) {
  const state = readState(config);
  if (!await ownVm(config, state)) await launchVm(config, state);
  const deadline = Date.now() + config.startupSeconds * 1000;
  let lastStatus = '', guest, rebooted = false;
  while (Date.now() < deadline) {
    if (!await ownVm(config, state)) {
      if (rebooted) throw new Error('VM exited again before readiness; inspect its private logs.');
      rebooted = true;
      console.log('Cold-starting the same disk after the guest-only cgroup setup reboot.');
      await launchVm(config, state);
    }
    guest = guestState(config);
    if (guest?.status && guest.status !== lastStatus) { console.log('Guest: ' + guest.status); lastStatus = guest.status; }
    const currentBoot = Number.isFinite(Date.parse(guest?.updatedAt)) && Date.parse(guest.updatedAt) >= Date.parse(state.vm.created);
    if (currentBoot && guest?.status === 'ERROR') throw new Error(guest.message || 'Guest bootstrap failed.');
    if (readyForBoot(guest, state.vm.created)) break;
    await delay(5000);
  }
  if (!readyForBoot(guest, state.vm.created)) throw new Error('Startup timed out; actual execution readiness was not established.');
  let tunnel = state.tunnel && processInfo(state.tunnel.pid);
  if (tunnel && !matchesTunnel(config, tunnel, state.tunnel)) throw new Error('Tracked SSH tunnel PID changed; nothing stopped.');
  if (!tunnel) {
    if (await listening(config.apiPort)) throw new Error('Local API port is occupied by an untracked process.');
    const args = [...sshArgs(config), '-N', '-T', '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=10', '-o', 'ServerAliveCountMax=3',
      '-L', `127.0.0.1:${config.apiPort}:127.0.0.1:2358`, 'ubuntu@127.0.0.1'];
    state.tunnel = await spawnTracked(config, config.ssh, args, 'ssh-tunnel', matchesTunnel);
    saveState(config, state);
  }
  const secrets = JSON.parse(fs.readFileSync(config.credentials, 'utf8'));
  if (!secrets.JUDGE0_AUTH_TOKEN) throw new Error('The private runtime token is missing.');
  let confirmed = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${config.apiPort}/languages`, { headers: { 'X-Auth-Token': secrets.JUDGE0_AUTH_TOKEN }, signal: AbortSignal.timeout(3000) });
      const languages = response.ok ? await response.json() : null;
      if (Array.isArray(languages) && [71, 63, 62, 54].every(id => languages.some(row => row.id === id))) { confirmed = true; break; }
    } catch {}
    await delay(1000);
  }
  if (!confirmed) throw new Error('The localhost tunnel did not pass authenticated language verification.');
  console.log(`Judge0 ready at http://127.0.0.1:${config.apiPort}; guest four-language hello executions passed. Stress/timeout/security acceptance are separate checks.`);
}
async function status(config) {
  const state = readState(config);
  const vm = await ownVm(config, state);
  const info = state.tunnel ? processInfo(state.tunnel.pid) : null;
  const guest = vm ? guestState(config) : null;
  console.log(JSON.stringify({ vmRunning: !!vm, tunnelRunning: !!info && matchesTunnel(config, info, state.tunnel), guest }, null, 2));
}
async function stop(config) {
  const state = readState(config);
  const vm = await ownVm(config, state);
  const tunnel = state.tunnel ? processInfo(state.tunnel.pid) : null;
  if (tunnel && !matchesTunnel(config, tunnel, state.tunnel)) throw new Error('Tunnel PID changed; nothing stopped.');
  if (vm) {
    const result = guestCommand(config, 'sudo systemctl poweroff');
    if (result.error || ![0, 255].includes(result.status)) throw new Error('Guest shutdown was not accepted; VM left running.');
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline && processInfo(vm.pid)) await delay(1000);
    const remaining = processInfo(vm.pid);
    if (remaining) throw new Error('Guest has not exited; VM was not force-killed. Inspect the private logs.');
  }
  if (tunnel) {
    const current = processInfo(tunnel.pid);
    if (current && matchesTunnel(config, current, tunnel)) process.kill(tunnel.pid);
    else if (current) throw new Error('Tunnel identity changed during shutdown; it was preserved.');
  }
  saveState(config, {});
  console.log('Local Judge0 VM and its dedicated tunnel stopped. Disk, images and keys were preserved.');
}
async function main() {
  if (process.platform !== 'win32') throw new Error('This helper controls the prepared Windows QEMU runtime only.');
  const action = process.argv[2];
  if (!['start', 'status', 'stop'].includes(action)) throw new Error('Usage: node lms/scripts/judge0-local.cjs start|status|stop [runtime-config-file]');
  const filename = process.argv[3] || path.resolve(__dirname, '../../.local/judge0-runtime.json');
  const config = loadConfig(filename);
  await ({ start, status, stop })[action](config);
}
module.exports = { inside, loadConfig, matchesVm, matchesTunnel, readyForBoot, dockerStatsCommand, stressResourceOptions };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
