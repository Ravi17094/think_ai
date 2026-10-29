const assert = require('node:assert/strict');
const test = require('node:test');
const { inside, matchesVm, matchesTunnel, readyForBoot } = require('../scripts/judge0-local.cjs');
const config = {
  qemu: 'D:\\LocalSandboxes\\lms\\qemu\\qemu-system-x86_64.exe',
  ssh: 'C:\\Windows\\System32\\OpenSSH\\ssh.exe',
  disk: 'D:\\LocalSandboxes\\lms\\private\\sandbox.qcow2',
  key: 'D:\\LocalSandboxes\\lms\\private\\sandbox_ed25519',
  sshPort: 22722,
  apiPort: 2358,
};
const created = '2026-10-26T14:00:00.0000000Z';
const vm = {
  executable: config.qemu,
  created,
  commandLine: `${config.qemu} -drive file=${config.disk},if=virtio,format=qcow2 -netdev user,id=net0,hostfwd=tcp:127.0.0.1:22722-:22`,
};
const tunnel = {
  executable: config.ssh,
  created,
  commandLine: `${config.ssh} -i ${config.key} -N -T -L 127.0.0.1:2358:127.0.0.1:2358 ubuntu@127.0.0.1`,
};
test('runtime paths cannot escape their private directory', () => {
  assert.ok(inside('D:/LocalSandboxes/lms', 'private/sandbox.qcow2').endsWith('sandbox.qcow2'));
  assert.throws(() => inside('D:/LocalSandboxes/lms', '../other/sandbox.qcow2'));
  assert.throws(() => inside('D:/LocalSandboxes/lms', 'C:/Windows/file'));
});
test('VM control requires the exact executable, disk, localhost port and creation identity', () => {
  assert.equal(matchesVm(config, vm, vm), true);
  assert.equal(matchesVm(config, null, vm), false);
  assert.equal(matchesVm(config, { ...vm, executable: 'C:/other/qemu-system-x86_64.exe' }, vm), false);
  assert.equal(matchesVm(config, { ...vm, created: '2026-10-26T15:00:00Z' }, vm), false);
  assert.equal(matchesVm(config, { ...vm, commandLine: vm.commandLine.replace('sandbox.qcow2,', 'sandbox.qcow2.backup,') }, vm), false);
  assert.equal(matchesVm(config, { ...vm, commandLine: vm.commandLine.replace(':22722-:22', ':22222-:22') }, vm), false);
});
test('tunnel control cannot stop an unrelated or PID-reused SSH process', () => {
  assert.equal(matchesTunnel(config, tunnel, tunnel), true);
  assert.equal(matchesTunnel(config, null, tunnel), false);
  assert.equal(matchesTunnel(config, { ...tunnel, executable: 'D:/ssh.exe' }, tunnel), false);
  assert.equal(matchesTunnel(config, { ...tunnel, created: '2026-10-26T15:00:00Z' }, tunnel), false);
  assert.equal(matchesTunnel(config, { ...tunnel, commandLine: tunnel.commandLine.replace('127.0.0.1:2358:127.0.0.1:2358', '0.0.0.0:2358:127.0.0.1:2358') }, tunnel), false);
  assert.equal(matchesTunnel(config, { ...tunnel, commandLine: tunnel.commandLine.replace('sandbox_ed25519', 'someone_else') }, tunnel), false);
});
test('readiness requires all four real hello results from this boot', () => {
  const evidence = {
    status: 'READY', updatedAt: '2026-10-26T14:05:00Z',
    executionReadiness: { status: 'PASS', programs: Object.fromEntries(Object.entries({ python: 71, javascript: 63, java: 62, cpp: 54 }).map(([name, id]) => [name, { languageId: id, statusId: 3, stdout: '42' }])) },
  };
  assert.equal(readyForBoot(evidence, created), true);
  assert.equal(readyForBoot({ ...evidence, updatedAt: '2026-10-26T13:00:00Z' }, created), false);
  assert.equal(readyForBoot({ ...evidence, executionReadiness: { status: 'PASS' } }, created), false);
  assert.equal(readyForBoot({ ...evidence, executionReadiness: { ...evidence.executionReadiness, programs: { ...evidence.executionReadiness.programs, java: { languageId: 62, statusId: 5, stdout: '' } } } }, created), false);
});
