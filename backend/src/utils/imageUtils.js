const Jimp = require('jimp');

async function compressStringIfNeeded(str) {
  if (typeof str !== 'string' || !str.startsWith('data:image/')) return str;
  if (str.length < 250000) return str; // Ignora imagens pequenas (< 180KB)

  try {
    const base64Data = str.split(',')[1];
    const buf = Buffer.from(base64Data, 'base64');
    const img = await Jimp.read(buf);
    
    // Redimensiona agressivamente imagens com resolução monumental
    if (img.bitmap.width > 1200) {
      img.resize(1200, Jimp.AUTO);
    }
    img.quality(65); // Qualidade Jpeg otimizada pra web
    
    const newBuf = await img.getBufferAsync(Jimp.MIME_JPEG);
    const newB64 = `data:image/jpeg;base64,${newBuf.toString('base64')}`;
    
    // Se o JPEG comprimido for efetivamente menor, retornamos ele. Senão retorna o txt
    if (newB64.length < str.length) {
        return newB64;
    }
    return str;
  } catch (err) {
    console.error('[IMAGE-COMPRESSOR] Error compressing deep image:', err.message);
    return str; // Skip se falhar (ex: webp não suportado nativamente pelo jimp puro)
  }
}

async function deepCompressObj(obj) {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'string') {
            obj[i] = await compressStringIfNeeded(obj[i]);
        } else if (typeof obj[i] === 'object' && obj[i] !== null) {
            await deepCompressObj(obj[i]);
        }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
            obj[key] = await compressStringIfNeeded(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            await deepCompressObj(obj[key]);
        }
    }
  }
}

module.exports = {
    deepCompressObj
};
