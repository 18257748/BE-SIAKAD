const toCreateSubjectData = ({ code, name, category, kkm, description }) => ({
  kode: `${code}`.trim(),
  nama: `${name}`.trim(),
  kategori: `${category}`.trim(),
  kkm: Number.parseInt(kkm, 10) || 75,
  deskripsi: description || null,
});

const toUpdateSubjectData = ({ code, name, category, kkm, description }) => {
  const data = {};
  if (code !== undefined) data.kode = `${code}`.trim();
  if (name !== undefined) data.nama = `${name}`.trim();
  if (category !== undefined) data.kategori = `${category}`.trim();
  if (kkm !== undefined) data.kkm = Number.parseInt(kkm, 10);
  if (description !== undefined) data.deskripsi = description || null;
  return data;
};

module.exports = { toCreateSubjectData, toUpdateSubjectData };
