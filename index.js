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

require('fibrous');

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

var verify_mailgun_call = function(req, res, next) {
  if (req.body.timestamp === undefined || req.body.token === undefined) {
    res.send('Unknown caller', 403);
    return;
  }
  var computed_signature = crypto.createHmac('sha256', user_config.mailgun_api_key).update(req.body.timestamp + req.body.token).digest('hex');
  if (computed_signature !== req.body.signature) {
    res.send('Unknown caller', 403);
    return;
  }
  next();
};

var app = express();

// Configurations
app.use(express.logger('dev'));
app.use(express.urlencoded());

app.configure('development', function(){
  app.use(express.errorHandler());
});

//assuming notebooks guid won't change, we can store them in memory once extracted
var known_notebook_guid = {};

app.post('/evernote/mail', verify_mailgun_call, function(req, res){
  var sender        = req.body.sender,
      recipient     = req.body.recipient,
      subject       = req.body.subject || "",
      body_plain    = req.body['body-plain'] || "",
      stripped_text = req.body['stripped-text'] || "",
      extend        = require('node.extend'),
      urlArray      = [],
      matchArray    = [];

  var target_notebook = user_config.evernote_default_notebook;
  //extract the target notebook prefixed by @ at the end of subject (so we can handle whitespaces easily!)
  if ((matchArray = /@(.+)$/.exec(req.body.subject)) !== null) {
    target_notebook = matchArray[1];
    //strip the notebook name from the subject
    subject = subject.replace(/@(.+)$/, "").replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  }

  var target_notebook_guid;
  if (!(target_notebook in known_notebook_guid)) {
    //extract the notebookGuid (@todo make it syncronous!)
    var notebooks = noteStore.listNotebooks(function(err, notebooks) {
      for (var i in notebooks) {
        known_notebook_guid[notebooks[i].name] = notebooks[i].Guid;
      }
      if (target_notebook in known_notebook_guid) {
        target_notebook_guid = known_notebook_guid[target_notebook];
      } else {
        console.warn("Unknown notebook " + target_notebook);
        console.log(known_notebook_guid);
      }
    }); 
  }
   
  // Regular expression to find HTTP(S) URLs
  var regexToken = /((https?:\/\/)[\-\w@:%_\+.~#?,&\/\/=]+)/g;

  // Iterate through any URLs in the text.
  while( (matchArray = regexToken.exec( body_plain )) !== null ) {
      var token = matchArray[0];
      urlArray.push( token );
  }

  var opts = {
    urls      : urlArray,
    maxWidth  : 450,
    maxHeight : 450
  };
  
  new embedly({key: user_config.embedly_api_key, logger: logger}, function(err, api) {
    api.extract(opts, function(err, api_return_values) {
      if (!!err) {
        console.error(err.stack, api_return_values);
        return;
      }
      var is_multi_url = false;
      if (api_return_values.length > 1) {
        is_multi_url = true;
      }
      api_return_values.forEach(function(api_return_value){
        //everything seems good - create the note
        var note = new Evernote.Note();

        note.title = is_multi_url ?  api_return_value.title : subject;

        var note_content = api_return_value.content || api_return_value.description || api_return_value.title;
        note_content = note_content.replace(/\n/g, '<br />').replace(/\t/g, '');
        note_content = note_content.replace(/<br>/g, '<br />'); //this is a temporary fix!
        note.content = '<?xml version="1.0" encoding="UTF-8"?>';
        note.content += '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">';
        note.content += '<en-note>';
        note.content += note_content;
        note.content += "<br /><br />";
        note.content += "Source: " + api_return_value.url;
        note.content += '</en-note>';

        if (target_notebook_guid) {
          note.notebookGuid = target_notebook_guid;
        }
        noteStore.createNote(note, function(err, createdNote) {
          if (!!err) {
            console.error(err, note.title, note.content);
            return;
          }

        });
        /*api_return_value.description
        api_return_value.content
        api_return_value.url*/
      });
    });
  });

  res.send('OK');
});

var server = http.createServer(app);
server.listen(process.env.PORT || 2378);
console.log('Express server started on port %s', server.address().port);
