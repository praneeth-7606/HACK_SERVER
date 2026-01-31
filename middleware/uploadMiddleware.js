const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories if they don't exist
const policiesDir = path.join(__dirname, '../uploads/policies');
const concernsDir = path.join(__dirname, '../uploads/concerns');

if (!fs.existsSync(policiesDir)) {
    fs.mkdirSync(policiesDir, { recursive: true });
}
if (!fs.existsSync(concernsDir)) {
    fs.mkdirSync(concernsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine destination based on the route or field name
        // For concerns, use concerns directory; for policies, use policies directory
        const isConcern = req.baseUrl.includes('/concerns') || req.path.includes('/concerns');
        const uploadDir = isConcern ? concernsDir : policiesDir;
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Create unique filename: timestamp-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const isConcern = req.baseUrl.includes('/concerns') || req.path.includes('/concerns');
        const prefix = isConcern ? 'concern-' : 'policy-';
        cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|pdf/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only PDF and Image files (JPEG, JPG, PNG) are allowed!'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

module.exports = upload;
