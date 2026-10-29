# Playground update

Updated 27 October 2026 in the existing `C:\Users\enovo\OneDrive\Desktop\project\think_ai` checkout. The real program checks below ran on 26 October 2026. No manual copying is needed for that checkout.

## Behavior corrected

- Each language keeps its own code, stdin and expected-output draft while the screen remains mounted. Selecting the same language preserves the draft and output. Selecting another language clears the previous result so it cannot appear to belong to the newly selected program.
- History stores and restores code, stdin and expected output. Older history records remain readable. A restored entry can be restored again after editing. History reloads on focus; clearing and appending are serialized.
- Web iframe and native WebView editors synchronize after loading. The editable fallback retains changes if Monaco finishes loading later. Editing and duplicate runs are blocked during execution.
- Late results cannot overwrite another account's screen or a newer run. A history-save failure preserves the execution result and shows a separate warning.
- Each language displays stdin instructions. A genuine Python EOFError retains its traceback and explains where to provide missing input. Runtime, compilation and timeout errors no longer also display a misleading expected-output comparison.
- The client allows 35 seconds for the response while the execution service retains its 30-second execution limit. Actual HTTP failures retain their useful messages.

## Running a program

1. Choose Python, JavaScript, Java or C++ and enter valid code for that language.
2. If the program reads input, supply all values in **Test input (stdin)** before pressing **Run code**. For Python, use one line for each `input()` call. Output is read-only and cannot accept input during execution.
3. Leave **Expected output (optional)** empty to see the actual output without comparison, or provide the exact result to compare.
4. Press **Run code** and inspect the returned output or error. For Java, use class `Main` with `public static void main(String[] args)`.

For example, the Python age-check program needs stdin `18` to print `Eligible`; stdin `15` selects its other branch. Empty stdin correctly produces an EOFError when an unhandled `input()` call requires a value. No default input or fabricated successful result is inserted.

Valid programs using functions, arrays, loops and if/else were exercised in all four languages. This is not a guarantee for arbitrary source, unsupported packages or newer language features. The local Judge0 images provide Python 3.8.1, Node.js 12.14.0, Java 13.0.1 and GCC 9.2.0. Use available standard libraries. Code networking and external files are disabled, and execution is subject to time, memory and output limits. The backend and local execution service must both be running.

## Verification actually run

| Check | Before this update | After this update |
| --- | --- | --- |
| Backend LMS suite | 148 passed | 148 passed |
| Backend CI suite | 25 passed | 25 passed |
| Mobile TypeScript | Passed | Passed |
| Full mobile Jest suite | 401 tests / 38 suites passed | 461 tests / 41 suites passed |
| Real existing API and Judge0 program checks | Not part of the before suite | 10/10 passed |

The ten real checks cover both if/else branches with functions, arrays, loops and multiline stdin in Python, JavaScript, Java and C++, plus intentional Python EOF handling and an unhandled missing-input error. The last check passes because the real error is correctly returned; it does not label the failed program as accepted. Results are recorded in [playground-program-verification.json](playground-program-verification.json).

The browser check on 26 October exercised the learner's actual Python if/else program: empty stdin returned the real EOFError with the input hint, and stdin `18` returned `Accepted`, `Eligible` and the expected-output match. This is recorded web evidence, not native device acceptance or a claim that the services are running now.

An initial final-suite run reported 460 passed and one failed: the first Playground test exceeded Jest's default five-second limit while loading React Native on a cold start. The final result above is from an unchanged warm rerun; the initial failure is retained here rather than hidden. Jest used a writable local cache directory to avoid the Windows temporary-cache rename restriction. No project test configuration was changed for that workaround. Backend source was unchanged by this Playground update.

## Files in this update

Source and tests, relative to `think_ai`:

| File | Purpose |
| --- | --- |
| mobile/src/lms/screens/PlaygroundScreen.tsx | Drafts, stdin help, result/error display, run lifecycle and history restore |
| mobile/src/lms/CodeEditor.web.tsx | Web editor synchronization and editing state |
| mobile/src/lms/CodeEditor.tsx | Native editor synchronization and editing state |
| mobile/src/lms/editorHtml.ts | Embedded editor readiness, fallback and update handling |
| mobile/src/lms/api.ts | Execution response deadline and useful request errors |
| mobile/src/lms/types.ts | Optional history stdin and expected-output fields |
| mobile/src/lms/storage.ts | Compatible history validation and serialized mutations |
| mobile/src/tests/lms/storage.test.ts | History compatibility and mutation regression checks |
| mobile/src/tests/lms/playground.test.tsx | Playground lifecycle, draft, input, comparison and history checks |
| mobile/src/tests/lms/editor.test.tsx | Editor load/synchronization/editing checks |
| mobile/src/tests/lms/execution-api.test.ts | Execution timeout and HTTP error checks |

Handover and evidence: `deliverables/PLAYGROUND_UPDATE.md`, `deliverables/PATAN_REMAINING_WORK.md`, `deliverables/playground-program-verification.json` and the complete `deliverables/PLAYGROUND_CHANGED_FILES.md` / `.json` manifest. Existing status documents receive a dated pointer so historical counts and the earlier reverted-draft statement are not mistaken for the current status. The final changed-file manifest is the authoritative list of files actually delivered.

## Overall assignment status

This update completes the tested local Playground fixes. It does not complete the external acceptance requirements for all of Patan's tasks. See [PATAN_REMAINING_WORK.md](PATAN_REMAINING_WORK.md) for the remaining services, team integration, approved client assets and device checks.
