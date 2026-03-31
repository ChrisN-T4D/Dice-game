#!/bin/sh
# Listen port: Railway (and similar) set PORT; local Docker defaults to 80.
PORT="${PORT:-80}"
case "$PORT" in
  ''|*[!0-9]*)
    echo "Warning: invalid PORT '$PORT'; falling back to 80"
    PORT=80
    ;;
  *)
    if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
      echo "Warning: PORT out of range '$PORT'; falling back to 80"
      PORT=80
    fi
    ;;
esac
mkdir -p /etc/nginx/conf.d
sed "s/__NGINX_PORT__/${PORT}/g" /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Optional: download static audio assets at startup (into container/volume) so they are not in the image.
# Set AUDIO_ASSETS_URL to either:
#   - Direct tarball with top-level "audio/" (from npm run pack-audio-assets; upload as release asset), or
#   - GitHub "Source code (tar.gz)" URL (archive has one top-level dir like Dice-game-audio-assets/ with public/audio inside).
# Extracts so /usr/share/nginx/html/audio/ exists and /audio/static/... is served. Skips if already present.
if [ -n "$AUDIO_ASSETS_URL" ]; then
  case "$AUDIO_ASSETS_URL" in
    http://*|https://*) ;;
    *)
      echo "Warning: AUDIO_ASSETS_URL must start with http:// or https://; skipping download."
      AUDIO_ASSETS_URL=
      ;;
  esac
fi

if [ -n "$AUDIO_ASSETS_URL" ]; then
  if [ ! -f /usr/share/nginx/html/audio/.downloaded ] 2>/dev/null; then
    echo "Downloading audio assets from AUDIO_ASSETS_URL..."
    if wget -q -O /tmp/audio-assets.tar.gz "$AUDIO_ASSETS_URL"; then
      if [ -n "$AUDIO_ASSETS_SHA256" ]; then
        if ! printf '%s  %s\n' "$AUDIO_ASSETS_SHA256" "/tmp/audio-assets.tar.gz" | sha256sum -c - >/dev/null 2>&1; then
          echo "Warning: AUDIO_ASSETS_SHA256 mismatch; aborting audio extraction."
          rm -f /tmp/audio-assets.tar.gz
          exec nginx -g "daemon off;"
        fi
      fi
      rm -f /tmp/audio-assets.list /tmp/audio-assets.long.list
      if ! tar -tzf /tmp/audio-assets.tar.gz > /tmp/audio-assets.list 2>/dev/null; then
        echo "Warning: invalid audio tarball (cannot list archive)."
        rm -f /tmp/audio-assets.tar.gz /tmp/audio-assets.list
        exec nginx -g "daemon off;"
      fi
      if awk '($0 ~ /^\/|(^|\/)\.\.(\/|$)/){bad=1} END{exit bad?0:1}' /tmp/audio-assets.list; then
        echo "Warning: tarball contains unsafe paths; aborting audio extraction."
        rm -f /tmp/audio-assets.tar.gz /tmp/audio-assets.list
        exec nginx -g "daemon off;"
      fi
      if tar -tzvf /tmp/audio-assets.tar.gz > /tmp/audio-assets.long.list 2>/dev/null && awk '{t=substr($1,1,1); if (t=="l" || t=="h") bad=1} END{exit bad?0:1}' /tmp/audio-assets.long.list; then
        echo "Warning: tarball contains links; aborting audio extraction."
        rm -f /tmp/audio-assets.tar.gz /tmp/audio-assets.list /tmp/audio-assets.long.list
        exec nginx -g "daemon off;"
      fi
      rm -rf /tmp/audio-extract
      mkdir -p /tmp/audio-extract
      tar -xzf /tmp/audio-assets.tar.gz -C /tmp/audio-extract --no-same-owner --no-same-permissions
      rm -f /tmp/audio-assets.tar.gz
      rm -f /tmp/audio-assets.list /tmp/audio-assets.long.list
      # Accept (1) tarball with top-level "audio" or (2) GitHub repo archive: one dir with public/audio inside
      if [ -d /tmp/audio-extract/audio ]; then
        mv /tmp/audio-extract/audio /usr/share/nginx/html/
      else
        _moved=
        for _d in /tmp/audio-extract/*/; do
          if [ -d "${_d}public/audio" ]; then
            mv "${_d}public/audio" /usr/share/nginx/html/
            _moved=1
            break
          fi
        done
        if [ -z "$_moved" ]; then
          echo "Warning: tarball has no top-level audio/ nor <dir>/public/audio/; static WAVs may be missing."
        fi
      fi
      rm -rf /tmp/audio-extract
      touch /usr/share/nginx/html/audio/.downloaded 2>/dev/null || true
      echo "Audio assets ready."
    else
      echo "Warning: failed to download audio assets from AUDIO_ASSETS_URL"
    fi
  fi
fi

exec nginx -g "daemon off;"
