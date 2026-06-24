require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./src/config/schema');
const apiRoutes = require('./src/routes/api');

const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

// API routes
app.use('/api', apiRoutes);

// Phục vụ React SPA cho tất cả các định tuyến khác
app.get('*any', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Xử lý lỗi 404 cho API
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Đường dẫn API không tồn tại' });
});

// Xử lý lỗi 500 cho API
app.use((error, req, res, next) => {
  const status = error.status || 500;
  console.error('Lỗi Server:', error);
  res.status(status).json({ error: error.message || 'Có lỗi xảy ra trên server' });
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
