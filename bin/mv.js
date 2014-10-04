#!/usr/bin/env node

/**
 * Module dependencies.
 */

var path = require('path'),
  fs = require('fs'),
  util = require('util'),
  glob = require('glob'),
  program = require('commander'),
  mv = require('../index.js');

program
  .version('0.0.1')
  // Not implemented yet
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


console.log('Start renaming');
mv.mvFile(currentDir, sourceAbsPath, destAbsPath, function(err) {
  if (err) {
    process.exit(1);
  }

  console.log('Successfully moved file and updated all file references');
  process.exit();
})