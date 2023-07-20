//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const mongoose = require('mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// var md5 = require('md5');
// const bcrypt=require('bcrypt');
// const saltRounds=10;
const session = require('express-session');
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose');
var findOrCreate = require('mongoose-findorcreate')

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: 'iamgonnamissmysister.',
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());
mongoose.connect('mongodb+srv://Subha-admin:8HwDCsK4EktIdnIa@cluster0.xhhtsqg.mongodb.net/userDB');

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  secret: String
});

//encryption
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);



const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://secrets-dalui-chingu1.onrender.com/auth/google/secrets"
  },
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id
    }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function (req, res) {
  res.render("home");
})

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  }));

app.get('/auth/google/secrets',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", function (req, res) {
  res.render("login");
})

app.post("/login", function (req, res) {
  const username = req.body.username;
  const pwd = req.body.password;
  const user = new User({
    username: username,
    password: pwd
  })

  req.login(user, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      const authenticate = User.authenticate();
      authenticate('username', 'password', function (err, result) {
        if (err) {
          console.log("failed process");
        }
      })
      res.redirect("/secrets");

    }

  })

})
app.get("/secrets", function (req, res) {
  User.find({
    "secret": {
      $ne: null
    }
  }).then(foundUsers => {
    res.render("secrets", {
      usersWithSecrets: foundUsers
    });
  })
})

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/login");
  }
}

app.post("/submit", ensureAuthenticated, function (req, res) {
  const submittedSecret = req.body.secret;
  const name = req.user.username


  User.findById(req.user.id).then(founduser => {

    if (founduser) {
      founduser.secret = submittedSecret;
      founduser.save();
      res.redirect("/secrets");
    } else {
      User.findOne({
        username: name
      }).then(found => {
        found.secret = submittedSecret;
        found.save();
        res.redirect("/secrets");
      })
    }
  })

})

app.get("/register", function (req, res) {
  res.render("register");
})

app.post("/register", function (req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      const authenticate = User.authenticate();
      authenticate('username', 'password', function (err, result) {
        if (err) {
          console.log("failed process");
        }
        res.redirect("/secrets");

      });
    }
  })


});

app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
})

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port 3000");
})