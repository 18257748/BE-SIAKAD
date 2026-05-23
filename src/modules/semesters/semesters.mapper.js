const toSemesterDto = (semester) => {
  if (!semester) return null;

  return {
    id: semester.id,
    name: semester.nama,
    academicYear: semester.tahun_ajaran?.kode,
    academicYearId: semester.tahun_ajaran_id,
    isActive: semester.is_active,
  };
};

const toActiveSemesterDto = (semester) => {
  if (!semester) return null;

  return {
    id: semester.id,
    nama: semester.nama,
    tahunAjaran: semester.tahun_ajaran?.kode || '-',
    label: `${semester.nama} - ${semester.tahun_ajaran?.kode || '-'}`,
  };
};

module.exports = { toSemesterDto, toActiveSemesterDto };
