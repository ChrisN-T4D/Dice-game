#!/bin/sh
# Listen port: Railway (and similar) set PORT; local Docker defaults to 80.
PORT="${PORT:-80}"
mkdir -p /etc/nginx/conf.d
sed "s/__NGINX_PORT__/${PORT}/g" /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Runtime config for the app: TTS server URL.
# Priority: TTS_SERVER_URL (full URL, e.g. Railway public URL) > HOST (Traefik: https://tts.HOST) > empty.
if [ -n "$TTS_SERVER_URL" ]; then
  _url="$TTS_SERVER_URL"
  _url_esc=$(printf '%s' "$_url" | sed 's/\\/\\\\/g; s/"/\\"/g')
  printf '{"ttsServerUrl":"%s"}\n' "$_url_esc" > /usr/share/nginx/html/config.json
elif [ -n "$HOST" ]; then
  printf '{"ttsServerUrl":"https://tts.%s"}\n' "$HOST" > /usr/share/nginx/html/config.json
else
  echo '{"ttsServerUrl":""}' > /usr/share/nginx/html/config.json
fi

# Optional: download static audio assets at startup (into container/volume) so they are not in the image.
# Set AUDIO_ASSETS_URL to either:
#   - Direct tarball with top-level "audio/" (from npm run pack-audio-assets; upload as release asset), or
#   - GitHub "Source code (tar.gz)" URL (archive has one top-level dir like Dice-game-audio-assets/ with public/audio inside).
# Extracts so /usr/share/nginx/html/audio/ exists and /audio/static/... is served. Skips if already present.
if [ -n "$AUDIO_ASSETS_URL" ]; then
  if [ ! -f /usr/share/nginx/html/audio/.downloaded ] 2>/dev/null; then
    echo "Downloading audio assets from AUDIO_ASSETS_URL..."
    if wget -q -O /tmp/audio-assets.tar.gz "$AUDIO_ASSETS_URL"; then
      rm -rf /tmp/audio-extract
      mkdir -p /tmp/audio-extract
      tar -xzf /tmp/audio-assets.tar.gz -C /tmp/audio-extract
      rm -f /tmp/audio-assets.tar.gz
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
