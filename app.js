const compareImages = require('resemblejs/compareImages')
const fs = require('fs').promises
const path = require('path')
const express = require('express')
const fileUpload = require('express-fileupload')
const cors = require('cors')
const bodyParser = require('body-parser')
const uuidv1 = require('uuid/v1')

/*
 * Settings
 * */
const UPLOADS_DIR = './uploads'
const OUTPUTS_DIR = './outputs'

const RESULT_EXTENSION = '.png'

const PORT = 8082

/*
 * Generates a filename in the form of '{UUID}.{extension}'
 * which is guaranteed to be unique in path (but not in subdirectories)
 * */
let generateUniqueFilename = async (path, extension) => {
  let fileName = uuidv1()
  let usedNames = await fs.readdir(path)
  console.log(usedNames)
  while (fileName + extension in usedNames) {
    fileName = uuidv1()
  }
  return fileName
}

let getDiff = async (firstImagePath, secondImagePath) => {
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
      errorType: 'movement',
      transparency: 0.6,
      largeImageThreshold: 5000,
      useCrossOrigin: false,
      outputDiff: true
    },
    scaleToSameSize: true,
    ignore: 'antialiasing'
  }

  const data = await compareImages(
    await fs.readFile(firstImagePath),
    await fs.readFile(secondImagePath),
    options
  )

  return data
}

/*
 * Adds routes to app, then returns the same app object
 * */
let addRoutes = app => {
  app.post('/upload', async (req, res) => {
    try {
      if (!req.files) {
        res.status(400).send({
          error: 'No file uploaded.'
        })
      } else {
        let image = req.files.image
        let extension = path.extname(image.name)
        let fileName = await generateUniqueFilename(UPLOADS_DIR, extension)
        image.mv(UPLOADS_DIR + '/' + fileName + extension)

        res.status(201).send({
          fileName: fileName + extension
        })
      }
    } catch (err) {
      res.status(500).send(err)
    }
  })

  app.post('/compare', async (req, res) => {
    if (req.body.first && req.body.second) {
      let firstPath = UPLOADS_DIR + '/' + req.body.first
      let secondPath = UPLOADS_DIR + '/' + req.body.path

      try {
        let data = await getDiff(firstPath, secondPath)
        let fileName = await generateUniqueFilename(
          OUTPUTS_DIR + '/',
          RESULT_EXTENSION
        )
        await fs.writeFile(
          OUTPUTS_DIR + '/' + fileName + RESULT_EXTENSION,
          data.getBuffer()
        )
        data['resultName'] = fileName
        res.status(200).send(data)
      } catch (err) {
        if (err.code === 'ENOENT') {
          res.status(404).send({ error: 'Invalid file name(s)' })
        } else {
          res.status(500).send(err)
        }
      }
    } else {
      res.status(400).send({ error: 'Missing first or second or both.' })
    }
  })

  app.get('/result/:name', async (req, res) => {
    let fileName = req.params.name + RESULT_EXTENSION
    res.download(OUTPUTS_DIR + '/' + fileName)
    res.status(200)
  })

  app.delete('/result/:name', async (req, res) => {
    let fileName = req.params.name + RESULT_EXTENSION
    try {
      await fs.unlink(OUTPUTS_DIR + '/' + fileName)
      res.status(204).send({})
    } catch (err) {
      res.status(404).send({ error: 'Invalid result name.' })
    }
  })

  app.get('/upload/:name', async (req, res) => {
    let fileName = req.params.name
    res.status(200)
    res.download(UPLOADS_DIR + '/' + fileName)
  })

  app.delete('/upload/:name', async (req, res) => {
    let fileName = req.params.name
    try {
      await fs.unlink(UPLOADS_DIR + '/' + fileName)
      res.status(204).send({})
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.status(404).send({ error: 'Invalid result name.' })
      } else {
        res.status(500).send(err)
      }
    }
  })

  return app
}

let start = async () => {
  let app = express()

  /*
   * Configure app extensions
   * */
  app.use(
    fileUpload({
      createParentPath: true
    })
  )
  app.use(cors())
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  addRoutes(app)

  /*
   * Create directories for uploads and outputs (if they don't already exist)
   * */
  await fs.mkdir(UPLOADS_DIR, { recursive: true })
  await fs.mkdir(OUTPUTS_DIR, { recursive: true })

  let server = app.listen(PORT, () => {
    let host = server.address().address
    let port = server.address().port
    console.log('Screendiff listening at http://%s:%s', host, port)
  })

  return server
}

start()
