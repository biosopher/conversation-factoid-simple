var bluemix  = require('../config/bluemix');
var DBpediaUtils = require('../javascript/dbpedia_utils');
var extend   = require('util')._extend;
var Q = require('q');
var wdc = require('watson-developer-cloud');

function AlchemyUtils(watson,callback) {

    // If bluemix credentials (VCAP_SERVICES) are present then override the local credentials
    watson.config.alchemy_api = extend(watson.config.alchemy_api, bluemix.getServiceCreds('alchemy_api'));

    if (watson.config.alchemy_api
        && watson.config.alchemy_api.apikey && watson.config.alchemy_api.apikey.toLowerCase().indexOf("key") == -1) {
        this.alchemyService = wdc.alchemy_language({api_key: watson.config.alchemy_api.apikey});
    }else{
        console.log("ERROR: The app has not been configured with an apikey for Alchemy Language. Please update" +
                     " ./config/watson_config.json file with settings for your Alchemy Language service.");
    }
}

AlchemyUtils.prototype.isReady = function() {
    return this.alchemyService != null
}

AlchemyUtils.prototype.identifyPeople = function(userText) {

    var deferred = Q.defer();

    var internalThis = this;
    var params = {
        text: userText
    }
    this.alchemyService.entities(params, function (err, foundEntities) {
        if(err) {
            console.log("Failed to extract entities for '" + userText + ". " + JSON.stringify(err))
            var people = []
            deferred.resolve(people)
        }else{
            var people = []
            console.log("User text: " + userText +"\nEntities found: " + JSON.stringify(foundEntities))
            foundEntities.entities.forEach(function(entity) {
                if (entity.type == "Person") {
                    if (entity.disambiguated && entity.disambiguated.dbpedia) {
                        var person = {}
                        person.name = entity.disambiguated.name
                        person.dbpediaLink = entity.disambiguated.dbpedia
                        people.push(person)
                    } else {
                        // 99% of the time, we can still use the name that's found and create our own resource link
                        var person = {}
                        person.name = entity.text
                        person.dbpediaLink = "http://dbpedia.org/resource/" + entity.text.replace(/ /g, "_")
                        people.push(person)
                    }
                    person.name_href = DBpediaUtils.htmlLinkForEntity(person.dbpediaLink)
                }
            });

            if (people.length > 0) {
                internalThis.followDbpediaRedirects(people)
                    .then(function() {
                        // Nothing return from prior method as it updates entities object directly
                        deferred.resolve(people)
                    }, function (err) {
                        deferred.reject(err)
                    });
            }else{
                deferred.resolve(people)
            }
        }
    });
    return deferred.promise
}

// Some entities returned by DBpedia don't point to the page of interest.  Follow the redirects
// to the desired page. See DBpediaUtils.followRedirects for details.
AlchemyUtils.prototype.followDbpediaRedirects = function(people) {

    var thePromises = []
    people.forEach(function(person) {
        if (person.dbpediaLink) {
            var deferred = Q.defer()
            DBpediaUtils.followRedirects(person.dbpediaLink)
                .then(function(redirect) {
                    if (redirect) {
                        person.dbpediaLink = redirect
                    }
                    deferred.resolve(null)
                })
            thePromises.push(deferred.promise)
        }
    });
    return Q.all(thePromises)
}

// Exported class
module.exports = AlchemyUtils
