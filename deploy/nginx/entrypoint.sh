#!/bin/sh
# Proxy entrypoint:
#   - background watcher polls /var/www/certbot/.reload-nginx (sentinel file
#     touched by the certbot sidecar's --deploy-hook on successful renewal)
#   - on sentinel: validate config and reload nginx, then delete the sentinel
#   - foreground: hand off to the upstream nginx entrypoint chain
#
# This avoids mounting the docker socket into certbot just to signal nginx;
# the shared certbot-www volume is the only coupling between the two services.

set -eu

SENTINEL="/var/www/certbot/.reload-nginx"

reload_watcher() {
  while :; do
    if [ -f "$SENTINEL" ]; then
      rm -f "$SENTINEL"
      if nginx -t >/dev/null 2>&1; then
        nginx -s reload
        echo "[proxy] reloaded nginx (sentinel)"
      else
        echo "[proxy] nginx -t FAILED; not reloading" >&2
      fi
    fi
    sleep 60
  done
}

reload_watcher &
exec /docker-entrypoint.sh nginx -g 'daemon off;'
