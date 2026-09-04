'use strict';

// Align the Ansible curriculum with LearnLinuxTV's "Getting started with
// Ansible" playlist. Captions were used while authoring the lesson prose and
// deciding which episode belongs beside each exercise; only YouTube metadata
// and focused embed windows are stored in the repository.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COURSE = path.join(ROOT, 'content/ansible-for-devops');
const track = JSON.parse(fs.readFileSync(path.join(COURSE, 'track.json'), 'utf8'));
const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLT98CRl2KxKEUHie1m24-wkyHpEsa4Y70';

// [lesson id, video id, title, start, end]. Start/end trim channel intros and
// outros while preserving the complete hands-on demonstration.
const alignments = [
  ['ans-ch01-control-node', '3RiVKs8GHYQ', 'Getting started with Ansible 01 - Introduction', 45, 435],
  ['ans-ch11-access-least-privilege', '-Q4T9wLsvOQ', 'Getting started with Ansible 02 - SSH Overview & Setup', 48, 1705],
  ['ans-ch12-ci-pipeline', 'FFaMqxpphjo', 'Getting started with Ansible 03 - Setting up the Git Repository', 45, 925],
  ['ans-ch03-ad-hoc', '4REljLsOnXk', 'Getting started with Ansible 04 - Running ad-hoc Commands', 45, 1085],
  ['ans-ch03-modules-async', 'FPU9_KDTa8A', 'Getting started with Ansible 05 - Running elevated ad-hoc Commands', 45, 1015],
  ['ans-ch04-playbooks', 'VANub3AhZpI', 'Getting started with Ansible 06 - Writing our first Playbook', 45, 1225],
  ['ans-ch05-conditions-blocks', 'BF7vIk9no14', "Getting started with Ansible 07 - The 'when' Conditional", 45, 1225],
  ['ans-ch04-play-anatomy', 'JJ-aoyydfVU', 'Getting Started with Ansible 08 - Improving your Playbook', 45, 770],
  ['ans-ch03-facts-patterns', 'EraC1AuWEF8', 'Getting started with Ansible 09 - Targeting Specific Nodes', 45, 1280],
  ['ans-ch05-advanced', 'gH_A-0zYLyw', 'Getting started with Ansible 10 - Tags', 45, 560],
  ['ans-ch04-application-stacks', 'teEhLgHpGgo', 'Getting started with Ansible 11 - Managing Files', 45, 1220],
  ['ans-ch10-deployments', 'soeBHGAMkoQ', 'Getting started with Ansible 12 - Managing Services', 45, 1245],
  ['ans-ch11-security', 'P5iKWANifrU', 'Getting started with Ansible 13 - Adding Users & Bootstrapping', 45, 1445],
  ['ans-ch06-roles', 'tq9sCeQNVYc', 'Getting started with Ansible 14 - Roles', 45, 1145],
  ['ans-ch05-variables-facts-vault', 'shBlQQZLU9M', 'Getting started with Ansible 15 - Host Variables and Handlers', 45, 995],
  ['ans-ch06-role-anatomy-galaxy', 's8F_YWGHeDM', 'Getting started with Ansible 16 (Series Finale) - Templates', 45, 850],
  ['ans-ch12-controller', 'CltoVfeRdoM', 'Complete Ansible Semaphore Tutorial: From Installation to Automation', 55, 2850],
  ['ans-ch12-awx-governance', 'NuuZ4CmiFQQ', 'An Inside Look at my Powerful Ansible Automation Solution', 55, 2530],
];

// Caption-derived jump points for the three lessons where a learner first
// moves from setup into real Ansible work. Times are absolute positions in
// the source video, matching the YouTube IFrame API.
const checkpointMap = {
  '4REljLsOnXk': [
    { id: 'install', title: 'Install Ansible', seconds: 80 },
    { id: 'inventory', title: 'Create the inventory', seconds: 128 },
    { id: 'ping', title: 'Run the ping module', seconds: 350 },
    { id: 'config', title: 'Simplify with ansible.cfg', seconds: 664 },
    { id: 'facts', title: 'Gather host facts', seconds: 820 },
  ],
  'FPU9_KDTa8A': [
    { id: 'permission-failure', title: 'Observe the permission failure', seconds: 87 },
    { id: 'become', title: 'Add privilege escalation', seconds: 200 },
    { id: 'package', title: 'Install a package', seconds: 460 },
    { id: 'idempotence', title: 'Read changed: false', seconds: 610 },
    { id: 'latest', title: 'Manage package state', seconds: 780 },
  ],
  'VANub3AhZpI': [
    { id: 'create-file', title: 'Create the playbook file', seconds: 101 },
    { id: 'play-anatomy', title: 'Write hosts, become, and tasks', seconds: 150 },
    { id: 'run-playbook', title: 'Run ansible-playbook', seconds: 365 },
    { id: 'recap', title: 'Read the play recap', seconds: 430 },
    { id: 'idempotence', title: 'Run it a second time', seconds: 600 },
    { id: 'failure', title: 'Diagnose a missing package', seconds: 680 },
  ],
};

const references = new Map(track.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => [lesson.id, lesson.path])));
for (const [lessonId, videoId, title, startSeconds, endSeconds] of alignments) {
  const relativePath = references.get(lessonId);
  if (!relativePath) throw new Error(`Unknown lesson id: ${lessonId}`);
  const lessonPath = path.join(COURSE, relativePath);
  const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
  lesson.videoAlignment = {
    playlist: 'Getting started with Ansible',
    playlistUrl: PLAYLIST_URL,
    basis: 'English captions reviewed for topic and demonstration alignment.',
  };
  lesson.videos = [{
    provider: 'youtube',
    videoId,
    creator: 'LearnLinuxTV',
    title,
    startSeconds,
    endSeconds,
    required: false,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?start=${startSeconds}&end=${endSeconds}&rel=0`,
    checkpoints: checkpointMap[videoId] || [
      { id: 'follow-along', title: 'Start the hands-on walkthrough', seconds: startSeconds },
    ],
  }];
  fs.writeFileSync(lessonPath, `${JSON.stringify(lesson, null, 2)}\n`);
}

// A second, playlist-ordered route through the same lesson files. Progress is
// intentionally shared because both paths teach and assess the same skills.
const guidedDir = path.join(ROOT, 'content/ansible-guided');
fs.mkdirSync(guidedDir, { recursive: true });
const guidedLessonsDir = path.join(guidedDir, 'lessons');
fs.mkdirSync(guidedLessonsDir, { recursive: true });
const guidedLessons = alignments.map(([lessonId, videoId, videoTitle], index) => {
  const sourcePath = references.get(lessonId);
  const sourceLesson = JSON.parse(fs.readFileSync(path.join(COURSE, sourcePath), 'utf8'));
  const guidedPath = `lessons/${String(index + 1).padStart(2, '0')}-${lessonId}.lesson.json`;
  sourceLesson.trackId = 'ansible-guided';
  sourceLesson.chapterId = 'guided-series';
  sourceLesson.number = String(index + 1);
  sourceLesson.nextLessonId = alignments[index + 1]?.[0] || null;
  fs.writeFileSync(path.join(guidedDir, guidedPath), `${JSON.stringify(sourceLesson, null, 2)}\n`);
  return {
    id: lessonId,
    number: String(index + 1),
    title: sourceLesson.title,
    videoTitle,
    path: guidedPath,
  };
});
const guidedTrack = {
  id: 'ansible-guided',
  title: 'Ansible Guided Video Path',
  language: 'ansible',
  version: 1,
  description: 'Follow LearnLinuxTV’s Ansible playlist in order, pausing for original explanations, predictions, and Code Forge lab work.',
  sourcePlaylist: PLAYLIST_URL,
  chapters: [{ id: 'guided-series', number: 1, title: 'Getting Started with Ansible — Guided Series', lessons: guidedLessons }],
};
fs.writeFileSync(path.join(guidedDir, 'track.json'), `${JSON.stringify(guidedTrack, null, 2)}\n`);

console.log(`Aligned ${alignments.length} Ansible lessons and built the playlist-ordered guided path.`);
