import Ajv from 'ajv';
import type {AnySchema} from "ajv/lib/types";

const ajv = new Ajv({ allErrors: true });

export function registerValidationSchema(schemaName: string, schema: AnySchema): void {
  ajv.addSchema(schema, schemaName);
}

export async function validateSchema(schemaName: string, data: unknown): Promise<{ valid: boolean, errors: string[] }> {
  const validate = ajv.getSchema(schemaName);

  if (!validate) {
    throw new Error(`Schema "${schemaName}" not found`);
  }

  await validate(data);
  const valid = validate.errors == null || validate.errors.length === 0;
  const errors = (validate.errors || []).map(error => {
    const path = error.instancePath ? ` at ${error.instancePath}` : '';
    return `${error.message}${path}`;
  });

  return { valid, errors };

}

export async function getValidationErrors(schemaName: string, data: unknown): Promise<string[]> {
  const validate = ajv.getSchema(schemaName);
  if (!validate) {
    throw new Error(`Schema "${schemaName}" not found`);
  }
  await validate(data);
  return (validate.errors || []).map(error => {
    const path = error.instancePath ? ` at ${error.instancePath}` : '';
    return `${error.message}${path}`;
  });
}

export async function validateArray(schemaName: string, data: unknown): Promise<boolean> {
  if (!Array.isArray(data)) {
    return false;
  }
  const results = await Promise.all(data.map(item => validateSchema(schemaName, item)));
  return results.every(Boolean);
}

export async function getArrayValidationErrors(schemaName: string, data: unknown): Promise<string[]> {
  if (!Array.isArray(data)) {
    return ['Data is not an array'];
  }
  const errors: string[] = [];
  await Promise.all(data.map(async (item, index) => {
    const itemErrors = await getValidationErrors(schemaName, item);
    if (itemErrors.length > 0) {
      errors.push(`Item at index ${index}:`, ...itemErrors);
    }
  }));
  return errors;
}
