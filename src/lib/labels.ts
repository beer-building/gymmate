import type { Difficulty, Equipment, Goal, MuscleGroup } from './types';

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
