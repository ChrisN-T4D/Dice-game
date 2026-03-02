#!/bin/sh
# Write runtime config for the app (e.g. TTS server URL from HOST).
if [ -n "$HOST" ]; then
  printf '{"ttsServerUrl":"https://tts.%s"}\n' "$HOST" > /usr/share/nginx/html/config.json
else
  echo '{"ttsServerUrl":""}' > /usr/share/nginx/html/config.json
fi
exec nginx -g "daemon off;"
