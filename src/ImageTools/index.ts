export class ImageTools {
    public async getImageAverageColor(url: string, loadPercentage: number = 100): Promise<string> {
        if (loadPercentage < 0 || loadPercentage > 100) {
            throw new Error('Invalid load percentage. It should be between 0 and 100.');
        }

        return new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // 用于跨域请求图片
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    // Canvas 2D 上下文获取失败，无法继续处理
                    reject(new Error('Canvas context is not available.'));
                    return;
                }

                const loadWidth = Math.round(img.width * (loadPercentage / 100));
                const loadHeight = Math.round(img.height * (loadPercentage / 100));

                canvas.width = loadWidth;
                canvas.height = loadHeight;

                ctx.drawImage(img, 0, 0, loadWidth, loadHeight);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                let r = 0, g = 0, b = 0;

                for (let i = 0; i < data.length; i += 4) {
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                }

                r = Math.floor(r / (data.length / 4));
                g = Math.floor(g / (data.length / 4));
                b = Math.floor(b / (data.length / 4));

                const color = this.rgb2hex(`${r}, ${g}, ${b}`);
                resolve(color);
            };

            img.onerror = () => {
                reject(new Error('Failed to load image.'));
            };

            img.src = url;
        });
    }

    public rgb2hex(rgb: string) {
        const [r, g, b] = rgb.split(',').map(Number);
        const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        return hex.toUpperCase(); // 将结果转换为大写，且不包含 #
    }
}
