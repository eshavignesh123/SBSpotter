var express = require('express');
require('dotenv').config();
const pug = require('pug');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('dbcmps369');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors({
    origin: 'http://localhost:3000'
  }));

app.use(express.static('build'));


const db = new Database();
db.connect();
app.use(bodyParser.json());
let postData = null;



app.use(session({
  secret: 'cmps369',
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
  
  if (req.session.user) {
      res.locals.user = {
          id: req.session.user.id,
          email: req.session.user.email
      }
  }
  next()
})

app.get('/api/data', (req, res) => {
    res.json(postData);
});

app.post("/signin", async (req, res)=>{
    
    console.log('Received data:', postData);
    res.json({ message: 'Data received successfully' });


    
    const email = req.body.email.trim();
    const password = req.body.password.trim();

    const user = await db.read('Users', [{column: "email", value: email}]);
    if(user.length ==0){
        postData = {loggedIn: false, user: null, message:"User not found"};

    }

    if(user && bcrypt.compareSync(password, user[0].password))
    {
        req.session.user = user[0];
        console.log(user);
        postData =({loggedIn: true, email: user[0].email, message:"User found"});

    }
    else{
        postData ={loggedIn: false, user: null, message:"Invalid Password"};
    }
});

    

app.post("/signup", async (req, res) => {
    const email = req.body.email.trim();
    const password = req.body.password.trim();
    const confirm_password = req.body.confirmPassword.trim();
    console.log("Hi");

    if(password!==confirm_password){
        postData ={loggedIn: false, user: null, message:"Passwords do not match"};
    }

    else{
        const emailExists = await db.read('Users', [{column: 'email', value: email}]);
        if(emailExists.length>0)
        {
            postData ={loggedIn: false, user: null, message:"Email already exists"};
        }
        else {
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(password, salt);
            const id = await db.create('Users', [
                { column: 'firstName', value: req.body.firstName },
                { column: 'lastName', value: req.body.lastName },
                { column: 'email', value: email },
                { column: 'password', value: hashedPassword }
            ]);

            const player = await db.create('PlayerInfo', [
                { column: 'id', value: id },
                { column: 'rank', value: 0 },
                { column: 'battleWins', value: 0 },
                { column: 'highestScore', value: 0 }
            ]);
            

            const user = await db.read('Users', [{ column: 'email', value: email }]);
            console.log(user);
            req.session.user = user[0];
            postData = {loggedIn: true, email: user[0].email, message:"User created successfully"};
        }
    }




});




app.post("/signout", (req, res) => {
  req.session.destroy();
  postData = null;


});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});