var express     = require('express'),
    embedly     = require('embedly'),
    winston     = require('winston'),
    util        = require('util'),
    http        = require('http'),
    nodemailer  = require("nodemailer"),
    fs          = require('fs'),
    crypto      = require('crypto'),
    Evernote    = require('evernote').Evernote,
    multipart   = require('connect-multiparty'),
    user_config = require('./config.json');

var app    = express(),
    logger = new (winston.Logger)({
        transports: [new (winston.transports.Console)({ level: 'info' })]
    });

var multipartMiddleware = multipart();

//instanciate Evernote client
var client = new Evernote.Client({token: user_config.evernote_dev_token, sandbox: false});

var userStore = client.getUserStore();

userStore.checkVersion(
  "Evernote EDAMTest (Node.js)",
  Evernote.EDAM_VERSION_MAJOR,
  Evernote.EDAM_VERSION_MINOR,
  function(err, versionOk) {
    if (!versionOk) {
      console.log("Evernote API out of sync, please update with NPM");
      process.exit(1);
    }
  }
);

var noteStore = client.getNoteStore();

// List all of the notebooks in the user's account
var notebooks = noteStore.listNotebooks(function(err, notebooks) {
  console.log("Found " + notebooks.length + " notebooks:");
  for (var i in notebooks) {
    console.log(" * " + notebooks[i].name);
  }
});


// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP",{
    host: user_config.smtp.hostname,
    auth: {
        user: user_config.smtp.login,
        pass: user_config.smtp.password,
    }
});

// setup e-mail data with unicode symbols
var default_mail_options = {
    from: "", // sender address
    to: "", // list of receivers
    subject: "Hello!", // Subject line
    text: "Hello world", // plaintext body
    html: "<b>Hello world</b>" // html body
};


var app = express();

// Configurations
app.use(express.logger('dev'));
app.use(express.urlencoded());


app.configure('development', function(){
  app.use(express.errorHandler());
});

app.post('/evernote/mail', function(req, res){
  var sender        = req.body.sender,
      recipient     = req.body.recipient,
      subject       = req.body.subject || "",
      body_plain    = req.body['body-plain'] || "",
      stripped_text = req.body['stripped-text'] || "",
      extend        = require('node.extend');

  console.log(sender,recipient,subject,body_plain,stripped_text);
  res.send('OK');
  /*
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
  });
  // send mail with defined transport object
  smtpTransport.sendMail(mailOptions, function(error, response){
      if(error){
          console.log(error);
      }else{
          console.log("Message sent: " + response.message);
      }
  });
  */
});

var server = http.createServer(app);
server.listen(process.env.PORT || 2378);
console.log('Express server started on port %s', server.address().port);
