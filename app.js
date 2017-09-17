'use strict';

var restify = require('restify');
var builder = require('botbuilder');
var Store = require('./store');
const LUIS_APP_URL = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/d3b4d78d-c051-451f-b0f2-4d86b381a8ef?subscription-key=35e4c714b5004788b7e877a86cc8858f&timezoneOffset=0&verbose=true&q='

var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url);
});

// setup bot credentials
var connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
});

server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, function (session) {
  session.send('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
});


// Install a custom recognizer to look for user saying 'help' or 'goodbye'.
bot.recognizer({
  recognize: function (context, done) {
  var intent = { score: 0.0 };

        if (context.message.text) {
            switch (context.message.text.toLowerCase()) {
                case 'help':
                    intent = { score: 1.0, intent: 'Help' };
                    break;
                case 'hi':
                    intent = { score: 1.0, intent: 'Hi' };
                    break;
                case 'goodbye':
                    intent = { score: 1.0, intent: 'Goodbye' };
                    break;
            }
        }
        done(null, intent);
    }
});

// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/
var luisAppUrl = process.env.LUIS_APP_URL || 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/d3b4d78d-c051-451f-b0f2-4d86b381a8ef?subscription-key=35e4c714b5004788b7e877a86cc8858f&timezoneOffset=0&verbose=true&q=';
bot.recognizer(new builder.LuisRecognizer(luisAppUrl));

// root dialog
bot.dialog('Hi', function(session, args) {

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

}).triggerAction({
  matches: 'Hi'
});


bot.dialog('FindApartments', [
  function (session, args, next) {
      session.send('One moment, while I sober up..', session.message.text);

      // try extracting entities
      var cityEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.geography.city');
      if (cityEntity) {
          // city entity detected, continue to next step
          session.dialogData.searchType = 'city';
          next({ response: cityEntity.entity });
      } else {
          // no entities detected, ask user for a destination
          builder.Prompts.text(session, 'Please enter your destination');
      }
  },
  function (session, results) {
      var destination = results.response;

      var message = 'Looking for apartments';
      message += ' in %s...';

      session.send(message, destination);

      // Async search
      Store
          .searchApartments(destination)
          .then(function (apartments) {
              // args
              session.send('I found %d apartments:', apartments.length);

              var message = new builder.Message()
                  .attachmentLayout(builder.AttachmentLayout.carousel)
                  .attachments(apartments.map(apartmentAsAttachment));

              session.send(message);

              // End
              session.endDialog();
          });
  }
]).triggerAction({
  matches: 'FindApartments',
  onInterrupted: function (session) {
      session.send('Please provide a destination');
  }
});

bot.dialog('FindRentalTrucks', [
    function (session, args, next) {
        session.send('One second while I find the best moving trucks in the land', session.message.text);

        // try extracting entities
        var rentalEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.vehicle');
        if (rentalEntity) {
            // city entity detected, continue to next step
            session.dialogData.searchType = 'vehicle';
            next({ response: rentalEntity.entity });
        } else {
            // no entities detected, ask user for a destination
            builder.Prompts.text(session, 'Did you need help finding a vessle to move your belongings?');
        }
    },
    function (session, results) {
        var destination = results.response;

        var message = "I'll be back after some drinks";

        session.send(message, destination);

        // Async search
        Store
            .searchApartments(destination)
            .then(function (searchRentals) {
                // args
                session.send('I found %d places where you can rent trucks! How grand!:', searchRentals.length);

                var message = new builder.Message()
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(apartments.map(apartmentAsAttachment));

                session.send(message);

                // End
                session.endDialog();
            });
    }
]).triggerAction({
    matches: 'FindRentalTrucks',
    onInterrupted: function (session) {
        session.send('Did you have a preferred company?');
    }
});

// help command
bot.dialog('Help', function (session) {
  session.endDialog('Don\'t feel bad, Sansa asks me all the time. Try asking me things like \'find apartments in Cambridge\' or \'find apartments near Boston University\'');
}).triggerAction({
  matches: 'Help'
});

// Add a global endConversation() action that is bound to the 'Goodbye' intent
bot.endConversationAction('goodbyeAction', "Ok... See you later.", { matches: 'Goodbye' });

// Helpers
function apartmentAsAttachment(apartment) {
  return new builder.HeroCard()
      .title(apartment.name)
      .subtitle('%d stars. %d reviews. From $%d per night.', apartment.rating, apartment.numberOfReviews, apartment.priceStarting)
      .images([new builder.CardImage().url(apartment.image)])
      .buttons([
          new builder.CardAction()
              .title('More details')
              .type('openUrl')
              .value('https://www.bing.com/search?q=apartments+in+' + encodeURIComponent(apartment.location))
      ]);
}
// function searchApartments(destination) {
  
// }