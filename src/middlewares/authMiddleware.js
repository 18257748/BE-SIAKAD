// src/middlewares/authMiddleware.js
// ═══════════════════════════════════════════════
// JWT Verification & Role-Based Access Control
// ═══════════════════════════════════════════════

const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const normalizeRoleName = (roleName = '') => {
  const aliases = {
    Administrator: 'ADMIN',
    Admin: 'ADMIN',
    ADMIN: 'ADMIN',
    Kurikulum: 'KURIKULUM',
    KURIKULUM: 'KURIKULUM',
    'Guru Mapel': 'GURU',
    Guru: 'GURU',
    GURU: 'GURU',
    'Wali Kelas': 'WALI_KELAS',
    WALI_KELAS: 'WALI_KELAS',
    Siswa: 'SISWA',
    SISWA: 'SISWA',
  };

  return aliases[roleName] || `${roleName}`.toUpperCase();
};

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1];
};

const sendAuthError = (res, status, message, errorCode) => {
  return res.status(status).json({
    success: false,
    message,
    errorCode,
  });
};

const verifyJwtWithSecret = (token, secret) => {
  if (!secret) return null;
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
};

const findUserByEmail = async (email) => {
  if (!email) return null;

  return prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
    include: { role: true },
  });
};

const findAcademicUser = async ({ authUserId, email, legacyUserId }) => {
  if (authUserId) {
    const linkedUser = await prisma.user.findUnique({
      where: { auth_user_id: authUserId },
      include: { role: true },
    });

    if (linkedUser) return linkedUser;

    const emailUser = await findUserByEmail(email);
    if (emailUser && !emailUser.auth_user_id) {
      return prisma.user.update({
        where: { id: emailUser.id },
        data: {
          auth_user_id: authUserId,
          last_login_at: new Date(),
        },
        include: { role: true },
      });
    }

    return emailUser;
  }

  if (legacyUserId) {
    return prisma.user.findUnique({
      where: { id: legacyUserId },
      include: { role: true },
    });
  }

  return findUserByEmail(email);
};

const attachRequestUser = (req, user, decoded, source) => {
  const roleName = user.role?.nama_role;
  const securityRole = normalizeRoleName(roleName);

  req.user = {
    // Existing controller compatibility.
    userId: user.id,
    role: roleName,

    // Supabase/OIDC identity.
    authUserId: decoded.sub || decoded.user_id || user.auth_user_id || null,
    academicUserId: user.id,
    email: user.email,
    securityRole,
    isActive: user.status_aktif,
    sessionVersion: user.session_version,
    tokenSource: source,
    claims: decoded,
  };
};

const authenticateDecodedUser = async (req, res, next, decoded, source) => {
  const authUserId = source === 'supabase'
    ? decoded.sub || decoded.user_id
    : null;
  const legacyUserId = source === 'legacy' ? decoded.userId : null;

  const user = await findAcademicUser({
    authUserId,
    email: decoded.email,
    legacyUserId,
  });

  if (!user) {
    return sendAuthError(
      res,
      401,
      'Akun belum terdaftar di sistem akademik',
      'UNREGISTERED_ACADEMIC_USER'
    );
  }

  if (!user.status_aktif) {
    return sendAuthError(
      res,
      403,
      'Akun tidak aktif. Hubungi administrator.',
      'INACTIVE_USER'
    );
  }

  if (source === 'supabase' && user.is_sso_allowed === false) {
    return sendAuthError(
      res,
      403,
      'Akses SSO tidak diizinkan untuk akun ini.',
      'SSO_NOT_ALLOWED'
    );
  }

  if (source === 'legacy') {
    const tokenSessionVersion = decoded.sessionVersion || decoded.session_version || 1;
    if (tokenSessionVersion !== user.session_version) {
      return sendAuthError(
        res,
        401,
        'Session sudah tidak berlaku. Silakan login kembali.',
        'SESSION_REVOKED'
      );
    }
  }

  attachRequestUser(req, user, decoded, source);
  return next();
};

const authenticateSupabaseUser = async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return sendAuthError(res, 401, 'Token tidak disediakan', 'UNAUTHENTICATED');
  }

  try {
    let decoded = null;
    let source = null;

    // 1. Try decoding with SUPABASE_JWT_SECRET first if configured
    if (process.env.SUPABASE_JWT_SECRET) {
      try {
        decoded = verifyJwtWithSecret(token, process.env.SUPABASE_JWT_SECRET);
        source = 'supabase';
      } catch (err) {
        // Ignore error, will fall back to local JWT
      }
    }

    // 2. Fallback to local JWT_SECRET if Supabase decoding failed or wasn't configured
    if (!decoded && process.env.JWT_SECRET) {
      try {
        decoded = verifyJwtWithSecret(token, process.env.JWT_SECRET);
        source = 'legacy';
      } catch (err) {
        // Ignore, handled by the generic throw below
      }
    }

    if (!decoded) {
      throw new Error('Token verification failed for all available secrets');
    }

    return await authenticateDecodedUser(req, res, next, decoded, source);
  } catch (error) {
    return sendAuthError(
      res,
      401,
      'Token tidak valid atau sudah kadaluarsa',
      'INVALID_TOKEN'
    );
  }
};

const verifyToken = authenticateSupabaseUser;

/**
 * Middleware Factory: Authorize specific roles
 * Usage: authorizeRoles('Administrator', 'Kurikulum')
 * 
 * @param  {...string} allowedRoles - Role names that are permitted
 * @returns Express middleware
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendAuthError(res, 401, 'Autentikasi diperlukan', 'UNAUTHENTICATED');
    }

    const allowedSecurityRoles = allowedRoles.map(normalizeRoleName);
    const hasAllowedRole = allowedRoles.includes(req.user.role) ||
      allowedSecurityRoles.includes(req.user.securityRole);

    if (!hasAllowedRole) {
      return sendAuthError(
        res,
        403,
        `Akses ditolak. Endpoint ini hanya untuk: ${allowedRoles.join(', ')}`,
        'FORBIDDEN'
      );
    }

    next();
  };
};

const requireRole = (...allowedRoles) => authorizeRoles(...allowedRoles);

// Backward compatible: verifyAdmin = verifyToken + admin-only check
const verifyAdmin = (req, res, next) => {
  return verifyToken(req, res, () => authorizeRoles('Administrator')(req, res, next));
};

module.exports = {
  authenticateSupabaseUser,
  verifyToken,
  authorizeRoles,
  requireRole,
  verifyAdmin,
  normalizeRoleName,
};
