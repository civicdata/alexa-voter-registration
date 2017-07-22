/* jshint node: true */

'use strict';

process.env.UV_THREADPOOL_SIZE = 128;

var Alexa = require('alexa-sdk');
var request = require('request');
var APP_ID = '';
var AQI = 0;

var languageStrings = {
    'en-US': {
        translation: {
            SKILL_NAME: 'Louisville Air Quality',
            HELP_MESSAGE: 'You can ask how\'s the air, or, exit.',
            HELP_REPROMPT: 'You can ask how\'s the air, or, exit.',
            STOP_MESSAGE: 'Breathe safely out there! Bye!',
            ERROR_MESSAGE: 'I\'m sorry, I can\'t access the air quality index right now.'
        },
    }
};

var handlers = {
    'LaunchRequest': function () {
        this.emit('GetAQIntent');
    },

    'GetAQIntent': function () {
        // save intent object for use
        var self = this;

        // fetch the current AQI for Louisville
        request({method: 'GET', timeout: 5000, url:'https://www.atriaseniorliving.com/sites/archive/bouv/getLouAir.php'}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log('request successful');
                var jsonContent = JSON.parse(body);
                AQI = jsonContent.AirQuality.Index;

                var theIndexStatement = 'The Air Quality Index value is ' + AQI + '. ';

                switch(true) {
                    case (AQI <= 50):
                        self.emit(':tell', theIndexStatement + 'The air quality is good. Air quality is considered satisfactory, and air pollution poses little or no risk.');
                        break;
                    case (AQI <= 100):
                        self.emit(':tell', theIndexStatement + 'The air quality is moderate. Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.');
                        break;
                    case (AQI <= 150):
                        self.emit(':tell', theIndexStatement + 'The air quality is unhealthy for sensitive groups. Members of sensitive groups may experience health effects. The general public is not likely to be affected.');
                        break; 
                    case (AQI <= 200):
                        self.emit(':tell', theIndexStatement + 'The air quality is unhealthy. Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.');
                        break;  
                    case (AQI <= 300):
                        self.emit(':tell', theIndexStatement + 'The air quality is very unhealthy. Health alert: everyone may experience more serious health effects.');
                        break;  
                    case (AQI <= 500):
                        self.emit(':tell', theIndexStatement + 'The air quality is hazardous. Health warnings of emergency conditions. The entire population is more likely to be affected.');
                        break;  
                }
            }
            else {
                console.log('request error: ' + error);
                if (error == 'Error: ESOCKETTIMEDOUT' || error == 'Error: ETIMEDOUT') {
                    // probably a timeout with remote service, so retrying
                    // will only retry as much as Lambda will allow (set in aws console, 30 sec at time of writing this
                    console.log('timed out, so retrying');
                    self.emit('GetAQIntent');
                }
                else {
                    self.emit('ErrorIntent');
                }
            }
        });
    },

    'ErrorIntent': function() {
      this.emit(':tell',this.t('ERROR_MESSAGE'));
    },

    'AMAZON.HelpIntent': function () {
        var speechOutput = this.t('HELP_MESSAGE');
        var reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },

    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },

    'Unhandled': function() {
        this.emit('ErrorIntent');
    }

};

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};