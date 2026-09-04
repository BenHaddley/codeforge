# Code Forge Ansible Lab

This directory is mounted at `/workspace` in the disposable controller.
The three target containers are reachable as `web01`, `web02`, and `db01`
only on the internal lab network.

Try:

```bash
ansible all -m ping
ansible-inventory --graph
```

The password is intentionally `ansible` inside this isolated local lab. Never
reuse this pattern for a real host or expose the target containers' SSH ports.
