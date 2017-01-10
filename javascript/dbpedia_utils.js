var Q = require('q');
var HttpUtils = require('../javascript/http_utils');

function performQuery(entityInfo,property) {

    var deferred = Q.defer();
    var entity = extractDBpediaEntity(entityInfo.dbpediaLink);
    queryDBpedia(entity,property)
        .then(function(answers) {
            if ((answers && answers.length > 0)) {
                deferred.resolve(answers);
            }else{
                deferred.resolve(null);
            }
        }, function(err) {
            deferred.reject(err);
        });
    return deferred.promise;
}

// Alchemy returns disambiguated resources that may actually link to other pages with actual content so we
// must follow those redirected links.  E.g. Alchemy returns "Hillary_Rodham_Clinton" which redirects
// to "Hillary_Clinton" which is the actual page we need.
function followRedirects(resourceLink) {

    var deferred = Q.defer();

    // ------------------------------
    // Reformat SPARQL query for HTTP
    // ------------------------------
    // select ?redirect
    // where {
    //      <http://dbpedia.org/resource/Hillary_Rodham_Clinton> dbo:wikiPageRedirects ?redirect .
    // }

    resourceLink = encodeURIComponent(resourceLink)
    var url = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=select%20%3Fredirect%20where%20%7B%20%3C" + resourceLink + "%3E%20dbo%3AwikiPageRedirects%20%3Fredirect%7D&format=json";
    new HttpUtils().sendToServer("GET",url,null,null,null,null)
        .then(function (data) {
            if (data != '' && data.results && data.results.bindings && data.results.bindings.length > 0 && data.results.bindings[0].redirect) {
                if (data.results.bindings[0].redirect.type == "uri") {
                    var redirect = data.results.bindings[0].redirect.value
                    deferred.resolve(redirect);
                }
            }
            deferred.resolve(null);
        }, function (err) {
            console.log("DBpedia redirect lookup error.\nURL: " + JSON.stringify(url)+"\nURL: "+ JSON.stringify(err));
            deferred.resolve(null);
        });
    return deferred.promise;
}

function queryDBpedia(entity,propertyType) {

    var deferred = Q.defer();
    property = encodeURIComponent(propertyType)
    entity = entity.replace(" ","_");
    var url = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=select%20%3Fproperty%20where%20%7B%20%3Chttp%3A%2F%2Fdbpedia.org%2Fresource%2F"+entity+"%3E%20"+propertyType+"%20%3Fproperty%7D&format=json";
    new HttpUtils().sendToServer("GET",url,null,null,null,null)
        .then(function (data) {
            if (data != '') {
                try {
                    if (data.results && data.results.bindings && data.results.bindings.length > 0) {
                        var answers = [];
                        for (var i = 0; i < data.results.bindings.length; i++) {
                            answers[i] = data.results.bindings[i].property
                        }
                        deferred.resolve(answers);
                    }else{
                        console.log("Failure extracting "+property+" for "+entity+" from dbpedia results.\nURL: " + JSON.stringify(url));
                        deferred.resolve(null); // Fail gracefully and assume a malformed result due to invalid query format
                    }
                }catch(err) {
                    // Assume a malformed query due to invalid query format
                    console.log("DBpedia request parsing error.\nURL: " + JSON.stringify(url)+"\nURL: "+ JSON.stringify(err));
                    deferred.resolve(null);
                }
            }
        }, function (err) {
            // Assume a malformed query due to invalid query format
            console.log("DBpedia request error.\nURL: " + JSON.stringify(url)+"\nURL: "+ JSON.stringify(err));
            deferred.resolve(null);
        });
    return deferred.promise;
}

// Create html link to dbpedia using entity's name as clickable text
function htmlLinkForEntity(entity) {
    var resourceLink
    if (entity.indexOf("dbpedia.org") >= 0) {
        resourceLink = entity;
        entity = extractDBpediaEntity(resourceLink);
    }else{
        // Handle entities being passed as resource urls
        resourceLink = "http://dbpedia.org/resource/" + entity.replace(/ /g, "_");
    }
    return "<a href='" + resourceLink + "' target='_blank'>" + entity.replace(/_/g, " ") + "</a>";
}
function extractDBpediaEntity(dbpediaink) {
    var index = dbpediaink.lastIndexOf("/")+1;
    return dbpediaink.substr(index);
}

function getUrisForResources(resources) {
    var uris = []
    for (i in resources) {
        if (resources[i].type == "uri") {
            uris.push(resources[i].value)
        }
    }
    return uris
}

function convertResourcesToHref(resources) {
    var hrefs = "";
    for (var i = 0; i < resources.length; i++) {
        if (i > 0) {
            if (i == resources.length-1) {
                hrefs += " and "; // last answer
            }else {
                hrefs += ", ";
            }
        }
        var entity = extractDBpediaEntity(resources[i])
        hrefs += "<a href='"+resources[i]+"' target='_blank'>"+ entity.replace("_"," ") + "</a>"
    }
    return hrefs
}

// Exported class
module.exports.convertResourcesToHref = convertResourcesToHref
module.exports.htmlLinkForEntity = htmlLinkForEntity
module.exports.extractDBpediaEntity = extractDBpediaEntity
module.exports.performQuery = performQuery
module.exports.followRedirects = followRedirects
module.exports.getUrisForResources = getUrisForResources