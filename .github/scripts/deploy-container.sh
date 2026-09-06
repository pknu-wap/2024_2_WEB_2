#!/usr/bin/env bash
# Runs on OCI through the verified OpenSSH connection.
set -eu

if ! printf '%s\n' "${REMOTE_DIR:-}" | grep -Eq '^/tmp/waps-deploy\.[A-Za-z0-9]{8}$'; then
  echo 'Invalid deployment temporary directory.' >&2
  exit 1
fi
trap 'rm -rf -- "$REMOTE_DIR"' EXIT

# Environment values arrive through shell-quoted exports over verified SSH.
for name in CADDY_DOMAIN IMAGE DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD \
  JWT_SECRET_KEY KAKAO_REST_API_KEY SERVER_URL SWAGGER_SERVER_URL \
  OCI_NAMESPACE OCI_BUCKET_NAME OCI_REGION; do
  if ! printenv "$name" | grep -q .; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
done

docker info > /dev/null
# Reuse the existing Compose project so certificate volumes and the DB network stay intact.
compose_project=
compose_dir=
for container in caddy waps-mysql; do
  compose_project=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$container" 2>/dev/null || true)
  compose_dir=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$container" 2>/dev/null || true)
  if [[ -n "$compose_project" && "$compose_project" != '<no value>' && "$compose_dir" == /* ]]; then
    break
  fi
done
if [[ -z "$compose_project" || "$compose_project" == '<no value>' || "$compose_dir" != /* ]]; then
  echo 'Existing Caddy or MySQL Compose project not found; initialize Docker Compose on OCI first.' >&2
  exit 1
fi
deploy_network="${compose_project}_waps-network"
docker network inspect "$deploy_network" > /dev/null
docker compose version > /dev/null

test -f /home/ubuntu/.oci/config

# Verify and load the transferred archive before touching the running container.
(cd "$REMOTE_DIR" && sha256sum --check image.tar.gz.sha256)
docker load --input "$REMOTE_DIR/image.tar.gz"
docker image inspect "$IMAGE" > /dev/null
rm -f -- "$REMOTE_DIR/image.tar.gz" "$REMOTE_DIR/image.tar.gz.sha256"

# Verify the mounted config is readable by the image's non-root user.
docker run --rm --entrypoint sh \
  --mount type=bind,src=/home/ubuntu/.oci,dst=/home/ubuntu/.oci,readonly \
  "$IMAGE" -c 'test -r /home/ubuntu/.oci/config && test -r /home/ubuntu/.oci/waps.pem'

if docker container inspect waps-server-previous > /dev/null 2>&1; then
  echo 'Previous deployment backup exists; inspect it before retrying.' >&2
  exit 1
fi

# Apply the workflow's domain to Caddy before replacing the running app.
# Exported environment variables take precedence over the server's .env file.
install -m 644 "$REMOTE_DIR/Caddyfile" "$compose_dir/Caddyfile"
install -m 644 "$REMOTE_DIR/docker-compose.yml" "$compose_dir/docker-compose.yml"
docker compose -p "$compose_project" -f "$compose_dir/docker-compose.yml" \
  run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose -p "$compose_project" -f "$compose_dir/docker-compose.yml" \
  up -d --no-deps --force-recreate caddy

had_previous=false
if docker container inspect waps-server > /dev/null 2>&1; then
  if ! docker stop waps-server || ! docker rename waps-server waps-server-previous; then
    echo 'Could not prepare previous container; attempting to restart it.' >&2
    if ! docker start waps-server; then
      echo 'Could not restart previous container; manual recovery required.' >&2
    fi
    exit 1
  fi
  had_previous=true
fi

rollback() {
  docker logs --tail 100 waps-server || true
  docker rm -f waps-server || true
  if [ "$had_previous" = true ]; then
    docker rename waps-server-previous waps-server
    docker start waps-server
  fi
  echo 'Deployment failed; previous container restored if available.' >&2
  exit 1
}

if ! docker run -d \
  --name waps-server \
  --restart unless-stopped \
  --network "$deploy_network" --network-alias app \
  --mount type=bind,src=/home/ubuntu/.oci,dst=/home/ubuntu/.oci,readonly \
  -e SPRING_PROFILES_ACTIVE=oracle \
  -e DB_HOST -e DB_PORT -e DB_NAME -e DB_USER -e DB_PASSWORD \
  -e JWT_SECRET_KEY -e KAKAO_REST_API_KEY -e SERVER_URL \
  -e OCI_NAMESPACE -e OCI_BUCKET_NAME -e OCI_REGION \
  -e OCI_CONFIG_PATH=/home/ubuntu/.oci/config \
  -e SWAGGER_SERVER_URL \
  "$IMAGE"; then
  rollback
fi

attempt=0
while [ "$attempt" -lt 30 ]; do
  if docker exec waps-server curl --fail --silent --max-time 5 \
    http://localhost:8080/actuator/health > /dev/null; then
    if [ "$had_previous" = true ]; then
      docker rm waps-server-previous
    fi
    echo 'Deployment completed successfully.'
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep 10
done
rollback
