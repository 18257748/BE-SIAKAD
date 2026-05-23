const toCreateSemesterData = ({ name, academicYearId, isActive }) => ({
  nama: `${name}`.trim(),
  tahun_ajaran_id: academicYearId,
  is_active: isActive === true,
});

const toUpdateSemesterData = ({ name, academicYearId, isActive }) => {
  const data = {};
  if (name !== undefined) data.nama = `${name}`.trim();
  if (academicYearId !== undefined) data.tahun_ajaran_id = academicYearId;
  if (isActive !== undefined) data.is_active = isActive === true;
  return data;
};

module.exports = { toCreateSemesterData, toUpdateSemesterData };
