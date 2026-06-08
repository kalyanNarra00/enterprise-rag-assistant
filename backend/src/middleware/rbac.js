const ROLE_HIERARCHY = {
  admin: { clearanceLevel: 6, departments: null },
  hr: { clearanceLevel: 4, departments: ['HR'] },
  finance: { clearanceLevel: 4, departments: ['Finance'] },
  it_admin: { clearanceLevel: 4, departments: ['IT'] },
  manager: { clearanceLevel: 3, departments: null },
  employee: { clearanceLevel: 1, departments: null },
};

const RESTRICTED_FIELDS = new Set([
  'salary', 'ssn', 'social_security', 'bank_account', 'compensation',
  'personal_phone', 'personal_email', 'home_address', 'date_of_birth',
  'emergency_contact',
]);

const authorize = (...permittedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication is required to access this resource.' });
    }
    if (!permittedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Role '${req.user.role}' cannot access this resource.`,
      });
    }
    next();
  };
};

const buildAccessFilter = (req) => {
  const { role, department } = req.user;
  const roleConfig = ROLE_HIERARCHY[role];

  if (!roleConfig) {
    return { access_level: ['employee'] };
  }

  if (roleConfig.clearanceLevel >= 6) {
    return {};
  }

  if (roleConfig.clearanceLevel >= 4 && roleConfig.departments) {
    return {
      department: roleConfig.departments,
      access_level: ['employee', role],
    };
  }

  if (role === 'manager') {
    return {
      access_level: ['employee', 'manager'],
      department: [department],
    };
  }

  return { access_level: ['employee'] };
};

const redactSensitiveData = (payload, userRole) => {
  if (userRole === 'hr' || userRole === 'admin') {
    return payload;
  }

  const sanitize = (node) => {
    if (Array.isArray(node)) return node.map(sanitize);
    if (node && typeof node === 'object') {
      const cleaned = {};
      for (const [key, val] of Object.entries(node)) {
        if (!RESTRICTED_FIELDS.has(key.toLowerCase())) {
          cleaned[key] = sanitize(val);
        }
      }
      return cleaned;
    }
    return node;
  };

  return sanitize(payload);
};

module.exports = { authorize, departmentFilter: buildAccessFilter, filterSensitiveFields: redactSensitiveData };
