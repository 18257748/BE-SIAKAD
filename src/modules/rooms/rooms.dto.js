const toCreateRoomData = ({ code, building, capacity }) => ({
  kode: `${code}`.trim(),
  gedung: `${building}`.trim(),
  kapasitas: Number.parseInt(capacity, 10),
});

const toUpdateRoomData = ({ code, building, capacity }) => {
  const data = {};

  if (code !== undefined) data.kode = `${code}`.trim();
  if (building !== undefined) data.gedung = `${building}`.trim();
  if (capacity !== undefined) data.kapasitas = Number.parseInt(capacity, 10);

  return data;
};

module.exports = { toCreateRoomData, toUpdateRoomData };
