require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDb } = require('./src/config/schema');
const { attachLocals } = require('./src/middleware/auth');
const webRoutes = require('./src/routes/web');
const apiRoutes = require('./src/routes/api');

const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8,
  },
}));
app.use(attachLocals);

app.locals.roleLabels = {
  ADMIN: 'Quản trị',
  SALES: 'Sales',
  LOGISTICS: 'Logistics',
  WAREHOUSE: 'Kho',
  FACTORY: 'Nhà máy',
};

app.locals.statusLabels = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã gửi',
  LOGISTICS_RECEIVED: 'Logistics đã nhận',
  WAREHOUSE_PROCESSING: 'Kho đang xử lý',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  CONFIRMED: 'Đã nhập kho',
};

app.locals.formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
};

app.locals.formatMoney = (value) => {
  const num = Number(value || 0);
  const validNum = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(validNum);
};

app.use('/api', apiRoutes);
app.use(webRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'Không tìm thấy', error: 'Trang không tồn tại' });
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (req.path.startsWith('/api')) {
    return res.status(status).json({ error: error.message || 'Có lỗi xảy ra' });
  }
  return res.status(status).render('error', {
    title: 'Có lỗi xảy ra',
    error: error.message || 'Có lỗi xảy ra',
  });
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Warehouse app is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Cannot start application:', error.message);
    process.exit(1);
  });
