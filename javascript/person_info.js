var Q = require('q');
var DBpediaUtils = require('../reasoning_pipelines/dbpedia_utils');
var DateUtils = require('../reasoning_pipelines/date_utils');

//************ Constructor **************//
function PersonInfo() {

}

PersonInfo.prototype.getAnswerForIntent = function(intent, entities) {

    var person = entities.person
    person.links.href_link = DBpediaUtils.linkForEntity(entity.person.dbpediaLink)

    // Set default value for details
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

    DBpediaUtils.performQuery(person,["dbo%3AbirthDate"],false,deferred,function(answers,typeIndex) {
        person.details = {}
        if (answers) {
            person["years_old"] = DateUtils.getYearsSinceNow(answers[0].value);
            person["birth_date"] = DateUtils.getDateAsString(answers[0].value)
        }
        return person
    });
}

PersonInfo.prototype.answerBirthPlace = function(deferred,person) {

    DBpediaUtils.performQuery(person,["dbp%3AbirthPlace"],false,deferred,function(answers,typeIndex) {
        person.details = {}
        if (answers) {
            person["birth_place"] = DBpediaUtils.linkForEntity(answers[0].value)
        }
        return person
    });
}

PersonInfo.prototype.answerChildren = function(deferred,person) {

    var internalThis = this
    DBpediaUtils.performQuery(person,["dbp%3Achildren"],false,deferred,function(answers,typeIndex) {
        person.details = {}
        if (answers) {
            if (answers.length == 1 && parseInt(answers[0].value) != NaN) {
                // Handle when children are only provided as a number.
                person["children_count"] = parseInt(answers[0].value)
            } else {
                person["children_count"] = answers.length
                person["children_names"] = "";
                for (var i = 0; i < array.length; i++) {
                    if (i > 0) {
                        if (i == array.length-1) {
                            person["children_names"] += " and "; // last item
                        }else {
                            person["children_names"] += ", ";
                        }
                    }
                    person["children_names"] += answers[i]
                }
            }
        }
        return person
    });
}

PersonInfo.prototype.answerNetWorth = function(deferred,person) {

    DBpediaUtils.performQuery(person,["dbo%3Anetworth"],false,deferred,function(answers,typeIndex) {
        person.details = {}
        if (answers) {
            var netWorth = Number(answers[0].value).toFixed(0);
            person["net_worth"] = "$" + netWorth.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        }
        return person
    });
}
PersonInfo.prototype.answerSchooling = function(deferred,person) {

    DBpediaUtils.performQuery(person,["dbp%3AalmaMater"],false,deferred,function(answers,typeIndex) {
        person.details = {}
        if (answers) {
            var uris = DBpediaUtils.getUrisForResources(answers)
            person["alma_mater"] = DBpediaUtils.convertResourcesToHref(uris)
        }
        return person
    });
}
PersonInfo.prototype.answerSpouse = function(deferred,person) {

    DBpediaUtils.performQuery(person,["dbo%3Aspouse","dbp%3Aspouse"],false,deferred,function(answers,typeIndex) {
        person.details = {}
        if (answers) {
            // Assume spouse's in order so go in reverse
            answers.reverse()
            for (var i in answers) {
                if (answers[i].type == "uri"){
                    // dbp:spouse can return the marriage date too so look for uri of spouse
                    person["spouse"] = DBpediaUtils.extractDBpediaEntity(answers[i].value).replace("_"," ")
                    person["spouse_href"] = DBpediaUtils.linkForEntity(answers[i].value)
                    break
                }
            }
        }
        return person
    });
}

// Exported class
module.exports = PersonInfo;
