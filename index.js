var path = require('path'),
  fs = require('fs'),
  exec = require('child_process').exec,
  util = require('util'),
  async = require('async'),
  walk = require('./lib/walk');

var defaultRegExcludes = [/^\.+.*/, /node_modules/]

exports.mvFile = function(currentDir, sourceAbsPath, destAbsPath, options, cb) {
  fs.exists(sourceAbsPath, function(exists) {
    if (!exists) return cb(new Error('File ' + sourceAbsPath + ' does not exist!'));

    steps = [];
    if (options.git) {
      steps.push(function(cb) {
        exec('git mv ' + sourceAbsPath + ' ' + destAbsPath, function(err, stdout, stderr) {
          if (err) return cb(err);
          if (stderr) return cb(stderr);
          cb();
        })
      })
    } else {
      steps.push(function(cb) {
        fs.rename(sourceAbsPath, destAbsPath, cb);
      })
    }

    var excludes = defaultRegExcludes;
    if (options.excludes) {
      excludes = excludes.concat(options.excludes);
    }
    // var regExcludes = options.excludes;
    steps.push(function(cb) {exports.updateReferenceInFile(sourceAbsPath, destAbsPath, cb)});
    steps.push(function(cb) {exports.updateReferenceToMovedFile(currentDir, sourceAbsPath, destAbsPath, excludes, cb)});

    async.series(steps, cb);
  });
};

exports.updateReferenceInFile = function(sourceAbsPath, destAbsPath, cb) {
  fs.readFile(destAbsPath, 'utf8', function(err, data) {
    if (err) return cb(err);

    var re = /require(\(|\s)('|")(\.\S+)('|")(\))?/g,
      re1 = /require(\(|\s)('|")(\.\S+)('|")(\))?/,
      matches = data.match(re);

    if (matches) {
      matches.forEach(function(match) {
        var oldRequire = match,
          groups = re1.exec(match),
          oldPath = groups[3],
          oldAsbPath = path.join(path.dirname(sourceAbsPath), oldPath),
          newRelativePath = path.relative(path.dirname(destAbsPath), oldAsbPath);

        if (newRelativePath.indexOf(".") != 0 ) {
          newRelativePath = './' + newRelativePath;
        }

        var newRequire = oldRequire.replace(re1, 'require$1$2' + newRelativePath + '$4$5');
        data = data.replace(oldRequire, newRequire);
      })
    }
    fs.writeFile(destAbsPath, data, {encoding: 'utf8'}, cb);
  });
}

exports.updateReferenceToMovedFile = function(currentDir, sourceAbsPath, destAbsPath, regExcludes, cb) {
  walk(currentDir, regExcludes, function(err, files) {
    if (err) return cb(err);

    function updateReferenceForFile(file, cb) {
      var oldRelativePath = path.relative(path.dirname(file), sourceAbsPath).replace(/\.(js|coffee)$/, ''),
        newRelativePath = path.relative(path.dirname(file), destAbsPath).replace(/\.(js|coffee)$/, '');
      if (oldRelativePath.indexOf(".") != 0 ) {
        oldRelativePath = './' + oldRelativePath;
      }
      if (newRelativePath.indexOf(".") != 0 ) {
        newRelativePath = './' + newRelativePath;
      }

      var regex = exports.generateRequireRegex(oldRelativePath);
      fs.readFile(file, 'utf8', function(err, data) {
        if (err) return cb(err);
        if (data.indexOf(regex)) {
          var result = data.replace(regex, 'require$1$2' + newRelativePath + '$4$5');
          fs.writeFile(file, result, {encoding: 'utf8'}, cb);
        } else {
          return cb()
        }

      })
    }
    async.eachLimit(files, 20, updateReferenceForFile, cb);
  })
}

exports.generateRequireRegex = function(filePath) {
  return new RegExp("require(\\(|\\s)('|\")(" + filePath + ")('|\")(\\))?", "g");
}
