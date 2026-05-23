const buildMeta = (res, meta = {}) => {
  const requestId = res.req?.requestId;

  return {
    ...meta,
    requestId: meta.requestId || requestId,
    timestamp: meta.timestamp || new Date().toISOString(),
  };
};

const sendSuccess = (
  res,
  {
    message = 'Berhasil',
    data = null,
    meta = {},
    statusCode = 200,
  } = {}
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: buildMeta(res, meta),
  });
};

const sendCreated = (
  res,
  { message = 'Data berhasil dibuat', data = null, meta = {} } = {}
) => {
  return sendSuccess(res, { message, data, meta, statusCode: 201 });
};

const sendNoContent = (res, { message = 'Data berhasil dihapus' } = {}) => {
  return sendSuccess(res, { message, data: null, statusCode: 200 });
};

module.exports = { buildMeta, sendSuccess, sendCreated, sendNoContent };
