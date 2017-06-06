// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
var request = require("request");
var cheerio = require("cheerio");
mongoose.Promise = Promise;


// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Make public a static dir
app.use(express.static("public"));



// added before submission:
    var databaseUri = "mongodb://localhost/craig";
    if (process.env.MONGODB_URI) {
        mongoose.connect(process.env.MONGODB_URI);
    } else {
        mongoose.connect(databaseUri);
    }


// edited out before submission
    // Database configuration with mongoose
    // mongoose.connect("mongodb://localhost/craig");




var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
    console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
    console.log("Mongoose connection successful.");
});


// scraping:
app.get("/scrape", function(req, res) {
    // grab the html
    request("https://losangeles.craigslist.org/search/sec", function(error, response, html) {
        // console.log(html)

        var $ = cheerio.load(html);
        // console.log(html)
        // console.log($('article.article-teaser'))
        // grabbing the info we need
        $("li.result-row").each(function(i, element) {
            // Save an empty result object
            var result = {};
            console.log(this)
                // save text and href as properties on the object
            result.title = $(this).find("p").find("a").text();
            result.link = $(this).find("p").find("a").attr("href");
            console.log(result.title);

            var entry = new Article(result);

            // save entry to the db
            entry.save(function(err, doc) {
                // Log any errors
                if (err) {
                    console.log(err);
                }
                // Or log the doc
                else {
                    console.log(doc);
                    console.log('this grabbed info')
                    console.log(html)
                }
            });

        });
    });
    // Tell the browser that we finished scraping the text
    res.send("you finished scraping this information!!!");
});


// attempt at a delete route:
// //Delete route for comments
// app.get("/comments/one/:id", function(req, res) {

//     notes.Remove({ "_id": req.params.id }, function(err, removed) {
//         var removednotes = removed.id;
//     });
//     res.redirect('/');

//     console.log('note deleted');
// });
// // ------


// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
    // Grab every doc in the Articles array
    Article.find({}, function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Or send the doc to the browser as a json object
        else {
            res.json(doc);
        }
    });
});

// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    Article.findOne({ "_id": req.params.id })
        // ..and populate all of the notes associated with it
        .populate("note")
        // now, execute our query
        .exec(function(error, doc) {
            // Log any errors
            if (error) {
                console.log(error);
            }
            // Otherwise, send the doc to the browser as a json object
            else {
                res.json(doc);
            }
        });
});


// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    var newNote = new Note(req.body);

    // And save the new note the db
    newNote.save(function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Otherwise
        else {
            // Use the article id to find and update it's note
            Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
                // Execute the above query
                .exec(function(err, doc) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                    } else {
                        // Or send the document to the browser
                        res.send(doc);
                    }
                });
        }
    });
});


// Listen on port 3000
app.listen(3000, function() {
    console.log("App running on port 3000!");
});
