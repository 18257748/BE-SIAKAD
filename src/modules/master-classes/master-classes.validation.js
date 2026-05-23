const ValidationError = require('../../shared/errors/ValidationError');
const { isNonEmptyString } = require('../../shared/validation/validators');

const validateCreateMasterClass = ({ name, grade }) => {
  const fields = {};
  if (!isNonEmptyString(name)) fields.name = ['Nama kelas wajib diisi'];
  if (!isNonEmptyString(grade)) fields.grade = ['Tingkat wajib diisi'];

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Nama kelas dan tingkat wajib diisi', { fields });
  }
};

const validateUpdateMasterClass = ({ name, grade }) => {
  const fields = {};
  if (name !== undefined && !isNonEmptyString(name)) fields.name = ['Nama kelas tidak boleh kosong'];
  if (grade !== undefined && !isNonEmptyString(grade)) fields.grade = ['Tingkat tidak boleh kosong'];

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Data master kelas tidak valid', { fields });
  }
};

module.exports = { validateCreateMasterClass, validateUpdateMasterClass };
