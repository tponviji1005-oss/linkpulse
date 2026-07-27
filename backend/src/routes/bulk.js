const express = require('express');
const multer = require('multer');
const {
  bulkCreateLinks,
  csvUpload,
  exportCSV,
  bulkDelete,
  bulkActivate,
  bulkDeactivate,
} = require('../controllers/bulkController');
const auth = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.post('/', auth, bulkCreateLinks);
router.post('/csv', auth, upload.single('file'), csvUpload);
router.get('/export', auth, exportCSV);
router.delete('/', auth, bulkDelete);
router.put('/activate', auth, bulkActivate);
router.put('/deactivate', auth, bulkDeactivate);

module.exports = router;
