#!/usr/bin/env node
'use strict';

// Bootstrap application settings
var express = require( 'express' );  // app server
var app = express();
var bodyParser = require( 'body-parser' );  // parser for post requests
app.use( express.static( './public' ) ); // load UI from public folder
app.use( bodyParser.json() );

console.log(process.env)

// Initialize Watson
var WatsonUtils = require('./javascript/watson_utils');
var watson = new WatsonUtils(app);

if (watson.isReady()) {

    // Look for Diego port variable
    var localPort = 3000
    var port = process.env.PORT || localPort;
    if (port == localPort) {
        // See if we're in a pre-Diego environment
        port = process.env.VCAP_APP_PORT || localPort;
    }
    app.listen(port, function() {
        console.log('Server running on port: %d', port);
    });
}else{
    console.log("ERROR: Failed to initialize app.  Ensure that all Watson services were configured and started properly.");
}
