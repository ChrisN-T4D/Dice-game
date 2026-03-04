#!/bin/sh
# Write runtime config for the app (e.g. TTS server URL from HOST).
if [ -n "$HOST" ]; then
  printf '{"ttsServerUrl":"https://tts.%s"}\n' "$HOST" > /usr/share/nginx/html/config.json
else
  echo '{"ttsServerUrl":""}' > /usr/share/nginx/html/config.json
fi

# Optional: download static audio assets at startup (into container/volume) so they are not in the image.
# Set AUDIO_ASSETS_URL to a URL of a tarball containing the "audio" directory (e.g. from scripts/pack-audio-assets.sh).
# Extracts to /usr/share/nginx/html so /audio/static/... is served. Skips if already present.
if [ -n "$AUDIO_ASSETS_URL" ]; then
  if [ ! -f /usr/share/nginx/html/audio/.downloaded ] 2>/dev/null; then
    echo "Downloading audio assets from AUDIO_ASSETS_URL..."
    if wget -q -O /tmp/audio-assets.tar.gz "$AUDIO_ASSETS_URL"; then
      tar -xzf /tmp/audio-assets.tar.gz -C /usr/share/nginx/html
      rm -f /tmp/audio-assets.tar.gz
      touch /usr/share/nginx/html/audio/.downloaded 2>/dev/null || true
      echo "Audio assets ready."
    else
      echo "Warning: failed to download audio assets from AUDIO_ASSETS_URL"
    fi
  fi
fi

exec nginx -g "daemon off;"
