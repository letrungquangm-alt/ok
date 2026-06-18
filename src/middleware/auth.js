function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
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
    if (!req.session || !req.session.user) {
      return requireAuth(req, res, next);
    }
    if (roles.includes(req.session.user.role)) {
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
