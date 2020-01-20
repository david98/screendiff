FROM node:latest

COPY app.js /screendiff/app.js
COPY package.json /screendiff/package.json
COPY yarn.lock /screendiff/yarn.lock

WORKDIR /screendiff

RUN yarn

ENTRYPOINT ["node", "app.js"]
