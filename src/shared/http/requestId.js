const crypto = require('crypto');

const REQUEST_ID_HEADER = 'x-request-id';

const createRequestId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const requestIdMiddleware = (req, res, next) => {
  const incomingRequestId = req.get?.(REQUEST_ID_HEADER);
  req.requestId = incomingRequestId || createRequestId();
  res.setHeader(REQUEST_ID_HEADER, req.requestId);
  next();
};

module.exports = { REQUEST_ID_HEADER, createRequestId, requestIdMiddleware };
