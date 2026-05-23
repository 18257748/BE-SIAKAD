const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createPaginationMeta = ({ page = 1, limit = 10, total = 0 }) => {
  const safePage = toPositiveInt(page, 1);
  const safeLimit = toPositiveInt(limit, 10);
  const safeTotal = Math.max(Number.parseInt(total, 10) || 0, 0);
  const totalPages = safeLimit > 0 ? Math.ceil(safeTotal / safeLimit) : 0;

  return {
    page: safePage,
    limit: safeLimit,
    total: safeTotal,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1 && totalPages > 0,
  };
};

module.exports = { createPaginationMeta };
