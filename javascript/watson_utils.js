var fs = require('fs');
var strip_json_comments = require('strip-json-comments');
var ConversationUtils = require('../javascript/conversation_utils');
var AlchemyApiUtils = require('../javascript/alchemyapi_utils');

//************ Constructor **************//
function WatsonUtils(app) {

    this.loadConfig()

    this.conversationUtils = new ConversationUtils(this)
    this.alchemyUtils = new AlchemyApiUtils(this)

    this.addUrlPaths(app)
}

WatsonUtils.prototype.isReady = function() {
    return this.conversationUtils.isReady() && this.alchemyUtils.isReady()
}

WatsonUtils.prototype.addUrlPaths = function(app) {

    // Endpoint to call from the client side
    var internalThis = this
    app.post( '/message', function(req, res) {
        if ( req.body.input && req.body.context) {
            internalThis.alchemyUtils.identifyEntities(req.body.input.text)
                .then(function(entities) {
                    internalThis.conversationUtils.processUserMessage(req,res,entities)
                        .then(function(message) {
                            res.json(message);
                        }, function (err) {
                            internalThis.handleError(res,"Failed to process conversation. " + JSON.stringify(err));
                        });
                }, function (err) {
                    internalThis.handleError(res,"Failed to determine answer text for '" + userText + ". " + JSON.stringify(err));
                });
        }else{
            internalThis.initConversationService(res)
        }
    });
}

WatsonUtils.prototype.loadConfig = function() {
    // Load local config including credentials for running app locally (but services remotely)
    var configFPath = "./config/watson_config.json";
    if (fs.existsSync(configFPath)) {

        try {
            var data = fs.readFileSync(configFPath, "utf8");
            data = strip_json_comments(data);
            this.config = JSON.parse(data);
        } catch (err) {
            this.config = null
            console.log("Unable to load local credentials.json:\n" + JSON.stringify(err));
        }
    }
}

WatsonUtils.prototype.handleError = function(res, errMessage) {
    var response = {
        status : 500,
        message : errMessage
    };
    /*$assistantLoading.hide();
     $assistantError.find('.errorMsg').html();
     $assistantError.show();*/
    console.log("Error occurred processing request:\n" + JSON.stringify(response));
    res.status(500).json(response);
}

// Exported class
module.exports = WatsonUtils;