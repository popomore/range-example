var join = require('path').join;
var fs = require('fs');
var connect = require('connect');
var parse = require('range-parser');

connect()
  .use(range)
  .use(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('No Range Header');
  })
  .listen(8080);

function range(req, res, next) {
  res.setHeader('Accept-Range', 'bytes');

  if (!req.headers.range) {
    next();
    return;
  }

  var path = join(process.cwd(), req.url)
  fs.stat(path, function(err, stat) {
    if (err || stat.isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }

    var options = {};
    var total = stat.size;
    var ranges = parse(total, req.headers.range);

    // unsatisfiable
    if (-1 === ranges) {
      res.setHeader('Content-Range', 'bytes */' + stat.size);
      res.writeHead(416);
      res.end();
      return;
    }

    // valid
    if (-2 !== ranges) {
      options.start = ranges[0].start;
      options.end = ranges[0].end;

      // Content-Range
      res.setHeader('Content-Range', 'bytes '
        + ranges[0].start
        + '-'
        + ranges[0].end
        + '/'
        + total);
      res.setHeader('Content-Length', options.end - options.start + 1);
      res.writeHead(206);
      var stream = fs.createReadStream(path, options);
      stream.pipe(res);
    }

  });
}
