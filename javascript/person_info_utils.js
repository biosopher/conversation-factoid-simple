var Q = require('q');
var DBpediaUtils = require('../javascript/dbpedia_utils');
var DateUtils = require('../javascript/date_utils');

//************ Constructor **************//
function PersonInfo() {

}

PersonInfo.prototype.getAnswerForIntent = function(intent, person) {

    // Preet default error value
    person.details = {"error" : "Unable to extract entity details for intent."}

    var deferred = Q.defer();
    switch (intent) {
        case "person-birthdate":
            this.answerBirthday(deferred,person);
            break;
        case "person-birthplace":
            this.answerBirthPlace(deferred,person);
            break;
        case "person-children":
            this.answerChildren(deferred,person);
            break;
        case "person-death_date":
            this.answerDeath(deferred,person);
            break;
        case "person-net_worth":
            this.answerNetWorth(deferred,person);
            break;
        case "person-schooling":
            this.answerSchooling(deferred,person);
            break;
        case "person-spouse":
            this.answerSpouse(deferred,person);
            break;
        default:
            deferred.resolve(null);
            break;
    }
    return deferred.promise;
}

PersonInfo.prototype.answerBirthday = function(deferred,person) {

    DBpediaUtils.performQuery(person,"dbo:birthDate")
        .then(function (answers) {
            person.details = {}
            if (answers) {
                person.details["years_old"] = DateUtils.getYearsSinceNow(answers[0].value);
                person.details["birth_date"] = DateUtils.getDateAsString(answers[0].value)
            }
            deferred.resolve(person)
        }, function (err) {
            deferred.reject(err)
        });
}

PersonInfo.prototype.answerBirthPlace = function(deferred,person) {

    DBpediaUtils.performQuery(person,"dbp:birthPlace")
        .then(function (answers) {
            person.details = {}
            if (answers) {
                if (answers[0].type == "literal") {
                    person.details["birth_place"] = answers[0].value
                }else{
                    person.details["birth_place"] = DBpediaUtils.htmlLinkForEntity(answers[0].value)
                }
                deferred.resolve(person)
            }else{
                DBpediaUtils.performQuery(person,"dbo:birthPlace")
                    .then(function (answers) {
                        if (answers) {
                            person.details["birth_place"] = DBpediaUtils.htmlLinkForEntity(answers[0].value)
                        }
                        deferred.resolve(person)
                    }, function (err) {
                        deferred.reject(err)
                    });
            }
        }, function (err) {
            deferred.reject(err)
        });
}

PersonInfo.prototype.answerChildren = function(deferred,person) {

    var internalThis = this
    DBpediaUtils.performQuery(person,"dbp:children")
        .then(function (answers) {
            person.details = {}
            if (answers) {
                if (answers.length == 1 && parseInt(answers[0].value) != NaN) {
                    // Handle when children are only provided as a number.
                    person.details["children_count"] = parseInt(answers[0].value)
                } else {
                    person.details["children_count"] = answers.length
                    person.details["children_names"] = "";
                    for (var i = 0; i < answers.length; i++) {
                        if (i > 0) {
                            if (i == answers.length-1) {
                                person.details["children_names"] += " and "; // last item
                            }else {
                                person.details["children_names"] += ", ";
                            }
                        }
                        var child = DBpediaUtils.extractDBpediaEntity(answers[i].value).replace(/_/g," ")
                        child = DBpediaUtils.htmlLinkForEntity(child)
                        person.details["children_names"] += child
                    }
                }
            }

            if (!person.details["children_names"] || person.details["children_names"].length == 0) {
                // Check alternate path for children
                DBpediaUtils.performQuery(person,["dbo:child"])
                    .then(function (answers) {
                        person.details = {}
                        if (answers) {
                            person.details["children_count"] = answers.length
                            person.details["children_names"] = "";
                            for (var i = 0; i < answers.length; i++) {
                                if (i > 0) {
                                    if (i == answers.length-1) {
                                        person.details["children_names"] += " and "; // last item
                                    }else {
                                        person.details["children_names"] += ", ";
                                    }
                                }
                                var child = DBpediaUtils.extractDBpediaEntity(answers[i].value).replace(/_/g," ")
                                child = DBpediaUtils.htmlLinkForEntity(child)
                                person.details["children_names"] += child
                            }
                        }
                        deferred.resolve(person)
                    }, function (err) {
                        deferred.reject(err)
                    });
            }else{
                deferred.resolve(person)
            }
        }, function (err) {
            deferred.reject(err)
        });
}

PersonInfo.prototype.answerDeath = function(deferred,person) {

    DBpediaUtils.performQuery(person,"dbo:deathDate")
        .then(function (answers) {
            person.details = {}
            if (answers) {
                person.details["death_date"] = DateUtils.getDateAsString(answers[0].value)
            }
            DBpediaUtils.performQuery(person,"dbo:deathPlace")
                .then(function (answers) {
                    if (answers) {
                        person.details["death_place"] = DBpediaUtils.htmlLinkForEntity(answers[0].value)
                    }
                    deferred.resolve(person)
                }, function (err) {
                    deferred.reject(err)
                });
        }, function (err) {
            deferred.reject(err)
        });
}

PersonInfo.prototype.answerNetWorth = function(deferred,person) {

    DBpediaUtils.performQuery(person,"dbo:networth")
        .then(function (answers) {
            person.details = {}
            if (answers) {
                var netWorth = Number(answers[0].value).toFixed(0);
                person.details["net_worth"] = "$" + netWorth.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            deferred.resolve(person)
        }, function (err) {
            deferred.reject(err)
        });
}
PersonInfo.prototype.answerSchooling = function(deferred,person) {

    DBpediaUtils.performQuery(person,"dbp:almaMater")
        .then(function (answers) {
            person.details = {}
            if (answers) {
                var uris = DBpediaUtils.getUrisForResources(answers)
                person.details["alma_mater"] = DBpediaUtils.convertResourcesToHref(uris)
            }
            deferred.resolve(person)
        }, function (err) {
            deferred.reject(err)
        });
}

PersonInfo.prototype.formatSpouseAnswer = function(person,answers) {
    // Assume spouse's in order so go in reverse
    answers.reverse()
    for (var i in answers) {
        if (answers[i].type == "uri"){
            // dbp:spouse can return the marriage date too so look for uri of spouse
            person.details["spouse"] = DBpediaUtils.extractDBpediaEntity(answers[i].value).replace("_"," ")
            person.details["spouse_href"] = DBpediaUtils.htmlLinkForEntity(answers[i].value)
            break
        }
    }
    return person
}
PersonInfo.prototype.answerSpouse = function(deferred,person) {

    var internalThis = this
        DBpediaUtils.performQuery(person,"dbo:spouse")
        .then(function (answers) {
            person.details = {}
            if (answers) {
                person = internalThis.formatSpouseAnswer(person,answers)
                deferred.resolve(person)
            }else{
                DBpediaUtils.performQuery(person,"dbp:spouse")
                    .then(function (answers) {
                        if (answers) {
                            person = internalThis.formatSpouseAnswer(person,answers)
                        }
                        deferred.resolve(person)
                    }, function (err) {
                        deferred.reject(err)
                    });
            }
            deferred.resolve(person)
        }, function (err) {
            deferred.reject(err)
        });
}

// Exported class
module.exports = PersonInfo;
