//
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
//
function loadTexture(gl, url, format = gl.RGBA) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture );

  // Because images have to be downloaded over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = format;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = format;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); 
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel,
  );

  const image = new Image();
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); 
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      image,
    );

    // WebGL1 has different requirements for power of 2 images
    // vs. non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      // Yes, it's a power of 2. Generate mips.
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      // No, it's not a power of 2. Turn off mips and set
      // wrapping to clamp to edge
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}


function loadTexture16(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Placeholder 1x1 (unsigned short) — on met un seul short (valeur max)
  const pixelPlaceholder = new Uint16Array([0xFFFF]);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); 
      // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); 
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); // pour Int16Array
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D, 0,
    gl.R16UI, // placeholder as single-channel unsigned 16-bit
    1, 1, 0,
    gl.RED_INTEGER,
    gl.UNSIGNED_SHORT,
    pixelPlaceholder
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  fetch(url)
    .then(r => r.arrayBuffer())
    .then(buf => {
      const img = UPNG.decode(buf);
      const width = img.width;
      const height = img.height;
      const depth = img.depth || 8; // 8 ou 16
      const bytes = img.data; // Uint8Array

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); 
      // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); 
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); // pour Int16Array

      if (depth === 16) {
        // calculer le nombre de canaux : (bytes.length / 2) / (width*height)
        const channels = Math.round((bytes.length / 2) / (width * height));

        // reconstruire un Uint16Array en corrigeant l'endianness (PNG big-endian)
        const u16 = new Uint16Array(width * height * channels);
        for (let i = 0, j = 0; i < u16.length; i++, j += 2) {
          // bytes[j] est MSB, bytes[j+1] est LSB dans le flux PNG
          u16[i] = (bytes[j] << 8) | bytes[j + 1];
        }

        // Choisir format interne & format en fonction du nombre de canaux
        if (channels === 1) {
          gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); // stride = width * 2 -> align 1 est sûr
          gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.R16UI, width, height, 0,
            gl.RED_INTEGER, gl.UNSIGNED_SHORT, u16
          );
        } else if (channels === 4) {
          // RGBA16UI
          gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4); // stride = width * 4 * 2 = width*8 => 4 OK
          gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA16UI, width, height, 0,
            gl.RGBA_INTEGER, gl.UNSIGNED_SHORT, u16
          );
        } else {
          console.warn('Channels not supported:', channels);
        }
      } else {
        // depth === 8 : UPNG a donné des octets 8-bit
        // détecter channels
        const channels = Math.round(bytes.length / (width * height));
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        if (channels === 1) {
          // Upload as R8 (normalized) — accessible with sampler2D
          gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.R8, width, height, 0,
            gl.RED, gl.UNSIGNED_BYTE, bytes
          );
        } else if (channels === 4) {
          gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, bytes
          );
        } else {
          console.warn('Channels not supported:', channels);
        }
      }

      // paramètres (ré-appliquer)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    })
    .catch(err => console.error('loadTexture16 error:', err));

  return texture;
}


export { loadTexture, loadTexture16 };