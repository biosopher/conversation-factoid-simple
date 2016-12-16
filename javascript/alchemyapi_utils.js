var bluemix  = require('../config/bluemix');
var extend   = require('util')._extend;
var Q = require('q');
var wdc = require('watson-developer-cloud');
var DBpediaUtils = require('./reasoning_pipelines/dbpedia_utils');

function AlchemyApiUtils(watson,callback) {

    // If bluemix credentials (VCAP_SERVICES) are present then override the local credentials
    watson.config.alchemyapi = extend(watson.config.alchemyapi, bluemix.getServiceCreds('alchemyapi'));

    if (watson.config.alchemyapi
        && watson.config.alchemyapi.api_key && watson.config.alchemyapi.api_key.toLowerCase().indexOf("key") == -1) {
        this.alchemyService = wdc.alchemy_language({
            api_key: watson.config.alchemyapi.api_key
        });
    }else{
        callback({errMessage :  "The app has not been configured with an api_key for Alchemy Language. Please update" +
                                " ./config/watson_config.json file with settings for your Alchemy Language service."});
    }
}

AlchemyApiUtils.prototype.isReady = function() {
    return this.alchemyService != null
}

AlchemyApiUtils.prototype.identifyEntities = function(userText) {

    var deferred = Q.defer();

    var internalThis = this;
    var params = {
        text: userText
    }
    this.alchemyService.entities(params, function (err, foundEntities) {
        if(err) {
            console.log("Failed to extract entities for '" + userText + ". " + JSON.stringify(err))
            deferred.resolve(err)
        }else{
            entities = {}
            if (foundEntities && foundEntities.entities) {
                internalThis.followDbpediaRedirects(foundEntities.entities)
                    .then(function() {
                        // Nothing return from prior method as it updates entities object directly
                        entities = internalThis.prettifyEntities(foundEntities.entities)
                        deferred.resolve(entities)
                    })
            }else{
                deferred.resolve(entities)
            }
        }
    });
    return deferred.promise
}

// Some entities returned by DBpedia don't point to the page of interest.  Follow the redirects
// to the desired page. See DBpediaUtils.followRedirects for details.
AlchemyApiUtils.prototype.followDbpediaRedirects = function(entities) {

    var thePromises = []
    entities.forEach(function(entity) {
        if (entity.disambiguated && entity.disambiguated.dbpedia) {
            var deferred = Q.defer()
            DBpediaUtils.followRedirects(entity.disambiguated.dbpedia)
                .then(function(redirect) {
                    if (redirect) {
                        entity.disambiguated.dbpedia = redirect
                    }
                    deferred.resolve(null)
                })
            thePromises.push(deferred.promise)
        }
    });
    return Q.all(thePromises)
}

AlchemyApiUtils.prototype.prettifyEntities = function(foundEntities) {

    entities = {};
    for (var i = 0; i < foundEntities.length; i++) {
        var entity = foundEntities[i];
        if (entity.disambiguated && entity.disambiguated.dbpedia) {
            var prettyEntity = {};
            prettyEntity.name = entity.disambiguated.name;
            prettyEntity.relevance = entity.relevance;
            prettyEntity.links = {}
            prettyEntity.links.dbpediaLink = entity.disambiguated.dbpedia;
            prettyEntity.links.freebaseLink = entity.disambiguated.freebase;
            prettyEntity.links.yagoLink = entity.disambiguated.yago;
            prettyEntity.links.opencycLink = entity.disambiguated.opencyc;

            // Currently support single instance of each entity type
            if (entity.type == "Person" && !entities["person"]) {
                entities.person = prettyEntity
                entities.person.type = "person"
            }else if (entity.type == "Place" && !entities["place"]) {
                entities.place = prettyEntity
                entities.place.type = "place"
            }else if (entity.type == "Health" && !entities["health"]) {
                entities.health = prettyEntity
                entities.health.type = "health"
            }
        }
    }
    return entities;
}

// Exported class
module.exports = AlchemyApiUtils
