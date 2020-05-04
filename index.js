/* Require external APIs and start our application instance */
var express = require('express');
var mysql = require('mysql');
var app = express();
var session = require('express-session');
var bcrypt = require('bcrypt');
var bodyParser = require('body-parser');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: 'top secret code!',
    resave: true,
    saveUninitialized: true
}));

/* Configure MySQL DBMS */
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'miguelespitia',
    password: 'miguelespitia',
    database: 'quotes_edit'
});
connection.connect();

function isAuthenticated(req, res, next){
    if(!req.session.authenticated) res.redirect('/login');
    else next();
}

function checkUsername(username){
    let stmt = 'SELECT * FROM users WHERE username=?';
    return new Promise(function(resolve, reject){
       connection.query(stmt, [username], function(error, results){
           if(error) throw error;
           resolve(results);
       }); 
    });
}

function checkPassword(password, hash){
    return new Promise(function(resolve, reject){
       bcrypt.compare(password, hash, function(error, result){
          if(error) throw error;
          resolve(result);
       }); 
    });
}

app.get('/', function(req, res){
    res.render('start');
});

app.get('/home', isAuthenticated, function(req, res){
    var stmt = 'SELECT * FROM l9_author;';
    console.log(stmt);
    var authors = null;
    connection.query(stmt, function(error, results){
        if(error) throw error;
        if(results.length) authors = results;
        res.render('home', {authors: authors, user: req.session.user});
    });
});

app.get('/login', function(req, res){
    res.render('login');
});

app.post('/login', async function(req, res){
    let isUserExist   = await checkUsername(req.body.username);
    let hashedPasswd  = isUserExist.length > 0 ? isUserExist[0].password : '';
    let passwordMatch = await checkPassword(req.body.password, hashedPasswd);
    if(passwordMatch){
        req.session.authenticated = true;
        req.session.user = isUserExist[0].username;
        res.redirect('/home');
    }
    else{
        res.render('login', {error: true});
    }
});

app.get('/register', function(req, res){
    res.render('register');
});

app.post('/register', function(req, res){
    let salt = 10;
    bcrypt.hash(req.body.password, salt, function(error, hash){
        if(error) throw error;
        let stmt = 'INSERT INTO users (username, password) VALUES (?, ?)';
        let data = [req.body.username, hash];
        connection.query(stmt, data, function(error, result){
           if(error) throw error;
           res.redirect('/login');
        });
    });
});

app.get('/logout', function(req, res){
   req.session.destroy();
   res.redirect('/');
});

app.get('/author/new', isAuthenticated, function(req, res){
    res.render('author_new');
});

app.post('/author/new', isAuthenticated, function(req, res){
   connection.query('SELECT * FROM l9_author;', function(error, result){
       if(error) throw error;
       if(result.length){
            var authorId = result[result.length - 1].authorId + 1;
            var stmt = 'INSERT INTO l9_author ' + '(authorId, firstName, lastName, dob, dod, sex, profession, country, portrait, biography) '+ 'VALUES ' +
                      '(' + authorId + ',"' + req.body.firstname + '","' + req.body.lastname + '","' + req.body.dob + '","' + req.body.dod + '","';
            if (req.body.sex != undefined) {
                stmt += req.body.sex + '","';
            } else {
                stmt += "" + '","';
            }
            stmt += req.body.profession + '","' + req.body.portrait + '","' + req.body.country + '","' + req.body.biography + '"' + ');';
            console.log(stmt);
            connection.query(stmt, function(error, result){
                if(error) throw error;
                res.redirect('/home');
            });
            //console.log(req.body.sex);
       }
   });
});

app.get('/author/:aid', isAuthenticated, function(req, res){
    var stmt = 'SELECT * FROM l9_author WHERE authorId=' + req.params.aid + ';';
    console.log(stmt);
    connection.query(stmt, function(error, results){
       if(error) throw error;
       if(results.length){
           var author = results[0];
           author.dob = author.dob.toString().split(' ').slice(0,4).join(' ');
           author.dod = author.dod.toString().split(' ').slice(0,4).join(' ');
           res.render('author', {author: author});
       }
    });
});

app.get('/author/:aid/edit', isAuthenticated, function(req, res){
    var stmt = 'SELECT * FROM l9_author WHERE authorId=' + req.params.aid + ';';
    connection.query(stmt, function(error, results){
        if(error) throw error;
        if(results.length){
            var author = results[0];
            res.render('author_edit', {author: author});
       }
    });
});

app.post('/author/:aid', isAuthenticated, function(req, res){
    console.log(req.body);
    var stmt = 'UPDATE l9_author SET ' + 'firstName = "'+ req.body.firstname + '",' + 'lastName = "'+ req.body.lastname + '",' + 'dob = "'+ req.body.dob + '",' +
                'dod = "'+ req.body.dod + '",';
    if (req.body.sex != undefined) {
        stmt += 'sex = "'+ req.body.sex + '",';
    }
    stmt += 'profession = "'+ req.body.profession + '",' + 'portrait = "'+ req.body.portrait + '",' + 'country = "'+ req.body.country + '",' + 'biography = "'+ req.body.biography + '"' +
            'WHERE authorId = ' + req.params.aid + ";";
    connection.query(stmt, function(error, result){
        if(error) throw error;
        res.redirect('/author/' + req.params.aid);
    });
});

app.get('/author/:aid/confirmdelete', isAuthenticated, function(req, res){
    var stmt = 'SELECT * FROM l9_author WHERE authorId=' + req.params.aid + ';';
    connection.query(stmt, function(error, results){
       if(error) throw error;
       if(results.length){
           var author = results[0];
           res.render('author_delete', {author: author});
       }
    });
});

app.get('/author/:aid/delete', isAuthenticated, function(req, res){
    var stmt = 'DELETE from l9_author WHERE authorId='+ req.params.aid + ';';
    connection.query(stmt, function(error, result){
        if(error) throw error;
        res.redirect('/home');
    });
});

app.get('/author/:aid/quotes/new', isAuthenticated, function(req, res){
    res.render('quote_new', {authorId: req.params.aid});
});

app.get('/author/:aid/quotes', isAuthenticated, function(req, res){
    var stmt = 'select firstName, lastName, quote, quoteId '+ 'from l9_author, l9_quotes '+ 'where l9_author.authorId=l9_quotes.authorId '+ 'and l9_author.authorId='+ req.params.aid + ';';
    console.log(stmt);
    var name = null;
    var quotes = null;
    connection.query(stmt, function(error, results){
        if(error) throw error;
        if(results.length){
            name = results[0].firstName + ' ' + results[0].lastName;
            quotes = results;
        }
        res.render('quotes', {name: name, authorId: req.params.aid, quotes: quotes});
    });
});

app.post('/author/:aid/quotes', isAuthenticated, function(req, res){
    connection.query('SELECT * FROM l9_quotes;', function(error, result){
       if(error) throw error;
       if(result.length){
            var quoteId = result[result.length - 1].quoteId + 1;
            var stmt = 'INSERT INTO l9_quotes ' + '(quoteId, quote, authorId, category, likes) '+ 'VALUES ' + '(' + quoteId + ',"' + req.body.quote + '",' +
                       req.params.aid + ',"' + req.body.category + '",' + req.body.likes + ');';
            console.log(stmt);
            connection.query(stmt, function(error, result){
                if(error) throw error;
                res.redirect('/author/'+ req.params.aid +'/quotes');
            });
       }
    });
});

app.get('*', function(req, res){
   res.render('error'); 
});

/* Start the application server */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, function(){
//     console.log('Server has been started');
// });