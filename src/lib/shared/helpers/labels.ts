import type { Difficulty, Equipment, ExerciseKind, Goal, MuscleGroup } from '$lib/shared/types';

export const muscleGroupLabels: Record<MuscleGroup, string> = {
	chest: 'Грудь',
	back: 'Спина',
	legs: 'Ноги',
	glutes: 'Ягодицы',
	calves: 'Икры',
	shoulders: 'Плечи',
	biceps: 'Бицепс',
	triceps: 'Трицепс',
	forearms: 'Предплечья',
	abs: 'Пресс',
	neck: 'Шея'
};

export const exerciseKindLabels: Record<ExerciseKind, string> = {
	strength: 'Силовые',
	warmup: 'Разминка',
	stretching: 'Растяжка'
};

export const equipmentLabels: Record<Equipment, string> = {
	barbell: 'Штанга',
	dumbbell: 'Гантели',
	machine: 'Тренажёр',
	cable: 'Блок',
	bodyweight: 'Свой вес',
	kettlebell: 'Гиря',
	band: 'Резина'
};

export const difficultyLabels: Record<Difficulty, string> = {
	beginner: 'Новичок',
	intermediate: 'Средний',
	advanced: 'Продвинутый'
};

export const goalLabels: Record<Goal, string> = {
	mass: 'Масса',
	weight_loss: 'Похудение',
	relief: 'Рельеф',
	strength: 'Сила'
};

export function formatDate(iso: string): string {
	const date = new Date(iso);
	return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Русское склонение по числу: plural(1, ['подход', 'подхода', 'подходов']) → 'подход'.
// forms = [для 1, для 2–4, для 5–20]. Возвращает только существительное, без числа.
export function plural(n: number, forms: [string, string, string]): string {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) return forms[0];
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
	return forms[2];
}

// Целевые повторы: "8–10", "5"; если диапазон не задан числами,
// оригинальная строка лежит в notes как "Повторы: 30-60 сек"
export function formatTargetReps(item: {
	target_reps_min: number;
	target_reps_max: number;
	notes: string;
}): string {
	const { target_reps_min: min, target_reps_max: max, notes } = item;
	if (min || max) {
		return !max || min === max ? String(min || max) : `${min}–${max}`;
	}
	const fromNotes = notes.match(/^Повторы: (.+)$/);
	return fromNotes ? fromNotes[1] : '—';
}

// «3×8–10» / «3×5»; если повторы не заданы — «3 подхода» вместо «3×—»,
// которое читается как сбой данных
export function formatSetsReps(item: {
	target_sets: number;
	target_reps_min: number;
	target_reps_max: number;
	notes: string;
}): string {
	const reps = formatTargetReps(item);
	if (reps === '—') {
		return `${item.target_sets} ${plural(item.target_sets, ['подход', 'подхода', 'подходов'])}`;
	}
	return `${item.target_sets}×${reps}`;
}
