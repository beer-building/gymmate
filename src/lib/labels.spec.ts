import { describe, expect, it } from 'vitest';
import { formatDate, muscleGroupLabels, goalLabels } from './labels';

describe('labels', () => {
	it('форматирует дату по-русски', () => {
		expect(formatDate('2026-06-10 12:00:00.000Z')).toBe('10 июня 2026 г.');
	});

	it('содержит подписи для всех групп мышц и целей', () => {
		expect(Object.values(muscleGroupLabels).every((label) => label.length > 0)).toBe(true);
		expect(Object.values(goalLabels).every((label) => label.length > 0)).toBe(true);
	});
});
