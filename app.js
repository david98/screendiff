const compareImages = require("resemblejs/compareImages");
const fs = require("fs");
const path = require("path");
const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const bodyParser = require("body-parser");
const { promisify } = require("util");
const uuidv1 = require("uuid/v1");

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const UPLOADS_DIR = "./uploads";
const OUTPUTS_DIR = "./outputs";

let app = express();

// enable files upload
app.use(
  fileUpload({
    createParentPath: true
  })
);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function generateUniqueFilename(path, extension) {
  let fileName = uuidv1();
  while (fs.existsSync(path + fileName + extension)) {
    fileName = uuidv1();
  }
  return fileName;
}

async function getDiff(firstImagePath, secondImagePath) {
  const options = {
    output: {
      errorColor: {
        red: 255,
        green: 0,
        blue: 255
      },
      ignoreAreasColoredWith: {
        red: 255,
        green: 255,
        blue: 255
      },
      errorType: "movement",
      transparency: 0.6,
      largeImageThreshold: 5000,
      useCrossOrigin: false,
      outputDiff: true
    },
    scaleToSameSize: true,
    ignore: "antialiasing"
  };

  // The parameters can be Node Buffers
  // data is the same as usual with an additional getBuffer() function
  const data = await compareImages(
    await readFileAsync(firstImagePath),
    await readFileAsync(secondImagePath),
    options
  );

  return data;
}

app.post("/upload", (req, res) => {
  try {
    if (!req.files) {
      res.status(400).send({
        error: "No file uploaded."
      });
    } else {
      let image = req.files.image;
      let extension = path.extname(image.name);
      let fileName = generateUniqueFilename(UPLOADS_DIR, extension);
      image.mv(UPLOADS_DIR + "/" + fileName + extension);

      //send response
      res.status(200).send({
        fileName: fileName + extension
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

let server = app.listen(8082, function() {
  let host = server.address().address;
  let port = server.address().port;
  console.log("Screendiff listening at http://%s:%s", host, port);
});

app.post("/compare", async (req, res) => {
  if (req.body.first && req.body.second) {
    let firstExists = fs.existsSync(UPLOADS_DIR + "/" + req.body.first);
    let secondExists = fs.existsSync(UPLOADS_DIR + "/" + req.body.second);

    if (!(firstExists && secondExists)) {
      res.status(404).send({
        error:
          "Invalid file(s): " +
          (firstExists ? null : req.body.first + " ") +
          (secondExists ? null : req.body.second + " ")
      });
    } else {
      let data = await getDiff(
        UPLOADS_DIR + "/" + req.body.first,
        UPLOADS_DIR + "/" + req.body.second
      );
      let extension = ".png";
      let fileName = generateUniqueFilename(OUTPUTS_DIR + "/", extension);
      await writeFileAsync(
        OUTPUTS_DIR + "/" + fileName + extension,
        data.getBuffer()
      );
      data["resultFile"] = fileName + extension;
      res.status(200).send(data);
    }
  } else {
    res.status(400).send({ error: "Missing first or second or both." });
  }
});

app.get("/result", async (req, res) => {
  let fileName = req.query.name;
  if (fs.existsSync(OUTPUTS_DIR + "/" + fileName)) {
    res.download(OUTPUTS_DIR + "/" + fileName);
    res.status(200);
  } else {
    res.status(404).send({ error: "Invalid result name." });
  }
});
