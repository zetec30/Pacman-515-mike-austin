var express = require('express');
var app = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
//Require the handlebars express package
var handlebars = require('express-handlebars');
var bcrypt = require('bcryptjs');
const passport = require('passport');
const session = require('express-session');

const { isAuth } = require('./middleware/isAuth');
require('./middleware/passport')(passport);


const User = require('./models/User');
const Contact = require('./models/Contact');
app.use(express.static('public'));

app.use(
    session({
        secret: 'secret',
        resave: true,
        saveUninitialized: true,
        cookie: { maxAge: 60000 }
    })
);

app.use(passport.initialize());
app.use(passport.session());
//We Use body Parser to structure the request into a format that is simple to use
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
//use app.set to tell express to use handlebars as our view engine
app.set('view engine', 'hbs');
//Pass some additional information to handlebars to that is can find our layouts folder, and allow
//us to use the .hbs extension for our files.
app.engine('hbs', handlebars({
    layoutsDir: __dirname + '/views/layouts',
    extname: 'hbs'
}))

app.get('/', (req, res) => {
    try {
        res.render('login', { layout: 'main' });
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server Error')
    }

});

//Pacman
app.get('/PacMan', isAuth, (req, res) => {
    Contact.find({}).lean()
    .exec((err, contacts) => {
        if (contacts.length) {
            res.render('PacMan', { layout: 'main', contacts: contacts, contactsExist: true });
        } else {
            res.render('PacMan', { layout: 'main', contacts: contacts, contactsExist: false });
        }
    })
});
app.get('/signout', (req, res) => {
    //Logs the logged in user out and redirects to the sign in page
    req.logout();
    res.redirect('/');
})

//POST Signup
app.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;
    try {
        let user = await User.findOne({ username });
        //If user exists stop the process and render login view with userExist true
        if (user) {
            return res.status(400).render('login', { layout: 'main', userExist: true });
        }
        //If user does not exist, then continue
        user = new User({
            username,
            password,
            email
        });
        //Salt Generation
        const salt = await bcrypt.genSalt(10);
        //Password Encryption using password and salt
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        res.status(200).render('login', { layout: 'main', userDoesNotExist: true });
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server Error')
    }
})

app.post('/signin',  (req, res, next) => {
    
    try {
        passport.authenticate('local', {
            successRedirect: '/PacMan',
            failureRedirect: '/?incorrectLogin'
            
        })(req, res, next)
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server Error')
    }

});
app.post('/addContact', (req, res) => {
    //Uses destructuring to extract name, email and number from the req
    const { name, email, number } = req.body;
    try {
        let contact = new Contact({
           
            name,
            email,
            number
        });

        contact.save()
        res.redirect('/PacMan?contactSaved');
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server Error')
    }

})


mongoose.connect('mongodb+srv://mike:DIgitalcat14@cluster0-fssfj.mongodb.net/test?authSource=admin&replicaSet=pacman&readPreference=primary&appname=MongoDB%20Compass%20Community&ssl=true', {
    useUnifiedTopology: true,
    useNewUrlParser: true
})
    .then(() => {
        console.log('connected to DB')//Upon Successful connection, we are using a Javasctipt .then block here to give us a message in in our console 
    })
    .catch((err) => {
        console.log('Not Connected to DB : ' + err);//Upon unuccessful connection, we are using a Javasctipt .catch block here to give us a message in in our console with err displayed so that we can see what the issue is.
    });

//Listening for requests on port 3000
app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
