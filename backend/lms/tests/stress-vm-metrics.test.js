const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runStress, dockerSample } = require('../stress-runner');
const { dockerStatsCommand, stressResourceOptions } = require('../scripts/judge0-local.cjs');

const config = {
  ssh: 'C:/Windows/System32/OpenSSH/ssh.exe',
  key: 'D:/LocalSandboxes/lms/private/sandbox_ed25519',
  knownHosts: 'D:/LocalSandboxes/lms/private/known_hosts',
  sshPort: 22722,
};
const dockerArgs = ['stats', '--no-stream', '--format', '{{json .}}', 'judge0-workers-1'];
const sample = { CPUPerc: '147.5%', MemPerc: '12.3%', MemUsage: '512MiB / 4GiB' };
const jsonSample = () => ({ stdout: JSON.stringify(sample) + '\n' });

test('VM metrics use asynchronous read-only SSH without blocking the event loop', async () => {
  let finish, invocation;
  const pending = dockerStatsCommand(config, 'docker', dockerArgs, {}, async (...args) => {
    invocation = args;
    return await new Promise(resolve => { finish = resolve; });
  });
  let progressed = false;
  await new Promise(resolve => setImmediate(() => { progressed = true; resolve(); }));
  assert.equal(progressed, true);
  assert.equal(invocation[0], config.ssh);
  assert.equal(invocation[1].at(-1), "sudo docker stats --no-stream --format '{{json .}}' judge0-workers-1");
  assert.ok(invocation[1].includes('BatchMode=yes'));
  assert.ok(invocation[1].includes('StrictHostKeyChecking=accept-new'));
  assert.ok(invocation[1].includes('UserKnownHostsFile=' + config.knownHosts));
  assert.equal(invocation[2].timeout, 10000);
  assert.equal(invocation[2].windowsHide, true);
  finish(jsonSample());
  assert.deepEqual(await pending, jsonSample());
});

test('metrics reject container/command injection before any SSH call', async () => {
  let calls = 0;
  const execute = async () => { calls++; return jsonSample(); };
  for (const container of ['workers;id', '$(id)', 'workers\nwhoami', '--help', 'workers /etc/passwd']) {
    const args = [...dockerArgs.slice(0, -1), container];
    await assert.rejects(dockerStatsCommand(config, 'docker', args, {}, execute));
  }
  await assert.rejects(dockerStatsCommand(config, 'bash', dockerArgs, {}, execute));
  await assert.rejects(dockerStatsCommand(config, 'docker', ['exec', 'workers', 'id'], {}, execute));
  await assert.rejects(dockerSample('workers;id', execute));
  assert.equal(calls, 0);
});

test('unconfigured VM metrics do not read runtime config or invoke SSH', async () => {
  assert.deepEqual(stressResourceOptions({}), {});
  assert.deepEqual(stressResourceOptions({ LMS_JUDGE0_CONTAINER: 'workers' }), {});
  assert.deepEqual(stressResourceOptions({ LMS_JUDGE0_RUNTIME_CONFIG: 'missing-runtime-file.json' }), {});
  let calls = 0;
  const report = await runStress({
    base: 'https://fake-api.example.invalid/api/lms', token: 'test-token', concurrency: 4,
    resourceCommand: async () => { calls++; return jsonSample(); },
    request: async url => String(url).includes('/health') ? { ok: true } : ({
      ok: true, status: 200,
      json: async () => ({ data: { results: [{ passed: true, statusId: 3, stdout: '42', stderr: '' }] } }),
    }),
  });
  assert.equal(calls, 0);
  assert.equal(report.resources.source, 'not configured');
  assert.deepEqual(report.resources.samples, []);
});

test('injected async resource sampler spans primary and concurrent edge batches', async () => {
  let phase = 'before';
  const phases = [];
  const report = await runStress({
    base: 'https://fake-api.example.invalid/api/lms', token: 'test-token', concurrency: 20, edgeCases: true,
    container: 'judge0-workers-1', resourceSource: 'docker stats via SSH in local Judge0 VM',
    resourceCommand: async (file, args, options) => {
      phases.push(phase);
      assert.equal(file, 'docker');
      assert.deepEqual(args, dockerArgs);
      assert.equal(options.timeout, 10000);
      return jsonSample();
    },
    request: async (url, options) => {
      if (String(url).includes('/health')) return { ok: true };
      const body = JSON.parse(options.body);
      const edge = body.sourceCode === 'while True: pass' || body.sourceCode.includes('sys.stdin.read()');
      phase = edge ? 'edge' : 'primary';
      await new Promise(resolve => setTimeout(resolve, 1200));
      const timeout = body.sourceCode === 'while True: pass';
      const stdout = edge ? body.testCases[0].input.replace(/<[^>]*>/g, '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '') : '42';
      return {
        ok: true, status: 200,
        json: async () => ({ data: { results: [{ passed: !timeout, statusId: timeout ? 5 : 3, stdout, stderr: '' }] } }),
      };
    },
  });
  assert.ok(phases.includes('primary'), 'No sample was captured during the primary batch.');
  assert.ok(phases.includes('edge'), 'No sample was captured during the edge batch.');
  assert.equal(report.executionStatus, 'PASS');
  assert.equal(report.timeoutVerified, true);
  assert.equal(report.sanitizerVerified, true);
  assert.equal(report.resources.source, 'docker stats via SSH in local Judge0 VM');
  assert.equal(report.resources.peakCpuPercent, 147.5);
  assert.equal(report.resources.peakMemoryPercent, 12.3);
  assert.ok(report.resources.samples.every(row => row.memoryUsage === sample.MemUsage));
  assert.deepEqual(report.resources.errors, []);
});

test('the existing Docker-host sample command and parsing remain compatible', async () => {
  const value = await dockerSample('judge0-workers-1', async (file, args, options) => {
    assert.equal(file, 'docker');
    assert.deepEqual(args, dockerArgs);
    assert.deepEqual(options, { timeout: 10000, windowsHide: true });
    return jsonSample();
  });
  assert.equal(value.cpuPercent, 147.5);
  assert.equal(value.memoryPercent, 12.3);
  assert.equal(value.memoryUsage, sample.MemUsage);
});
