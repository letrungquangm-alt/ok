const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  }

  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }
  if (req.originalUrl.startsWith('/api')) {
    return res.status(401).json({ error: 'Bạn cần đăng nhập' });
  }
  return res.redirect('/login');
}

function guestOnly(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.user || (req.session && req.session.user);
    if (!user) {
      if (req.originalUrl.startsWith('/api')) return res.status(401).json({ error: 'Bạn cần đăng nhập' });
      return res.redirect('/login');
    }
    if (roles.includes(user.role)) {
      return next();
    }
    if (req.originalUrl.startsWith('/api')) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
    }
    req.session.flash = { type: 'error', message: 'Bạn không có quyền thực hiện thao tác này' };
    return res.redirect('back');
  };
}

function flash(req, type, message) {
  req.session.flash = { type, message };
}

function attachLocals(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
}

module.exports = {
  attachLocals,
  flash,
  guestOnly,
  requireAuth,
  requireRole,
};
