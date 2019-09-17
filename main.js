// const imageUrl = 'https://ih0.redbubble.net/image.109072510.9004/flat,1000x1000,075,f.u1.jpg';
const imageUrl = '/flat,1000x1000,075,f.u1.jpg';

async function loadImage(url) {
  const image = document.createElement('img');
  return new Promise(resolve => {
    image.onload = () => {
      resolve(image);
    }
    // image.crossOrigin = "Anonymous";
    image.src = imageUrl;
  });
}

function getSubsamples(image) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = image.width;
  canvas.height = image.height;

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, 1000, 1000);

  function getSubsample(imageData, startX, startY, step) {
    const subSample = ctx.createImageData(imageData.width / step**2, imageData.height / step**2);
    const datain = new Uint32Array(imageData.data.buffer);
    const dataout = new Uint32Array(subSample.data.buffer);
    const { width, height } = imageData;
    for (let j = 0; j < height / step; j++) {
      for (let i = 0; i < width / step; i++) {
        dataout[i + j * width] = datain[(startX + i) * step + (startY + j) * width * step];
      }
    }
    return subSample;
  }

  return [
    getSubsample(imageData, 0, 0, 2),
    getSubsample(imageData, 1, 0, 2),
    getSubsample(imageData, 0, 1, 2),
    getSubsample(imageData, 1, 1, 2),
  ];
}

function generateMask() {
  const maskCanvas = document.createElement('canvas');
  const maskCtx = canvas.getContext('2d');
  maskCanvas.width = 4000;
  maskCanvas.height = 4000;
  const { width, height } = maskCanvas;
  const mask = new Uint32Array(maskCtx.getImageData(0, 0, width, height).data.buffer)
  // Generate a mask like
  // 0 1 0 1
  // 0 0 0 0
  // 0 1 0 1
  // 0 0 0 0
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      mask[i + j * width] = (i % 2 === 0 && j % 2 === 0) ? 0xFF000000 : 0x00000000;
    }
  }
  console.log(mask);
  return { maskCanvas, maskCtx };
}

window.onload = async () => {
  const image = await loadImage(imageUrl);
  const [step1, step2, step3, step4] = getSubsamples(image);

  const { maskCanvas, maskCtx } = generateMask();

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = image.width;
  canvas.height = image.height;
}
