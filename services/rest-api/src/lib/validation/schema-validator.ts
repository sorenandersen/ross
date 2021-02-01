import Ajv from 'ajv';

export const validate = (schema: object, data: object) => {
  const ajv = new Ajv({ schemaId: 'auto', allErrors: true });
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
  const valid = ajv.validate(schema, data);
  const errorsText =
    ajv.errorsText() && ajv.errorsText().toLowerCase() !== 'no errors'
      ? ajv.errorsText()
      : undefined;

  return {
    errorsText,
    valid: !!valid,
  };
};
