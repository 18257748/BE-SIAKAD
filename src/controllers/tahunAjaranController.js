// src/controllers/tahunAjaranController.js
// ═══════════════════════════════════════════════
// TAHUN AJARAN CONTROLLER
// ═══════════════════════════════════════════════

const prisma = require('../config/prisma');

const getAll = async (req, res) => {
  try {
    const data = await prisma.tahunAjaran.findMany({
      orderBy: { kode: 'desc' },
      include: { _count: { select: { semester: true, rombel: true } } },
    });

    return res.status(200).json({
      message: 'Data tahun ajaran berhasil diambil',
      data: data.map((d) => ({
        id: d.id,
        code: d.kode,
        description: d.deskripsi,
        isActive: d.is_active,
        semesterCount: d._count.semester,
        rombelCount: d._count.rombel,
      })),
    });
  } catch (error) {
    console.error('TahunAjaran GetAll Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

const create = async (req, res) => {
  try {
    const { code, description, isActive } = req.body;

    if (!code || !description) {
      return res.status(400).json({ message: 'Kode dan deskripsi wajib diisi' });
    }

    // If setting as active, deactivate others
    if (isActive) {
      await prisma.tahunAjaran.updateMany({ data: { is_active: false } });
    }

    const data = await prisma.tahunAjaran.create({
      data: { kode: code, deskripsi: description, is_active: isActive || false },
    });

    return res.status(201).json({
      message: 'Tahun ajaran berhasil ditambahkan',
      data: { id: data.id, code: data.kode, description: data.deskripsi, isActive: data.is_active },
    });
  } catch (error) {
    console.error('TahunAjaran Create Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

const update = async (req, res) => {
  try {
    const { code, description, isActive } = req.body;

    // If setting as active, deactivate others
    if (isActive) {
      await prisma.tahunAjaran.updateMany({ data: { is_active: false } });
    }

    const data = await prisma.tahunAjaran.update({
      where: { id: req.params.id },
      data: {
        ...(code && { kode: code }),
        ...(description && { deskripsi: description }),
        ...(isActive !== undefined && { is_active: isActive }),
      },
    });

    return res.status(200).json({
      message: 'Tahun ajaran berhasil diperbarui',
      data: { id: data.id, code: data.kode, description: data.deskripsi, isActive: data.is_active },
    });
  } catch (error) {
    console.error('TahunAjaran Update Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

const toggleActive = async (req, res) => {
  try {
    const existing = await prisma.tahunAjaran.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });

    const newActive = !existing.is_active;

    const data = await prisma.$transaction(async (tx) => {
      if (newActive) {
        await tx.tahunAjaran.updateMany({ data: { is_active: false } });
        await tx.semester.updateMany({ data: { is_active: false } });
      } else {
        await tx.semester.updateMany({
          where: { tahun_ajaran_id: req.params.id },
          data: { is_active: false },
        });
      }

      return tx.tahunAjaran.update({
        where: { id: req.params.id },
        data: { is_active: newActive },
      });
    });

    return res.status(200).json({
      message: `Tahun ajaran berhasil ${newActive ? 'diaktifkan' : 'dinonaktifkan'}`,
      data: { id: data.id, code: data.kode, description: data.deskripsi, isActive: data.is_active },
    });
  } catch (error) {
    console.error('TahunAjaran Toggle Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

const generateRombel = async (req, res) => {
  try {
    const tahunAjaranId = req.params.id;

    const tahunAjaran = await prisma.tahunAjaran.findUnique({
      where: { id: tahunAjaranId },
      select: { id: true, kode: true, deskripsi: true, is_active: true },
    });

    if (!tahunAjaran) {
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    }

    const [masterKelasList, existingRombel] = await Promise.all([
      prisma.masterKelas.findMany({
        select: { id: true, nama: true },
        orderBy: { nama: 'asc' },
      }),
      prisma.rombel.findMany({
        where: { tahun_ajaran_id: tahunAjaranId },
        select: { master_kelas_id: true },
      }),
    ]);

    const existingMasterKelasIds = new Set(existingRombel.map((item) => item.master_kelas_id));
    const missingMasterKelas = masterKelasList.filter((kelas) => !existingMasterKelasIds.has(kelas.id));

    let createdCount = 0;
    if (missingMasterKelas.length > 0) {
      const result = await prisma.rombel.createMany({
        data: missingMasterKelas.map((kelas) => ({
          master_kelas_id: kelas.id,
          tahun_ajaran_id: tahunAjaranId,
          wali_kelas_id: null,
          ruang_kelas_id: null,
        })),
        skipDuplicates: true,
      });
      createdCount = result.count;
    }

    return res.status(200).json({
      message: 'Generate rombel berhasil',
      data: {
        tahunAjaranId: tahunAjaran.id,
        tahunAjaranCode: tahunAjaran.kode,
        totalMasterKelas: masterKelasList.length,
        rombelDibuat: createdCount,
      },
    });
  } catch (error) {
    console.error('TahunAjaran GenerateRombel Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.tahunAjaran.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: 'Tahun ajaran berhasil dihapus' });
  } catch (error) {
    console.error('TahunAjaran Delete Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

module.exports = { getAll, create, update, toggleActive, remove, generateRombel };
