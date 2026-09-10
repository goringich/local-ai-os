#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${LOCAL_AI_OS_CLEANROOM_IMAGE:-python:3.12-bookworm}"
ENGINE="${CONTAINER_ENGINE:-}"

if [[ -z "$ENGINE" ]]; then
  if command -v docker >/dev/null 2>&1; then
    ENGINE=docker
  elif command -v podman >/dev/null 2>&1; then
    ENGINE=podman
  else
    echo "customer_package_cleanroom=BLOCKED reason=docker_or_podman_required" >&2
    exit 2
  fi
fi

if ! command -v "$ENGINE" >/dev/null 2>&1; then
  echo "customer_package_cleanroom=BLOCKED reason=container_engine_not_found engine=$ENGINE" >&2
  exit 2
fi

if ! "$ENGINE" image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Pulling clean-room image before network isolation: $IMAGE" >&2
  "$ENGINE" pull "$IMAGE" >/dev/null
fi

IMAGE_ID="$($ENGINE image inspect --format '{{.Id}}' "$IMAGE")"
echo "cleanroom_engine=$ENGINE"
echo "cleanroom_image=$IMAGE"
echo "cleanroom_image_id=$IMAGE_ID"

RUN_ARGS=(
  run
  --rm
  --network none
  --read-only
  --cap-drop ALL
  --security-opt no-new-privileges
  --pids-limit 128
  --memory 512m
  --cpus 2
  --user 65534:65534
  --tmpfs /tmp:rw,nosuid,nodev,noexec,size=64m,mode=1777
  --tmpfs /work:rw,nosuid,nodev,noexec,size=256m,mode=1777
  --env HOME=/work/home
  --env PYTHONDONTWRITEBYTECODE=1
  --env PYTHONUNBUFFERED=1
  --mount "type=bind,src=$ROOT/scripts/customer-package.py,dst=/src/scripts/customer-package.py,readonly"
  --mount "type=bind,src=$ROOT/scripts/customer-package-secure.py,dst=/src/scripts/customer-package-secure.py,readonly"
  --mount "type=bind,src=$ROOT/tests/customer_package_cleanroom.py,dst=/src/tests/customer_package_cleanroom.py,readonly"
  "$IMAGE"
  bash
  -lc
  'set -Eeuo pipefail
   mkdir -p "$HOME"
   test ! -e /var/run/docker.sock
   test ! -e /run/podman/podman.sock
   command -v python3 >/dev/null
   command -v openssl >/dev/null
   python3 /src/tests/customer_package_cleanroom.py'
)

"$ENGINE" "${RUN_ARGS[@]}"
