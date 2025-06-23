import { vi } from 'vitest';
vi.mock('@/stores/notes', () => ({}));
vi.mock('@/stores/modules', () => ({}));
vi.mock('@/stores/parties', () => ({}));
vi.mock('@/stores/monsters', () => ({}));
vi.mock('@/stores/encounters', () => ({}));
// ... existing code ... 