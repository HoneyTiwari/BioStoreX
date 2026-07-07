import { v2 as cloudinary } from "cloudinary";

const getCloudinaryUrlConfig = () => {
    if (!process.env.CLOUDINARY_URL) return {};

    try {
        const parsed = new URL(process.env.CLOUDINARY_URL);

        return {
            cloud_name: parsed.hostname,
            api_key: decodeURIComponent(parsed.username),
            api_secret: decodeURIComponent(parsed.password),
        };
    } catch {
        return {};
    }
};

const cloudinaryUrlConfig = getCloudinaryUrlConfig();
const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || process.env.CLOUD_NAME || cloudinaryUrlConfig.cloud_name,
    api_key: process.env.CLOUDINARY_API_KEY || cloudinaryUrlConfig.api_key,
    api_secret: process.env.CLOUDINARY_API_SECRET || cloudinaryUrlConfig.api_secret,
    secure: true,
};

cloudinary.config(cloudinaryConfig);

export const hasCloudinaryConfig = () =>
    Boolean(
        cloudinaryConfig.cloud_name &&
        cloudinaryConfig.api_key &&
        cloudinaryConfig.api_secret
    );

export const getMissingCloudinaryConfigKeys = () => {
    if (process.env.CLOUDINARY_URL) {
        return hasCloudinaryConfig() ? [] : ["valid CLOUDINARY_URL"];
    }

    return [
        ["CLOUDINARY_CLOUD_NAME", cloudinaryConfig.cloud_name],
        ["CLOUDINARY_API_KEY", cloudinaryConfig.api_key],
        ["CLOUDINARY_API_SECRET", cloudinaryConfig.api_secret],
    ]
        .filter(([, value]) => !value)
        .map(([key]) => key);
};

export { cloudinary };
