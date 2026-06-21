.PHONY: install dev build test up down restart logs smoke validate

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm test

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
	npm run typecheck
	npm test
