// this is for the codes
/* jshint node: true */

'use strict';
var Alexa = require('alexa-sdk');
var APP_ID = '';
var AQI = 0;

var languageStrings = {
    'en-US': {
        translation: {
            SKILL_NAME: 'Louisville Voting Toolkit',
            HELP_MESSAGE: 'You can ask where do I register to vote',
            HELP_REPROMPT: 'You can ask where do I register to vote, or, exit.',
            STOP_MESSAGE: 'Make sure you Vote in the Ville! Bye!',
            ERROR_MESSAGE: 'I\'m sorry, I can\'t access the Louisville Voting Toolkit right now.'
        },
    }
};

var handlers = {
    'LaunchRequest': function () {
        this.emit('GetVotingLocation');
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

var handlers = {

    'LaunchRequest': function() {
        var cardTitle = this.t("Atria Census", this.t("Atria Census"));
        var cardContent = this.t("Welcome! You can ask about move ins, move outs, and the forecast.");
        var imageObj = {
            smallImageUrl: 'https://s3.amazonaws.com/atriaalexacensus/atria-alexa-sm.jpg',
            largeImageUrl: 'https://s3.amazonaws.com/atriaalexacensus/atria-alexa-lg.jpg'
        };
        this.emit('AMAZON.HelpIntent', imageObj, cardTitle, cardContent);
    },

    'GetActualMoveInIntent': function() {
        var self = this;

        httpsGet((returnData) => {

            if (returnData){
            var MOVEINS = JSON.parse(returnData).Actual.MoveIn;
                this.emit(':ask', "The move ins, month to date, are " + Math.abs(MOVEINS) + ".",
                    self.t('HELP_MESSAGE'));
                }
        });

    },

    'GetActualMoveOutIntent': function() {
        var self = this;

        httpsGet((returnData) => {

            if (returnData){
                var MOVEOUTS = JSON.parse(returnData).Actual.MoveOut;
                this.emit(':ask', "The move outs, month to date, are " + Math.abs(MOVEOUTS) + ".",
                    self.t('HELP_MESSAGE'));
                }
        });

    },

    'GetForecastIntent': function() {
        var self = this;
        httpsGet((returnData) => {

            if (returnData) {
                var FORECASTMOVEINS = JSON.parse(returnData).RVPEstimate.MoveIn;
                var FORECASTMOVEOUTS = JSON.parse(returnData).RVPEstimate.MoveOut;
                this.emit(':ask', 'The RVPs have estimated ' + Math.abs(FORECASTMOVEINS) + ' move ins and ' + Math.abs(FORECASTMOVEOUTS) + " move outs" + ".", self.t('HELP_MESSAGE'));
            } else {
                self.emit('ErrorIntent');
            }
        });

    },

    'GetDiffIntent': function() {
        var self = this;
        httpsGet((returnData) => {
            var DIFFMOVEINS = JSON.parse(returnData).RVPEstimate.MoveIn - JSON.parse(returnData).OpsPlan.MoveIn;
            var DIFFMOVEOUTS = JSON.parse(returnData).RVPEstimate.MoveOut - JSON.parse(returnData).OpsPlan.MoveOut;
            var DIFFNET = JSON.parse(returnData).RVPEstimate.Net - JSON.parse(returnData).OpsPlan.Net;
            var MOVEINSPEECH = "";
            var MOVEOUTSPEECH = "";
            var DIFFNETSPEECH = "";
            var FINALSPEECH = "";

            if (DIFFMOVEINS > 0) {
                MOVEINSPEECH = "Move ins are " + Math.abs(DIFFMOVEINS) + " greater than target. ";
            }
            else {
                MOVEINSPEECH = "Move ins are " + Math.abs(DIFFMOVEINS) + " less than target. ";
            }

            if (DIFFMOVEOUTS > 0) {
                MOVEOUTSPEECH = "Move outs are " + Math.abs(DIFFMOVEOUTS) + " greater than target. ";
            }
            else {
                MOVEOUTSPEECH = "Move outs are " + Math.abs(DIFFMOVEOUTS) + " less than target. ";
            }

            if (DIFFNET > 0) {
                DIFFNETSPEECH = "Net is " + Math.abs(DIFFNET) + " greater than target. ";
            }
            else {
                DIFFNETSPEECH = "Net is " + Math.abs(DIFFNET) + " less than target. ";
            }

            FINALSPEECH = MOVEINSPEECH + MOVEOUTSPEECH + DIFFNETSPEECH;

            self.emit(':ask', FINALSPEECH, FINALSPEECH);

        });

    },

    'EasterEggIntent': function() {
        this.emit(':ask', "Atria Information Technologies Department, is the best, obviously.");
    },

    'Unhandled': function() {
        this.emit('AMAZON.HelpIntent');
    },

    'ErrorIntent': function() {
        this.emit(':ask', this.t('ERROR_MESSAGE'));
    },
    'AMAZON.HelpIntent': function() {
        var speechOutput = this.t('HELP_MESSAGE');
        var reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.StopIntent': function() {
        var speechOutput = this.t("STOP_MESSAGE");
        this.emit(':tell', speechOutput);
    },
    'AMAZON.CancelIntent': function() {
        var speechOutput = this.t('STOP_MESSAGE');
        this.emit(':tell', speechOutput);
    }
};


var https = require('https');

function httpsGet(callback) {
    var options = {
        host: 's3.amazonaws.com',
        port: 443,
        path: '/atriaalexacensus/test-census-revamp.json',
        method: 'GET'
    };
    var req = https.request(options, res => {
        res.setEncoding('utf8');
        var returnData = "";

        res.on('data', chunk => {
            returnData = returnData + chunk;
        });

        res.on('end', () => {

            console.log(JSON.stringify(returnData));

            callback(returnData);

        });

    });
    req.end();

}
