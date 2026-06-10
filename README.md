# GymMate

Приложение для тренировок в зале (по мотивам tvoytrener.com): каталог упражнений,
готовые программы и дневник тренировок с подходами и весами.

## Стек

- **Фронтенд**: SvelteKit (Svelte 5, runes) + [effector](https://effector.dev) для моделей и бизнес-логики
- **Бэкенд**: [PocketBase](https://pocketbase.io) — живёт в `../gymmate_backend`

## Запуск

Бэкенд (порт 8090, доступен в локальной сети):

```sh
cd ../gymmate_backend
./pocketbase serve --http=0.0.0.0:8090
```

Фронтенд:

```sh
pnpm install
pnpm dev
```

Адрес PocketBase настраивается через `VITE_POCKETBASE_URL` в `.env`
(сейчас `http://192.168.1.40:8090` — LAN-адрес машины; fallback в коде — `http://127.0.0.1:8090`).
После изменения `.env` dev-сервер нужно перезапустить.

Админка PocketBase: http://192.168.1.40:8090/_/ (`admin@gymmate.local` / `gymmate-admin-123`).

## Структура

- `src/lib/models/` — effector-модели (auth, exercises, programs, diary)
- `src/lib/api.ts` — обёртки над PocketBase SDK
- `src/routes/` — страницы: каталог упражнений, программы, дневник, авторизация
- `../gymmate_backend/pb_migrations/` — схема коллекций и сид-данные

После изменения миграций: `./pocketbase migrate up` и **перезапуск** сервера
(работающий процесс кэширует схему коллекций).

## Команды

```sh
pnpm dev     # дев-сервер
pnpm check   # svelte-check
pnpm lint    # prettier + eslint
pnpm test    # vitest
pnpm build   # прод-сборка
```
