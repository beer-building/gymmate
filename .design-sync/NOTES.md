# design-sync notes

**Off-script foundation sync.** GymMate — это SvelteKit-приложение, а не React-библиотека
компонентов. Конвертер `design-sync` собирает только React/JSX-бандлы, поэтому стандартный
путь (`package-build.mjs` / `resync.mjs`) здесь неприменим.

Вместо этого в claude.ai/design заливается **бренд-фундамент** (`shape: "foundation"`):

- `ds-bundle/styles.css` — реальные токены и глобальные классы из `src/app.css` плюс
  `.btn`-семейство, перенесённое дословно из `src/lib/shared/components/button/button.svelte`.
  Шрифты подключены через Google Fonts CDN (а не self-hosted `@fontsource`), чтобы не тащить
  бинарники в рантайм рендера.
- `ds-bundle/README.md` — конвенции дизайн-системы (источник — `DESIGN.md`).
- `ds-bundle/previews/*.html` — карточки для Design System pane.

Дизайн-агент строит **on-brand React-разметку** на этих CSS-классах; готовые компоненты в
проект не заливаются (это был бы форк, дрейфующий от Svelte-исходника).

## Re-sync

`_ds_sync.json` не публикуется — package-shape recipe сюда не подходит. Повторная
синхронизация просто пересобирает `ds-bundle/` и перезаливает фундамент целиком (он маленький).

## Если правишь дизайн-систему

`styles.css` — это копия. Источник правды — `src/app.css` и `button.svelte`. Меняешь там →
прогоняешь `/design-sync` снова, чтобы фундамент в claude.ai/design не разъехался.
