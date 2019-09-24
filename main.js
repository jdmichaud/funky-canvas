// const imageUrl = 'https://ih0.redbubble.net/image.109072510.9004/flat,1000x1000,075,f.u1.jpg';
const imageUrl = '/flat,1000x1000,075,f.u1.jpg';

function createCanvas(array, width, height) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const imageData32 = new Uint32Array(imageData.data.buffer);
  for (let i = 0; i < width * height; ++i) {
    imageData32[i] = 0xFF000000 | array[i] << 16 | array[i] << 8 | array[i];
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function createImageData(array, width, height) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const imageData32 = new Uint32Array(imageData.data.buffer);
  for (let i = 0; i < width * height; ++i) {
    imageData32[i] = 0xFF000000 | array[i] << 16 | array[i] << 8 | array[i];
  }
  return imageData;
}

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

function magnifyCanvas(canvas, magnifiedCanvas, magnifiedWidth, magnifiedHeight, canvasWidth, canvasHeight, interpolate = false) {
  // const magnifiedCanvas = document.createElement('canvas');
  const magnifiedCtx = magnifiedCanvas.getContext('2d');
  // magnifiedCanvas.width = canvasWidth;
  // magnifiedCanvas.height = canvasHeight;
  magnifiedCtx.imageSmoothingEnabled = interpolate;
  magnifiedCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, magnifiedWidth, magnifiedHeight);

  return magnifiedCanvas;
}

function magnifyImageData(imageData, magnifiedWidth, magnifiedHeight, canvasWidth, canvasHeight, interpolate = false) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);

  const magnifiedCanvas = magnifyCanvas(canvas, magnifiedWidth, magnifiedHeight, interpolate);

  return magnifiedCanvas.getContext('2d').getImageData(0, 0, magnifiedWidth, magnifiedHeight);
}

function printCanvas(canvas) {
  const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  printImageData(imageData);
}

function printImageData(imageData) {
  if (imageData.width > 50) {
    console.log('image is to big');
    return ;
  }
  function toDisplay(value) {
    const x = ((value & 0x00FF0000) >>> 16) + ((value & 0x0000FF00) >>> 8) + (value & 0x000000FF);
    return {
      value: (x / 3) | 0,
      alpha: (value & 0xFF000000) >>> 24,
    };
  }

  const view = new Uint32Array(imageData.data.buffer);
  const { width, height } = imageData;
  for (let j = 0; j < height; j++) {
    const line = Array.from(view.slice(j * width, (j + 1) * width)).map(x => {
      const { value, alpha } = toDisplay(x);
      return `${value.toString().padStart(3, 0)}(${alpha.toString().padStart(3, 0)})`;
    }).join(" ");
    console.log(`0x${(j * width * 4).toString(16).padStart(4, 0)}`, line);
  }
}

function generateMask() {
  const maskCanvas = document.createElement('canvas');
  const maskCtx = canvas.getContext('2d');
  maskCanvas.width = 4000;
  maskCanvas.height = 4000;
  const { width, height } = maskCanvas;
  const mask = new Uint32Array(maskCtx.getImageData(0, 0, width, height).data.buffer)
  // Generate a mask like:
  // 0 1 0 1
  // 0 0 0 0
  // 0 1 0 1
  // 0 0 0 0
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      mask[i + j * width] = (i % 2 === 0 && j % 2 === 0) ? 0xFF000000 : 0x00000000;
    }
  }
  return { maskCanvas, maskCtx };
}

function and(lhs, rhs, dx = 0, dy = 0) {
  lhs.globalCompositeOperation = 'source-in';
  lhs.drawImage(rhs, dx, dy);
  lhs.globalCompositeOperation = 'source-over';
  return lhs;
}

function or(lhs, rhs) {
  lhs.globalCompositeOperation = 'source-over';
  lhs.drawImage(rhs, dx, dy);
  return lhs;
}

window.onload = async () => {
  const image = await loadImage(imageUrl);
  const [step1, step2, step3, step4] = getSubsamples(image);

  const magnifiedCanvas = document.createElement('canvas');
  magnifiedCanvas.width = 9;
  magnifiedCanvas.height = 9;
  const { maskCanvas, maskCtx } = generateMask();
  const originalCanvas = createCanvas([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, 3);
  magnifyCanvas(originalCanvas, magnifiedCanvas, 9, 9, 9, 9, true);
  magnifyCanvas(originalCanvas, magnifiedCanvas, 7, 7, 9, 9, true);
  // const nonInterpolatedCanvas = magnifyCanvas(originalCanvas, 5, 5, 6, 6, false);
  console.log('original imageData');
  printCanvas(originalCanvas);
  console.log('interpolated magnifiction');
  printCanvas(magnifiedCanvas);
  // console.log('non interpolated magnification');
  // printCanvas(nonInterpolatedCanvas);
}
