var bluemix  = require('../config/bluemix');
var extend   = require('util')._extend;
var WDCConversation = require( 'watson-developer-cloud/conversation/v1' );
var PersonInfo = require('../javascript/person_info');

//************ Constructor **************//
function ConversationUtils(app) {

    // Init Watson Conversation service
    this.config.conversation = extend(this.config.conversation, bluemix.getServiceCreds('conversation')); // VCAP_SERVICES
    if ( !this.config.conversation.username || this.config.conversation.username == "USERNAME"
        || !this.config.conversation.password || this.config.conversation.password == "PASSWORD") {
        console.log("The app has not been configured with a USERNAME and PASSWORD for Watson Conversation. Please update" +
            " ./config/watson_config.json file with settings for your Conversation service.")
        return
    } else if ( !this.config.conversation.workspace_id || this.config.conversation.workspace_id.split("-").length == 0) {
        console.log("The app has not been configured with a WORKSPACE_ID for Watson Conversation. Please update" +
                    " ./config/watson_config.json file with settings for your Conversation service.")
        return
    }

    this.conversation = new WDCConversation({
        url: this.config.conversation.url,
        username: this.config.conversation.username,
        password: this.config.conversation.password,
        version_date: this.config.conversation.version_date,
        version: this.config.conversation.version
    });

    this.personInfo = new PersonInfo()
}

ConversationUtils.prototype.isReady = function() {
    return this.conversation != null
}

ConversationUtils.prototype.getDefaultConversationPayload = function() {
    var payload = {
        workspace_id: internalThis.config.conversation.workspace_id,
        context: {},
        input: {}
    };
    return payload
}

ConversationUtils.prototype.processUserMessage = function(req,res,entities) {

    var deferred = Q.defer();

    var internalThis = this
    var payload = internalThis.getDefaultConversationPayload()
    payload.input = req.body.input
    payload.context = req.body.context // The client MUST return the prior conversation context
    if (entities && (entities.person || entities.place || entities.health)) {
        // Store than clear prior detected entities
        payload.context.prior_health = payload.context.health
        payload.context.prior_person = payload.context.person
        payload.context.prior_place = payload.context.place

        payload.context.health = entities.health
        payload.context.person = entities.person
        payload.context.place = entities.place
    }else{
        // Use prior entities to answer this question
        entities.health = payload.context.health
        entities.person = payload.context.person
        entities.place = payload.context.place
    }
    internalThis.forwardToConversationService(res,payload.input,entities,payload)
        .then(function(message) {
            deferred.resolve(err)
        }, function (err) {
            deferred.reject(err)
        });
    return deferred.promise
}

// Initiating conversation so no input to process
ConversationUtils.prototype.initConversationService = function(res) {

    var deferred = Q.defer();
    internalThis.forwardToConversationService(res,"",null,internalThis.getDefaultConversationPayload())
        .then(function(message) {
            deferred.resolve(message)
        }, function (err) {
            deferred.reject(err)
        });
    return deferred.promise
}

ConversationUtils.prototype.forwardToConversationService = function(res,input,entities,payload) {

    var deferred = Q.defer();
    var internalThis = this
    this.conversation.message(payload, function (err, message) {
        if (err) {
            deferred.resolve(err)
        }

        // Must keep track of revised context
        payload.context = message.context
        if ( message.intents && message.intents.length > 0) {
            if ( !entities || (!entities.person && !entities.place && !entities.health)) {
                deferred.resolve(message)
            }else{
                // Extract factoids from Wikipedia based on intent identified by Watson Conversation
                internalThis.personInfo.getAnswerForIntent(message.intents[0].intent, entities)
                    .then(function (entity) {

                        payload.context[entity.type] = entity
                        internalThis.conversation.message(payload, function (err, message) {
                            if (err) {
                                deferred.resolve(err)
                            }
                            deferred.resolve(message)
                        });
                    }, function (err) {
                        deferred.resolve(err)
                    });
            }
        } else if (message.output && message.output.text) {
            // Simply return whatever "no intent found" reply is provided by Conversation.  This will also occur
            // after the first call to establish a conversation.
            deferred.resolve(message)
        }else{
            message.output = {};
            message.output.text = "Sorry. I'm having difficult understanding your question.";
            deferred.resolve(message)
        }
    });
    return deferred.promise
}

// Exported class
module.exports = ConversationUtils;