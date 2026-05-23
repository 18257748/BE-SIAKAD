require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('\n══════════════════════════════════════');
  console.log(`  SIAKAD Backend v2.0 Running on port ${PORT}`);
  console.log(`  http://localhost:${PORT}/api/health`);
  console.log('══════════════════════════════════════\n');
});
