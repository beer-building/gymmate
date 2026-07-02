# Разминка и растяжка в программах — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Разминки/растяжки как упражнения с `kind`, целевой длительностью в программах, записью по времени в воркауте и подсказкой растяжек на задействованные мышцы.

**Architecture:** Расширяем существующую сущность `exercises` полем `kind` (`strength | warmup | stretching`), join-коллекциям программ добавляем `target_duration_seconds`. Логи не меняются (`workout_log_sets.duration_seconds` уже есть). UI: фильтр kind в каталоге/селекте, поле длительности в редакторе, ввод времени в воркауте, блок подсказок растяжек.

**Tech Stack:** SvelteKit 3 next (Svelte 5 runes), effector, PocketBase (миграции JS в `../gymmate_backend/pb_migrations`), vitest.

**Spec:** `docs/superpowers/specs/2026-07-02-warmup-stretching-design.md`

## Global Constraints

- Бэкенд — PocketBase в Docker: миграции применяются ТОЛЬКО рестартом контейнера `docker compose restart pocketbase` из `~/Developer/dev/pet/gymmate_backend`. НЕ запускать хостовый `./pocketbase migrate up`.
- Админ PocketBase: `admin@gymmate.local` / `gymmate-admin-123` (порт 8090).
- Бизнес-логика — в effector-моделях, компоненты — тонкие вьюхи. Сторы без `$`-префикса, подписка `$store`.
- Пакетный менеджер — pnpm. Проверки: `pnpm test` (vitest), `pnpm check` (svelte-check).
- Тексты UI — на русском. Числа — моноширинные (существующие классы `mono`).
- В number-полях PocketBase `0` = «не задано».

---

### Task 1: Миграция схемы — `exercises.kind` + `target_duration_seconds`

**Files:**
- Create: `/Users/freethinkel/Developer/dev/pet/gymmate_backend/pb_migrations/1781350000_exercise_kind_duration.js`

**Interfaces:**
- Produces: поле `kind` (`strength|warmup|stretching`, required) в `exercises`; поле `target_duration_seconds` (number, min 0) в `program_workout_exercises` и `user_program_workout_exercises`. Все существующие exercises получают `kind = "strength"`.

- [ ] **Step 1: Написать миграцию**

```js
/// <reference path="../pb_data/types.d.ts" />

// Разминки и растяжки живут в общей коллекции exercises: kind отличает их от
// силовых (strength — все существующие записи). В программах у warmup/stretching
// вместо подходов×повторов×веса — целевая длительность, поэтому обеим
// join-коллекциям программ добавляется target_duration_seconds (0 = не задано).
// Логи не трогаем: в workout_log_sets duration_seconds уже есть.
migrate(
	(app) => {
		const exercises = app.findCollectionByNameOrId("exercises");
		exercises.fields.add(
			new Field({
				type: "select",
				name: "kind",
				required: true,
				maxSelect: 1,
				values: ["strength", "warmup", "stretching"],
			}),
		);
		app.save(exercises);

		for (const record of app.findAllRecords("exercises")) {
			record.set("kind", "strength");
			app.save(record);
		}

		for (const name of ["program_workout_exercises", "user_program_workout_exercises"]) {
			const collection = app.findCollectionByNameOrId(name);
			collection.fields.add(
				new Field({ type: "number", name: "target_duration_seconds", min: 0 }),
			);
			app.save(collection);
		}
	},
	(app) => {
		const exercises = app.findCollectionByNameOrId("exercises");
		exercises.fields.removeByName("kind");
		app.save(exercises);

		for (const name of ["program_workout_exercises", "user_program_workout_exercises"]) {
			const collection = app.findCollectionByNameOrId(name);
			collection.fields.removeByName("target_duration_seconds");
			app.save(collection);
		}
	},
);
```

- [ ] **Step 2: Применить рестартом контейнера**

Run: `cd /Users/freethinkel/Developer/dev/pet/gymmate_backend && docker compose restart pocketbase && sleep 3 && docker logs pocketbase --tail 20`
Expected: в логах нет ошибок миграции, PocketBase поднялся.

- [ ] **Step 3: Проверить поле через API**

```bash
TOKEN=$(curl -s -X POST http://localhost:8090/api/collections/_superusers/auth-with-password \
  -H 'Content-Type: application/json' \
  -d '{"identity":"admin@gymmate.local","password":"gymmate-admin-123"}' | jq -r .token)
curl -s "http://localhost:8090/api/collections/exercises/records?perPage=1" \
  -H "Authorization: $TOKEN" | jq '.items[0].kind'
```

Expected: `"strength"`.

- [ ] **Step 4: Commit (репозиторий бэкенда)**

```bash
cd /Users/freethinkel/Developer/dev/pet/gymmate_backend
git add pb_migrations/1781350000_exercise_kind_duration.js
git commit -m "feat: kind у упражнений + target_duration_seconds в программах"
```

---

### Task 2: Seed-миграция разминок и растяжек

**Files:**
- Create: `/Users/freethinkel/Developer/dev/pet/gymmate_backend/pb_migrations/1781360000_seed_warmup_stretching.js`

**Interfaces:**
- Consumes: поле `kind` из Task 1.
- Produces: 22 записи в `exercises` (9 warmup + 13 stretching), растяжки покрывают все 11 групп мышц из `MuscleGroup`.

- [ ] **Step 1: Написать seed-миграцию**

```js
/// <reference path="../pb_data/types.d.ts" />

// Базовый набор разминок и растяжек. Разминки — суставная гимнастика и
// кардио-разогрев; растяжки покрывают все группы мышц каталога, чтобы
// подсказка «растяжка на задействованные мышцы» находила вариант для любой
// тренировки. Все — bodyweight/beginner, без видео.
migrate(
	(app) => {
		const ITEMS = [
			// --- разминка ---
			{
				name: "Суставная разминка шеи",
				slug: "sustavnaya-razminka-shei",
				kind: "warmup",
				muscles: ["neck"],
				instructions:
					"Медленные наклоны головы вперёд-назад и к плечам, затем плавные повороты в стороны. По 8–10 повторений в каждом направлении, без резких движений и круговых вращений через запрокидывание.",
			},
			{
				name: "Вращения плечами и руками",
				slug: "vrashcheniya-plechami-i-rukami",
				kind: "warmup",
				muscles: ["shoulders"],
				instructions:
					"Круговые движения плечами вперёд и назад, затем прямыми руками с растущей амплитудой. По 10–15 вращений в каждую сторону.",
			},
			{
				name: "Вращения корпусом и тазом",
				slug: "vrashcheniya-korpusom-i-tazom",
				kind: "warmup",
				muscles: ["abs"],
				instructions:
					"Руки на пояс, круговые движения тазом в обе стороны, затем повороты корпуса вправо-влево. По 10 повторений в каждую сторону.",
			},
			{
				name: "Вращения коленями и стопами",
				slug: "vrashcheniya-kolenyami-i-stopami",
				kind: "warmup",
				muscles: ["legs", "calves"],
				instructions:
					"Ноги вместе, ладони на коленях — круговые движения коленями. Затем поочерёдно вращение стопой на носке. По 10 вращений в каждую сторону.",
			},
			{
				name: "Махи ногами",
				slug: "mahi-nogami-razminka",
				kind: "warmup",
				muscles: ["legs", "glutes"],
				instructions:
					"Держась за опору, махи прямой ногой вперёд-назад и в сторону. По 10–12 махов каждой ногой, амплитуду наращивать постепенно.",
			},
			{
				name: "Прыжки на скакалке",
				slug: "pryzhki-na-skakalke-razminka",
				kind: "warmup",
				muscles: ["calves", "legs"],
				instructions:
					"Лёгкие прыжки на носках в спокойном темпе 1–3 минуты. Приземляться мягко, колени слегка согнуты.",
			},
			{
				name: "Велотренажёр: лёгкий разогрев",
				slug: "velotrenazher-razogrev",
				kind: "warmup",
				muscles: ["legs"],
				instructions:
					"5–10 минут в лёгком темпе с низким сопротивлением. Пульс — разговорный, задача разогреть ноги и поднять температуру тела, а не устать.",
			},
			{
				name: "Ходьба или лёгкий бег на дорожке",
				slug: "dorozhka-razogrev",
				kind: "warmup",
				muscles: ["legs", "calves"],
				instructions:
					"5–10 минут быстрой ходьбы или лёгкого бега. Начать с ходьбы, темп поднимать постепенно.",
			},
			{
				name: "Прыжки с разведением рук и ног",
				slug: "pryzhki-s-razvedeniem-ruk-i-nog",
				kind: "warmup",
				muscles: ["legs", "shoulders"],
				instructions:
					"Jumping jacks: из стойки ноги вместе прыжком развести ноги и поднять руки над головой, прыжком вернуться. 2–3 подхода по 20–30 секунд.",
			},
			// --- растяжка ---
			{
				name: "Растяжка грудных мышц в дверном проёме",
				slug: "rastyazhka-grudnyh-v-proyome",
				kind: "stretching",
				muscles: ["chest"],
				instructions:
					"Предплечья на косяки дверного проёма, локти на уровне плеч. Мягко подать корпус вперёд до растяжения в груди, держать 20–30 секунд.",
			},
			{
				name: "Растяжка спины: поза ребёнка",
				slug: "rastyazhka-spiny-poza-rebyonka",
				kind: "stretching",
				muscles: ["back"],
				instructions:
					"Сесть на пятки, наклониться вперёд, руки вытянуть по полу перед собой, лоб опустить. Дышать ровно, держать 30–60 секунд.",
			},
			{
				name: "Растяжка широчайших у опоры",
				slug: "rastyazhka-shirochayshih-u-opory",
				kind: "stretching",
				muscles: ["back"],
				instructions:
					"Взяться обеими руками за стойку на уровне пояса, отсесть назад с прямыми руками, округлив верх спины. Держать 20–30 секунд, тянуться тазом назад.",
			},
			{
				name: "Растяжка квадрицепса стоя",
				slug: "rastyazhka-kvadritsepsa-stoya",
				kind: "stretching",
				muscles: ["legs"],
				instructions:
					"Стоя, согнуть ногу и подтянуть пятку к ягодице рукой, колени вместе. Держать 20–30 секунд на каждую ногу, за опору можно придерживаться.",
			},
			{
				name: "Растяжка задней поверхности бедра",
				slug: "rastyazhka-zadney-poverhnosti-bedra",
				kind: "stretching",
				muscles: ["legs", "glutes"],
				instructions:
					"Пятка на невысокой опоре, нога прямая. Наклоняться к ноге с прямой спиной до растяжения по задней поверхности. 20–30 секунд на каждую ногу.",
			},
			{
				name: "Растяжка ягодиц лёжа («четвёрка»)",
				slug: "rastyazhka-yagodits-chetvyorka",
				kind: "stretching",
				muscles: ["glutes"],
				instructions:
					"Лёжа на спине, лодыжку одной ноги положить на колено другой и подтянуть нижнее бедро к груди. Держать 20–30 секунд на каждую сторону.",
			},
			{
				name: "Растяжка икр у стены",
				slug: "rastyazhka-ikr-u-steny",
				kind: "stretching",
				muscles: ["calves"],
				instructions:
					"Упор руками в стену, одна нога отставлена назад на всю стопу, колено прямое. Подать таз вперёд до растяжения в икре. 20–30 секунд на каждую ногу.",
			},
			{
				name: "Растяжка плеч: рука поперёк груди",
				slug: "rastyazhka-plech-poperyok-grudi",
				kind: "stretching",
				muscles: ["shoulders"],
				instructions:
					"Прямую руку провести поперёк груди, второй рукой мягко прижать её к себе за плечо. Держать 20–30 секунд на каждую руку.",
			},
			{
				name: "Растяжка трицепса за головой",
				slug: "rastyazhka-tritsepsa-za-golovoy",
				kind: "stretching",
				muscles: ["triceps"],
				instructions:
					"Поднять руку вверх, согнуть за головой, второй рукой мягко надавить на локоть вниз. Держать 20–30 секунд на каждую руку.",
			},
			{
				name: "Растяжка бицепса у стены",
				slug: "rastyazhka-bitsepsa-u-steny",
				kind: "stretching",
				muscles: ["biceps", "forearms"],
				instructions:
					"Прямую руку ладонью на стену пальцами назад, локоть прямой. Медленно отворачивать корпус от стены до растяжения в бицепсе и предплечье. 20–30 секунд на каждую руку.",
			},
			{
				name: "Растяжка предплечий на коленях",
				slug: "rastyazhka-predplechiy",
				kind: "stretching",
				muscles: ["forearms"],
				instructions:
					"На четвереньках развернуть ладони пальцами к коленям и мягко отсаживаться назад, не отрывая ладони. Держать 20–30 секунд.",
			},
			{
				name: "Растяжка пресса: прогиб лёжа",
				slug: "rastyazhka-pressa-progib",
				kind: "stretching",
				muscles: ["abs"],
				instructions:
					"Лёжа на животе, упор ладонями у груди, мягко выпрямить руки и прогнуться, таз на полу («кобра»). Держать 20–30 секунд, без боли в пояснице.",
			},
			{
				name: "Растяжка шеи наклонами",
				slug: "rastyazhka-shei-naklonami",
				kind: "stretching",
				muscles: ["neck"],
				instructions:
					"Сидя, наклонить голову к плечу и мягко усилить наклон ладонью, второе плечо тянуть вниз. Держать 20 секунд на каждую сторону.",
			},
		];

		const collection = app.findCollectionByNameOrId("exercises");
		for (const item of ITEMS) {
			const record = new Record(collection);
			record.set("name", item.name);
			record.set("slug", item.slug);
			record.set("kind", item.kind);
			record.set("primary_muscles", item.muscles);
			record.set("secondary_muscles", []);
			record.set("equipment", "bodyweight");
			record.set("difficulty", "beginner");
			record.set("instructions", item.instructions);
			app.save(record);
		}
	},
	(app) => {
		const SLUGS = [
			"sustavnaya-razminka-shei", "vrashcheniya-plechami-i-rukami",
			"vrashcheniya-korpusom-i-tazom", "vrashcheniya-kolenyami-i-stopami",
			"mahi-nogami-razminka", "pryzhki-na-skakalke-razminka",
			"velotrenazher-razogrev", "dorozhka-razogrev",
			"pryzhki-s-razvedeniem-ruk-i-nog", "rastyazhka-grudnyh-v-proyome",
			"rastyazhka-spiny-poza-rebyonka", "rastyazhka-shirochayshih-u-opory",
			"rastyazhka-kvadritsepsa-stoya", "rastyazhka-zadney-poverhnosti-bedra",
			"rastyazhka-yagodits-chetvyorka", "rastyazhka-ikr-u-steny",
			"rastyazhka-plech-poperyok-grudi", "rastyazhka-tritsepsa-za-golovoy",
			"rastyazhka-bitsepsa-u-steny", "rastyazhka-predplechiy",
			"rastyazhka-pressa-progib", "rastyazhka-shei-naklonami",
		];
		for (const slug of SLUGS) {
			try {
				app.delete(app.findFirstRecordByData("exercises", "slug", slug));
			} catch {
				/* записи уже нет */
			}
		}
	},
);
```

- [ ] **Step 2: Применить и проверить**

Run: `cd /Users/freethinkel/Developer/dev/pet/gymmate_backend && docker compose restart pocketbase && sleep 3`

```bash
TOKEN=$(curl -s -X POST http://localhost:8090/api/collections/_superusers/auth-with-password \
  -H 'Content-Type: application/json' \
  -d '{"identity":"admin@gymmate.local","password":"gymmate-admin-123"}' | jq -r .token)
curl -s 'http://localhost:8090/api/collections/exercises/records?perPage=1&filter=kind%3D%22warmup%22' \
  -H "Authorization: $TOKEN" | jq .totalItems
curl -s 'http://localhost:8090/api/collections/exercises/records?perPage=1&filter=kind%3D%22stretching%22' \
  -H "Authorization: $TOKEN" | jq .totalItems
```

Expected: totalItems warmup = `9`, stretching = `13`.

- [ ] **Step 3: Commit (репозиторий бэкенда)**

```bash
cd /Users/freethinkel/Developer/dev/pet/gymmate_backend
git add pb_migrations/1781360000_seed_warmup_stretching.js
git commit -m "feat: сид разминок и растяжек (kind warmup/stretching)"
```

---

### Task 3: Типы + перенос `target_duration_seconds` через fork/import/export

**Files:**
- Modify: `src/lib/shared/types/index.ts`
- Modify: `src/lib/modules/diary/helpers/program-transfer.ts`
- Modify: `src/lib/modules/diary/helpers/program-transfer.spec.ts`
- Modify: `src/lib/modules/exercises/helpers/find-similar.spec.ts`
- Modify: `src/lib/modules/diary/model/user-program.model.ts`
- Modify: `src/lib/modules/diary/model/diary.model.ts`

**Interfaces:**
- Produces: `export type ExerciseKind = 'strength' | 'warmup' | 'stretching'`; `Exercise.kind: ExerciseKind`; `ProgramWorkoutExercise.target_duration_seconds: number`; `UserProgramWorkoutExercise.target_duration_seconds: number`; `ProgramFileExercise.target_duration_seconds: number`. Все последующие задачи опираются на эти имена.

- [ ] **Step 1: Обновить типы**

В `src/lib/shared/types/index.ts` после `Difficulty`:

```ts
export type ExerciseKind = 'strength' | 'warmup' | 'stretching';
```

В `Exercise` после `slug: string;`:

```ts
	kind: ExerciseKind;
```

В `ProgramWorkoutExercise` и `UserProgramWorkoutExercise` после `rest_seconds: number;`:

```ts
	target_duration_seconds: number; // для kind warmup/stretching; 0 = не задано
```

- [ ] **Step 2: Написать падающие тесты на roundtrip длительности**

В `program-transfer.spec.ts`: в фикстуре `exercise()` добавить `kind: 'strength'` (после `slug`), в оба элемента `exercises` добавить `target_duration_seconds: 0` (после `rest_seconds`), в ожидание теста «нормализует кривые значения» добавить `target_duration_seconds: 0`. Добавить тест:

```ts
	it('переносит целевую длительность разминки/растяжки', () => {
		const stretching: UserProgramWorkoutExercise = {
			...exercises[0],
			id: 'e3',
			target_duration_seconds: 300,
			expand: { exercise: { ...exercise('rastyazhka', 'Растяжка'), kind: 'stretching' } }
		};
		const file = serializeProgram(program, workouts, [...exercises, stretching]);
		const parsed = parseProgramFile(JSON.stringify(file));
		expect(parsed.workouts[0].exercises.at(-1)?.target_duration_seconds).toBe(300);
	});
```

В `find-similar.spec.ts` в фикстуру `ex()` добавить `kind: 'strength'` (после `slug`).

- [ ] **Step 3: Убедиться, что тест падает**

Run: `pnpm test`
Expected: FAIL — `target_duration_seconds` отсутствует в `ProgramFileExercise`/сериализации (ошибка типов либо `undefined ≠ 300`).

- [ ] **Step 4: Реализовать перенос**

В `program-transfer.ts`:
- в `ProgramFileExercise` после `rest_seconds: number;` добавить `target_duration_seconds: number;`
- в `serializeProgram` после `rest_seconds: item.rest_seconds,` добавить `target_duration_seconds: item.target_duration_seconds,`
- в `parseProgramFile` после `rest_seconds: asNonNegativeNumber(fields.rest_seconds),` добавить `target_duration_seconds: asNonNegativeNumber(fields.target_duration_seconds),`

В `user-program.model.ts` в payload `api.createUserProgramWorkoutExercise` (внутри `addExerciseFx`) после `rest_seconds: 0,` добавить `target_duration_seconds: 0,`.

В `diary.model.ts`:
- в `forkProgramFx` в payload `createUserProgramWorkoutExercise` после `rest_seconds: item.rest_seconds,` добавить `target_duration_seconds: item.target_duration_seconds,`
- в `importProgramFx` там же добавить `target_duration_seconds: exercise.target_duration_seconds,`

- [ ] **Step 5: Проверить тесты и типы**

Run: `pnpm test && pnpm check`
Expected: все тесты PASS, svelte-check без ошибок (если check найдёт ещё места, где создаётся `Exercise`/payload без новых полей — дополнить их `kind: 'strength'` / `target_duration_seconds: 0`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/shared/types/index.ts src/lib/modules/diary src/lib/modules/exercises/helpers/find-similar.spec.ts
git commit -m "feat: тип ExerciseKind и target_duration_seconds в программах"
```

---

### Task 4: Фильтр kind в каталоге упражнений

**Files:**
- Modify: `src/lib/shared/helpers/labels.ts`
- Modify: `src/lib/modules/exercises/model/exercises.model.ts`
- Modify: `src/lib/modules/exercises/pages/exercises.svelte`

**Interfaces:**
- Produces: `exerciseKindLabels: Record<ExerciseKind, string>` в labels; `kindSelected(kind | null)` событие и стор `kind` в exercises.model. Task 5 использует `exerciseKindLabels`.

- [ ] **Step 1: Подписи kind**

В `labels.ts` (импортировать `ExerciseKind` из `$lib/shared/types`, рядом с `muscleGroupLabels`):

```ts
export const exerciseKindLabels: Record<ExerciseKind, string> = {
	strength: 'Силовые',
	warmup: 'Разминка',
	stretching: 'Растяжка'
};
```

- [ ] **Step 2: Стор и фильтр в модели**

В `exercises.model.ts` (импортировать `ExerciseKind` в type-импорт):

```ts
export const kindSelected = createEvent<ExerciseKind | null>();

export const kind = createStore<ExerciseKind | null>(null).on(kindSelected, (_, value) => value);
```

`filteredExercises` расширить четвёртым источником:

```ts
export const filteredExercises = combine(
	exercises,
	muscleGroup,
	searchQuery,
	kind,
	(items, group, query, kindFilter) => {
		const normalized = query.trim().toLowerCase();
		return items.filter(
			(item) =>
				(!kindFilter || item.kind === kindFilter) &&
				(!group || item.primary_muscles.includes(group)) &&
				(!normalized || item.name.toLowerCase().includes(normalized))
		);
	}
);
```

- [ ] **Step 3: Chips в странице каталога**

В `exercises.svelte`:
- в script: `const kind = exercisesModel.kind;`, импорт `exerciseKindLabels` из labels, `const kinds = Object.entries(exerciseKindLabels) as [ExerciseKind, string][];` (импортировать тип `ExerciseKind`);
- `hasFilters` дополнить `|| $kind !== null`; в `resetFilters()` добавить `exercisesModel.kindSelected(null);`
- внутри `.filters` первой строкой (до `{#if tab === 'map'}`):

```svelte
			<div class="chips kind-chips">
				<button
					class="chip"
					class:active={$kind === null}
					onclick={() => exercisesModel.kindSelected(null)}
				>
					Все
				</button>
				{#each kinds as [value, label] (value)}
					<button
						class="chip"
						class:active={$kind === value}
						onclick={() => exercisesModel.kindSelected(value)}
					>
						{label}
					</button>
				{/each}
			</div>
```

- в meta-row после тега muscleGroup добавить:

```svelte
				{#if $kind}
					<span class="filter-tag">{exerciseKindLabels[$kind]}</span>
				{/if}
```

- в стили:

```css
	.kind-chips {
		margin-bottom: 18px;
	}
```

- [ ] **Step 4: Проверить**

Run: `pnpm check`
Expected: без ошибок. Вручную (dev-сервер): на `/exercises` чип «Разминка» показывает 9 записей, «Растяжка» — 13, «сбросить» очищает и kind.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shared/helpers/labels.ts src/lib/modules/exercises
git commit -m "feat: фильтр по kind (силовые/разминка/растяжка) в каталоге"
```

---

### Task 5: exercise-select — разминки и растяжки отдельными optgroup

**Files:**
- Modify: `src/lib/modules/exercises/components/exercise-select/exercise-select.svelte`

**Interfaces:**
- Consumes: `exerciseKindLabels` из Task 4, `Exercise.kind` из Task 3.
- Produces: селект группирует силовые по мышцам как раньше, warmup/stretching — в optgroup «Разминка»/«Растяжка» в конце списка.

- [ ] **Step 1: Обновить группировку**

Заменить блок `const groups = $derived.by(...)` (импортировать `exerciseKindLabels` рядом с `muscleGroupLabels`):

```ts
	// силовые — optgroup по группам мышц; разминки и растяжки — своими
	// optgroup в конце, чтобы не смешивались с силовыми внутри мышц
	const groups = $derived.by(() => {
		const result: { key: string; label: string; items: Exercise[] }[] = [];
		const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name, 'ru');
		const strength = exercises.filter((exercise) => exercise.kind === 'strength');
		for (const muscle of Object.keys(muscleGroupLabels) as MuscleGroup[]) {
			const items = strength
				.filter((exercise) => exercise.primary_muscles.includes(muscle))
				.sort(byName);
			if (items.length > 0) result.push({ key: muscle, label: muscleGroupLabels[muscle], items });
		}
		for (const kind of ['warmup', 'stretching'] as const) {
			const items = exercises.filter((exercise) => exercise.kind === kind).sort(byName);
			if (items.length > 0) result.push({ key: kind, label: exerciseKindLabels[kind], items });
		}
		return result;
	});
```

В шаблоне `{#each groups as group (group.muscle)}` заменить ключ на `(group.key)`.

- [ ] **Step 2: Проверить**

Run: `pnpm check`
Expected: без ошибок. Вручную: в редакторе программы селект «Добавить упражнение…» показывает группы мышц + «Разминка» + «Растяжка» в конце.

- [ ] **Step 3: Commit**

```bash
git add src/lib/modules/exercises/components/exercise-select/exercise-select.svelte
git commit -m "feat: разминка и растяжка отдельными группами в селекте упражнений"
```

---

### Task 6: Редактор программы — поле длительности вместо подходов×веса

**Files:**
- Modify: `src/lib/modules/diary/pages/program-editor.svelte`

**Interfaces:**
- Consumes: `UserProgramWorkoutExercise.target_duration_seconds`, `Exercise.kind`, существующие `changeNumber`, `numberFields`, `findSimilarExercises`.

- [ ] **Step 1: Ветка полей по kind**

В шаблоне заменить содержимое `<div class="exercise-fields">`:

```svelte
									<div class="exercise-fields">
										{#if (item.expand?.exercise?.kind ?? 'strength') === 'strength'}
											{#each numberFields as { field, label, min, step } (field)}
												<label class="mini-field">
													<span class="mono">{label}</span>
													<Input
														size="sm"
														type="number"
														{min}
														{step}
														value={item[field] || ''}
														placeholder="—"
														onchange={(event) => changeNumber(item.id, field, event)}
													/>
												</label>
											{/each}
										{:else}
											<label class="mini-field">
												<span class="mono">Время, с</span>
												<Input
													size="sm"
													type="number"
													min={0}
													step={15}
													value={item.target_duration_seconds || ''}
													placeholder="—"
													onchange={(event) => changeNumber(item.id, 'target_duration_seconds', event)}
												/>
											</label>
										{/if}
									</div>
```

- [ ] **Step 2: «Заменить на похожее» — в пределах своего kind**

Заменить `similarFor`:

```ts
	// похожие упражнения для замены — по группам мышц текущего и в пределах
	// его kind: растяжку не предлагаем заменить на силовое
	function similarFor(item: UserProgramWorkoutExercise) {
		const current = item.expand?.exercise;
		if (!current) return [];
		return findSimilarExercises(
			current,
			$catalog.filter((exercise) => exercise.kind === current.kind)
		);
	}
```

- [ ] **Step 3: Проверить**

Run: `pnpm check && pnpm test`
Expected: без ошибок. Вручную: добавить растяжку в программу — у неё одно поле «Время, с», значение сохраняется (перезагрузка страницы не теряет его).

- [ ] **Step 4: Commit**

```bash
git add src/lib/modules/diary/pages/program-editor.svelte
git commit -m "feat(editor): поле длительности у разминок/растяжек вместо подходов и веса"
```

---

### Task 7: Воркаут — запись разминки/растяжки по времени

**Files:**
- Modify: `src/lib/shared/helpers/labels.ts`
- Modify: `src/lib/modules/diary/model/diary.model.ts`
- Modify: `src/lib/modules/diary/pages/workout.svelte`

**Interfaces:**
- Consumes: `Exercise.kind`, `target_duration_seconds` из плана, `createWorkoutLogSet` (уже принимает `duration_seconds`).
- Produces: `setAdded` принимает `{ exercise, reps, weight, durationSeconds? }`; `formatDurationShort(seconds: number): string` в labels (используется и в Task 8).

- [ ] **Step 1: Хелпер формата длительности**

В `labels.ts`:

```ts
export function formatDurationShort(seconds: number): string {
	if (seconds < 60) return `${seconds} с`;
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	return rest ? `${minutes} мин ${rest} с` : `${minutes} мин`;
}
```

- [ ] **Step 2: Модель — длительность в setAdded и без таймера отдыха**

В `diary.model.ts`:
- `setAdded`:

```ts
export const setAdded = createEvent<{
	exercise: string;
	reps: number;
	weight: number;
	durationSeconds?: number;
}>();
```

- в `addSetFx`: добавить `durationSeconds` в параметры (тип `durationSeconds?: number;`) и в вызов создания подхода:

```ts
		const set = await api.createWorkoutLogSet({
			workout_log_exercise: logExercise.id,
			set_index: sets.filter((item) => item.workout_log_exercise === logExercise.id).length + 1,
			reps,
			weight,
			duration_seconds: durationSeconds ?? 0,
			completed: true
		});
```

- в `sample({ clock: setAdded, ... })` в `fn` пробросить `durationSeconds` из payload (добавить в деструктуризацию и в возвращаемый объект);
- таймер отдыха: разминка/растяжка записываются по времени, отдых после них не стартует —

```ts
sample({
	clock: addSetFx.done,
	source: { plan: workoutPlan, log: currentWorkoutLog },
	filter: ({ log }, { params }) => log !== null && !log.completed_at && !params.durationSeconds,
	fn: ({ plan }, { params }) =>
		plan.find((item) => item.exercise === params.exerciseId)?.rest_seconds || DEFAULT_REST_SECONDS,
	target: restStarted
});
```

- [ ] **Step 3: Страница воркаута — форма, план, список сетов**

В `workout.svelte`:

- импорт: `formatDurationShort` из labels;
- состояние и производные (рядом с `reps`/`weight`):

```ts
	let durationSeconds = $state(60);

	const selectedKind = $derived(
		$allExercises.find((item) => item.id === selectedExercise)?.kind ?? 'strength'
	);

	// префилл длительности: цель из плана, иначе минута
	$effect(() => {
		if (!selectedExercise || selectedKind === 'strength') return;
		const planned = $workoutPlan.find((item) => item.exercise === selectedExercise);
		durationSeconds = planned?.target_duration_seconds || 60;
	});
```

- `addSet`:

```ts
	function addSet(event: SubmitEvent) {
		event.preventDefault();
		if (!selectedExercise) return;
		if (selectedKind === 'strength') {
			diaryModel.setAdded({ exercise: selectedExercise, reps, weight });
		} else {
			diaryModel.setAdded({ exercise: selectedExercise, reps: 0, weight: 0, durationSeconds });
		}
	}
```

- в форме поля повторов и веса обернуть в ветку:

```svelte
					{#if selectedKind === 'strength'}
						<div class="field">
							<label for="reps">Повторы</label>
							<input id="reps" type="number" min="1" bind:value={reps} required />
						</div>
						<div class="field">
							<label for="weight">Вес, кг</label>
							<input id="weight" type="number" min="0" step="0.5" bind:value={weight} />
						</div>
					{:else}
						<div class="field">
							<label for="duration">Время, с</label>
							<input id="duration" type="number" min="5" step="5" bind:value={durationSeconds} required />
						</div>
					{/if}
```

- хинт «в прошлый раз» показывать только для силовых: условие `{#if $lastSet?.set && $lastSet.exerciseId === selectedExercise}` дополнить `&& selectedKind === 'strength'`;
- в «Плане на сегодня» цель по времени для warmup/stretching — заменить span с `formatSetsReps`:

```svelte
								<span class="mono muted">
									{#if (item.expand?.exercise?.kind ?? 'strength') !== 'strength'}
										{item.target_duration_seconds
											? formatDurationShort(item.target_duration_seconds)
											: '—'}
									{:else}
										{formatSetsReps(item)}{item.target_weight ? ` · ${item.target_weight} кг` : ''}
									{/if}
								</span>
```

- в списке записанных сетов — ветка по `duration_seconds`:

```svelte
						{#each group.sets as set, i (set.id)}
							<div class="set mono">
								<span class="n">#{i + 1}</span>
								{#if set.duration_seconds}
									<span class="span-2"><b>{formatDurationShort(set.duration_seconds)}</b></span>
								{:else}
									<span><b>{set.reps}</b> повт.</span>
									<span><b>{set.weight || '—'}</b> кг</span>
								{/if}
								<Button ...без изменений... />
							</div>
						{/each}
```

и стиль:

```css
	.set .span-2 {
		grid-column: span 2;
	}
```

- в `summaryRows` добавить суммарную длительность: в map добавить `duration: group.sets.reduce((sum, set) => sum + set.duration_seconds, 0),` и в шаблоне breakdown заменить строку веса:

```svelte
								{#if row.weight === 0 && row.duration > 0}
									<span class="bd-top mono"><b>{formatDurationShort(row.duration)}</b></span>
									<span class="bd-delta mono"></span>
								{:else}
									<span class="bd-top mono"><b>{row.weight || '—'}</b> кг × {row.reps}</span>
									<span class="bd-delta mono" class:up={delta !== null && delta > 0}>
										{#if delta === null}
											новое
										{:else if delta > 0}
											↑ {delta.toLocaleString('ru-RU')}
										{:else if delta < 0}
											↓ {Math.abs(delta).toLocaleString('ru-RU')}
										{:else}
											=
										{/if}
									</span>
								{/if}
```

- [ ] **Step 4: Проверить**

Run: `pnpm check && pnpm test`
Expected: без ошибок. Вручную: начать тренировку, выбрать растяжку — форма показывает «Время, с» с префиллом из плана, подход записывается как «5 мин», таймер отдыха не стартует; силовые работают как раньше (повторы/вес, таймер стартует).

- [ ] **Step 5: Commit**

```bash
git add src/lib/shared/helpers/labels.ts src/lib/modules/diary
git commit -m "feat(workout): запись разминки/растяжки по времени"
```

---

### Task 8: Подсказка растяжек на задействованные мышцы

**Files:**
- Create: `src/lib/modules/exercises/helpers/suggest-stretches.ts`
- Test: `src/lib/modules/exercises/helpers/suggest-stretches.spec.ts`
- Modify: `src/lib/modules/diary/pages/workout.svelte`

**Interfaces:**
- Consumes: `Exercise.kind`, `formatDurationShort`/`muscleGroupLabels` из labels, `quickAdd` из workout.svelte.
- Produces: `suggestStretches(planned: Exercise[], catalog: Exercise[], limit?: number): Exercise[]`.

- [ ] **Step 1: Падающий тест**

`src/lib/modules/exercises/helpers/suggest-stretches.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { suggestStretches } from './suggest-stretches';
import type { Exercise, ExerciseKind, MuscleGroup } from '$lib/shared/types';

const ex = (id: string, kind: ExerciseKind, primary: MuscleGroup[]): Exercise => ({
	id,
	name: id,
	slug: id,
	kind,
	primary_muscles: primary,
	secondary_muscles: [],
	equipment: 'bodyweight',
	difficulty: 'beginner',
	instructions: '',
	videos: null
});

describe('suggestStretches', () => {
	it('подбирает растяжки по пересечению мышц, ранжирует по покрытию, исключает уже добавленные в план', () => {
		const planned = [
			ex('bench', 'strength', ['chest', 'triceps']),
			ex('stretch-in-plan', 'stretching', ['back'])
		];
		const catalog = [
			...planned,
			ex('chest-stretch', 'stretching', ['chest']),
			ex('chest-triceps-stretch', 'stretching', ['chest', 'triceps']),
			ex('legs-stretch', 'stretching', ['legs']),
			ex('chest-warmup', 'warmup', ['chest'])
		];

		expect(suggestStretches(planned, catalog).map((item) => item.id)).toEqual([
			'chest-triceps-stretch',
			'chest-stretch'
		]);
	});

	it('режет список по limit', () => {
		const planned = [ex('bench', 'strength', ['chest'])];
		const catalog = [ex('s1', 'stretching', ['chest']), ex('s2', 'stretching', ['chest'])];
		expect(suggestStretches(planned, catalog, 1)).toHaveLength(1);
	});
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `pnpm test -- suggest-stretches`
Expected: FAIL — модуля `./suggest-stretches` нет.

- [ ] **Step 3: Реализовать хелпер**

`src/lib/modules/exercises/helpers/suggest-stretches.ts`:

```ts
import type { Exercise, MuscleGroup } from '$lib/shared/types';

// Растяжки на мышцы, задействованные в плане тренировки: пересечение по
// primary_muscles, ранжирование по числу покрытых групп (при равенстве — по
// алфавиту), уже добавленные в план исключаются. Растяжки из плана мышцы
// «не задействуют» — на них новые растяжки не предлагаем.
export function suggestStretches(
	planned: Exercise[],
	catalog: Exercise[],
	limit = 5
): Exercise[] {
	const used = new Set<MuscleGroup>(
		planned
			.filter((exercise) => exercise.kind !== 'stretching')
			.flatMap((exercise) => exercise.primary_muscles)
	);
	const plannedIds = new Set(planned.map((exercise) => exercise.id));
	return catalog
		.filter((exercise) => exercise.kind === 'stretching' && !plannedIds.has(exercise.id))
		.map((exercise) => ({
			exercise,
			score: exercise.primary_muscles.filter((muscle) => used.has(muscle)).length
		}))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'ru'))
		.slice(0, limit)
		.map(({ exercise }) => exercise);
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Блок в воркауте**

В `workout.svelte`:
- импорты: `suggestStretches` из `$lib/modules/exercises/helpers/suggest-stretches`, `muscleGroupLabels` (добавить к импорту из labels), тип `Exercise` из `$lib/shared/types`;
- производная (после `grouped`):

```ts
	// растяжки на мышцы из плана; уже записанные в лог не предлагаем
	const stretchSuggestions = $derived.by(() => {
		const planned = $workoutPlan
			.map((item) => item.expand?.exercise)
			.filter((item): item is Exercise => Boolean(item));
		const loggedIds = new Set($logExercises.map((item) => item.exercise));
		return suggestStretches(planned, $allExercises).filter((item) => !loggedIds.has(item.id));
	});
```

- в шаблоне после `{#each grouped ...}{/each}`, перед секцией «Заметки»:

```svelte
			{#if !log.completed_at && stretchSuggestions.length > 0}
				<section class="plate block">
					<h2 class="mono label">Растяжка на сегодня</h2>
					<ul class="plan">
						{#each stretchSuggestions as stretch (stretch.id)}
							<li>
								<a
									href="/exercises/{stretch.id}?ref={page.url.pathname}"
									class="plan-name exercise-link"
								>
									{stretch.name}
								</a>
								<span class="mono muted">
									{stretch.primary_muscles.map((muscle) => muscleGroupLabels[muscle]).join(' · ')}
								</span>
								<Button kind="ghost" size="sm" onclick={() => quickAdd(stretch.id)}>Выбрать</Button>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
```

- [ ] **Step 6: Проверить**

Run: `pnpm check && pnpm test`
Expected: без ошибок. Вручную: в идущей тренировке с планом виден блок «Растяжка на сегодня» с растяжками на мышцы плана; «Выбрать» подставляет растяжку в форму с полем времени; у тренировки без программы блока нет.

- [ ] **Step 7: Commit**

```bash
git add src/lib/modules/exercises/helpers src/lib/modules/diary/pages/workout.svelte
git commit -m "feat(workout): подсказка растяжек на задействованные мышцы"
```
