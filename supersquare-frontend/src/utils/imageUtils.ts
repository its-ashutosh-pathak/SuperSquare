
/**
 * Compresses an image file to be under a specified size limit (default 200KB).
 * @param file The file object from input type='file'
 * @param maxWidth Max width of the output image (default 500px)
 * @param quality Initial quality (0-1)
 * @returns Promise resolving to a Base64 string
 */
export const compressImage = (file: File, maxWidth = 500, quality = 0.9): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Resize if needed
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Recursive compression function
                const compress = (q: number) => {
                    const dataUrl = canvas.toDataURL('image/jpeg', q);
                    // Approximate size: (length * 3/4) - padding
                    const sizeInBytes = Math.ceil((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);

                    if (sizeInBytes < 200 * 1024 || q < 0.2) {
                        resolve(dataUrl);
                    } else {
                        // Reduce quality and try again
                        compress(q - 0.1);
                    }
                };

                compress(quality);
            };
            img.onerror = (err) => reject(err);
        };
    });
};

/**
 * Creates a cropped image from a source URL and crop pixel area.
 * @param imageSrc The source image URL (DataURL or HTTP URL)
 * @param pixelCrop The crop area { x, y, width, height }
 * @returns Promise resolving to a Blob (or DataURL if needed)
 */
export const getCroppedImg = (imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = imageSrc;
        image.crossOrigin = 'anonymous'; // Avoid CORS issues if external URL
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;

            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                pixelCrop.width,
                pixelCrop.height
            );

            // Return as Data URL (Base64)
            resolve(canvas.toDataURL('image/jpeg'));
        };
        image.onerror = (err) => reject(err);
    });
};
