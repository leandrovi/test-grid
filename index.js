const Jimp = require("jimp");
const sharp = require("sharp");
const { joinImages } = require("join-images");
const { toPNG } = require("png-chunks");
const extract = require("png-chunks-extract");
const encode = require("png-chunks-encode");
const text = require("png-chunk-text");

// https://github.com/hometlt/png-metadata
const { readMetadata, writeMetadata } = require("./metadata");

async function generateGrid(images) {
  const jimpPromises = [];
  const bufferPromises = [];

  images.forEach((image) => jimpPromises.push(Jimp.read(image)));
  const jimpImgs = await Promise.all(jimpPromises);

  jimpImgs.forEach((jimpImg) =>
    bufferPromises.push(jimpImg.getBufferAsync("image/png"))
  );
  const resizedBuffers = await Promise.all(bufferPromises);

  const [topRow, bottomRow] = await Promise.all([
    joinImages([resizedBuffers[0], resizedBuffers[1]], {
      direction: "horizontal",
    }),
    joinImages([resizedBuffers[2], resizedBuffers[3]], {
      direction: "horizontal",
    }),
  ]);

  const [topRowBuffer, bottomRowBuffer] = await Promise.all([
    topRow.png().toBuffer(),
    bottomRow.png().toBuffer(),
  ]);

  const grid = await joinImages([topRowBuffer, bottomRowBuffer]);
  const bufferedGrid = await grid.png().toBuffer();
  const bufferedGridResized = await sharp(bufferedGrid)
    .resize(720, 720)
    .toBuffer();

  const bufferedGridComposition = await sharp(bufferedGridResized)
    .composite([{ input: "overlay.png" }])
    .toBuffer();

  /**
   * Being of metadata tests
   */

  // const chunks = extract(bufferedGridComposition);
  // chunks.splice(-1, 0, text.encode("Author", "Leandro Fernandes"));

  // const bufferedChunks = new Buffer(encode(chunks));

  // // const textChunks = chunks
  // //   .filter((chunk) => chunk.name === "tEXt")
  // //   .map((chunk) => text.decode(chunk.data));

  // // console.log({ textChunks });

  // // const fileData = new Uint8Array(bufferedGridComposition);

  // // const chunks = getChunks(fileData);
  // // console.log({ chunks });

  // // const selectedChunk = chunks[1].data;

  // // const str = String.fromCharCode.apply(null, selectedChunk);
  // // console.log(str);

  const newMetadata = {
    tEXt: {
      Author: "Leandro F V",
      Description:
        "I will put my long description here. This is a placeholder for a prompt",
    },
  };

  const newBuffer = writeMetadata(bufferedGridComposition, newMetadata);
  const metadata = readMetadata(newBuffer);

  // Metadata is stored in runtime, but png is not displaying it
  console.log({ metadata });

  const jimpImage = await Jimp.read(newBuffer);
  await jimpImage.writeAsync("metadataJimp.png");

  // /**
  //  * End of metadata tests
  //  */

  // const gridResizedComposed = await sharp(newBuffer);

  // const resizedMetadata = await gridResizedComposed.stats();
  // console.log({ resizedMetadata });

  // // const pngBuffer = await gridResizedComposed.png().toBuffer();
  // const pngBuffer = await gridResizedComposed.png().toFile("metadata.png");

  // grid.resize(512, 512).toFile("grid.png");
}

(async () => {
  await generateGrid([
    "https://publicis-images.s3.amazonaws.com/prompted/0ee16fe8-a268-4116-8f58-43a74da45e87.png",
    "https://publicis-images.s3.amazonaws.com/prompted/5c395679-3779-4a67-a34a-aad69cdbfff9.png",
    "https://publicis-images.s3.amazonaws.com/prompted/6b81397e-b655-4892-b3d5-96a07553b1eb.png",
    "https://publicis-images.s3.amazonaws.com/prompted/82fd914b-7c33-4eae-bfdf-b38649b71e40.png",
  ]);
})();
