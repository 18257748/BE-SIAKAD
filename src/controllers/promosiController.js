// src/controllers/promosiController.js
// ═══════════════════════════════════════════════
// PROMOSI (Kenaikan Kelas) CONTROLLER
// ═══════════════════════════════════════════════

const prisma = require('../config/prisma');
const { MIN_ATTENDANCE_RATE, MIN_AVERAGE_GRADE } = require('../config/academicThresholds');
const { canBypassWaliOwnership, findOwnedRombel } = require('../middlewares/ownershipMiddleware');

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const formatSiswaLabel = (siswa, fallback = '-') => {
  if (!siswa) return fallback;
  return siswa.nomor_induk
    ? `${siswa.nama_lengkap} (${siswa.nomor_induk})`
    : siswa.nama_lengkap;
};

/**
 * GET /api/promosi/rombel/:id
 * Mendapatkan daftar siswa di rombel beserta rata-rata nilai, kehadiran, dan status promosi.
 */
const getSiswaPromosi = async (req, res) => {
  try {
    const rombelId = req.params.id;

    const rombel = await findOwnedRombel({
      userId: req.user.userId,
      role: req.user.role,
      rombelId,
    });

    if (!rombel) {
      const status = canBypassWaliOwnership(req.user.role) ? 404 : 403;
      return res.status(status).json({ message: 'Rombel tidak ditemukan atau bukan kelas wali Anda' });
    }

    const siswaList = rombel.siswa.map((rs) => rs.siswa);

    // Ambil data nilai akhir rata-rata (hanya untuk tahun ajaran terkait)
    // Untuk mempermudah perhitungan, kita agregat manual atau panggil findMany
    const semesters = await prisma.semester.findMany({
      where: { tahun_ajaran_id: rombel.tahun_ajaran_id },
      select: { id: true }
    });
    const semesterIds = semesters.map(s => s.id);

    // Get all nilai and kehadiran for these students in this academic year.
    const nilaiData = await prisma.nilai.findMany({
      where: {
        siswa_id: { in: siswaList.map((s) => s.id) },
        semester_id: { in: semesterIds },
      },
      select: { siswa_id: true, nilai_akhir: true }
    });

    // Kehadiran (Hitung persentase kehadiran: HADIR / Total * 100)
    // For simplicity, we just count the occurrences.
    // In a real app, you would join JadwalPelajaran that belongs to this rombel.
    // Here we just find kehadiran by siswa.
    const kehadiranData = await prisma.kehadiran.findMany({
      where: {
        siswa_id: { in: siswaList.map((s) => s.id) },
        semester_id: { in: semesterIds },
      },
      select: { siswa_id: true, status: true }
    });

    // Construct the response
    const results = rombel.siswa.map((rs) => {
      const { siswa_id, status_promosi } = rs;
      const sNilai = nilaiData.filter((n) => n.siswa_id === siswa_id);
      const sKehadiran = kehadiranData.filter((k) => k.siswa_id === siswa_id);

      const missingData = [];
      if (sNilai.length === 0) missingData.push('nilai');
      if (sKehadiran.length === 0) missingData.push('kehadiran');
      const isDataComplete = missingData.length === 0;

      // Hitung rata-rata nilai tanpa fallback dummy.
      const avgNilai = sNilai.length > 0
        ? sNilai.reduce((acc, curr) => acc + curr.nilai_akhir, 0) / sNilai.length 
        : 0;

      // Hitung persentase kehadiran
      let hadirCount = 0;
      let totalCount = sKehadiran.length;
      sKehadiran.forEach(k => {
        if (['HADIR', 'SAKIT', 'IZIN'].includes(k.status)) hadirCount++;
      });
      const percentHadir = totalCount > 0 ? (hadirCount / totalCount) * 100 : 0;

      // Tentukan status default jika belum ada
      let status = status_promosi;
      if (!status) {
        status = isDataComplete
          ? ((avgNilai >= MIN_AVERAGE_GRADE && percentHadir >= MIN_ATTENDANCE_RATE) ? 'NAIK' : 'TINGGAL')
          : 'PERLU_CEK';
      }

      return {
        id: rs.siswa.id,
        nama: rs.siswa.nama_lengkap,
        nisn: rs.siswa.nomor_induk || '-',
        nilaiRataRata: avgNilai,
        persentaseKehadiran: Math.round(percentHadir),
        status: status === 'NAIK' ? 'naik' : (status === 'TINGGAL' ? 'tinggal' : 'perluCek'),
        isDataComplete,
        missingData,
      };
    });

    return res.status(200).json({
      message: 'Data siswa promosi berhasil diambil',
      isLocked: rombel.is_locked,
      data: results,
    });
  } catch (error) {
    console.error('getSiswaPromosi Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

/**
 * POST /api/promosi/lock
 * Menyimpan keputusan Wali Kelas (Naik/Tinggal) dan mengunci Rombel
 */
const lockPromosi = async (req, res) => {
  try {
    const { rombelId, decisions } = req.body; // decisions: [{ siswaId, status: 'naik'|'tinggal' }]

    if (!Array.isArray(decisions)) {
      return res.status(400).json({ message: 'Format decisions tidak valid' });
    }

    const rombel = await findOwnedRombel({
      userId: req.user.userId,
      role: req.user.role,
      rombelId,
    });
    if (!rombel) {
      const status = canBypassWaliOwnership(req.user.role) ? 404 : 403;
      return res.status(status).json({ message: 'Rombel tidak ditemukan atau bukan kelas wali Anda' });
    }

    const siswaIds = new Set(rombel.siswa.map((s) => s.siswa_id));
    if (decisions.length !== siswaIds.size) {
      return res.status(400).json({ message: 'Keputusan promosi harus mencakup semua siswa di rombel' });
    }

    for (const dec of decisions) {
      if (!siswaIds.has(dec.siswaId)) {
        return res.status(400).json({ message: 'Terdapat siswa yang bukan anggota rombel ini' });
      }
      if (!['naik', 'tinggal'].includes(dec.status)) {
        return res.status(400).json({ message: 'Semua siswa harus diputuskan naik atau tinggal kelas sebelum dikunci' });
      }
    }

    const naikIds = decisions
      .filter((dec) => dec.status === 'naik')
      .map((dec) => dec.siswaId);
    const tinggalIds = decisions
      .filter((dec) => dec.status === 'tinggal')
      .map((dec) => dec.siswaId);

    await prisma.$transaction([
      ...(naikIds.length > 0
        ? [
            prisma.rombelSiswa.updateMany({
              where: {
                rombel_id: rombelId,
                siswa_id: { in: naikIds },
              },
              data: { status_promosi: 'NAIK' },
            }),
          ]
        : []),
      ...(tinggalIds.length > 0
        ? [
            prisma.rombelSiswa.updateMany({
              where: {
                rombel_id: rombelId,
                siswa_id: { in: tinggalIds },
              },
              data: { status_promosi: 'TINGGAL' },
            }),
          ]
        : []),
      prisma.rombel.update({
        where: { id: rombelId },
        data: { is_locked: true },
      }),
    ]);

    return res.status(200).json({ message: 'Data promosi berhasil dikunci' });
  } catch (error) {
    console.error('lockPromosi Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

/**
 * POST /api/promosi/execute
 * Mengeksekusi migrasi dari rombel asal ke rombel tujuan (Kurikulum)
 */
const executePromosi = async (req, res) => {
  try {
    const { rombelAsalId, rombelTujuanId, tahunAjaranBaruId, siswaIds } = req.body;

    if (!rombelAsalId || !rombelTujuanId || !tahunAjaranBaruId) {
      return res.status(400).json({
        message: 'rombelAsalId, rombelTujuanId, dan tahunAjaranBaruId wajib diisi',
      });
    }

    if (!Array.isArray(siswaIds) || siswaIds.length === 0) {
      return res.status(400).json({ message: 'Tidak ada siswa yang dipilih untuk dipromosikan' });
    }

    if (rombelAsalId === rombelTujuanId) {
      return res.status(400).json({ message: 'Rombel asal dan rombel tujuan tidak boleh sama' });
    }

    const uniqueSiswaIds = [...new Set(siswaIds)];

    await prisma.$transaction(async (tx) => {
      const rombelAsal = await tx.rombel.findUnique({
        where: { id: rombelAsalId },
        select: {
          id: true,
          tahun_ajaran_id: true,
          is_locked: true,
        },
      });

      if (!rombelAsal) {
        throw createHttpError(404, 'Rombel asal tidak ditemukan');
      }

      if (!rombelAsal.is_locked) {
        throw createHttpError(400, 'Rombel Asal belum divalidasi dan dikunci oleh Wali Kelas');
      }

      const rombelTujuan = await tx.rombel.findUnique({
        where: { id: rombelTujuanId },
        select: {
          id: true,
          tahun_ajaran_id: true,
          master_kelas: {
            select: { nama: true },
          },
        },
      });

      if (!rombelTujuan) {
        throw createHttpError(404, 'Rombel tujuan tidak ditemukan');
      }

      if (rombelTujuan.tahun_ajaran_id !== tahunAjaranBaruId) {
        throw createHttpError(400, 'Rombel tujuan bukan dari Tahun Ajaran Baru yang dipilih');
      }

      if (rombelAsal.tahun_ajaran_id === rombelTujuan.tahun_ajaran_id) {
        throw createHttpError(400, 'Promosi harus dilakukan ke tahun ajaran yang berbeda');
      }

      const requestedStudents = await tx.user.findMany({
        where: { id: { in: uniqueSiswaIds } },
        select: {
          id: true,
          nama_lengkap: true,
          nomor_induk: true,
        },
      });
      const requestedStudentMap = new Map(
        requestedStudents.map((siswa) => [siswa.id, siswa]),
      );

      const sourceMemberships = await tx.rombelSiswa.findMany({
        where: {
          rombel_id: rombelAsalId,
          siswa_id: { in: uniqueSiswaIds },
        },
        select: {
          siswa_id: true,
        },
      });

      const sourceStudentIds = new Set(sourceMemberships.map((item) => item.siswa_id));
      const missingStudents = uniqueSiswaIds
        .filter((siswaId) => !sourceStudentIds.has(siswaId))
        .map((siswaId) => formatSiswaLabel(requestedStudentMap.get(siswaId), siswaId));

      if (missingStudents.length > 0) {
        throw createHttpError(
          400,
          `Siswa berikut tidak berasal dari rombel asal: ${missingStudents.join(', ')}`,
        );
      }

      const targetConflicts = await tx.rombelSiswa.findMany({
        where: {
          siswa_id: { in: uniqueSiswaIds },
          rombel_id: { not: rombelTujuanId },
          rombel: {
            tahun_ajaran_id: tahunAjaranBaruId,
          },
        },
        include: {
          siswa: {
            select: {
              id: true,
              nama_lengkap: true,
              nomor_induk: true,
            },
          },
          rombel: {
            include: {
              master_kelas: {
                select: {
                  nama: true,
                },
              },
            },
          },
        },
      });

      if (targetConflicts.length > 0) {
        const conflictMap = new Map();
        targetConflicts.forEach((conflict) => {
          if (!conflictMap.has(conflict.siswa_id)) {
            conflictMap.set(
              conflict.siswa_id,
              `${formatSiswaLabel(conflict.siswa)} (${conflict.rombel.master_kelas?.nama || 'Rombel'})`,
            );
          }
        });

        throw createHttpError(
          400,
          `Siswa berikut sudah terdaftar pada tahun ajaran target: ${[...conflictMap.values()].join(', ')}`,
        );
      }

      const createData = uniqueSiswaIds.map((siswaId) => ({
        rombel_id: rombelTujuanId,
        siswa_id: siswaId,
        status_promosi: null,
      }));

      await tx.rombelSiswa.createMany({
        data: createData,
      });
    });

    return res.status(200).json({ message: 'Migrasi berhasil dieksekusi!' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    if (error.code === 'P2002') {
      return res.status(400).json({
        message: 'Siswa sudah terdaftar pada rombel tujuan atau terjadi konflik data promosi',
      });
    }

    console.error('executePromosi Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

/**
 * POST /api/promosi/unlock
 * Membatalkan kunci rombel agar Wali Kelas bisa mengubah keputusan kenaikan.
 * Mereset is_locked = false dan status_promosi semua siswa di rombel ke null.
 */
const unlockPromosi = async (req, res) => {
  try {
    const { rombelId } = req.body;

    const rombel = await findOwnedRombel({
      userId: req.user.userId,
      role: req.user.role,
      rombelId,
    });
    if (!rombel) {
      const status = canBypassWaliOwnership(req.user.role) ? 404 : 403;
      return res.status(status).json({ message: 'Rombel tidak ditemukan atau bukan kelas wali Anda' });
    }

    if (!rombel.is_locked) {
      return res.status(400).json({ message: 'Data kenaikan kelas belum dikunci, tidak perlu dibatalkan' });
    }

    await prisma.$transaction([
      // Reset semua status_promosi siswa di rombel ini ke null
      prisma.rombelSiswa.updateMany({
        where: { rombel_id: rombelId },
        data: { status_promosi: null },
      }),
      // Buka kunci rombel
      prisma.rombel.update({
        where: { id: rombelId },
        data: { is_locked: false },
      }),
    ]);

    return res.status(200).json({ message: 'Kunci data kenaikan berhasil dibatalkan. Status siswa direset.' });
  } catch (error) {
    console.error('unlockPromosi Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

module.exports = {
  getSiswaPromosi,
  lockPromosi,
  unlockPromosi,
  executePromosi,
};
