#!/usr/bin/env node

/**
 * Module dependencies.
 */

var path = require('path'),
  fs = require('fs'),
  util = require('util'),
  glob = require('glob'),
  program = require('commander');

program
  .version('0.0.1')
  .option('-g, --git', 'Rename in git')
  .parse(process.argv);

if (process.argv.length < 4) {
  console.log(program.help());
}

var source = process.argv[2],
    dest = process.argv[3];

var currentDir = process.cwd(),
  sourceAbsPath = path.join(currentDir, source),
  destAbsPath = path.join(currentDir, dest);

console.log(sourceAbsPath);
console.log(path.join(currentDir, dest));

console.log('Start renaming');
fs.exists(sourceAbsPath, function(exists) {
  if (!exists) {
    console.error('File ' + sourceAbsPath + ' does not exist!');
    process.exit(1)
  }

  fs.rename(sourceAbsPath, destAbsPath, function(err) {
    if (err) {return console.error(err)};

    console.log('Finish renaming');
    console.log('Start updating references');

    glob("**/*.+(js|coffee)", {cwd:currentDir}, function (err, files) {
      if (err) {return console.error(errorr)}
      console.log(files);

      files.forEach(function(file) {
        var oldRelativePath = path.relative(path.dirname(file), sourceAbsPath).replace(/\.(js|coffee)$/g, ''),
          newRelativePath = path.relative(path.dirname(file), destAbsPath).replace(/\.(js|coffee)$/g, '');
        if (oldRelativePath.indexOf(".") < 0 ) {
          oldRelativePath = './' + oldRelativePath;
        }
        if (newRelativePath.indexOf(".") < 0 ) {
          newRelativePath = './' + newRelativePath;
        }
        var regex = new RegExp("require\\('" + oldRelativePath+"'\\)", "g")
        fs.readFile(file, 'utf8', function(err, data) {
          if (err) {return console.error(err)};
          console.log('file = ' + file)
          console.log('regex = ' + regex)
          var result = data.replace(regex, "require('" + newRelativePath + "')");
          fs.writeFile(file, result, 'utf8', function(err) {
            if (err) {return console.error(err)};

            process.exit();
          })
        })
      })

    })

  })
});
