var express = require('express'),
    embedly = require('embedly'),
    util = require('util'),
    winston = require('winston'),
    logger = new (winston.Logger)({
        transports: [new (winston.transports.Console)({ level: 'info' })]
    }),
    user_config = require('./config.json');

new embedly({key: user_config.EMBEDLY_KEY, logger: logger}, function(err, api) {
  var url = ('http://www.guardian.co.uk/media/2011/jan' +
             '/21/andy-coulson-phone-hacking-statement');
  api.extract({url: url}, function(err, objs) {
    if (!!err) {
      console.error('request #2 failed');
      console.error(err.stack, objs);
      return;
    }
    console.log('---------------------------------------------------------');
    console.log('3. ');
    console.log(util.inspect(objs[0]));
  });
});

var app = express();

app.post('/evernote/mail', function(req, res){
  res.send('Hello World');
});

app.listen(2378);
console.log('Listening on port 2378');
