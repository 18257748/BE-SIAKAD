const toCreateMasterClassData = ({ name, grade }) => ({
  nama: `${name}`.trim(),
  tingkat: `${grade}`.trim(),
});

const toUpdateMasterClassData = ({ name, grade }) => {
  const data = {};
  if (name !== undefined) data.nama = `${name}`.trim();
  if (grade !== undefined) data.tingkat = `${grade}`.trim();
  return data;
};

const toRombelAssignmentData = ({ homeroomTeacherId, classroomId }) => {
  const data = {};
  if (homeroomTeacherId !== undefined) data.wali_kelas_id = homeroomTeacherId || null;
  if (classroomId !== undefined) data.ruang_kelas_id = classroomId || null;
  return data;
};

module.exports = {
  toCreateMasterClassData,
  toUpdateMasterClassData,
  toRombelAssignmentData,
};
