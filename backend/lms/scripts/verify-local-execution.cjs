#!/usr/bin/env node
// Real HTTP acceptance only. This script never executes learner source on Windows.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

const repo = process.env.LMS_ACCEPTANCE_REPO || path.resolve(__dirname, '../../..');
const api = (process.env.LMS_ACCEPTANCE_API || 'http://127.0.0.1:5000/api').replace(/\/$/, '');
const output = process.argv[2] || path.join(repo, 'deliverables/code-execution-acceptance.json');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sources = {
  python: 'print(42)',
  javascript: 'console.log(42);',
  java: 'public class Main { public static void main(String[] args) { System.out.println(42); } }',
  cpp: '#include <iostream>\nint main() { std::cout << 42 << std::endl; }',
};
async function jsonRequest(url, { headers = {}, body, timeoutMs = 40000 } = {}) {
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  let data;
  try { data = text.trim() ? JSON.parse(text) : null; } catch { throw new Error('HTTP response was not JSON (status ' + response.status + ').'); }
  return { status: response.status, data };
}

async function main() {
  const report = { startedAt: new Date().toISOString(), mode: 'real local HTTP and Judge0', status: 'IN_PROGRESS', checks: [] };
  async function check(name, action) {
    const began = performance.now();
    try {
      const evidence = await action();
      report.checks.push({ name, passed: true, latencyMs: Math.round(performance.now() - began), ...evidence });
      console.log(name + ': PASS');
    } catch (error) {
      report.checks.push({ name, passed: false, latencyMs: Math.round(performance.now() - began), error: String(error.message).slice(0, 1000) });
      console.log(name + ': FAIL');
    }
  }
  try {
    assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(api).hostname), 'This acceptance script may use practice credentials only against a loopback API.');
    const pointer = JSON.parse(await fs.readFile(path.join(repo, 'backend/.local/judge0-runtime.json'), 'utf8'));
    const privateConfig = JSON.parse(await fs.readFile(path.join(pointer.runtimeDir, 'private/runtime-config.json'), 'utf8'));
    const judgeBase = 'http://127.0.0.1:' + (pointer.apiPort || 2358);
    const judgeHeaders = { 'X-Auth-Token': privateConfig.JUDGE0_AUTH_TOKEN };
    assert.ok(judgeHeaders['X-Auth-Token'], 'Private Judge0 auth is not configured.');
    const credentials = await fs.readFile(path.join(repo, 'backend/.local/LOCAL_LOGIN.txt'), 'utf8');
    const match = /^Password for both:\s*(.+)$/m.exec(credentials);
    assert.ok(match, 'Local practice credential file has no recognized password line.');
    const login = await jsonRequest(api + '/auth/login', { body: { email: 'patan@local.test', password: match[1].trim() } });
    assert.equal(login.status, 200, 'Local learner login failed.');
    assert.ok(login.data.token, 'Local learner login did not issue a token.');
    const learnerHeaders = { Authorization: 'Bearer ' + login.data.token };
    const run = async body => jsonRequest(api + '/lms/code/execute', { headers: learnerHeaders, body });
    const resultOf = response => {
      assert.equal(response.status, 200, 'Secured execution HTTP status ' + response.status + '/' + (response.data.code || 'unknown'));
      assert.equal(response.data.success, true);
      assert.equal(response.data.data?.results?.length, 1);
      return response.data.data.results[0];
    };
    await check('unauthenticated API execution denied', async () => {
      const response = await jsonRequest(api + '/lms/code/execute', { body: { language: 'python', sourceCode: 'print(42)' } });
      assert.equal(response.status, 401);
      return { httpStatus: response.status };
    });
    await check('unauthenticated direct sandbox denied', async () => {
      const response = await jsonRequest(judgeBase + '/languages', { timeoutMs: 10000 });
      assert.ok([401, 403].includes(response.status), 'Unauthenticated sandbox language read was not denied.');
      return { httpStatus: response.status };
    });
    for (const [language, sourceCode] of Object.entries(sources)) {
      await check(language + ' real stdout', async () => {
        const response = await run({ language, sourceCode, testCases: [{ input: '', expectedOutput: '42' }] });
        const result = resultOf(response);
        assert.equal(result.statusId, 3); assert.equal(result.stdout.trim(), '42'); assert.equal(result.passed, true);
        return { language, httpStatus: response.status, statusId: result.statusId, stdout: result.stdout, cpuTimeSeconds: result.time, memoryKiB: result.memory };
      });
    }
    await check('stdin and matching expected output', async () => {
      const result = resultOf(await run({ language: 'python', sourceCode: 'print(int(input()) + int(input()))', testCases: [{ input: '20\n22\n', expectedOutput: '42' }] }));
      assert.equal(result.statusId, 3); assert.equal(result.stdout.trim(), '42'); assert.equal(result.passed, true);
      return { statusId: result.statusId, stdout: result.stdout, expectedMatched: result.passed };
    });
    await check('mismatched expected output is false', async () => {
      const result = resultOf(await run({ language: 'python', sourceCode: 'print(42)', testCases: [{ input: '', expectedOutput: '43' }] }));
      assert.equal(result.statusId, 3); assert.equal(result.stdout.trim(), '42'); assert.equal(result.passed, false);
      return { statusId: result.statusId, expectedMatched: result.passed };
    });
    await check('real Java compile error returned', async () => {
      const result = resultOf(await run({ language: 'java', sourceCode: 'public class Main { public static void main(String[] args) { broken } }' }));
      assert.equal(result.statusId, 6); assert.ok(result.compileOutput.length > 0);
      return { statusId: result.statusId, compileOutputPresent: true };
    });
    await check('real Python runtime error returned', async () => {
      const result = resultOf(await run({ language: 'python', sourceCode: 'print(1 / 0)' }));
      assert.equal(result.statusId, 11); assert.match(result.stderr, /ZeroDivisionError/);
      return { statusId: result.statusId, runtimeErrorPresent: true };
    });
    await check('HTML ANSI and shell-like stdin sanitized after real execution', async () => {
      const input = '; echo SHELL_PAYLOAD $(id) <script>alert(1)</script>\u001b[31m';
      const result = resultOf(await run({ language: 'python', sourceCode: 'import sys\nprint(sys.stdin.read())', testCases: [{ input, expectedOutput: input }] }));
      assert.equal(result.statusId, 3); assert.equal(result.passed, true);
      assert.equal(result.stdout.trimEnd(), '; echo SHELL_PAYLOAD $(id) alert(1)');
      assert.ok(!/<script|\x1b\[/i.test(result.stdout));
      return { statusId: result.statusId, rawExpectedMatched: result.passed, sanitizedStdout: result.stdout };
    });
    await check('CPU-bound loop is actually terminated by sandbox', async () => {
      const result = resultOf(await run({ language: 'python', sourceCode: 'while True: pass', timeout: 30 }));
      assert.equal(result.statusId, 5, 'Only actual terminal status 5 proves sandbox termination; proxy 504 is insufficient.');
      return { statusId: result.statusId, cpuTimeSeconds: result.time, memoryKiB: result.memory };
    });
    const directBody = {
      language_id: 71, source_code: Buffer.from('print(42)').toString('base64'), stdin: '',
      cpu_time_limit: 5, wall_time_limit: 30, memory_limit: 128000, enable_network: false,
    };
    for (const [field, value] of Object.entries({ enable_network: true, compiler_options: '-O2', command_line_arguments: 'test', callback_url: 'http://127.0.0.1:9/disabled-callback', additional_files: Buffer.from('not-a-zip').toString('base64') })) {
      await check('sandbox rejects prohibited ' + field, async () => {
        const response = await jsonRequest(judgeBase + '/submissions?base64_encoded=true&wait=false', { headers: judgeHeaders, body: { ...directBody, [field]: value }, timeoutMs: 10000 });
        assert.equal(response.status, 422, 'Prohibited option was not rejected.');
        assert.ok(response.data[field], 'Validation did not identify the prohibited field.');
        return { httpStatus: response.status, rejectedField: field };
      });
    }
    await check('30 second wall limit kills a low CPU sleeping program', async () => {
      const began = performance.now();
      const submission = await jsonRequest(judgeBase + '/submissions?base64_encoded=true&wait=false', {
        headers: judgeHeaders, body: { ...directBody, source_code: Buffer.from('import time\ntime.sleep(60)\nprint("SHOULD_NOT_RUN")').toString('base64') }, timeoutMs: 10000,
      });
      assert.equal(submission.status, 201); assert.ok(submission.data.token);
      const token = encodeURIComponent(submission.data.token);
      const deadline = Date.now() + 45000;
      let response;
      while (Date.now() < deadline) {
        response = await jsonRequest(judgeBase + '/submissions/' + token + '?base64_encoded=true&fields=status,stdout,stderr,time,wall_time,memory', { headers: judgeHeaders, timeoutMs: 10000 });
        assert.equal(response.status, 200);
        if (Number(response.data.status?.id) > 2) break;
        await sleep(500);
      }
      const result = response.data;
      assert.equal(result.status?.id, 5, 'Remote terminal Time Limit Exceeded was not observed.');
      assert.ok(Number(result.wall_time) >= 29 && Number(result.wall_time) <= 35, 'Actual sandbox wall time did not establish the configured 30 second limit.');
      assert.ok(Number(result.time) < 5, 'Probe hit the CPU limit instead of establishing the wall limit.');
      const stdout = Buffer.from(result.stdout || '', 'base64').toString('utf8');
      assert.ok(!stdout.includes('SHOULD_NOT_RUN'));
      return { statusId: result.status.id, wallTimeSeconds: result.wall_time, cpuTimeSeconds: result.time, totalObservedMs: Math.round(performance.now() - began), completedAfterSleep: false };
    });
    report.status = report.checks.every(row => row.passed) ? 'PASS' : 'FAIL';
  } catch (error) {
    report.status = 'BLOCKED';
    report.error = String(error.message).slice(0, 1000);
  } finally {
    report.finishedAt = new Date().toISOString();
    report.passed = report.checks.filter(row => row.passed).length;
    report.failed = report.checks.filter(row => !row.passed).length;
    report.note = 'Actual real local sandbox results only. This run does not establish production capacity, cloud certificates or native-device behavior. No learner source was executed on the Windows host.';
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ status: report.status, passed: report.passed, failed: report.failed, reportFile: output }));
    if (report.status !== 'PASS') process.exitCode = 1;
  }
}
if (require.main === module) main().catch(error => { console.error(String(error.message)); process.exitCode = 1; });
