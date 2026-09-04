FROM ubuntu:24.04
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ansible openssh-client sshpass ca-certificates git \
 && rm -rf /var/lib/apt/lists/*
COPY ansible.cfg /etc/ansible/ansible.cfg
ENV PS1="forge@controller:\w$ "
WORKDIR /workspace
