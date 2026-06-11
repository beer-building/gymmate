import type { MuscleGroup } from '$lib/shared/types';
import { MALE } from './muscle-map-male';
import { FEMALE } from './muscle-map-female';

// Карта мышц. Контуры фигур экспортированы из Figma и лежат в
// muscle-map-male.ts / muscle-map-female.ts; здесь — общие типы и реестр.

export interface MusclePath {
	group: MuscleGroup | null;
	d: string;
}

export interface BodyView {
	viewBox: string;
	paths: MusclePath[];
}

export interface BodyMap {
	front: BodyView;
	back: BodyView;
}

export type BodyVariant = 'male' | 'female';

export const BODY_MAPS: Record<BodyVariant, BodyMap> = {
	male: MALE,
	female: FEMALE
};
