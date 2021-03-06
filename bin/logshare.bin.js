#!/usr/bin/env node
var logshare = process.env.LOGSHARE || 'https://logshare.mybluemix.net';
var stdin = process.stdin;
var URL = require('url');
var request = require('request');

var kill = function(id) {
  var url = logshare + '/stop/' + id;
  request({url: url, method: 'get'}, function(e, r, b) {
    process.exit();
  });
};

var usage = function() {
  console.error("Usage:");
  console.error("  To share data:")
  console.error("     tail -f /var/log/messages | logshare");
  console.error("   or to pipe the changes to your stdout:");
  console.error("     tail -f /var/log/messages | logshare -f");
  console.error("  To consume shared data on the command-line:")
  console.error("     logshare <token>");
  console.error("   or visit the URL generated by logshare.")
  process.exit(1);
};

if (stdin.isTTY) {
  var argv = require('minimist')(process.argv.slice(2));
  if (argv._.length == 0) {
    usage();
  } 
  var token = argv._[0];
  var parsed =  URL.parse(token);
  if (parsed.protocol && parsed.pathname && parsed.pathname.match(/share\/.+/)) {
    token = token.substr( token.lastIndexOf('/') + 1);
  }

  var socket = require('socket.io-client')(logshare);
  socket.emit('subscribe', { id: token});
  socket.on('data', function(data){
    console.log(data);
  });
  socket.on('baddata', function(message){
    console.error("Invalid token");
    process.exit(1);
  });

} else {
  var argv = require('minimist')(process.argv.slice(2));
  var liner = require('../lib/liner.js');
  var objectifier = require('../lib/objectifier.js')
  
  // create a new logshare service
  var url = logshare + '/start'
  
  request.get(url, function(err, res, body) {
    if (err) {
      console.error("Could not contact the logshare server");
      process.exit(1);
    }
    body=JSON.parse(body);

    var writer = require('../lib/writer.js')(body.id, logshare);
    stdin.resume();  
    stdin.pipe(liner).pipe(objectifier).pipe(writer);
    console.log("Share URL:", body.shareurl);
    if (argv.f) {
      stdin.pipe(process.stdout);
    }

    process.on('SIGINT', function() {
      kill(body.id)
    });
  });
}



  
