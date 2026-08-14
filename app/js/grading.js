// Evaluates a Submit attempt against a lesson's assignment: static
// requirement checks against the source text, plus a behavioral check via
// a test harness executed in the Pyodide worker.
const Grading = (() => {
  function checkRequirements(code, requirementChecks) {
    const codeNoComments = code.replace(/#.*$/gm, '');
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

  async function submit(code, assignment) {
    const requirementResults = checkRequirements(code, assignment.requirementChecks);
    const runResult = await RunnerClient.run(code + (assignment.testHarness || ''), {
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
      outputCheck: { label: assignment.outputCheckLabel, passed: outputPassed },
      rawOutput: runResult.output,
    };
  }

  return { submit };
})();
