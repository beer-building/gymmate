import { describe, expect, it } from 'vitest';
import { formatDate, formatTargetReps, muscleGroupLabels } from './labels';

describe('labels', () => {
	it('форматирует дату по-русски', () => {
		expect(formatDate('2026-06-10 12:00:00.000Z')).toBe('10 июня 2026 г.');
	});

	it('содержит подписи для всех групп мышц', () => {
		expect(Object.values(muscleGroupLabels).every((label) => label.length > 0)).toBe(true);
	});

	it('форматирует целевые повторы', () => {
		expect(formatTargetReps({ target_reps_min: 8, target_reps_max: 10, notes: '' })).toBe('8–10');
		expect(formatTargetReps({ target_reps_min: 5, target_reps_max: 5, notes: '' })).toBe('5');
		expect(
			formatTargetReps({ target_reps_min: 0, target_reps_max: 0, notes: 'Повторы: 30-60 сек' })
		).toBe('30-60 сек');
		expect(formatTargetReps({ target_reps_min: 0, target_reps_max: 0, notes: '' })).toBe('—');
	});
});
