'use strict';

// Purpose-built companion course for LearnLinuxTV's 18-video Ansible
// playlist. Captions inform the topic boundaries and jump points, while all
// prose, checks, examples, and assignments below are original Code Forge work.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COURSE = path.join(ROOT, 'content/ansible-guided');
const LESSONS = path.join(COURSE, 'lessons');
const PLAYLIST = 'https://www.youtube.com/playlist?list=PLT98CRl2KxKEUHie1m24-wkyHpEsa4Y70';
fs.mkdirSync(LESSONS, { recursive: true });

const episodes = [
  {
    slug: 'introduction', videoId: '3RiVKs8GHYQ', videoTitle: 'Getting started with Ansible 01 - Introduction', end: 435,
    title: 'How Ansible Automation Works', objective: 'Explain the control-node, managed-node, inventory, module, and playbook model.',
    paragraphs: [
      'Ansible is an agentless automation system. You install Ansible on a control node, describe managed nodes in inventory, and connect to those nodes—normally over SSH—to inspect or converge their state.',
      'A module performs one focused operation, such as managing a package or file. A playbook records an ordered, repeatable set of module calls in YAML so the same intent can be reviewed, versioned, and rerun.',
      'Automation is valuable when it replaces inconsistent manual steps with declared outcomes. A good first question is not “what command do I want to run?” but “what state should every targeted system end in?”',
    ], rule: 'Keep automation on the control node; managed nodes do not need a permanent Ansible agent.',
    code: 'architecture:\n  control_node: controller\n  inventory: inventory.yml\n  managed_nodes:\n    - web01\n    - web02\n    - db01\n  transport: ssh',
    question: 'Which machine needs the Ansible package installed for this course?', options: ['The controller', 'Every managed node', 'Only web01', 'Only db01'], correct: 0,
    assignment: ['Model the Lab', 'Describe the Code Forge lab topology as YAML.', 'architecture:\n', 'architecture:\n  control_node: controller\n  inventory: inventory.yml\n  managed_nodes:\n    - web01\n    - web02\n    - db01\n  transport: ssh\n', [['controller','control_node\\s*:\\s*controller'],['inventory','inventory\\s*:\\s*inventory\\.yml'],['ssh','transport\\s*:\\s*ssh']]],
    checkpoints: [['Meet Ansible',45],['Understand agentless automation',140],['Control and managed nodes',245],['Why use playbooks',350]],
    lab: ['Inspect the prepared controller', ['Open the Terminal tab and run ansible --version.','Print /workspace/inventory.yml and identify the two inventory groups.','Run ansible all --list-hosts and predict the three host names.'], 'ansible --version && ansible all --list-hosts', 'Ansible reports its version and lists web01, web02, and db01.'],
  },
  {
    slug: 'ssh-setup', videoId: '-Q4T9wLsvOQ', videoTitle: 'Getting started with Ansible 02 - SSH Overview & Setup', end: 1705,
    title: 'SSH Trust and Connection Setup', objective: 'Prepare secure, repeatable SSH access from a control node to managed nodes.',
    paragraphs: [
      'Ansible usually transports module work over SSH, so connection reliability comes before playbooks. The controller must know the remote host, login user, authentication method, and host-key policy.',
      'A public key may be installed on each managed node while its private half remains protected on the controller. An SSH agent can hold an unlocked key temporarily, avoiding repeated passphrase prompts without removing key protection.',
      'Troubleshoot SSH directly before blaming Ansible. Confirm addressing, username, key permissions, host-key verification, and a successful interactive login, then test the same details through inventory.',
    ], rule: 'If plain SSH cannot connect reliably, Ansible will not connect reliably either.',
    code: 'ssh_access:\n  user: ansible\n  authentication: public_key\n  private_key_mode: "0600"\n  password_login: disabled\n  root_login: disabled',
    question: 'Where should the private SSH key remain?', options: ['Protected on the controller', 'Copied to every managed node', 'Committed to Git', 'Embedded in inventory'], correct: 0,
    assignment: ['Define an SSH Policy', 'Record a least-privilege SSH access policy.', 'ssh_access:\n', 'ssh_access:\n  user: ansible\n  authentication: public_key\n  private_key_mode: "0600"\n  password_login: disabled\n  root_login: disabled\n', [['key-auth','authentication\\s*:\\s*public_key'],['mode','private_key_mode\\s*:\\s*["\\\']?0600'],['root','root_login\\s*:\\s*disabled']]],
    checkpoints: [['OpenSSH components',58],['Create an SSH key pair',640],['Install the public key',1200],['Test key-based login',1380],['Use an SSH agent',1500]],
    lab: ['Trace the lab connection', ['Run ssh -o BatchMode=yes ansible@web01 hostname.','Inspect the inventory variables used for the training connection.','Run ansible webservers -m ansible.builtin.ping.'], 'ssh -o BatchMode=yes ansible@web01 hostname; ansible webservers -m ansible.builtin.ping', 'Direct SSH reaches web01 and Ansible returns pong from both webservers.'],
  },
  {
    slug: 'git-repository', videoId: 'FFaMqxpphjo', videoTitle: 'Getting started with Ansible 03 - Setting up the Git Repository', end: 925,
    title: 'Version-Control Your Automation', objective: 'Use a safe Git workflow to preserve and review infrastructure changes.',
    paragraphs: [
      'Infrastructure code needs the same history and review discipline as application code. A repository records inventories, playbooks, roles, documentation, and dependency declarations as a sequence of explainable changes.',
      'The basic loop is clone, edit, inspect the diff, stage intentional files, commit with a useful message, and push when an external remote is appropriate. Never stage secret keys, plaintext vault passwords, or generated credentials.',
      'Small commits make troubleshooting easier because each change has one purpose. Before every commit, use git status and git diff --staged to verify exactly what the repository will preserve.',
    ], rule: 'Commit reviewed automation and documentation; keep credentials and generated secrets out of Git.',
    code: 'git_workflow:\n  - clone\n  - edit\n  - review_diff\n  - stage\n  - commit\n  - push\nsecret_policy: never_commit',
    question: 'What should happen immediately before a commit?', options: ['Review the staged diff', 'Delete the inventory', 'Run every task as root', 'Store the private key'], correct: 0,
    assignment: ['Write a Repository Policy', 'Define a reviewable Git workflow for infrastructure code.', 'git_workflow:\n', 'git_workflow:\n  - edit\n  - test\n  - review_diff\n  - stage\n  - commit\nsecret_policy: never_commit\n', [['review','-\\s+review_diff'],['commit','-\\s+commit'],['secret','secret_policy\\s*:\\s*never_commit']]],
    checkpoints: [['Create the repository',170],['Clone it locally',384],['Stage and commit changes',600],['Push the reviewed commit',698]],
    lab: ['Practice locally without pushing', ['Run git status inside /workspace.','Create or edit a harmless README note.','Use git diff, but do not add credentials or push from the lab.'], 'git status && git diff -- README.md', 'Git shows only the intentional documentation change.'],
  },
  {
    slug: 'ad-hoc-commands', videoId: '4REljLsOnXk', videoTitle: 'Getting started with Ansible 04 - Running ad-hoc Commands', end: 1085,
    title: 'Inventory and Ad-Hoc Commands', objective: 'Build inventory and safely run focused modules against explicit host patterns.',
    paragraphs: [
      'Inventory gives Ansible a named model of the fleet. Host patterns such as all, webservers, or web01 select which inventory members receive a module call.',
      'An ad-hoc command is ideal for a quick inspection or one-time action. The ping module is not ICMP: it connects using Ansible’s transport and verifies that a small module can execute remotely.',
      'Keep commands readable by placing stable defaults such as inventory location in ansible.cfg. Before a change, use --list-hosts or a narrow --limit so the target set is never a surprise.',
    ], rule: 'Confirm the target pattern before running any fleet-wide change.',
    code: 'all:\n  children:\n    webservers:\n      hosts:\n        web01:\n        web02:\n    databases:\n      hosts:\n        db01:',
    question: 'What does ansible all -m ansible.builtin.ping primarily test?', options: ['Ansible transport and remote module execution', 'Only ICMP reachability', 'Whether nginx is running', 'GitHub access'], correct: 0,
    assignment: ['Create the Lab Inventory', 'Define webservers and databases groups with all three lab hosts.', 'all:\n  children:\n', 'all:\n  children:\n    webservers:\n      hosts:\n        web01:\n        web02:\n    databases:\n      hosts:\n        db01:\n', [['web01','web01\\s*:'],['web02','web02\\s*:'],['db01','db01\\s*:']]],
    checkpoints: [['Install Ansible',80],['Create inventory',128],['Run the ping module',350],['Configure defaults',664],['Gather host facts',820]],
    lab: ['Inspect the disposable fleet', ['Run ansible all --list-hosts and predict the count.','Run ansible all -m ansible.builtin.ping.','Gather only distribution facts from webservers.'], 'ansible all --list-hosts && ansible all -m ansible.builtin.ping', 'All three hosts appear and return SUCCESS.'], labCheck: 'inventory-connectivity',
  },
  {
    slug: 'privilege-escalation', videoId: 'FPU9_KDTa8A', videoTitle: 'Getting started with Ansible 05 - Running elevated ad-hoc Commands', end: 1015,
    title: 'Privilege Escalation and Package State', objective: 'Use become with state-aware modules and recognize idempotent results.',
    paragraphs: [
      'Package changes normally require elevated privileges. Ansible’s become system requests that elevation explicitly rather than assuming every task should run as root.',
      'State-aware package modules compare the requested state with the host. A first run may report changed=true; the same present-state request should report changed=false once the requirement is satisfied.',
      'Read failures before adding flags. A permission error suggests missing escalation, while an unavailable-package error points to the package name or repository metadata—not to SSH.',
    ], rule: 'Escalate only the work that needs it, and rerun state-aware work to prove idempotence.',
    code: 'package_operation:\n  target: webservers\n  module: ansible.builtin.package\n  name: curl\n  state: present\n  become: true',
    question: 'What result should the second identical package-present operation report?', options: ['changed=false', 'failed=true', 'unreachable=true', 'changed=true forever'], correct: 0,
    assignment: ['Plan an Elevated Package Operation', 'Describe an idempotent curl installation.', 'package_operation:\n', 'package_operation:\n  target: webservers\n  module: ansible.builtin.package\n  name: curl\n  state: present\n  become: true\n', [['module','module\\s*:\\s*ansible\\.builtin\\.package'],['present','state\\s*:\\s*present'],['become','become\\s*:\\s*true']]],
    checkpoints: [['Observe permission failure',87],['Add become',200],['Install a package',460],['Read changed=false',610],['Manage package state',780]],
    lab: ['Prove package idempotence', ['Try the curl package operation without -b and read the failure.','Repeat with -b so it succeeds.','Run the elevated command again and inspect changed.'], 'ansible webservers -b -m ansible.builtin.package -a "name=curl state=present"', 'The second elevated run reports changed=false on both webservers.'], labCheck: 'package-idempotence',
  },
  {
    slug: 'first-playbook', videoId: 'VANub3AhZpI', videoTitle: 'Getting started with Ansible 06 - Writing our first Playbook', end: 1225,
    title: 'Write and Run Your First Playbook', objective: 'Translate an ad-hoc package operation into a named, repeatable YAML play.',
    paragraphs: [
      'A playbook binds a host pattern to ordered tasks. Each task has a descriptive name and invokes a module that declares the required state.',
      'YAML indentation expresses structure, so align play-level keys and nest module arguments consistently. Use fully qualified module names even when short names work; they make intent unambiguous.',
      'The play recap separates ok, changed, unreachable, failed, rescued, ignored, and skipped outcomes. Run the play twice: the second recap is the simplest first check that your automation converges cleanly.',
    ], rule: 'A healthy state-setting playbook succeeds twice and reports changed=0 on the second run.',
    code: '- name: Configure web servers\n  hosts: webservers\n  become: true\n  tasks:\n    - name: Install nginx\n      ansible.builtin.package:\n        name: nginx\n        state: present',
    question: 'Why run a successful playbook a second time?', options: ['To verify idempotence', 'To duplicate every package', 'To bypass inventory', 'To remove task names'], correct: 0,
    assignment: ['Build the Web Playbook', 'Install nginx on webservers with an elevated, named task.', '- name: Configure web servers\n  hosts: webservers\n', '- name: Configure web servers\n  hosts: webservers\n  become: true\n  tasks:\n    - name: Install nginx\n      ansible.builtin.package:\n        name: nginx\n        state: present\n    - name: Start nginx\n      ansible.builtin.service:\n        name: nginx\n        state: started\n', [['hosts','hosts\\s*:\\s*webservers'],['package','ansible\\.builtin\\.package'],['become','become\\s*:\\s*true']]],
    checkpoints: [['Create the playbook file',101],['Write the play anatomy',150],['Run ansible-playbook',365],['Read the recap',430],['Prove idempotence',600],['Diagnose a bad package',680]],
    lab: ['Converge the web tier', ['Save the editor solution as /workspace/webservers.yml.','Preview it with --check --diff.','Run it twice and compare the recaps.'], 'ansible-playbook webservers.yml && ansible-playbook webservers.yml', 'The second run succeeds with changed=0.'], labCheck: 'web-tier', fileName: 'webservers.yml',
  },
  {
    slug: 'when-conditionals', videoId: 'BF7vIk9no14', videoTitle: "Getting started with Ansible 07 - The 'when' Conditional", end: 1225,
    title: 'Choose Tasks with when Conditions', objective: 'Use gathered facts to select distribution-appropriate tasks without hiding failures.',
    paragraphs: ['A when expression decides whether a task applies to the current host. Common gates compare gathered facts such as ansible_distribution or inspect a previously registered result.','A skipped task is not a failure; it means its condition evaluated false. This allows one play to express alternatives for different operating-system families while keeping each module call explicit.','Quote values, not the entire Jinja expression. Prefer a small number of readable conditions over a dense expression that obscures why a host receives a task.'],
    rule: 'Use facts to select valid desired state; do not use conditions merely to silence errors.',
    code: '- name: Install a web server on Debian-family hosts\n  ansible.builtin.apt:\n    name: nginx\n    state: present\n  when: ansible_os_family == "Debian"',
    question: 'What does skipped mean in a task result?', options: ['The when condition was false', 'SSH always failed', 'The YAML was deleted', 'The task changed the host'], correct: 0,
    assignment: ['Gate a Debian Task', 'Write a package task that runs only for the Debian OS family.', '- name: Install a Debian package\n', '- name: Install a Debian package\n  ansible.builtin.apt:\n    name: nginx\n    state: present\n  when: ansible_os_family == "Debian"\n', [['apt','ansible\\.builtin\\.apt'],['when','when\\s*:\\s*ansible_os_family'],['debian','Debian']]],
    checkpoints: [['Why conditional tasks matter',75],['Inspect distribution facts',210],['Write a when expression',360],['Observe skipped hosts',720],['Apply a platform-specific task',1000]],
    lab: ['Run a fact-driven play', ['Save the conditional task inside a webservers play.','Run ansible-playbook --check and note which hosts match.','Change Debian to RedHat and observe skipped results without applying changes.'], 'ansible webservers -m ansible.builtin.setup -a "filter=ansible_os_family"', 'Facts report Debian and explain which form of the conditional runs.'],
  },
  {
    slug: 'improve-playbook', videoId: 'JJ-aoyydfVU', videoTitle: 'Getting Started with Ansible 08 - Improving your Playbook', end: 770,
    title: 'Remove Duplication from Playbooks', objective: 'Replace distribution-specific duplication with portable modules, variables, and lists.',
    paragraphs: ['A working playbook can still be expensive to maintain. Repeated tasks drift apart when a package name, state, or option changes in only one copy.','The generic package module selects the host’s package backend, and variables isolate values that truly differ. A list or loop expresses repeated resources without repeating the surrounding task structure.','Refactoring should preserve outcomes. Preview the revised play, run it, and compare the final state before deleting the original implementation.'],
    rule: 'Abstract repeated mechanics, but keep meaningful platform differences visible.',
    code: '- name: Install baseline tools\n  ansible.builtin.package:\n    name:\n      - curl\n      - git\n    state: present',
    question: 'Why prefer ansible.builtin.package when the operation is portable?', options: ['It selects the platform package backend', 'It disables idempotence', 'It stores passwords', 'It ignores inventory'], correct: 0,
    assignment: ['Consolidate Package Tasks', 'Install curl and git with one portable task.', '- name: Install baseline tools\n', '- name: Install baseline tools\n  ansible.builtin.package:\n    name:\n      - curl\n      - git\n    state: present\n', [['package','ansible\\.builtin\\.package'],['curl','-\\s+curl'],['git','-\\s+git']]],
    checkpoints: [['Find repeated package tasks',60],['Compare distribution branches',180],['Use module parameters',280],['Introduce variables',430],['Adopt the generic package module',620]],
    lab: ['Refactor safely', ['Run the original package tasks in check mode.','Replace them with the portable list-based task.','Run twice and require changed=0 on the second execution.'], 'ansible webservers -b -m ansible.builtin.package -a "name=curl,git state=present"', 'Both tools are present and the repeated run is unchanged.'],
  },
  {
    slug: 'target-specific-nodes', videoId: 'EraC1AuWEF8', videoTitle: 'Getting started with Ansible 09 - Targeting Specific Nodes', end: 1280,
    title: 'Target Groups and Individual Nodes', objective: 'Design inventory groups and host patterns that make deployment scope obvious.',
    paragraphs: ['Inventory groups turn changing host addresses into stable operational roles such as webservers and databases. Plays should target those roles instead of a broad all pattern when only one tier needs a change.','Patterns can select a group, one host, an intersection, or an exclusion. The --limit option further narrows a playbook run without rewriting its hosts declaration.','Host variables describe real per-host differences. If the same value appears on many hosts, move it to group_vars rather than duplicating exceptions.'],
    rule: 'Make the smallest correct target set visible before executing a change.',
    code: '- name: Configure only the web tier\n  hosts: webservers\n  become: true\n  tasks:\n    - name: Show the selected host\n      ansible.builtin.debug:\n        var: inventory_hostname',
    question: 'What is the safest way to test a web-tier play on one node?', options: ['Use --limit web01', 'Change hosts to all', 'Delete web02', 'Disable inventory'], correct: 0,
    assignment: ['Target the Web Tier', 'Write a play that reports each selected webserver hostname.', '- name: Inspect the web tier\n', '- name: Inspect the web tier\n  hosts: webservers\n  tasks:\n    - name: Show selected host\n      ansible.builtin.debug:\n        var: inventory_hostname\n', [['hosts','hosts\\s*:\\s*webservers'],['debug','ansible\\.builtin\\.debug'],['hostname','inventory_hostname']]],
    checkpoints: [['Create inventory groups',130],['Add host variables',180],['Target a group in a play',300],['Narrow the run',540],['Verify the selected nodes',900]],
    lab: ['Prove targeting before changes', ['Run ansible webservers --list-hosts.','Run the lesson play with --limit web01.','Run it again without the limit and compare host counts.'], 'ansible webservers --list-hosts && ansible webservers --limit web01 --list-hosts', 'The group selects two hosts and the limit selects only web01.'],
  },
  {
    slug: 'tags', videoId: 'gH_A-0zYLyw', videoTitle: 'Getting started with Ansible 10 - Tags', end: 560,
    title: 'Select Work with Tags', objective: 'Apply tags so operators can run intentional subsets without duplicating playbooks.',
    paragraphs: ['Tags label related tasks so an operator can select or skip a subset at runtime. They are useful for maintenance workflows such as packages, configuration, or deployment.','The always tag marks setup or safety checks that should accompany tagged runs. Use it sparingly: unexpected work under always makes scoped execution harder to reason about.','Tags are an execution interface and should have stable names. List available tags before depending on them in automation or CI.'],
    rule: 'Tags narrow an existing playbook; they should not create a second hidden workflow.',
    code: '- name: Update package metadata\n  ansible.builtin.apt:\n    update_cache: true\n  tags:\n    - packages\n    - maintenance',
    question: 'Which command previews the tags exposed by a playbook?', options: ['ansible-playbook site.yml --list-tags', 'ansible all --delete-tags', 'git tag site.yml', 'ssh --tags'], correct: 0,
    assignment: ['Tag Maintenance Work', 'Add packages and maintenance tags to an update task.', '- name: Update package metadata\n', '- name: Update package metadata\n  ansible.builtin.apt:\n    update_cache: true\n  tags:\n    - packages\n    - maintenance\n', [['apt','ansible\\.builtin\\.apt'],['packages','-\\s+packages'],['maintenance','-\\s+maintenance']]],
    checkpoints: [['Introduce tags',34],['Use the always tag',95],['Tag related tasks',250],['Run one tagged subset',340]],
    lab: ['Compare tagged execution', ['Add tags to two harmless debug tasks.','Run ansible-playbook --list-tags.','Run only one tag and observe which task is skipped.'], 'ansible-playbook site.yml --list-tags', 'The requested tag runs without executing the unrelated tagged task.'],
  },
  {
    slug: 'managing-files', videoId: 'teEhLgHpGgo', videoTitle: 'Getting started with Ansible 11 - Managing Files', end: 1220,
    title: 'Manage Files and Downloads', objective: 'Choose copy, file, get_url, and related modules while setting ownership and permissions explicitly.',
    paragraphs: ['The copy module transfers controlled content from the project or writes inline content. The file module manages paths, directories, links, ownership, modes, and absence without relying on shell commands.','Downloads and archives deserve purpose-built modules such as get_url and unarchive. Checksums make external artifacts verifiable instead of trusting a filename or transport alone.','File permissions are part of desired state. Quote modes such as "0644" so YAML does not reinterpret them, and grant only the access the service or user requires.'],
    rule: 'Manage a file’s content, owner, group, and mode as one reviewed contract.',
    code: '- name: Install the managed banner\n  ansible.builtin.copy:\n    content: "Managed by Code Forge\\n"\n    dest: /etc/motd\n    owner: root\n    group: root\n    mode: "0644"',
    question: 'Why should a YAML file mode usually be quoted?', options: ['To preserve the intended mode value', 'To make it executable', 'To bypass become', 'To disable ownership'], correct: 0,
    assignment: ['Manage a Login Banner', 'Copy an explicit managed banner to /etc/motd with safe permissions.', '- name: Install the managed banner\n', '- name: Install the managed banner\n  ansible.builtin.copy:\n    content: "Managed by Code Forge\\n"\n    dest: /etc/motd\n    owner: root\n    group: root\n    mode: "0644"\n', [['copy','ansible\\.builtin\\.copy'],['dest','dest\\s*:\\s*/etc/motd'],['mode','mode\\s*:\\s*["\\\']0644']]],
    checkpoints: [['Create managed content',60],['Use copy',315],['Set destination and mode',300],['Download an artifact',840],['Verify the remote file',1000]],
    lab: ['Manage and inspect a file', ['Place the task in a webservers play with become.','Run the play twice.','Use stat to verify ownership and mode on web01.'], 'ansible web01 -b -m ansible.builtin.stat -a "path=/etc/motd"', 'The file exists with mode 0644 and the second play run is unchanged.'],
  },
  {
    slug: 'managing-services', videoId: 'soeBHGAMkoQ', videoTitle: 'Getting started with Ansible 12 - Managing Services', end: 1245,
    title: 'Manage Services and Configuration Changes', objective: 'Declare service state and connect configuration changes to safe restarts.',
    paragraphs: ['The service module declares whether a service should be started, stopped, restarted, and enabled. Starting an already-running service should not create a change.','Configuration edits should use a file-aware module such as template, copy, or lineinfile. Each edit must be narrow enough to rerun without appending duplicate lines.','A restart belongs in a handler when it is required only after configuration changes. Handlers coalesce repeated notifications and run after the play’s normal tasks.'],
    rule: 'Notify a restart from the configuration task; do not restart a healthy service on every run.',
    code: '- name: Ensure nginx is running\n  ansible.builtin.service:\n    name: nginx\n    state: started\n    enabled: true',
    question: 'When should a notified handler normally run?', options: ['After a notifying task reports changed', 'Before inventory loads', 'On every play regardless of change', 'Only after Git push'], correct: 0,
    assignment: ['Declare Service State', 'Ensure nginx is started and enabled.', '- name: Ensure nginx is running\n', '- name: Ensure nginx is running\n  ansible.builtin.service:\n    name: nginx\n    state: started\n    enabled: true\n', [['service','ansible\\.builtin\\.service'],['started','state\\s*:\\s*started'],['enabled','enabled\\s*:\\s*true']]],
    checkpoints: [['Declare service state',60],['Start and enable a service',180],['Use the service module',273],['Restart after a change',413],['Make idempotent file edits',600]],
    lab: ['Inspect service behavior', ['Install nginx with the package module.','Apply the started-state task twice.','Make a controlled configuration change and observe its handler.'], 'ansible webservers -b -m ansible.builtin.service -a "name=nginx state=started"', 'Nginx is started on both webservers and unchanged on the repeated run.'],
  },
  {
    slug: 'users-and-bootstrap', videoId: 'P5iKWANifrU', videoTitle: 'Getting started with Ansible 13 - Adding Users & Bootstrapping', end: 1445,
    title: 'Manage Users and Bootstrap Access', objective: 'Create repeatable user, group, sudo, and SSH-key bootstrap state.',
    paragraphs: ['The user module declares account properties such as name, groups, shell, and presence. Separate key installation and sudo policy into explicit tasks so access decisions remain reviewable.','Bootstrapping solves a transition problem: initial credentials establish the managed account, then automation configures stronger key-based access and removes dependence on the temporary path.','Never put plaintext login or become passwords in a committed inventory. Use Vault or an external credential store, and test the new access path before disabling the old one.'],
    rule: 'Create and verify the replacement access path before removing bootstrap credentials.',
    code: '- name: Create the deploy account\n  ansible.builtin.user:\n    name: deploy\n    groups: sudo\n    append: true\n    shell: /bin/bash\n    state: present',
    question: 'When should temporary bootstrap access be removed?', options: ['After the managed key-based path is verified', 'Before creating the new user', 'Never', 'Before inventory exists'], correct: 0,
    assignment: ['Declare a Deploy User', 'Create a present deploy account with an explicit shell and supplemental sudo group.', '- name: Create the deploy account\n', '- name: Create the deploy account\n  ansible.builtin.user:\n    name: deploy\n    groups: sudo\n    append: true\n    shell: /bin/bash\n    state: present\n', [['user','ansible\\.builtin\\.user'],['deploy','name\\s*:\\s*deploy'],['append','append\\s*:\\s*true']]],
    checkpoints: [['Define the user task',60],['Use the user module',128],['Add account properties',360],['Build a bootstrap play',920],['Remove password prompts safely',1140]],
    lab: ['Test account state safely', ['Run the user task in check mode first.','Apply it to web01 only.','Use getent to inspect the created account, then rerun the play.'], 'ansible web01 -b -m ansible.builtin.getent -a "database=passwd key=deploy"', 'The deploy account exists on web01 and its repeated creation is unchanged.'],
  },
  {
    slug: 'roles', videoId: 'tq9sCeQNVYc', videoTitle: 'Getting started with Ansible 14 - Roles', end: 1145,
    title: 'Organize Automation with Roles', objective: 'Extract coherent tasks, handlers, files, templates, and defaults into a reusable role.',
    paragraphs: ['A role packages one responsibility behind a conventional directory structure. Ansible discovers tasks/main.yml, handlers/main.yml, defaults/main.yml, files, templates, and metadata without custom loading code.','The calling play becomes a readable composition of roles. Public configuration belongs in defaults because callers can override it; hard-to-override internal constants belong in vars only when necessary.','Extract a role when a unit of configuration has a clear purpose and reuse boundary—not simply because a playbook has become long. Roles should remain testable and independently understandable.'],
    rule: 'One role should own one coherent system responsibility and expose intentional defaults.',
    code: 'roles:\n  webserver:\n    tasks: tasks/main.yml\n    handlers: handlers/main.yml\n    defaults: defaults/main.yml\n    templates: templates/',
    question: 'Where should user-overridable role settings normally live?', options: ['defaults/main.yml', 'vars/main.yml only', 'tasks/main.yml comments', 'The private SSH key'], correct: 0,
    assignment: ['Design a Role Layout', 'Record the conventional locations for tasks, handlers, defaults, and templates.', 'roles:\n  webserver:\n', 'roles:\n  webserver:\n    tasks: tasks/main.yml\n    handlers: handlers/main.yml\n    defaults: defaults/main.yml\n    templates: templates/\n', [['tasks','tasks\\s*:\\s*tasks/main\\.yml'],['handlers','handlers\\s*:\\s*handlers/main\\.yml'],['defaults','defaults\\s*:\\s*defaults/main\\.yml']]],
    checkpoints: [['Why roles help',60],['Create the role structure',180],['Inspect the roles directory',300],['Move tasks into the role',480],['Call the role from site.yml',780]],
    lab: ['Scaffold a webserver role', ['Run ansible-galaxy role init roles/webserver.','Move one package task into tasks/main.yml.','Create a small site.yml that applies the role to webservers.'], 'ansible-playbook --syntax-check site.yml', 'The site play parses and discovers the webserver role.'],
  },
  {
    slug: 'host-vars-and-handlers', videoId: 'shBlQQZLU9M', videoTitle: 'Getting started with Ansible 15 - Host Variables and Handlers', end: 995,
    title: 'Host Variables and Handlers', objective: 'Place host-specific values deliberately and restart services only after relevant changes.',
    paragraphs: ['host_vars stores genuine per-host differences using a file named for the inventory host. Shared values should move to group_vars so the inventory model does not become a collection of duplicated exceptions.','A task’s notify entry names a handler. The handler runs only when its notifying task reports a change, and repeated notifications are normally combined into one execution.','Handler names form an interface between configuration and service lifecycle. Keep them descriptive and ensure the notified spelling exactly matches the handler name.'],
    rule: 'Variables describe differences; handlers react to changes.',
    code: '- name: Install nginx configuration\n  ansible.builtin.template:\n    src: nginx.conf.j2\n    dest: /etc/nginx/nginx.conf\n  notify: Restart nginx\n\nhandlers:\n  - name: Restart nginx\n    ansible.builtin.service:\n      name: nginx\n      state: restarted',
    question: 'Why might a correctly declared handler not run?', options: ['Its notifying task reported no change', 'Inventory always disables handlers', 'Handlers require GitHub', 'The service is enabled'], correct: 0,
    assignment: ['Connect a Change to a Handler', 'Notify Restart nginx from a template task and define the matching handler.', '- name: Install nginx configuration\n', '- name: Install nginx configuration\n  ansible.builtin.template:\n    src: nginx.conf.j2\n    dest: /etc/nginx/nginx.conf\n  notify: Restart nginx\n\nhandlers:\n  - name: Restart nginx\n    ansible.builtin.service:\n      name: nginx\n      state: restarted\n', [['notify','notify\\s*:\\s*Restart nginx'],['handlers','handlers\\s*:'],['restart','state\\s*:\\s*restarted']]],
    checkpoints: [['Introduce host_vars',60],['Create per-host values',180],['Resolve host variables',300],['Notify a change',660],['Define the handler',707],['Observe handler execution',900]],
    lab: ['Prove handler behavior', ['Create a harmless managed file that notifies a debug handler.','Run the play and observe the handler.','Run it again without editing the file and confirm the handler is absent.'], 'ansible-playbook site.yml', 'The handler runs after the first change and not after an unchanged second run.'],
  },
  {
    slug: 'templates', videoId: 's8F_YWGHeDM', videoTitle: 'Getting started with Ansible 16 (Series Finale) - Templates', end: 850,
    title: 'Render Configuration with Templates', objective: 'Render host-aware configuration from Jinja templates and validate it before activation.',
    paragraphs: ['A template combines a version-controlled Jinja source file with variables and facts to produce host-specific configuration. The source remains readable while values vary by group, host, or environment.','The template module manages destination ownership and mode and reports a change only when rendered content differs. Notify a handler so a service reload follows a real configuration update.','Rendering valid text is not enough for critical services. Use the module’s validate option when supported, then add an external check after activation.'],
    rule: 'Render, validate, then notify—never activate an unchecked configuration change.',
    code: '- name: Render nginx site\n  ansible.builtin.template:\n    src: site.conf.j2\n    dest: /etc/nginx/conf.d/site.conf\n    mode: "0644"\n  notify: Reload nginx',
    question: 'What file belongs in the role templates directory?', options: ['The Jinja source such as site.conf.j2', 'A private SSH key', 'The rendered remote file only', 'The Docker socket'], correct: 0,
    assignment: ['Render a Managed Site', 'Use the template module to render a Jinja source with an explicit destination and mode.', '- name: Render nginx site\n', '- name: Render nginx site\n  ansible.builtin.template:\n    src: site.conf.j2\n    dest: /etc/nginx/conf.d/site.conf\n    mode: "0644"\n  notify: Reload nginx\n', [['template','ansible\\.builtin\\.template'],['source','src\\s*:\\s*site\\.conf\\.j2'],['mode','mode\\s*:\\s*["\\\']0644']]],
    checkpoints: [['Introduce templates',60],['Choose a configuration source',180],['Create a Jinja file',281],['Insert variables',420],['Render with template',550],['Deploy and inspect',720]],
    lab: ['Render a host-aware file', ['Create a template containing {{ inventory_hostname }}.','Render it to /tmp/codeforge-host on all nodes.','Fetch or inspect each file and compare the values.'], 'ansible all -m ansible.builtin.command -a "cat /tmp/codeforge-host"', 'Each managed node’s rendered file contains its own inventory hostname.'],
  },
  {
    slug: 'semaphore', videoId: 'CltoVfeRdoM', videoTitle: 'Complete Ansible Semaphore Tutorial: From Installation to Automation', end: 2850,
    title: 'Operate Ansible through Semaphore', objective: 'Connect repositories, inventories, credentials, environments, and task templates in a controlled automation service.',
    paragraphs: ['Semaphore provides a web interface and API around Ansible execution. Installation is only the first layer; useful automation requires a database, an application configuration, and a service process with protected access.','A project connects the execution ingredients: a version-controlled repository, inventory, key store, environment variables, and a task template that selects the playbook and launch options.','Central execution improves repeatability and visibility but also concentrates credentials and authority. Apply authentication, least privilege, TLS, backups, and audit-log retention before treating the service as production infrastructure.'],
    rule: 'A controller UI governs Ansible execution; it does not replace reviewed repositories or least privilege.',
    code: 'semaphore_project:\n  repository: git\n  inventory: managed\n  credentials: key_store\n  environment: protected\n  execution: task_template\n  audit_logs: retained',
    question: 'Which Semaphore object binds a playbook to launch settings?', options: ['A task template', 'A managed-node agent', 'A shell alias', 'A Git tag alone'], correct: 0,
    assignment: ['Model a Governed Project', 'Describe the required inputs and controls for a Semaphore project.', 'semaphore_project:\n', 'semaphore_project:\n  repository: git\n  inventory: managed\n  credentials: key_store\n  environment: protected\n  execution: task_template\n  audit_logs: retained\n', [['repository','repository\\s*:\\s*git'],['credentials','credentials\\s*:\\s*key_store'],['audit','audit_logs\\s*:\\s*retained']]],
    checkpoints: [['Plan the installation',60],['Create the service account and database',180],['Configure Semaphore',600],['Open the web interface',900],['Create a project',1500],['Add inventory and credentials',1720],['Create a task template',1920],['Run and inspect a job',2250],['Add safer web access',2700]],
    lab: ['Audit a controller design', ['List where repository, inventory, and credential data originate.','Identify which users may launch production templates.','Record backup and TLS requirements before installation.'], 'printf "Review the Semaphore design artifact in the editor.\\n"', 'The design separates source, targets, secrets, authorization, and audit history.'],
  },
  {
    slug: 'automation-solution', videoId: 'NuuZ4CmiFQQ', videoTitle: 'An Inside Look at my Powerful Ansible Automation Solution', end: 2530,
    title: 'Design a Complete Automation Solution', objective: 'Combine Git, inventory, roles, tags, Vault, scheduling, and recovery into a maintainable operating model.',
    paragraphs: ['A mature automation solution is more than one playbook. Version-controlled branches, inventories, role composition, variables, tags, and encrypted secrets define how different machines reach their intended state.','Scheduled or boot-triggered execution can keep systems converged, but unattended automation needs bounded scope, locking, logs, safe failure behavior, and a recovery path. Reset or bootstrap modes should be explicit rather than hidden in ordinary runs.','Generic host names and reusable roles reduce accidental coupling to one machine. Document the entry point, credential source, supported platforms, and verification commands so another operator can understand the system without reverse engineering it.'],
    rule: 'Design automation as an observable operating system for change, including failure and recovery—not merely a successful playbook run.',
    code: 'automation_solution:\n  source: git\n  entrypoint: provision.yml\n  inventory: explicit\n  roles: reusable\n  secrets: vault\n  scheduling: systemd_timer\n  locking: required\n  logs: retained\n  recovery: documented',
    question: 'What must accompany unattended scheduled automation?', options: ['Locking, logs, bounded scope, and recovery', 'Plaintext passwords', 'Unlimited root shell commands', 'An unversioned local copy'], correct: 0,
    assignment: ['Write the Operating Contract', 'Define a maintainable and observable automation solution.', 'automation_solution:\n', 'automation_solution:\n  source: git\n  entrypoint: provision.yml\n  inventory: explicit\n  roles: reusable\n  secrets: vault\n  scheduling: systemd_timer\n  locking: required\n  logs: retained\n  recovery: documented\n', [['vault','secrets\\s*:\\s*vault'],['locking','locking\\s*:\\s*required'],['recovery','recovery\\s*:\\s*documented']]],
    checkpoints: [['Tour the repository architecture',45],['Use branches and reset modes',180],['Control execution with tags',600],['Compose reusable roles',900],['Schedule convergence',1020],['Observe a full run',1320],['Protect secrets with Vault',1620],['Inspect workstation roles',1980],['Review inventory and portability',2280]],
    lab: ['Review the complete system', ['Map the current /workspace entry points and inventory.','Identify what would prevent overlapping scheduled runs.','Write recovery and verification steps before proposing automation on a real workstation.'], 'find . -maxdepth 3 -type f | sort', 'The operating contract documents source, secrets, execution, observation, and recovery.'],
  },
];

function slugify(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

const refs = [];
for (let index = 0; index < episodes.length; index += 1) {
  const e = episodes[index];
  const number = index + 1;
  const id = `ans-guide-${String(number).padStart(2, '0')}-${e.slug}`;
  const [assignmentTitle, brief, starterCode, solutionCode, patterns] = e.assignment;
  const videoStart = Math.min(45, ...e.checkpoints.map(([, seconds]) => seconds));
  const lesson = {
    id, trackId: 'ansible-guided', chapterId: 'guided-series', number: String(number), title: e.title, xp: number >= 17 ? 125 : 75, objective: e.objective,
    sourceAlignment: { type: 'video-companion', title: e.videoTitle, creator: 'LearnLinuxTV', videoId: e.videoId, url: `https://www.youtube.com/watch?v=${e.videoId}`, playlistUrl: PLAYLIST, note: 'English captions informed topic alignment and timestamps. Lesson prose and exercises are original Code Forge material.' },
    explanation: { tts: true, paragraphs: e.paragraphs, rule: e.rule },
    examples: [{ title: 'Working design or automation artifact', code: e.code, note: 'Read the structure, predict its effect, then adapt it in the assignment and terminal mission.' }],
    videos: [{ provider: 'youtube', videoId: e.videoId, creator: 'LearnLinuxTV', title: e.videoTitle, startSeconds: videoStart, endSeconds: e.end, required: false, embedUrl: `https://www.youtube-nocookie.com/embed/${e.videoId}?start=${videoStart}&end=${e.end}&rel=0`, checkpoints: e.checkpoints.map(([title, seconds]) => ({ id: slugify(title), title, seconds })).sort((a, b) => a.seconds - b.seconds) }],
    checks: [
      { id: `${e.slug}-concept`, question: e.question, options: e.options, correctIndex: e.correct, feedback: { correct: 'Correct—this matches the demonstrated workflow and keeps the automation explicit.', incorrect: `Review the rule of thumb and the relevant video checkpoint before continuing.` } },
      { id: `${e.slug}-practice`, question: `Which practice best supports this lesson’s objective: “${e.objective}”?`, options: ['Preview scope, use state-aware modules, and verify the observed result.', 'Hide failures and assume the target state was reached.', 'Store credentials beside the playbook in plaintext.', 'Replace every module with an unreviewed shell command.'], correctIndex: 0, feedback: { correct: 'Correct—safe automation combines explicit scope, desired state, and verification.', incorrect: 'The reliable workflow makes scope, state, and verification visible.' } },
    ],
    assignment: { title: assignmentTitle, brief, fileName: e.fileName || `${String(number).padStart(2, '0')}-${e.slug}.yml`, requirements: ['Use valid two-space YAML.', 'Express the requested state explicitly.', 'Include every named safety or behavior requirement.'], starterCode, solutionCode, timeoutMs: 1000, requirementChecks: patterns.map(([key, pattern]) => ({ id: key, label: `Includes ${key.replace(/-/g, ' ')}`, pattern, mustMatch: true })), testHarness: '\n# __CF_VALIDATE_YAML__', expectedOutput: 'valid', outputCheckLabel: 'Artifact uses valid course-style YAML structure' },
    lab: e.lab ? { checkId: e.labCheck, title: e.lab[0], setup: 'Start the disposable lab with npm run lab:up, then work from /workspace in the Terminal tab.', steps: e.lab[1], verify: e.lab[2], success: e.lab[3] } : undefined,
    hints: ['Start from the complete example and preserve its indentation.', 'Use the checkpoint list to jump back to the demonstrated operation.', 'Run the narrowest possible check before applying a change.'],
    nextLessonId: episodes[index + 1] ? `ans-guide-${String(number + 1).padStart(2, '0')}-${episodes[index + 1].slug}` : null,
  };
  if (!lesson.lab) delete lesson.lab;
  const fileName = `${String(number).padStart(2, '0')}-${e.slug}.lesson.json`;
  fs.writeFileSync(path.join(LESSONS, fileName), `${JSON.stringify(lesson, null, 2)}\n`);
  refs.push({ id, number: String(number), title: e.title, videoTitle: e.videoTitle, path: `lessons/${fileName}` });
}

const track = {
  id: 'ansible-guided', title: 'Ansible Guided Video Path', language: 'ansible', version: 2,
  description: 'Follow all 18 LearnLinuxTV videos with caption-aligned checkpoints, original explanations, predictions, assignments, troubleshooting, and hands-on lab missions.',
  sourcePlaylist: PLAYLIST,
  chapters: [{ id: 'guided-series', number: 1, title: 'Getting Started with Ansible — Complete Guided Series', lessons: refs }],
};
fs.writeFileSync(path.join(COURSE, 'track.json'), `${JSON.stringify(track, null, 2)}\n`);
console.log(`Built ${refs.length} purpose-built guided Ansible lessons.`);
