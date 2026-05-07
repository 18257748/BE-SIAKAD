// src/controllers/masterKelasController.js
// ═══════════════════════════════════════════════
// MASTER KELAS CONTROLLER
// ═══════════════════════════════════════════════

const prisma = require('../config/prisma');

const getAll = async (req, res) => {
  try {
    const activeTahun = await prisma.tahunAjaran.findFirst({
      where: { is_active: true },
      select: { id: true },
    });

    const [data, activeRombel] = await Promise.all([
      prisma.masterKelas.findMany({
        select: { id: true, nama: true, tingkat: true },
        orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }],
      }),
      activeTahun
        ? prisma.rombel.findMany({
            where: { tahun_ajaran_id: activeTahun.id },
            select: {
              master_kelas_id: true,
              wali_kelas_id: true,
              ruang_kelas_id: true,
              wali_kelas: { select: { nama_lengkap: true } },
              ruang_kelas: { select: { kode: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const rombelMap = new Map(activeRombel.map((item) => [item.master_kelas_id, item]));

    return res.status(200).json({
      message: 'Data master kelas berhasil diambil',
      data: data.map((d) => ({
        id: d.id,
        name: d.nama,
        grade: d.tingkat,
        homeroomTeacher: rombelMap.get(d.id)?.wali_kelas?.nama_lengkap || '-',
        homeroomTeacherId: rombelMap.get(d.id)?.wali_kelas_id || null,
        classroom: rombelMap.get(d.id)?.ruang_kelas?.kode || '-',
        classroomId: rombelMap.get(d.id)?.ruang_kelas_id || null,
      })),
    });
  } catch (error) {
    console.error('MasterKelas GetAll Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

const create = async (req, res) => {
  try {
    const { name, grade, homeroomTeacherId, classroomId } = req.body;
    if (!name || !grade) {
      return res.status(400).json({ message: 'Nama kelas dan tingkat wajib diisi' });
    }

    // 1. Buat MasterKelas (data statis/template — tidak menyimpan wali/ruang di sini)
    const masterKelas = await prisma.masterKelas.create({
      data: { nama: name, tingkat: grade },
    });

    // 2. Jika ada wali/ruang, buat Rombel di tahun ajaran aktif
    //    agar konsisten dengan getAll() yang membaca dari tabel Rombel.
    let rombelData = null;
    if (homeroomTeacherId || classroomId) {
      const activeTahun = await prisma.tahunAjaran.findFirst({
        where: { is_active: true },
        select: { id: true },
      });

      if (activeTahun) {
        rombelData = await prisma.rombel.create({
          data: {
            master_kelas_id: masterKelas.id,
            tahun_ajaran_id: activeTahun.id,
            wali_kelas_id: homeroomTeacherId || null,
            ruang_kelas_id: classroomId || null,
          },
          include: {
            wali_kelas: { select: { nama_lengkap: true } },
            ruang_kelas: { select: { kode: true } },
          },
        });
      }
    }

    return res.status(201).json({
      message: 'Master kelas berhasil ditambahkan',
      data: {
        id: masterKelas.id,
        name: masterKelas.nama,
        grade: masterKelas.tingkat,
        homeroomTeacher: rombelData?.wali_kelas?.nama_lengkap || '-',
        classroom: rombelData?.ruang_kelas?.kode || '-',
      },
    });
  } catch (error) {
    console.error('MasterKelas Create Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

const update = async (req, res) => {
  try {
    const { name, grade, homeroomTeacherId, classroomId } = req.body;

    // 1. Update nama & tingkat di MasterKelas (data statis/template)
    const masterKelas = await prisma.masterKelas.update({
      where: { id: req.params.id },
      data: {
        ...(name && { nama: name }),
        ...(grade && { tingkat: grade }),
      },
    });

    // 2. Update wali_kelas & ruang_kelas di Rombel tahun ajaran aktif
    //    karena getAll() membaca data ini dari tabel Rombel.
    //    Gunakan upsert agar tetap bekerja meski Rombel belum ada.
    let rombelData = null;
    const hasRombelFields = homeroomTeacherId !== undefined || classroomId !== undefined;

    if (hasRombelFields) {
      const activeTahun = await prisma.tahunAjaran.findFirst({
        where: { is_active: true },
        select: { id: true },
      });

      if (!activeTahun) {
        return res.status(400).json({
          message: 'Tidak ada tahun ajaran aktif. Aktifkan tahun ajaran terlebih dahulu.',
        });
      }

      rombelData = await prisma.rombel.upsert({
        where: {
          master_kelas_id_tahun_ajaran_id: {
            master_kelas_id: req.params.id,
            tahun_ajaran_id: activeTahun.id,
          },
        },
        update: {
          ...(homeroomTeacherId !== undefined && { wali_kelas_id: homeroomTeacherId || null }),
          ...(classroomId !== undefined && { ruang_kelas_id: classroomId || null }),
        },
        create: {
          master_kelas_id: req.params.id,
          tahun_ajaran_id: activeTahun.id,
          wali_kelas_id: homeroomTeacherId || null,
          ruang_kelas_id: classroomId || null,
        },
        include: {
          wali_kelas: { select: { nama_lengkap: true } },
          ruang_kelas: { select: { kode: true } },
        },
      });
    }

    return res.status(200).json({
      message: 'Master kelas berhasil diperbarui',
      data: {
        id: masterKelas.id,
        name: masterKelas.nama,
        grade: masterKelas.tingkat,
        homeroomTeacher: rombelData?.wali_kelas?.nama_lengkap || '-',
        classroom: rombelData?.ruang_kelas?.kode || '-',
      },
    });
  } catch (error) {
    console.error('MasterKelas Update Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.masterKelas.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: 'Master kelas berhasil dihapus' });
  } catch (error) {
    console.error('MasterKelas Delete Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

module.exports = { getAll, create, update, remove };
