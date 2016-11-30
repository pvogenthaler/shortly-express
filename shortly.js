var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var session = require('express-session');
var Handlebars = require('handlebars');


var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: 'hello',
  resave: false,
  saveUninitialized: true
}));

app.get('/', util.checkUser,
function(req, res) {
  res.render('index');
});

app.get('/create', util.checkUser,
function(req, res) {
  res.render('index');
});

app.get('/links', util.checkUser,
function(req, res) {
  var username = req.session.username;
  Links.reset().fetch().then(function(links) {    
    var filteredLinks = links.models.filter(function(link) {
      return link.attributes.username === username;
    });
    // res.status(200).send(links.models);
    res.status(200).send(filteredLinks);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;
  var username = req.session.username;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri, username: username }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          username: username,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', 
function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username}).fetch().then(function(user) {
    if (!user) {
      var newUser = new User({
        username: username,
        password: password
      });
      newUser.save().then(function() {
        // create new session for new user
        util.startSession(req, res, username);
        // res.redirect('index');
      });
    } else {
      res.redirect('signup');
      console.log('User already exists. Try again.');
    }
  });
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', 
function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username}).fetch().then(function(user) {
    if (user === null) {
      res.redirect('/login');
    } else {
      user.comparePassword(password, function(found) { 
        if (found) {
          // create new session for user that just logged in
          util.startSession(req, res, username);
          // res.redirect('index');
        }
      });
    }
  });
});

app.get('/logout', function(req, res) {
  util.endSession(req, res);
  // res.redirect('login');
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
