const toCreateAcademicYearData = ({ code, description, isActive }) => ({
  kode: `${code}`.trim(),
  deskripsi: `${description}`.trim(),
  is_active: isActive === true,
});

const toUpdateAcademicYearData = ({ code, description, isActive }) => {
  const data = {};
  if (code !== undefined) data.kode = `${code}`.trim();
  if (description !== undefined) data.deskripsi = `${description}`.trim();
  if (isActive !== undefined) data.is_active = isActive === true;
  return data;
};

module.exports = { toCreateAcademicYearData, toUpdateAcademicYearData };
