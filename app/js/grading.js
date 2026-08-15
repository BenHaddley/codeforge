// Evaluates a Submit attempt against a lesson's assignment: static
// requirement checks against the source text, plus a behavioral check via
// a test harness executed in that track's language Worker (Pyodide for
// Python, js-worker.js for JavaScript — see runner-client.js).
const Grading = (() => {
  // Each language comments differently, so stripping comments before
  // matching requirementChecks (so a pattern can't "pass" just because it
  // appears inside a comment) needs a per-language rule.
  const COMMENT_PATTERNS = {
    python: /#.*$/gm,
    javascript: /\/\/.*$/gm,
  };

  function checkRequirements(code, requirementChecks, language) {
    const commentPattern = COMMENT_PATTERNS[language] || COMMENT_PATTERNS.python;
    const codeNoComments = code.replace(commentPattern, '');
    return (requirementChecks || []).map((rc) => {
      const matched = new RegExp(rc.pattern).test(codeNoComments);
      const passed = rc.mustMatch ? matched : !matched;
      return { id: rc.id, label: rc.label, passed };
    });
  }

  function extractCapturedOutput(rawOutput) {
    const marker = '__CF_TEST_OUTPUT__\n';
    const idx = rawOutput.lastIndexOf(marker);
    if (idx < 0) return null;
    const tail = rawOutput.slice(idx + marker.length).trim().split('\n')[0];
    try {
      return Function('return ' + tail)();
    } catch (e) {
      return null;
    }
  }

  async function submit(code, assignment, { runner = RunnerClient, language = 'python' } = {}) {
    const requirementResults = checkRequirements(code, assignment.requirementChecks, language);
    const runResult = await runner.run(code + (assignment.testHarness || ''), {
      timeoutMs: assignment.timeoutMs || 8000,
    });
    const captured = runResult.ok ? extractCapturedOutput(runResult.output) : null;
    const outputPassed = captured === assignment.expectedOutput;
    const allReqsPassed = requirementResults.every((r) => r.passed);
    const passed = runResult.ok && allReqsPassed && outputPassed;
    return {
      passed,
      timedOut: runResult.timedOut,
      executed: runResult.ok,
      requirementResults,
      outputCheck: {
        label: assignment.outputCheckLabel,
        passed: outputPassed,
        expected: assignment.expectedOutput,
        actual: captured,
      },
      rawOutput: runResult.output,
    };
  }

  return { submit };
})();
