const ValidationError = require('../../shared/errors/ValidationError');
const { isNonEmptyString, isPositiveInteger } = require('../../shared/validation/validators');

const validateRequiredRoomFields = ({ code, building, capacity }) => {
  const fields = {};

  if (!isNonEmptyString(code)) fields.code = ['Kode ruang wajib diisi'];
  if (!isNonEmptyString(building)) fields.building = ['Gedung wajib diisi'];
  if (!isPositiveInteger(capacity)) fields.capacity = ['Kapasitas harus berupa angka positif'];

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Kode, gedung, dan kapasitas wajib diisi dengan benar', {
      fields,
    });
  }
};

const validateUpdateRoomFields = ({ code, building, capacity }) => {
  const fields = {};

  if (code !== undefined && !isNonEmptyString(code)) fields.code = ['Kode ruang tidak boleh kosong'];
  if (building !== undefined && !isNonEmptyString(building)) fields.building = ['Gedung tidak boleh kosong'];
  if (capacity !== undefined && !isPositiveInteger(capacity)) {
    fields.capacity = ['Kapasitas harus berupa angka positif'];
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Data ruang kelas tidak valid', { fields });
  }
};

module.exports = { validateRequiredRoomFields, validateUpdateRoomFields };
