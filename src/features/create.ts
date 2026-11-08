export interface CreatedEntity {
  id: string;
  label: string;
}

export function stripEntityMeta<T extends Record<string, unknown>>(
  payload: T,
): T {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = payload;
  return rest as T;
}
