const ValidationError = require('../../shared/errors/ValidationError');
const { isNonEmptyString } = require('../../shared/validation/validators');

const validateCreateAcademicYear = ({ code, description }) => {
  const fields = {};
  if (!isNonEmptyString(code)) fields.code = ['Kode tahun ajaran wajib diisi'];
  if (!isNonEmptyString(description)) fields.description = ['Deskripsi wajib diisi'];

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Kode dan deskripsi wajib diisi', { fields });
  }
};

const validateUpdateAcademicYear = ({ code, description }) => {
  const fields = {};
  if (code !== undefined && !isNonEmptyString(code)) fields.code = ['Kode tahun ajaran tidak boleh kosong'];
  if (description !== undefined && !isNonEmptyString(description)) {
    fields.description = ['Deskripsi tidak boleh kosong'];
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Data tahun ajaran tidak valid', { fields });
  }
};

module.exports = { validateCreateAcademicYear, validateUpdateAcademicYear };
