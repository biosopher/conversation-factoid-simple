
//************ Constructor **************//
function ExampleQuestionUX(askFunction) {

    this.askFunction = askFunction;
    this.visibleExampleLinks = [];
    this.hiddenExampleLinks = [];

    // Init question input
    this.displayExampleQuestions();
}

ExampleQuestionUX.prototype.loadExampleQuestions = function() {

    this.exampleQuestions = [];
    this.exampleQuestions[0] = "Do you know where John F Kennedy died?"
    this.exampleQuestions[1] = "Where did George Washington die?"
    this.exampleQuestions[2] = "Tell me how many children Brad Pitt has."
    this.exampleQuestions[3] = "Where did Albert Einstein attend university?"
    this.exampleQuestions[4] = "Who are Donald Trump's children?"
    this.exampleQuestions[5] = "When did Harriet Tubman die?"
    this.exampleQuestions[6] = "Where was George Washington born?"
    this.exampleQuestions[7] = "When did Martin Luther King Jr die?"
    this.exampleQuestions[8] = "Tell me who Barack Obama's spouse is"
    this.exampleQuestions[9] = "When was Beyonce born?"
    this.exampleQuestions[10] = "When was Arnold Schwarzenegger born?"
    this.exampleQuestions[11] = "Tell me where Mark Zuckerberg was born."
    this.exampleQuestions[12] = "Where did Isaac Newton attend college?"
    this.exampleQuestions[13] = "What was Albert Einstein's alma mater?"
    this.exampleQuestions[14] = "Lookup the birthdate of Lady Gaga."
    this.exampleQuestions[15] = "How old is Sylvester Stallone?"
    this.exampleQuestions[16] = "Where was Tom Cruise born?"
}

ExampleQuestionUX.prototype.displayExampleQuestions = function() {

    this.loadExampleQuestions()

    // Create links
    var internalThis = this;
    for (var i = 0; i < this.exampleQuestions.length;i++) {
        var linkId = "example_question_link_" + i;
        $('#example-questions').append("<a class='hide exampleQuestionLink' id='" + linkId + "'>" + this.exampleQuestions[i] + "</a>");
        var link = $("#"+linkId);
        link.speed = Math.random()+0.25;
        link.css('color','#aaa');
        link.on('click',function(sender){
            $("#textInput").val($("#" + sender.currentTarget.id).html());
            internalThis.askFunction($("#textInput").val());
        });
        this.hiddenExampleLinks.push(link);
    }

    this.refreshExampleQuestions(true);
    window.setInterval(function(){
        internalThis.refreshExampleQuestions(false);
    }, 50);
}

ExampleQuestionUX.prototype.refreshExampleQuestions = function(isInitialLoading) {

    // Remove all questions that have moved off screen
    for (var i = 0; i < this.visibleExampleLinks.length;i++) {
        var link = this.visibleExampleLinks[i];
        if (link.position().left + link.width() < 0) {
            link.toggleClass("hide",true);
            this.visibleExampleLinks.splice(this.visibleExampleLinks.indexOf(link), 1);
            this.hiddenExampleLinks.push(link);
            i++;
        }
    }

    // Determine max visible questions
    var maxFloatingExamples = $(document).height()/125.0; // Limit to one example per 50px vertical
    if (maxFloatingExamples > this.exampleQuestions.length) {
        maxFloatingExamples = this.exampleQuestions.length;
    }

    // Add new questions
    var maxWidth = $("#chat-column-holder").width()
    while (this.visibleExampleLinks.length < maxFloatingExamples) {
        var link = this.hiddenExampleLinks.pop();
        this.visibleExampleLinks.push(link);
        var offsetY = this.getNonOverlappingOffsetY();
        var offsetX = maxWidth-link.width()
        if (isInitialLoading) {
            offsetX = Math.floor((Math.random() * offsetX) + 1);
        }
        link.css({  top: offsetY,
            left: offsetX,
            position:'absolute'});
        link.toggleClass("hide",false);
    }

    // Move visible question links
    for (var i = 0; i < this.visibleExampleLinks.length;i++) {
        var link = this.visibleExampleLinks[i];
        link.css({  left: link.position().left - link.speed,
            position:'absolute'});
    }
};

// Ensure no example questions will overlap
ExampleQuestionUX.prototype.getNonOverlappingOffsetY = function(isInitialLoading) {

    var isOverlap = true;
    var offsetY = -1;
    var testCount = 0;
    while (isOverlap) {
        offsetY = Math.floor((Math.random() * ($(document).height()-30)) + 15);
        var passedTest = true;
        for (var i = 0; i < this.visibleExampleLinks.length;i++) {
            var link = this.visibleExampleLinks[i];
            if (offsetY >= link.position().top-30 && offsetY < link.position().top+30) {
                passedTest = false;
                break;
            }
        }
        isOverlap = !passedTest;
        testCount++;
        if (testCount == 4000) {
            break; // Prevent deadlock which has happened many times.  Probably need better algorithm.
        }
    }
    return offsetY;
}




