export function getOptimizedCloudinaryUrl(url, { width = 160, height = 160 } = {}) {
    if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
        return url;
    }

    return url.replace("/upload/", `/upload/f_auto,q_auto,c_fill,w_${width},h_${height}/`);
}
