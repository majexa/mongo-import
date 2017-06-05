const http = require('http');
const dbName = 'chat-server';

let options = {
  host: '95.79.46.186',
  port: 8072,
  // host: 'localhost',
  // port: 3000,
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

const ObjectID = require('mongodb').ObjectID;

require('mongodb').MongoClient.connect('mongodb://localhost:27017' +
  '/' + dbName, function (err, db) {
  console.log('db connected');

  request('/make-dump?dbName=' + dbName, (data) => {
    data = JSON.parse(data);
    if (data.error) {
      console.error(data);
      process.exit(1);
    }
    console.log('Downloading ' + data.file);
    request(data.file, (data) => {
      data = JSON.parse(data);
      let importFunctions = [];
      for (let v of data) {
        ((collectionName, docs) => {
          importFunctions.push(new Promise((resolve, reject) => {
            db.collection(collectionName).remove({}, () => {
              for (let i=0; i<docs.length; i++) {
                docs[i]._id = ObjectID(docs[i]._id);
              }
              db.collection(collectionName).insertMany(docs, () => {
                resolve(collectionName);
              });
            });
          }));
        })(v.collection, v.data);
      }
      Promise.all(importFunctions).then((r) => {
        console.log('Done: ' + r);
        process.exit(0);
      });
    });
  });
});




