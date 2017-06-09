if (!process.argv[2]) {
  console.error('Syntax: node index.js db-name');
  process.exit(1);
}

require('dotenv').config();

const http = require('http');
const fs = require('fs');
const dbName = process.argv[2];
const dbio = require('mongodb-io-native');
const download = require('./download');

let options = {
  host: process.env.SERVER_HOST,
  port: process.env.SERVER_PORT,
  headers: {
    'Authorization': 'Bearer ' + process.env.SECRET
  }
};

const processResponse = (response, onComplete) => {
  let str = '';
  response.on('data', (chunk) => {
    str += chunk;
  });
  response.on('end', () => {
    onComplete(str);
  });
};

const request = (path, onResponse) => {
  options.path = path;
  http.request(options, (response) => {
    processResponse(response, onResponse);
  }).end();
};

const _request = (path, filePath, onResponse) => {
  options.path = path;
  download(options, filePath, onResponse);
};

request('/make-dump?dbName=' + dbName, (data) => {
  data = JSON.parse(data);
  if (data.error) {
    console.error(data);
    process.exit(1);
  }
  console.log('Downloading ' + data.file);
  const filePath = __dirname + '/dump/' + dbName + '.tgz';

  _request(data.file, filePath, () => {
    console.log('done');
      dbio.import({
        config: {
          drop: true,
          filePath
        }, dbs: [dbName]
      }).then(() => {
        console.log('done');
        process.exit(0);
      });
  });

});
