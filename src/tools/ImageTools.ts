export class ImageTools
{


    /**
     * 从给定的图片 URL 计算平均颜色，并返回不带 # 的 HEX 颜色值
     * @param imageUrl 图片的 URL
     * @returns Promise<string> 返回一个包含平均颜色 HEX 值的 Promise（不带 #）
     */
    getAverageColorFromImageUrl(imageUrl: string): Promise<string>
    {
        return new Promise((resolve, reject) =>
        {
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // 允许跨域加载图片
            img.src = imageUrl;

            img.onload = () =>
            {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx)
                {
                    reject('无法获取 Canvas 上下文');
                    return;
                }

                // 设置 Canvas 尺寸为图片的尺寸
                canvas.width = img.width;
                canvas.height = img.height;

                // 将图片绘制到 Canvas 上
                ctx.drawImage(img, 0, 0, img.width, img.height);

                // 获取图像的像素数据
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const pixels = imageData.data;

                let r = 0, g = 0, b = 0;

                // 遍历像素数据，计算 RGB 总和
                for (let i = 0; i < pixels.length; i += 4)
                {
                    r += pixels[i];     // Red
                    g += pixels[i + 1]; // Green
                    b += pixels[i + 2]; // Blue
                }

                const pixelCount = pixels.length / 4;
                // 计算平均 RGB 值
                r = Math.round(r / pixelCount);
                g = Math.round(g / pixelCount);
                b = Math.round(b / pixelCount);

                // 将 RGB 转换为不带 # 的 HEX
                const toHex = (value: number) => value.toString(16).padStart(2, '0');
                const averageHexColor = `${toHex(r)}${toHex(g)}${toHex(b)}`; // 不带 #

                // 返回平均颜色的 HEX 值
                resolve(averageHexColor);
            }

            img.onerror = () =>
            {
                reject('图片加载失败');
            }
        });
    }


}