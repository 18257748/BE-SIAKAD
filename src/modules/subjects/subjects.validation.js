const ValidationError = require('../../shared/errors/ValidationError');
const { isNonEmptyString } = require('../../shared/validation/validators');

const validateCreateSubject = ({ code, name, category }) => {
  const fields = {};
  if (!isNonEmptyString(code)) fields.code = ['Kode mata pelajaran wajib diisi'];
  if (!isNonEmptyString(name)) fields.name = ['Nama mata pelajaran wajib diisi'];
  if (!isNonEmptyString(category)) fields.category = ['Kategori wajib diisi'];

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Kode, nama, dan kategori wajib diisi', { fields });
  }
};

const validateUpdateSubject = ({ code, name, category, kkm }) => {
  const fields = {};
  if (code !== undefined && !isNonEmptyString(code)) fields.code = ['Kode tidak boleh kosong'];
  if (name !== undefined && !isNonEmptyString(name)) fields.name = ['Nama tidak boleh kosong'];
  if (category !== undefined && !isNonEmptyString(category)) fields.category = ['Kategori tidak boleh kosong'];
  if (kkm !== undefined && Number.isNaN(Number.parseInt(kkm, 10))) fields.kkm = ['KKM harus berupa angka'];

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Data mata pelajaran tidak valid', { fields });
  }
};

module.exports = { validateCreateSubject, validateUpdateSubject };
