// Builds the structured context that accompanies every Paperclip request.
//
// Privacy and safety rules enforced here:
// - Only the current lesson/assignment/editor/run/test-summary/completion
//   state is included — no names, emails or account data.
// - Hidden grading material (solutionCode, testHarness, expectedOutput)
//   is NEVER included, so the model cannot be nudged into revealing it.
// - Student code and lesson text are treated as data, delimited clearly.
const PaperclipContext = (() => {
  let lesson = null;
  let chapter = null;
  let track = null;

  // Maximum editor code sent per request, in characters.
  const MAX_CODE_CHARS = 4000;

  function setLessonData(trackData, chapterData, lessonData) {
    track = trackData;
    chapter = chapterData;
    lesson = lessonData;
  }

  function getLesson() {
    return lesson;
  }

  function getLessonId() {
    return lesson ? lesson.id : null;
  }

  // The exact code currently visible in the IDE, never pasted manually.
  function getCurrentEditorCode() {
    const practiceScreen = document.getElementById('screen-practice');
    const practiceActive = practiceScreen && practiceScreen.classList.contains('active');
    if (practiceActive) {
      const practice = document.getElementById('practiceEditor');
      if (practice) return practice.value;
    }
    const preview = document.getElementById('previewEditor');
    return preview ? preview.value : '';
  }

  // Maps a raw execution result (from RunnerClient/Grading) into the
  // normalized shape the API understands. Lesson-loader tags each result
  // with source: 'run' (scratch execution) or 'submit' (graded attempt).
  function normalizeRunResult(result) {
    if (!result) return null;
    let status;
    if (result.source === 'submit') {
      if (result.passed) status = 'passed';
      else if (result.timedOut) status = 'timeout';
      else if (result.executed === false) status = /(SyntaxError|NameError|TypeError|ValueError|IndentationError|Error)/.test(result.output || result.rawOutput || '') ? 'runtime_error' : 'failed_tests';
      else status = 'failed_tests';
    } else if (result.timedOut) {
      status = 'timeout';
    } else if (result.ok) {
      status = 'success';
    } else {
      status = 'runtime_error';
    }
    return {
      status,
      stdout: (result.output || result.rawOutput || '').slice(0, 3000),
      stderr: result.stderr || '',
      executionTimeMs: result.executionTimeMs || null,
    };
  }

  // Derives a learner-safe test summary from the deterministic grader's
  // verdict. Only facts the learner can already see are included.
  function buildTestSummary(result) {
    if (!result) return null;
    const rows = [];
    if (result.requirementResults) {
      result.requirementResults.forEach((r) => rows.push({ passed: r.passed, label: r.label }));
    }
    if (result.outputCheck) rows.push({ passed: result.outputCheck.passed, label: result.outputCheck.label });
    if (result.executed !== undefined) rows.push({ passed: result.executed, label: 'Program executes without an exception' });

    const passed = rows.filter((r) => r.passed).length;
    const failing = rows.filter((r) => !r.passed).map((r) => r.label);
    return {
      summary: `${passed} / ${rows.length} tests passed.`,
      failing,
      failureCategory: result.timedOut ? 'probable infinite loop' : failing.length ? 'requirements not met' : null,
    };
  }

  function build() {
    const code = getCurrentEditorCode();
    const codeTruncated = code.length > MAX_CODE_CHARS;
    const run = normalizeRunResult(PaperclipState.getLastRun());
    const lastRun = PaperclipState.getLastRun();

    let testSummary = null;
    if (run) {
      if (lastRun && (lastRun.requirementResults || lastRun.outputCheck)) {
        testSummary = buildTestSummary(lastRun);
      } else if (run.status === 'timeout') {
        testSummary = { summary: 'Execution timed out.', failureCategory: 'probable infinite loop' };
      } else if (run.status === 'runtime_error') {
        testSummary = { summary: 'Program stopped with an error.', failureCategory: null };
      }
    }

    return {
      course: track ? track.title : null,
      chapter: chapter ? `${chapter.number}. ${chapter.title}` : null,
      lesson: lesson ? `${lesson.number} ${lesson.title}` : null,
      lessonId: lesson ? lesson.id : null,
      learningObjectives: lesson && lesson.objective ? [lesson.objective] : [],
      lessonSummary: lesson
        ? (lesson.explanation ? lesson.explanation.paragraphs.join(' ') : '') +
          (lesson.explanation && lesson.explanation.rule ? ' Rule: ' + lesson.explanation.rule : '')
        : '',
      assignment: lesson && lesson.assignment
        ? {
            title: lesson.assignment.title,
            brief: lesson.assignment.brief,
            requirements: lesson.assignment.requirements || [],
          }
        : null,
      editor: {
        code: codeTruncated ? code.slice(0, MAX_CODE_CHARS) + '\n# …(truncated)' : code,
        version: PaperclipState.hashCode(code),
        updatedSinceLastMessage: PaperclipState.editorUpdatedSinceLastMessage(code),
      },
      lastRun: run,
      testSummary,
      assignmentComplete: lesson ? ProgressStore.isComplete(lesson.id) : false,
      assistanceLevel: lesson ? PaperclipState.getAssistanceLevel(lesson.id) : 0,
      history: lesson ? PaperclipState.getSentHistory(lesson.id) : [],
    };
  }

  return { setLessonData, getLesson, getLessonId, getCurrentEditorCode, build };
})();