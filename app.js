'use strict';

var restify = require('restify');
var builder = require('botbuilder');
var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url);
});

// setup bot credentials
var connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(connector);

// Add a global LUIS recognizer to your bot using the endpoint URL of your LUIS app
var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/2c2afc3e-5f39-4b6f-b8ad-c47ce1b98d8a?subscription-key=9823b65a8c9045f8bce7fee87a5e1fbc';
bot.recognizer(new builder.LuisRecognizer(model));

// handle the proactive initiated dialog
bot.dialog('/survey', [
  function (session, args, next) {
    var prompt = ('Which kindoms would please you? (Cambridge, Allston, Brookline, etc)');
    builder.Prompts.choice(session, prompt, "Location");
  },
  function (session, results) {
    session.send("Excellent. Let me look into that my leige.");
    session.send(results);
    session.endDialog();
  }
]);

// initiate a dialog proactively
function startProactiveDialog(address) {
  bot.beginDialog(address, "*:/survey");
}

var savedAddress;
server.post('/api/messages', connector.listen());

// Do GET this endpoint to start a dialog proactively
server.get('/api/CustomWebApi', (req, res, next) => {
    startProactiveDialog(savedAddress);
    res.send('triggered');
    next();
  }
);

// root dialog
bot.dialog('/', function(session, args) {

  savedAddress = session.message.address;

  var message = 'Hello, I\'m Tyrion Realister.';
  session.send({text: message,
                attachments: [
                    {
                    contentUrl: "https://vignette.wikia.nocookie.net/gameofthrones/images/5/58/Tyrion_main_s7_e6.jpg/revision/latest?cb=20170818050344",
                    contentType: "image/jpg",
                    name: "Tyrion.jpg"
                    }
                ]
            });
  message = ' I\'m here to be your personalized Hand on all matters related to rentals in Boston.';
  session.send(message);
  //

  connector.url

  setTimeout(() => {
    startProactiveDialog(savedAddress);
  }, 5000)
});
