import type { Difficulty, Equipment, Goal, MuscleGroup } from '$lib/shared/types';

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
