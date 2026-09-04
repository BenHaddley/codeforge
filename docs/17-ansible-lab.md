# 17 — Ansible Lab and Terminal

## Purpose

The YAML editor remains the fast lesson/Submit surface. The Terminal tab adds
the missing operational loop: learners run real Ansible from a controller
against three disposable managed nodes and see genuine module output.

## Topology

```text
browser/xterm.js
      │ WebSocket /api/lab/terminal (localhost only)
      ▼
Code Forge server
      │ fixed docker exec target
      ▼
controller ───── internal Docker network
   ├── web01
   ├── web02
   └── db01
```

The browser cannot provide a container name or server command. The bridge always
opens an interactive Bash process in `codeforge-ansible-controller`, with
`/workspace` as its working directory. Target containers publish no host ports.

## Lifecycle

- `npm run lab:up` builds each reusable image once and starts the topology.
- `npm run lab:down` removes the containers and network.
- `npm run lab:reset` removes disposable container state and starts clean.
- `labs/ansible/workspace/` is bind-mounted, so learner files persist.

## Reference boundaries

- [AnsibleLabs](https://github.com/nirgeier/AnsibleLabs) informed the
  controller-plus-multiple-target topology.
- [Ansible Workshops](https://github.com/ansible/workshops) informs progressive
  exercise design; Code Forge retains its own lesson schema and prose.
- [Killercoda scenario examples](https://github.com/killercoda/scenario-examples)
  informs hidden verification and hint sequencing.
- [xterm.js](https://github.com/xtermjs/xterm.js) supplies terminal rendering.

No lesson text or lab implementation is copied from those repositories.

## Lab verification

`POST /api/lab/verify` accepts only a named, whitelisted check. The current
checks verify inventory connectivity, package idempotence, or the converged
nginx web tier. The browser cannot provide commands, arguments, hosts, or a
container name. Core lesson completion requires the matching server-side check
to pass in addition to the source and YAML checks.

Later chapters can extend the fixed check registry with `ansible-lint` and
Molecule scenarios. Never send hidden verifier source to the browser or allow a
lesson document to select arbitrary host commands.
