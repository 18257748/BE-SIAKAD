const toMasterClassDto = (masterClass, rombel = null) => ({
  id: masterClass.id,
  name: masterClass.nama,
  grade: masterClass.tingkat,
  homeroomTeacher: rombel?.wali_kelas?.nama_lengkap || '-',
  homeroomTeacherId: rombel?.wali_kelas_id || null,
  classroom: rombel?.ruang_kelas?.kode || '-',
  classroomId: rombel?.ruang_kelas_id || null,
});

module.exports = { toMasterClassDto };
