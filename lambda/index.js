const RSSParser = require('rss-parser');
const parser = new RSSParser();
const Alexa = require('ask-sdk-core');

const getNewsletterFeed = async () => {
const FEED_URL = 'https://newcastlevisionsupport.org.uk/category/newsletters/feed/';
    const newsletterFeed = await parser.parseURL(FEED_URL);
    const audioNewsletterPosts = newsletterFeed.items.filter((post) => post.enclosure && post.enclosure.type === 'audio/mpeg')
    return audioNewsletterPosts;
}

const getWhatsOnFeed = async () => {
    try {
    const FEED_URL = 'https://newcastlevisionsupport.org.uk/whats-on/feed';
    const newsletterFeed = await parser.parseURL(FEED_URL);
    //filter to the desired number of days previously
    const dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const timeFilteredFeed = newsletterFeed.items.filter((event) => new Date(event.isoDate) > dateFilter)
    return timeFilteredFeed;
    } catch (error) {
        throw error;
    }
};

const formatString = (starterString) => {
   const subString =  starterString.slice(0, starterString.indexOf('<p>The post <a rel="nofollow"'));
   /*the string needs to be formatted in SSML, this does not accept <br> it will accept <p></p> but as the string needs displaying on a card it will get replaced.
   there are two strings that could be used but the content:encoded string has the full description 
   where as the other contentSnippet is not the full description*/
   return subString.replaceAll(/<\/?[a-z]{1,2}>/g, ' ');
};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to the Newcastle Vision Support Alexa Skill. You can ask me to play the latest newsletter, or list events. What would you like to hear?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .withSimpleCard('Welcome to the Newcastle Vision Support Alexa Skill.', 'Welcome to the Newcastle Vision Support Alexa Skill.')
            .getResponse();
    }
};

const PlayNewsletterIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayNewsletterIntent';
    },
    async handle(handlerInput) {
        try {
            const newsletterFeed = await getNewsletterFeed();
            // episodes filters the newsletter feed to get only those posts that contain audio
            if (!newsletterFeed || newsletterFeed.length === 0) {
                throw new Error('No episodes found')
            }
            const mostRecentNewsletter = newsletterFeed[0]
            const speakOutput = `Playing ${mostRecentNewsletter.title}`;
            const audioUrl = mostRecentNewsletter.enclosure.url.replace('http:', 'https:');
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withSimpleCard('Playing latest Newsletter.', `Playing ${mostRecentNewsletter.title} from Newcastle Vision Support.`)
                .addAudioPlayerPlayDirective('REPLACE_ALL', audioUrl, audioUrl, 0, null)
                .getResponse();
                
        } catch (error) {
            const errorMessage = 'I\'m sorry. I could not play the latest newsletter. Please try again later'
            return handlerInput.responseBuilder
                .speak(errorMessage)
                .reprompt(errorMessage)
                .withSimpleCard('Error', errorMessage)
                .getResponse();
        }
    }
};

const ListEventsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ListEventsIntent';
    },
    async handle(handlerInput) {
        try {
            const whatsOnFeed = await getWhatsOnFeed();
 
            if (!whatsOnFeed|| whatsOnFeed.length === 0 ) {
                throw new Error('No events')
            }
            
            const eventNames = whatsOnFeed.map((event) => `\n ${event.title}`);
            const uniqueEventNamesToDisplay = eventNames.filter((event,index) => eventNames.indexOf(event) === index);
            const uniqueEventNamesToSpeak = uniqueEventNamesToDisplay.map((eventTitle) => `${eventTitle} <break time="200ms"/>`);
            
            const eventsStringBeginning = 'Here are the events that have been posted in the past 30 days:'
            const eventsStringEnd = 'Which would you like to hear more about?'
      
            return handlerInput.responseBuilder
                    .speak(`${eventsStringBeginning} ${uniqueEventNamesToSpeak} ${eventsStringEnd}`)
                    .withSimpleCard('Events list', `${eventsStringBeginning} ${uniqueEventNamesToDisplay} ${eventsStringEnd}`)
                    .reprompt(`${eventsStringBeginning} ${uniqueEventNamesToSpeak} ${eventsStringEnd}`)
                    .getResponse();
        } catch (error) {
            const errorMessage = 'I\'m sorry. There have been no new events posted in the past thirty days. Please try again later or contact Newcastle Vision Support for more information.'
            return handlerInput.responseBuilder
                .speak(errorMessage)
                .reprompt(errorMessage)
                .withSimpleCard('Error', errorMessage)
                .getResponse();
        }
    }
};

const DescribeEventIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'DescribeEventIntent';
    },
    async handle(handlerInput) {
        try {
            const whatsOnFeed = await getWhatsOnFeed();
            console.log(whatsOnFeed)
            if (!whatsOnFeed|| whatsOnFeed.length === 0 ) {
                throw new Error('No events')
            }
            
            const eventToDescribe = whatsOnFeed.filter((event) => event.title.toLowerCase().includes(handlerInput.requestEnvelope.request.intent.slots.eventName.value));
            console.log(eventToDescribe[0])
            const subStringToRead = formatString(eventToDescribe[0]['content:encoded']);
            
            let eventString = `here are the details for ${eventToDescribe[0].title}:  ${subStringToRead}`
            
            return handlerInput.responseBuilder
                .speak(eventString)
                .withSimpleCard(`${eventToDescribe[0].title}`, eventString)
                .reprompt(eventString)
                .getResponse();
                
        } catch (error) {
            const errorMessage = 'I\'m sorry. I cannot find the event. Please try again. or contact Newcastle Vision Support for further help.'
            return handlerInput.responseBuilder
                .speak(errorMessage)
                .reprompt(errorMessage)
                .withSimpleCard('Error', errorMessage)
                .getResponse();
        }
    }
};

const PauseAudioIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.PauseIntent';
    },
    async handle(handlerInput) {
        const pauseText = 'I\'m sorry but pausing is currently unsupported. I have stopped the newsletter, but you will have to play it from the start. Is there anything else you would like to hear?'
        return handlerInput.responseBuilder
            .speak(pauseText)
            .addAudioPlayerStopDirective()
            .reprompt(pauseText)
            .withSimpleCard('Pause unsupported', pauseText)
            .getResponse();
    }
};

const ResumeAudioIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.ResumeIntent';
    },
    async handle(handlerInput) {
        const resumeText = 'I\'m sorry but resuming is currently unsupported. You will have to play the newsletter from the start. Is there anything else you would like to hear?'
        return handlerInput.responseBuilder
            .speak(resumeText)
            .addAudioPlayerStopDirective()
            .reprompt(resumeText)
            .withSimpleCard('Resume unsupported', resumeText)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'This Alexa skill for Newcastle Vision Support has three functions. To play our newsletter say, play newsletter. To hear a list of upcoming events say, list events. Or to hear about a specific event say, tell me more about, followed by the event title.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withSimpleCard('Newcastle Vision Support Help', `Say one of the following: \n 'play newsletter' \n 'list events' \n 'tell me about...'`)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Thank you for using the Newcastle Vision Support Skill. Goodbye.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withSimpleCard('Thank you', speakOutput)
            .getResponse();
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        PlayNewsletterIntentHandler,
        ListEventsIntentHandler,
        DescribeEventIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        PauseAudioIntentHandler,
        ResumeAudioIntentHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();