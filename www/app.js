
var url = require('url');
var fs = require('fs');
var path = require('path');

var express = require("express");
var jsdom = require("jsdom");
var app = express();

var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"};

var port = "8008";


app.all('*', function(req, res, next) {
	return static(req, res, next);
});


function static(req, res, next) {
    if ('POST' !== req.method && 'GET' !== req.method && 'HEAD' !== req.method) return next();

    // Get the file path
    var uri = url.parse(req.url).pathname;
    var filename = path.join(process.cwd(), uri);
    var content;
    var $partialElement;
    var partialContent;
    var postData = "";


	if ('POST' === req.method) {
	    req.on('data', function(chunk) {
	      postData += chunk.toString();
	    });
	    req.on('end', function() {
	      onLoad(postData);
	    });
	} else {
    	onLoad();
	}


    function onLoad(newContent) {
		fs.stat(filename, function(err, stats) {

	        if (!stats || stats.errno || !stats.isFile()) {
	            console.log([req.method, 404, uri].join(" - "));
	            res.writeHead(200, {'Content-Type': 'text/plain'});
	            res.write("File does not exists: " + filename);
	            res.end();
	            return;
	        }


	        // Handle the mime type mapping
			var mimeType = mimeTypes[path.extname(filename).split(".")[1]];

		    var partial = req.headers["partial"];
		    if (partial) {
		    	content = fs.readFileSync(filename).toString();
				jsdom.env(content,
				  ["http://code.jquery.com/jquery.js"],
				  function(errors, window) {
				    res.writeHead(200, {
				    	'Content-Type':mimeType,
				    	'partial': partial
				    })
				  	$partialElement = window.$(partial);

				  	// If the method was a post, modify the dom and save te file
					if (newContent) {
						console.log("REQUEST content", newContent);
						var $newContent = window.$(newContent);
						$partialElement.replaceWith($newContent);
						$partialElement = $newContent;
						var newHTML = window.document.innerHTML;
						fs.writeFileSync(filename, newHTML);
					}

				  	partialContent = window.$('<div>').append($partialElement.clone()).html();
				    console.log("fragment for '" + partial + "'", partialContent);
				    res.write(partialContent);
				    res.end();
				    console.log([req.method, 200, uri].join(" - "));
				  }
				);
		    } else {
			    res.writeHead(200, {'Content-Type':mimeType})
				var fileStream = fs.createReadStream(filename);
			    fileStream.pipe(res);
			    console.log([req.method, 200, uri].join(" - "));
		    }


	    })
	};

};
app.listen(port);
console.log("listening to " + port);



