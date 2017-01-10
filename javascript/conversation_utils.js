var bluemix  = require('../config/bluemix');
var extend   = require('util')._extend;
var PersonInfoUtils = require('../javascript/person_info_utils');
var Q = require('q');
var WDCConversation = require( 'watson-developer-cloud/conversation/v1' );

//************ Constructor **************//
function ConversationUtils(watson) {

    // Init Watson Conversation service
    this.watson = watson

    watson.config.conversation = extend(watson.config.conversation, bluemix.getServiceCreds('conversation')); // VCAP_SERVICES
    if ( !watson.config.conversation.username || watson.config.conversation.username == "USERNAME"
        || !watson.config.conversation.password || watson.config.conversation.password == "PASSWORD") {
        console.log("ERROR: The app has not been configured with a USERNAME and PASSWORD for Watson Conversation. Please update" +
            " ./config/watson_config.json file with settings for your Conversation service.")
        return
    } else if ( !watson.config.conversation.workspace_id || watson.config.conversation.workspace_id.toLowerCase().indexOf("workspace") >= 0) {
        console.log("ERROR: The app has not been configured with a WORKSPACE_ID for Watson Conversation. Please update" +
                    " ./config/watson_config.json file with settings for your Conversation service.")
        return
    }

    this.conversation = new WDCConversation({
        url: watson.config.conversation.url,
        username: watson.config.conversation.username,
        password: watson.config.conversation.password,
        version_date: watson.config.conversation.version_date,
        version: watson.config.conversation.version
    });

    this.personInfoUtils = new PersonInfoUtils()
}

ConversationUtils.prototype.isReady = function() {
    return this.conversation != null
}

ConversationUtils.prototype.getDefaultConversationPayload = function() {
    var payload = {
        workspace_id: this.watson.config.conversation.workspace_id
    };
    return payload
}

// Initiating conversation so no input to process
ConversationUtils.prototype.initConversationService = function(res) {

    var deferred = Q.defer();
    var payload = this.getDefaultConversationPayload()
    this.conversation.message(payload, function (err, message) {
        if (err) {
            deferred.reject(err)
        }else{
            // Conversation will reply with message to start conversation with user
            deferred.resolve(message)
        }
    });
    return deferred.promise
}

ConversationUtils.prototype.processUserQuery = function(req,res,people) {

    var deferred = Q.defer();
    var payload = this.getDefaultConversationPayload()
    payload.context = req.body.context // Return conversation_id and other info.
    payload.context.person = null // Clear prior person until future code allows follow-on queries about same person

    if (people.length == 0) {
        // No person provide so stop and inform user about bot's requirements.
        var message = payload
        message.output = {}
        message.output.text = []
        message.output.text.push("I don't recognize that person.  Please ask a question about a famous person.")
        deferred.resolve(message)
    }else{
        payload.input = req.body.input

        // Classify the intent of the user's query
        var internalThis = this
        this.conversation.message(payload, function (err, message) {
            if (err) {
                deferred.reject(err)
            }else if (message.output.text && message.output.text.length > 0 && message.output.text[0].length > 0) {
                // Was an intent recognized?
                // output.text should only return here if error w/intent.  E.g. confidence <= 0.65
                deferred.resolve(message)
            }else{
                payload.context = message.context // Track revised context such as incremented conversation counter

                // Extract factoids from Wikipedia based on intent identified by Watson Conversation
                internalThis.personInfoUtils.getAnswerForIntent(message.intents[0].intent, people[0])
                    .then(function (person) {

                        // We now have the entity + intent + answer to intent so delegate final user answer to
                        // Watson Conversation.  This allows separation of UI from the backend code and let's UX designers
                        // or conversation specialists format the replies as desired.k
                        payload.context.person = person// ignore other found people for now
                        internalThis.conversation.message(payload, function (err, message) {
                            if (err) {
                                deferred.reject(err)
                            }else{
                                deferred.resolve(message)
                            }
                        });
                    }, function (err) {
                        deferred.reject(err)
                    });
            }
        });
    }
    return deferred.promise
}

// Exported class
module.exports = ConversationUtils;