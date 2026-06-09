#!/usr/bin/env bash
set -euo pipefail

# Run on the production server. Public traffic should only enter through Nginx.
BLOCKED_PORTS=(8000 8765 8787 5173)

if command -v firewall-cmd >/dev/null 2>&1; then
  systemctl enable --now firewalld >/dev/null 2>&1 || true
  firewall-cmd --permanent --add-service=http >/dev/null || true
  firewall-cmd --permanent --add-service=https >/dev/null || true
  for port in "${BLOCKED_PORTS[@]}"; do
    firewall-cmd --permanent --remove-port="${port}/tcp" >/dev/null 2>&1 || true
    firewall-cmd --permanent --add-rich-rule="rule family='ipv4' port port='${port}' protocol='tcp' reject" >/dev/null || true
    firewall-cmd --permanent --add-rich-rule="rule family='ipv6' port port='${port}' protocol='tcp' reject" >/dev/null || true
  done
  firewall-cmd --reload >/dev/null
else
  for port in "${BLOCKED_PORTS[@]}"; do
    iptables -C INPUT -p tcp --dport "$port" ! -s 127.0.0.1 -j REJECT 2>/dev/null \
      || iptables -I INPUT -p tcp --dport "$port" ! -s 127.0.0.1 -j REJECT
  done
fi

ss -ltnp | grep -E '(:80|:443|:8000|:8765|:8787|:5173)' || true
