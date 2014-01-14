var express = require('express')
    app = express(),
    embedly = require('embedly'),
    util = require('util'),
    winston = require('winston'),
    logger = new (winston.Logger)({
        transports: [new (winston.transports.Console)({ level: 'info' })]
    }),
    http = require('http'),
    user_config = require('./config.json'),
    nodemailer = require("nodemailer");

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP",{
    host: user_config.smtp.hostname,
    auth: {
        user: user_config.smtp.login,
        pass: user_config.smtp.password,
    }
});

// setup e-mail data with unicode symbols
var mailOptions = {
    from: "Evernote Bouncer <evernote-bouncer@mg.myebofthings.com>", // sender address
    to: "robertomigli@gmail.com", // list of receivers
    subject: "Hello!", // Subject line
    text: "Hello world", // plaintext body
    html: "<b>Hello world</b>" // html body
}

// Configurations
app.configure(function(){
  app.use(express.logger('dev'));
  app.use(express.urlencoded());
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


var app = express();

app.post('/evernote/mail', function(req, res){
  console.log(req);
  res.send('OK');
  var sender        = req.body.sender,
      recipient     = req.body.recipient,
      subject       = req.body.subject || "",
      body_plain    = req.body['body-plain'] || "",
      stripped_text = req.body['stripped-text'] || "";

      console.log(req.body)
/*
  // send mail with defined transport object
  smtpTransport.sendMail(mailOptions, function(error, response){
      if(error){
          console.log(error);
      }else{
          console.log("Message sent: " + response.message);
      }
  });
  new embedly({key: user_config.embedly_api_key, logger: logger}, function(err, api) {
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
  });*/
  res.send('OK');
});
var server = http.createServer(app);
server.listen(process.env.PORT || 2378);
console.log('Express server started on port %s', server.address().port);
