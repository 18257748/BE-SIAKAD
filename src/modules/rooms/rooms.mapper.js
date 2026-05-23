const toRoomDto = (room) => {
  if (!room) return null;

  return {
    id: room.id,
    code: room.kode,
    building: room.gedung,
    capacity: room.kapasitas,
  };
};

module.exports = { toRoomDto };
