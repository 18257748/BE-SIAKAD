const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFlaws() {
  console.log("=== MEMULAI PENGUJIAN CELAH LOGIKA (TANPA PERBAIKAN) ===\n");

  try {
    // 1. UJI CELAH JURNAL MENGAJAR (Jadwal Global vs Semester)
    console.log(">> Menguji Celah 1: Jurnal Mengajar Bentrok (Jadwal Global)");
    // Cari satu jadwal acak
    const jadwal = await prisma.jadwalPelajaran.findFirst();
    if (jadwal) {
      // Cari guru jadwal tersebut
      const guru = await prisma.user.findUnique({ where: { id: jadwal.guru_id }});
      if (guru) {
        console.log(`   - Menggunakan Jadwal ID: ${jadwal.id}`);
        // Simulasi pengisian jurnal pertemuan 1 di Semester Ganjil
        const jurnal1 = await prisma.jurnalMengajar.upsert({
          where: { jadwal_id_pertemuan_ke: { jadwal_id: jadwal.id, pertemuan_ke: 1 } },
          update: {},
          create: {
            jadwal_id: jadwal.id,
            guru_id: guru.id,
            tanggal: new Date().toISOString().split('T')[0],
            pertemuan_ke: 1,
            judul_materi: "Materi Semester Ganjil",
          }
        });
        console.log("   [V] Berhasil membuat Jurnal Pertemuan 1 (Simulasi Semester Ganjil)");

        try {
          // Simulasi: Semester berganti ke Genap. Jadwal tetap sama (karena global).
          // Guru mencoba mengisi jurnal pertemuan 1 untuk Semester Genap.
          await prisma.jurnalMengajar.create({
            data: {
              jadwal_id: jadwal.id,
              guru_id: guru.id,
              tanggal: new Date().toISOString().split('T')[0],
              pertemuan_ke: 1,
              judul_materi: "Materi Semester Genap",
            }
          });
          console.log("   [?] Harusnya gagal, tapi berhasil?");
        } catch (error) {
          console.log("   [X] ERROR TERBUKTI: Gagal membuat Jurnal Pertemuan 1 untuk Semester Genap karena jadwal_id global sudah dipakai di pertemuan 1 sebelumnya.");
          console.log(`       Pesan Error Prisma: ${error.message.split('\n').pop()}`);
        }
      }
    } else {
      console.log("   - Skip Celah 1: Tidak ada data Jadwal Pelajaran untuk diuji.");
    }
    console.log("----------------------------------------------------------\n");

    // 2. UJI CELAH DOUBLE ASSIGN SISWA KE 2 KELAS BERBEDA DI TAHUN YANG SAMA
    console.log(">> Menguji Celah 5: Double Assign Siswa di Tahun Ajaran Sama");
    const tahunAjaran = await prisma.tahunAjaran.findFirst({
        include: { rombel: true }
    });

    if (tahunAjaran && tahunAjaran.rombel.length >= 2) {
      const rombelA = tahunAjaran.rombel[0];
      const rombelB = tahunAjaran.rombel[1];

      // Cari satu siswa acak
      const roleSiswa = await prisma.role.findFirst({ where: { nama_role: 'Siswa' } });
      const siswa = await prisma.user.findFirst({ where: { role_id: roleSiswa.id } });

      if (siswa) {
        console.log(`   - Menggunakan Siswa ID: ${siswa.id} (${siswa.nama_lengkap})`);
        console.log(`   - Tahun Ajaran: ${tahunAjaran.kode}`);
        console.log(`   - Rombel A: ${rombelA.id}`);
        console.log(`   - Rombel B: ${rombelB.id}`);

        // Bersihkan dulu dari rombel ini agar tes valid
        await prisma.rombelSiswa.deleteMany({
            where: { siswa_id: siswa.id, rombel_id: { in: [rombelA.id, rombelB.id] } }
        });

        // Simulasi API Controller (hanya melakukan create tanpa validasi lintas rombel)
        await prisma.rombelSiswa.create({
            data: { rombel_id: rombelA.id, siswa_id: siswa.id }
        });
        console.log("   [V] Siswa berhasil di-assign ke Rombel A.");

        // Coba assign ke Rombel B di tahun ajaran yang SAMA
        try {
            await prisma.rombelSiswa.create({
                data: { rombel_id: rombelB.id, siswa_id: siswa.id }
            });
            console.log("   [X] ERROR TERBUKTI (LOGICAL FLAW): Sistem MENGIZINKAN siswa yang sama dimasukkan ke Rombel B padahal dia sudah ada di Rombel A pada tahun ajaran yang sama!");
        } catch (error) {
            console.log("   [V] Sistem menolak (Sudah aman).");
        }
      }
    } else {
      console.log("   - Skip Celah 5: Butuh minimal 2 Rombel di Tahun Ajaran yang sama dan 1 data Siswa.");
    }
    console.log("----------------------------------------------------------\n");

  } catch (error) {
    console.error("Test Script Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testFlaws();
