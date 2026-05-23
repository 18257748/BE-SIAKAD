const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isPositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
};

const isUuid = (value) => {
  if (!isNonEmptyString(value)) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

const pickMissingFields = (source, fields) => {
  return fields.filter((field) => {
    const value = source?.[field];
    return value === undefined || value === null || value === '';
  });
};

module.exports = {
  isNonEmptyString,
  isPositiveInteger,
  isUuid,
  pickMissingFields,
};
