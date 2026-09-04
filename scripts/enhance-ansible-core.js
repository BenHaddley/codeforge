'use strict';

// Adds executable lab missions and diagnostic questions to the first practical
// video sequence. Keeping this transformation scripted means curriculum
// regeneration remains deterministic.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COURSE = path.join(ROOT, 'content/ansible-for-devops');
const track = JSON.parse(fs.readFileSync(path.join(COURSE, 'track.json'), 'utf8'));
const refs = new Map(track.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => [lesson.id, lesson.path])));

function update(id, mutate) {
  const file = path.join(COURSE, refs.get(id));
  const lesson = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(lesson);
  fs.writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`);
}

update('ans-ch03-ad-hoc', (lesson) => {
  lesson.lab = {
    checkId: 'inventory-connectivity',
    title: 'Mission: inspect the disposable fleet',
    setup: 'Start the lab with npm run lab:up, open the Terminal tab, and work from /workspace.',
    steps: [
      'Run ansible all -m ansible.builtin.ping and predict how many hosts should return pong.',
      'Run ansible webservers -m ansible.builtin.setup -a "filter=ansible_distribution*".',
      'Repeat with --limit web01 and explain why only one host appears.',
    ],
    verify: 'ansible all --list-hosts && ansible webservers -m ansible.builtin.ping',
    success: 'The inventory lists web01, web02, and db01; both webservers return SUCCESS.',
  };
  lesson.checks.push({
    id: 'ping-is-not-icmp',
    question: 'The ansible.builtin.ping module reports UNREACHABLE for web01. What should you investigate first?',
    options: ['SSH connectivity and inventory connection variables', 'The remote ICMP firewall rule only', 'Whether nginx is installed', 'YAML handlers'],
    correctIndex: 0,
    feedback: {
      correct: 'Correct—the module logs in over Ansible’s connection transport and executes Python; it is not an ICMP echo.',
      incorrect: 'Ansible ping is a connection-and-module test. Check inventory, credentials, SSH, and remote Python.',
    },
  });
});

update('ans-ch03-modules-async', (lesson) => {
  lesson.assignment.fileName = 'package-operation.yml';
  lesson.lab = {
    checkId: 'package-idempotence',
    title: 'Mission: prove privilege escalation and idempotence',
    setup: 'Use the Terminal tab after the fleet inspection mission succeeds.',
    steps: [
      'Predict the result, then try installing curl on webservers without --become.',
      'Repeat with --become and confirm the package task succeeds.',
      'Run the identical command again and inspect the changed field.',
    ],
    verify: 'ansible webservers -b -m ansible.builtin.package -a "name=curl state=present"',
    success: 'The second successful run reports changed=false for both webservers.',
  };
  lesson.checks.push({
    id: 'idempotent-second-run',
    question: 'A package is already present and the same state-aware task runs again. What is the healthy result?',
    options: ['ok with changed=false', 'failed=true', 'changed=true every time', 'unreachable=true'],
    correctIndex: 0,
    feedback: {
      correct: 'Correct—the desired state is already satisfied, so no change is required.',
      incorrect: 'A state-aware module should report success without changing an already-correct host.',
    },
  });
});

update('ans-ch04-playbooks', (lesson) => {
  lesson.assignment.fileName = 'webservers.yml';
  lesson.assignment.requirements.push('The play must use become: true for package and service changes.');
  if (!lesson.assignment.requirementChecks.some((item) => item.id === 'become')) {
    lesson.assignment.requirementChecks.push({ id: 'become', label: 'Enables privilege escalation', pattern: 'become\\s*:\\s*true', mustMatch: true });
  }
  lesson.lab = {
    checkId: 'web-tier',
    title: 'Mission: converge a web tier',
    setup: 'Complete the playbook in the editor, copy it to /workspace/webservers.yml, then use the Terminal tab.',
    steps: [
      'Preview the play with ansible-playbook --check --diff webservers.yml.',
      'Run the play normally and verify nginx starts on both webservers.',
      'Run it again and require changed=0 in the play recap.',
      'Temporarily misspell the package name, read the failure, then restore it.',
    ],
    verify: 'ansible-playbook webservers.yml && ansible-playbook webservers.yml && ansible webservers -b -m ansible.builtin.service -a "name=nginx state=started"',
    success: 'The second playbook run reports changed=0 and nginx is started on web01 and web02.',
  };
  lesson.checks.push({
    id: 'undefined-package',
    question: 'A play fails with “No package matching ngnix is available.” What is the most direct fix?',
    options: ['Correct the package name to nginx and rerun', 'Add ignore_errors: true', 'Delete the inventory', 'Increase forks'],
    correctIndex: 0,
    feedback: {
      correct: 'Correct—fix the invalid desired state, then rerun the idempotent play.',
      incorrect: 'Do not hide the failure. Correct the misspelled package name and rerun.',
    },
  });
});

console.log('Enhanced the three core follow-along Ansible lessons.');
