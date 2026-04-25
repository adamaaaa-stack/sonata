#!/usr/bin/env bash
# Build for Capacitor/mobile with public/audio moved aside so the iOS bundle
# stays small. Audio is served from S3 via NEXT_PUBLIC_AUDIO_BASE_URL.
set -e

AUDIO_SRC="public/audio"
AUDIO_STASH="/tmp/.sonata-audio-stash"

restore() {
  if [ -d "$AUDIO_STASH" ]; then
    rm -rf "$AUDIO_SRC"
    mv "$AUDIO_STASH" "$AUDIO_SRC"
    echo "[build-mobile] restored $AUDIO_SRC"
  fi
}
trap restore EXIT

if [ -d "$AUDIO_SRC" ]; then
  rm -rf "$AUDIO_STASH"
  mv "$AUDIO_SRC" "$AUDIO_STASH"
  echo "[build-mobile] stashed $AUDIO_SRC"
fi

export NEXT_PUBLIC_PLATFORM=mobile
export NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL:-https://learnwithsonata.com}
export NEXT_PUBLIC_AUDIO_BASE_URL=${NEXT_PUBLIC_AUDIO_BASE_URL:-https://sonata-audio.s3.eu-west-1.amazonaws.com/audio}

echo "[build-mobile] NEXT_PUBLIC_AUDIO_BASE_URL=$NEXT_PUBLIC_AUDIO_BASE_URL"
next build
