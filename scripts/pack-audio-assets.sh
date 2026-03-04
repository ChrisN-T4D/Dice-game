#!/bin/sh
# Pack public/audio into a tarball for runtime download in Docker.
# Run from repo root. Output: audio-assets.tar.gz (top-level directory "audio").
# Upload this file somewhere (e.g. GitHub Release, S3) and set AUDIO_ASSETS_URL in Portainer.

set -e
cd "$(dirname "$0")/.."

if [ ! -d "public/audio" ]; then
  echo "public/audio not found. Run from repo root and ensure static WAVs exist." >&2
  exit 1
fi

echo "Packing public/audio into audio-assets.tar.gz..."
tar -czf audio-assets.tar.gz -C public audio
echo "Created audio-assets.tar.gz. Upload it and set AUDIO_ASSETS_URL to its URL in Portainer."
