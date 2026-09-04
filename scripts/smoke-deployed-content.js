'use strict';

// Fetches every track and lesson through the same public URLs used by the
// browser. Run after publishing to catch missing/case-sensitive paths.
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!/^https?:\/\//.test(base)) {
  console.error('Usage: node scripts/smoke-deployed-content.js https://example.com/codeforge');
  process.exit(2);
}

const tracks = ['python-fundamentals', 'javascript-fundamentals', 'ansible-for-devops', 'ansible-guided'];

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  try { return await response.json(); }
  catch (_) { throw new Error(`Invalid JSON ${url}`); }
}

(async () => {
  let count = 0;
  for (const trackId of tracks) {
    const trackUrl = `${base}/content/${trackId}/track.json`;
    const track = await fetchJson(trackUrl);
    for (const chapter of track.chapters || []) {
      for (const lesson of chapter.lessons || []) {
        const url = new URL(lesson.path, trackUrl).href;
        const body = await fetchJson(url);
        if (body.id !== lesson.id || !body.explanation?.paragraphs?.length || !body.assignment) {
          throw new Error(`Incomplete lesson ${lesson.id} at ${url}`);
        }
        count += 1;
      }
    }
  }
  console.log(`Deployment smoke test passed: ${count} lesson routes returned complete JSON.`);
})().catch((error) => {
  console.error(`Deployment smoke test failed: ${error.message}`);
  process.exit(1);
});
