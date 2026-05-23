const toAcademicYearDto = (year) => {
  if (!year) return null;

  return {
    id: year.id,
    code: year.kode,
    description: year.deskripsi,
    isActive: year.is_active,
    ...(year._count && {
      semesterCount: year._count.semester,
      rombelCount: year._count.rombel,
    }),
  };
};

module.exports = { toAcademicYearDto };
