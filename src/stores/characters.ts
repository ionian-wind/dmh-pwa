import characterSchema from '@/schemas/character.schema.json';
import {registerValidationSchema} from '@/utils/schemaValidator';

registerValidationSchema('character', characterSchema);
