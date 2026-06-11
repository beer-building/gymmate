# Деплой статики на VPS: каталог www/ в клоне gymmate_backend,
# его раздаёт Caddy (см. docker-compose.yml бэкенда).
# Хост можно переопределить: make deploy DEPLOY_HOST=root@1.2.3.4
DEPLOY_HOST ?= root@gymmate.freethinkel.dev
DEPLOY_PATH ?= /root/gymmate-backend/www

build:
	pnpm build

deploy: build
	rsync -az --delete build/ $(DEPLOY_HOST):$(DEPLOY_PATH)/
