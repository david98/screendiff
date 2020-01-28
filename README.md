# Setup

## Docker container

1. `docker pull davidevolta/screendiff`
2. `docker run -d --name screendiff -p 8082:8082 davidevolta/screendiff:stable`

## Manual

### Requirements

* NodeJS 13+
* npm (or yarn)

Just clone the repository and run `npm install` (or `yarn`).
Run `node app.js` to start the web service.

# Usage

## Uploading an image to be compared with another

Send a `POST` request to `http://localhost:8082/upload` . The body should be formatted as `multipart/form-data`
with a field named `image` containing the image file.

The response to a correct request is a JSON:

```json
{
	"fileName":"a25fcca0-379a-11ea-9bbd-25f0de585d63.png"
}
```

That's the file name to be used in the following step.

## Comparing two uploaded images

Send a `POST` request to `http://localhost:8082/compare`. The body should be a JSON:

```json
{
  "first": "932ab170-36e9-11ea-8260-5ff68542dbde.png",
  "second": "8fc120a0-36e9-11ea-8260-5ff68542dbde.png",
}
```

`first` and `second` are the names of the two previously uploaded images to be compared.

The response to a correct request will be a JSON like the following:

```json
{
  "isSameDimensions": true,
  "dimensionDifference": {
    "width": 0,
    "height": 0
  },
  "rawMisMatchPercentage": 8.409656274980017,
  "misMatchPercentage": "8.41",
  "diffBounds": {
    "top": 14,
    "left": 874,
    "bottom": 2779,
    "right": 4497
  },
  "analysisTime": 2416,
  "resultName": "fdd530c0-379a-11ea-9bbd-25f0de585d63"
}	
```

Take note of `resultName`, you will need it in case you want to retrieve a visual representation of the comparison result.

## Get a visual representation of the result

Just browse `http://localhost:8082/result/(resultName)` to download the image.

## Delete a result

Send a `DELETE` request to `http://localhost:8082/result/(resultName)`.

## Get an uploaded image

Just browse `http://localhost:8082/upload/(image file name, including extension)` to download the image.

## Delete an uploaded image

Send a `DELETE` request to `http://localhost:8082/upload/(image file name, including extension)`.
