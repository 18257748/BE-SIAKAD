const toSubjectDto = (subject) => {
  if (!subject) return null;

  return {
    id: subject.id,
    code: subject.kode,
    name: subject.nama,
    category: subject.kategori,
    kkm: subject.kkm,
    description: subject.deskripsi,
  };
};

module.exports = { toSubjectDto };
