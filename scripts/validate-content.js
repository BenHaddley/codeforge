'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const errors = [];
const warnings = [];
const LAB_CHECKS = new Set(['inventory-connectivity', 'package-idempotence', 'web-tier']);
let lessonCount = 0;
let videoCount = 0;

function problem(list, file, message) {
  list.push(`${path.relative(ROOT, file)}: ${message}`);
}

for (const entry of fs.readdirSync(CONTENT, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const trackFile = path.join(CONTENT, entry.name, 'track.json');
  if (!fs.existsSync(trackFile)) continue;
  let track;
  try { track = JSON.parse(fs.readFileSync(trackFile, 'utf8')); }
  catch (error) { problem(errors, trackFile, `invalid JSON (${error.message})`); continue; }

  const ids = new Set();
  for (const chapter of track.chapters || []) {
    for (const ref of chapter.lessons || []) {
      lessonCount += 1;
      if (ids.has(ref.id)) problem(errors, trackFile, `duplicate lesson id ${ref.id}`);
      ids.add(ref.id);
      const lessonFile = path.resolve(path.dirname(trackFile), ref.path);
      if (!lessonFile.startsWith(CONTENT + path.sep) || !fs.existsSync(lessonFile)) {
        problem(errors, trackFile, `missing or unsafe lesson path ${ref.path}`);
        continue;
      }
      let lesson;
      try { lesson = JSON.parse(fs.readFileSync(lessonFile, 'utf8')); }
      catch (error) { problem(errors, lessonFile, `invalid JSON (${error.message})`); continue; }
      for (const key of ['id', 'title', 'objective', 'explanation', 'examples', 'checks', 'assignment', 'hints']) {
        if (!lesson[key] || (Array.isArray(lesson[key]) && !lesson[key].length)) problem(errors, lessonFile, `missing ${key}`);
      }
      if (lesson.id !== ref.id) problem(errors, lessonFile, `id does not match track reference ${ref.id}`);
      if ((lesson.explanation?.paragraphs || []).length < 2) problem(warnings, lessonFile, 'explanation has fewer than two paragraphs');
      for (const check of lesson.checks || []) {
        if (!Array.isArray(check.options) || check.options.length < 2) problem(errors, lessonFile, `check ${check.id} needs options`);
        if (!Number.isInteger(check.correctIndex) || check.correctIndex < 0 || check.correctIndex >= check.options.length) problem(errors, lessonFile, `check ${check.id} has invalid correctIndex`);
      }
      for (const requirement of lesson.assignment?.requirementChecks || []) {
        try { new RegExp(requirement.pattern); }
        catch (error) { problem(errors, lessonFile, `invalid requirement regex ${requirement.id}`); }
      }
      for (const video of lesson.videos || []) {
        videoCount += 1;
        if (!video.videoId || !(video.endSeconds > video.startSeconds)) problem(errors, lessonFile, 'video has an invalid id or time window');
        if (!String(video.embedUrl || '').includes('youtube-nocookie.com')) problem(errors, lessonFile, 'video must use a privacy-enhanced embed URL');
        for (const checkpoint of video.checkpoints || []) {
          if (!checkpoint.id || !checkpoint.title || checkpoint.seconds < video.startSeconds || checkpoint.seconds > video.endSeconds) problem(errors, lessonFile, `invalid video checkpoint ${checkpoint.id || '(unnamed)'}`);
        }
      }
      if (lesson.lab?.checkId && !LAB_CHECKS.has(lesson.lab.checkId)) problem(errors, lessonFile, `unknown lab check ${lesson.lab.checkId}`);
    }
  }
}

warnings.forEach((message) => console.warn(`WARN ${message}`));
errors.forEach((message) => console.error(`FAIL ${message}`));
console.log(`Checked ${lessonCount} track lesson references and ${videoCount} video embeds.`);
if (errors.length) process.exitCode = 1;
else console.log('Content validation passed.');
