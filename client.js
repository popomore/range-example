var url = require('url');
var fs = require('fs');
var http = require('http');
var basename = require('path').basename;

var thread = 4;
var block = 1000;

run('http://127.0.0.1:8080/sample.mkv');

function run(path) {
  info(path, function(isSupportRange, len) {
    if (isSupportRange) {
      new Request({
        path: path,
        length: len,
        block: block,
        thread: thread
      }).run(function() {
        process.exit();
      });
    } else {
      process.exit();
    }
  });
}

function info(path, cb) {
  var p = url.parse(path);
  p.method = 'HEAD';
  console.log('>> Request HEAD ' + path);
  var req = http.request(p, function(res) {
    if (res.headers['accept-range'] === 'bytes') {
      var len = res.headers['content-length'];
      console.log('>> Content Length ' + len);
      cb(true, len);
    }
  });
  req.end();
}

function Request (options, cb) {
  this.options = options;
  this.cb = cb;
  this.url = options.path;
  this.path = process.cwd() + '/download.mkv';
  this._initBlocks();
}

Request.prototype._initBlocks = function() {
  var result = [];
  var block = this.options.block;
  var len = this.options.length;
  var total = Math.ceil(len / block);
  for(var i = 0; i < total; i++) {
    var start = i * block;
    var end = start + block - 1;
    result.push([start, end]);
  }
  this.blocks = result;
};

Request.prototype.run = function(cb) {
  new Thread({
    url: this.url,
    path: this.path
  }).download({
    start: 0,
    end: 999
  }, cb);
};

var id = 0;
function Thread (options) {
  this.id = id++;
  this.url = url.parse(options.url);
  this.path = options.path;
}

Thread.prototype.download = function(range, cb) {
  var that = this, p = this.url;
  p.headers = {
    'Range': 'bytes=' + range.start + '-' + range.end
  };
  console.log('>> Thread ' + this.id + ' Request ' + p.href + ' Range ' + p.headers['Range']);
  var req = http.request(p, function(res) {
    console.log(res.headers);
    if (res.statusCode === 206) {
      var options = {
        start: range.start,
        flags: 'w',
        encoding: null,
        mode: 0666
      };
      if (fs.existsSync(that.path)) {
        options.flags = 'r+';
      }
      console.log(options);
      var writeStream = fs.createWriteStream(that.path);
      res.pipe(writeStream);

      res.on('end', function() {
        console.log('>>  Thread ' + this.id + '');
        cb();
      });
    }
  });
  req.end();
};

