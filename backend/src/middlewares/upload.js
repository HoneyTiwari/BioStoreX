import multer from "multer";
import path from "path";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary, hasCloudinaryConfig } from "../config/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const baseName = path
            .parse(file.originalname)
            .name
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80);

        return {
            folder: "BioStoreX/items",
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
            public_id: `${baseName || "item"}-${Date.now()}`,
        };
    },
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();

    if (!hasCloudinaryConfig()) {
        console.log("[upload] Missing Cloudinary environment variables");
        return cb(new ApiError(500, "Cloudinary is not configured. Please set the required environment variables."));
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
        console.log("[upload] Rejected file type", {
            originalname: file.originalname,
            mimetype: file.mimetype,
        });
        return cb(new ApiError(400, "Only JPG, JPEG, PNG, WEBP, and GIF images are allowed"));
    }

    cb(null, true);
};

const multerUpload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
});

export const upload = {
    single(fieldName) {
        return (req, res, next) => {
            console.log(`[upload] Processing single image field "${fieldName}"`);
            return multerUpload.single(fieldName)(req, res, (err) => {
                if (err) {
                    console.log("[upload] Upload failed", {
                        message: err.message,
                        code: err.code,
                    });
                    return next(err);
                }

                if (req.file) {
                    console.log("[upload] Cloudinary upload complete", {
                        field: req.file.fieldname,
                        publicId: req.file.filename,
                        url: req.file.path,
                    });
                } else {
                    console.log("[upload] No image file included in request");
                }

                return next();
            });
        };
    },
};
