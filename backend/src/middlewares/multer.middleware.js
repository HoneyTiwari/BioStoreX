import multer from "multer";
import fs from "fs";
import path from "path";

const uploadPath = "./public/tmp";
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Sanitize the extension instead of trusting the raw original
        // filename, which could otherwise be used for path traversal.
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(new Error("Only JPEG, PNG, WEBP, and GIF images are allowed"));
    }
    cb(null, true);
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
});
