var gm = require('gm');
var dv = require('dv');
var request = require('request');
var simplesmtp = require("simplesmtp");

var PROJECT_LINK = "http://******.net/onlinevote/vote/52";
var CAPCHA_URL = 'http://******.net/onlinevote/secImage';
var SAVEVOTE_URL = 'http://******.net/onlinevote/saveVote';

/**
 * Email domain
 * Make sure to redirect that domain to this server
 * @type {String}
 */
var EMAIL_DOMAIN = 'yoursite.net';

/**
 * Confirmed emails
 * @type {Number}
 */
var counter = 0;

/**
 * Generates a random email
 * @return {String}
 */
function getRandomEmail() {
    var name = Math.floor(Math.random() * 1000000);
    return name + '@' + EMAIL_DOMAIN;
}

/**
 * Extract urls from string
 * @param  {String} text  input string
 * @return {Array}        urls
 */
function getVoteUrls(text) {
    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
    var output = [];
    text.replace(exp, function(link) {
        output.push(link);
    });
    return output;
}

var process = function(callback) {

    /**
     * Set cookiejar, so all requests will share the same cookies(session)
     */
    var currentSession = request.defaults({
        jar: request.jar()
    });

    /**
     * Open project link to populate cookiejar with session data
     */
    currentSession(PROJECT_LINK, function(err, resp, body) {

        /**
         * Open capcha url, so a capcha is set to our session
         */
        currentSession(CAPCHA_URL, {
            encoding: null // return body in binary
        }, function(error, response, body) {

            var image = gm(body)
                .quality('100') // use maximum quality
                .resize('450', '90') // the default size is 150x30, increase it 3 times
                .threshold(150); // apply threshold, so the gray background will be removed

            /**
             * Export the image to buffer, so we can pass it to tesseract
             */
            image.toBuffer('png', function(err, buffer) {
                var image = new dv.Image('png', buffer);
                var tesseract = new dv.Tesseract('eng', image);

                var text = tesseract.findText('plain').replace(/\s/g, ""); // get text and replace spaces

                /**
                 * Post the votepage with capcha, projectId and randomly generated email
                 */
                currentSession.post({
                    url: SAVEVOTE_URL,
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded' // make request form-like
                    },
                    body: 'pid=' + PROJECT_LINK.split('/').pop() + '&email=' + getRandomEmail() + '&code=' + text + '&send=Гласувай'
                }, callback);
            });
        });
    });
};

/**
 * Create a SMTP server, so we can click the vote links
 */
var server = simplesmtp.createSimpleServer({}, function(req) {

    /**
     * On new emails, find and open links
     */
    req.on("data", function(chunk) {
        var voteUrls = getVoteUrls(chunk.toString());

        voteUrls.forEach(function(url) {
            request(url, function(err, resp, body) {
                counter++;
                console.log('Confirmed vote: ' + counter + ' - ' + new Date());
            });
        });
    });

    req.accept();
});

server.listen(25, function(err) {
    if (err) {
        throw new Error(err);
    }

    console.log("SMTP server listening on port 25");

    /**
     * Make a vote every 1/4 second
     */
    setInterval(function() {
        process();
    }, 250);
});