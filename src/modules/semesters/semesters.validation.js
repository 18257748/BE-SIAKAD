const ValidationError = require('../../shared/errors/ValidationError');
const { isNonEmptyString } = require('../../shared/validation/validators');

const validateCreateSemester = ({ name, academicYearId }) => {
  const fields = {};
  if (!isNonEmptyString(name)) fields.name = ['Nama semester wajib diisi'];
  if (!isNonEmptyString(academicYearId)) fields.academicYearId = ['Tahun ajaran wajib diisi'];

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Nama semester dan tahun ajaran wajib diisi', { fields });
  }
};

const validateUpdateSemester = ({ name, academicYearId }) => {
  const fields = {};
  if (name !== undefined && !isNonEmptyString(name)) fields.name = ['Nama semester tidak boleh kosong'];
  if (academicYearId !== undefined && !isNonEmptyString(academicYearId)) {
    fields.academicYearId = ['Tahun ajaran tidak boleh kosong'];
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Data semester tidak valid', { fields });
  }
};

module.exports = { validateCreateSemester, validateUpdateSemester };
