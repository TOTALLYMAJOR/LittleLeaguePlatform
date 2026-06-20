# Runbook

## Local Static Browser Run

Open `index.html` directly in a browser.

This uses browser-only state. Refreshing the page resets changes.

## Docker Run

Start:

```bash
docker compose up -d --build
```

Check:

```bash
curl -I http://localhost:8081/
docker compose ps
```

Stop:

```bash
docker compose down
```

## Make Targets

```bash
make up
make down
make restart
make logs
make smoke
make validate
```

## Common Issues

### Port 8081 Is Already In Use

Edit `docker-compose.yml` and change the host side of the port mapping:

```yaml
ports:
  - "8082:80"
```

Then run:

```bash
docker compose up -d --build
```

### Static Changes Do Not Appear

The Compose build copies static files into the image. Rebuild after file changes:

```bash
docker compose up -d --build
```

### Container Is Running But Page Fails

Run:

```bash
docker compose ps
docker compose logs web
curl -I http://localhost:8081/
```

## Production Readiness Warning

This prototype does not provide production readiness. Before deployment, the app needs real auth, database policy, provider integration, audit logs, tests, monitoring, and retention jobs.
