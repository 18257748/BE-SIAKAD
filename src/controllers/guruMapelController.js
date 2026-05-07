// src/controllers/guruMapelController.js
// ═══════════════════════════════════════════════
// GURU-MAPEL MAPPING CONTROLLER
// ═══════════════════════════════════════════════

const prisma = require('../config/prisma');

const parseClasses = (classes = '') =>
  `${classes}`
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const uniq = (values = []) => [...new Set(values.filter(Boolean).map((value) => `${value}`.trim()).filter(Boolean))];

const normalizeClasses = (classes = '') => [...new Set(parseClasses(classes))].join(', ');

const getMasterKelasLookup = async () => {
  const rows = await prisma.masterKelas.findMany({
    select: { id: true, nama: true },
  });

  const byId = new Map();
  const byName = new Map();
  rows.forEach((row) => {
    byId.set(row.id, row.nama);
    byName.set(row.nama, row.id);
  });

  return { byId, byName };
};

const resolveGuruMapelKelas = async ({ masterKelasIds, classes }) => {
  const lookup = await getMasterKelasLookup();
  const requestedIds = Array.isArray(masterKelasIds) ? uniq(masterKelasIds) : [];

  if (requestedIds.length > 0) {
    const missing = requestedIds.filter((id) => !lookup.byId.has(id));
    if (missing.length > 0) {
      return {
        error: `Beberapa kelas tidak ditemukan: ${missing.join(', ')}`,
      };
    }

    return {
      lookup,
      masterKelasIds: requestedIds,
      masterKelasNames: requestedIds.map((id) => lookup.byId.get(id)).filter(Boolean),
    };
  }

  const classNames = parseClasses(classes);
  if (classNames.length === 0) {
    return {
      error: 'Minimal satu kelas yang diampu wajib dipilih',
    };
  }

  const missing = classNames.filter((name) => !lookup.byName.has(name));
  if (missing.length > 0) {
    return {
      error: `Beberapa kelas tidak ditemukan: ${missing.join(', ')}`,
    };
  }

  return {
    lookup,
    masterKelasIds: classNames.map((name) => lookup.byName.get(name)).filter(Boolean),
    masterKelasNames: classNames,
  };
};

const getMappingClassIds = (mapping, lookup = null) => {
  const pivotIds = (mapping.kelas_relasi || [])
    .map((item) => item.master_kelas_id)
    .filter(Boolean);
  if (pivotIds.length > 0) return pivotIds;

  if (!lookup) return [];
  return parseClasses(mapping.kelas_diampu)
    .map((name) => lookup.byName.get(name))
    .filter(Boolean);
};

const syncSchedulesForMapping = async ({
  client = prisma,
  teacherId,
  subjectId,
  masterKelasIds,
}) => {
  if (!teacherId || !subjectId || !masterKelasIds || masterKelasIds.length === 0) {
    return { count: 0 };
  }

  const activeSemester = await client.semester.findFirst({
    where: { is_active: true },
    select: { id: true },
  });

  return client.jadwalPelajaran.updateMany({
    where: {
      ...(activeSemester ? { semester_id: activeSemester.id } : {}),
      mata_pelajaran_id: subjectId,
      master_kelas_id: { in: masterKelasIds },
    },
    data: { guru_id: teacherId },
  });
};

const findClassSubjectConflicts = async ({
  subjectId,
  masterKelasIds,
  excludeId = null,
  lookup = null,
}) => {
  if (!subjectId || !masterKelasIds || masterKelasIds.length === 0) return [];

  const existingMappings = await prisma.guruMapel.findMany({
    where: {
      mata_pelajaran_id: subjectId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: {
      guru: { select: { nama_lengkap: true } },
      mata_pelajaran: { select: { nama: true } },
      kelas_relasi: {
        select: {
          master_kelas_id: true,
          master_kelas: { select: { nama: true } },
        },
      },
    },
  });

  const conflicts = [];
  for (const mapping of existingMappings) {
    const existingClassIds = getMappingClassIds(mapping, lookup);
    const overlap = masterKelasIds.filter((classId) => existingClassIds.includes(classId));
    overlap.forEach((classId) => {
      conflicts.push({
        className: lookup?.byId.get(classId) || mapping.kelas_relasi?.find((rel) => rel.master_kelas_id === classId)?.master_kelas?.nama || '-',
        subject: mapping.mata_pelajaran?.nama || 'Mata Pelajaran',
        teacher: mapping.guru?.nama_lengkap || 'Guru lain',
      });
    });
  }

  return conflicts;
};

const sendConflictResponse = (res, conflicts) => {
  const conflictText = conflicts
    .map((item) => `${item.className} - ${item.subject} sudah dipetakan ke ${item.teacher}`)
    .join('; ');

  return res.status(409).json({
    message: `Pemetaan duplikat tidak diizinkan. ${conflictText}`,
    errorCode: 'DUPLICATE_CLASS_SUBJECT_MAPPING',
    conflicts,
  });
};

const getAll = async (req, res) => {
  try {
    const { search = '' } = req.query;

    const where = search
      ? {
          OR: [
            { guru: { nama_lengkap: { contains: search, mode: 'insensitive' } } },
            { mata_pelajaran: { nama: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const data = await prisma.guruMapel.findMany({
      where,
      include: {
        guru: { select: { id: true, nama_lengkap: true } },
        mata_pelajaran: { select: { id: true, nama: true } },
        kelas_relasi: {
          select: {
            master_kelas_id: true,
            master_kelas: { select: { id: true, nama: true } },
          },
        },
      },
      orderBy: { guru: { nama_lengkap: 'asc' } },
    });

    // Get active tahun ajaran to find relevant master_kelas IDs
    const activeTahun = await prisma.tahunAjaran.findFirst({ where: { is_active: true } });

    // Get master_kelas IDs that have a rombel in the active tahun ajaran
    let activeMasterKelasIds = null;
    if (activeTahun) {
      const activeRombels = await prisma.rombel.findMany({
        where: { tahun_ajaran_id: activeTahun.id },
        select: { master_kelas_id: true },
      });
      activeMasterKelasIds = activeRombels.map((r) => r.master_kelas_id);
    }

    // Count scheduled slots per guru (filtered by active year via master_kelas)
    const jadwalCounts = await prisma.jadwalPelajaran.groupBy({
      by: ['guru_id'],
      where: activeMasterKelasIds
        ? { master_kelas_id: { in: activeMasterKelasIds } }
        : {},
      _count: { id: true },
    });
    const countMap = {};
    jadwalCounts.forEach((j) => (countMap[j.guru_id] = j._count.id));

    return res.status(200).json({
      message: 'Data pemetaan guru-mapel berhasil diambil',
      data: data.map((d) => ({
        id: d.id,
        teacher: d.guru.nama_lengkap,
        teacherId: d.guru_id,
        subject: d.mata_pelajaran.nama,
        subjectId: d.mata_pelajaran_id,
        masterKelasIds: d.kelas_relasi?.map((item) => item.master_kelas_id) || [],
        classes:
          d.kelas_relasi?.map((item) => item.master_kelas?.nama).filter(Boolean).join(', ') ||
          d.kelas_diampu ||
          '-',
        hoursPerWeek: d.jam_per_minggu,
        scheduled: countMap[d.guru_id] || 0, // dihitung dari jadwal aktif
      })),
    });
  } catch (error) {
    console.error('GuruMapel GetAll Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

const create = async (req, res) => {
  try {
    const { teacherId, subjectId, classes, masterKelasIds, hoursPerWeek } = req.body;
    if (!teacherId || !subjectId) {
      return res.status(400).json({ message: 'Guru dan mata pelajaran wajib diisi' });
    }
    const resolved = await resolveGuruMapelKelas({ masterKelasIds, classes });
    if (resolved.error) {
      return res.status(400).json({ message: resolved.error });
    }

    const conflicts = await findClassSubjectConflicts({
      subjectId,
      masterKelasIds: resolved.masterKelasIds,
      lookup: resolved.lookup,
    });
    if (conflicts.length > 0) return sendConflictResponse(res, conflicts);

    const result = await prisma.$transaction(async (tx) => {
      const data = await tx.guruMapel.create({
        data: {
          guru_id: teacherId,
          mata_pelajaran_id: subjectId,
          kelas_diampu: resolved.masterKelasNames.join(', '),
          jam_per_minggu: parseInt(hoursPerWeek) || 0,
        },
        include: {
          guru: { select: { nama_lengkap: true } },
          mata_pelajaran: { select: { nama: true } },
        },
      });

      if (resolved.masterKelasIds.length > 0) {
        await tx.guruMapelKelas.createMany({
          data: resolved.masterKelasIds.map((masterKelasId) => ({
            guru_mapel_id: data.id,
            master_kelas_id: masterKelasId,
          })),
          skipDuplicates: true,
        });
      }

      const syncedSchedules = await syncSchedulesForMapping({
        client: tx,
        teacherId,
        subjectId,
        masterKelasIds: resolved.masterKelasIds,
      });

      return { data, syncedSchedules };
    });
    const { data, syncedSchedules } = result;

    return res.status(201).json({
      message: 'Pemetaan guru-mapel berhasil ditambahkan',
      data: {
        id: data.id,
        teacher: data.guru.nama_lengkap,
        subject: data.mata_pelajaran.nama,
        masterKelasIds: resolved.masterKelasIds,
        classes: resolved.masterKelasNames.join(', '),
        hoursPerWeek: data.jam_per_minggu,
        syncedSchedules: syncedSchedules.count,
      },
    });
  } catch (error) {
    console.error('GuruMapel Create Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

const update = async (req, res) => {
  try {
    const { teacherId, subjectId, classes, masterKelasIds, hoursPerWeek } = req.body;
    const existing = await prisma.guruMapel.findUnique({
      where: { id: req.params.id },
      include: {
        kelas_relasi: {
          select: {
            master_kelas_id: true,
            master_kelas: { select: { nama: true } },
          },
        },
      },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Pemetaan guru-mapel tidak ditemukan' });
    }

    const nextSubjectId = subjectId || existing.mata_pelajaran_id;
    const nextTeacherId = teacherId || existing.guru_id;
    const resolved = await resolveGuruMapelKelas({
      masterKelasIds,
      classes: classes !== undefined ? classes : existing.kelas_diampu,
    });
    if (resolved.error) {
      return res.status(400).json({ message: resolved.error });
    }

    const conflicts = await findClassSubjectConflicts({
      subjectId: nextSubjectId,
      masterKelasIds: resolved.masterKelasIds,
      excludeId: req.params.id,
      lookup: resolved.lookup,
    });
    if (conflicts.length > 0) return sendConflictResponse(res, conflicts);

    const result = await prisma.$transaction(async (tx) => {
      const data = await tx.guruMapel.update({
        where: { id: req.params.id },
        data: {
          guru_id: nextTeacherId,
          mata_pelajaran_id: nextSubjectId,
          kelas_diampu: resolved.masterKelasNames.join(', '),
          ...(hoursPerWeek !== undefined && { jam_per_minggu: parseInt(hoursPerWeek) }),
        },
        include: {
          guru: { select: { nama_lengkap: true } },
          mata_pelajaran: { select: { nama: true } },
        },
      });

      await tx.guruMapelKelas.deleteMany({
        where: { guru_mapel_id: req.params.id },
      });

      if (resolved.masterKelasIds.length > 0) {
        await tx.guruMapelKelas.createMany({
          data: resolved.masterKelasIds.map((masterKelasId) => ({
            guru_mapel_id: req.params.id,
            master_kelas_id: masterKelasId,
          })),
          skipDuplicates: true,
        });
      }

      const syncedSchedules = await syncSchedulesForMapping({
        client: tx,
        teacherId: nextTeacherId,
        subjectId: nextSubjectId,
        masterKelasIds: resolved.masterKelasIds,
      });

      return { data, syncedSchedules };
    });
    const { data, syncedSchedules } = result;
    return res.status(200).json({
      message: 'Pemetaan guru-mapel berhasil diperbarui',
      data: {
        id: data.id,
        teacher: data.guru.nama_lengkap,
        subject: data.mata_pelajaran.nama,
        masterKelasIds: resolved.masterKelasIds,
        classes: resolved.masterKelasNames.join(', '),
        hoursPerWeek: data.jam_per_minggu,
        syncedSchedules: syncedSchedules.count,
      },
    });
  } catch (error) {
    console.error('GuruMapel Update Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.guruMapel.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: 'Pemetaan guru-mapel berhasil dihapus' });
  } catch (error) {
    console.error('GuruMapel Delete Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal pada server' });
  }
};

module.exports = { getAll, create, update, remove };
