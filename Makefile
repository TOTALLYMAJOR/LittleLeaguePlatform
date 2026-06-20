.PHONY: up down restart logs smoke validate

up:
	docker compose up -d --build

down:
	docker compose down

restart: down up

logs:
	docker compose logs -f web

smoke:
	curl -fsSI http://localhost:8081/ | head -n 1

validate:
	docker compose config --quiet
