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

    origin: 'http://localhost:3000',
    credentials: true
  }));

app.use(express.static('build'));




const db = new Database();
db.connect();
app.use(bodyParser.json());
let postData = null;
let postUser = null;



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

app.get("/api/leaderboard", async (req, res) => {

    const sql = "SELECT * FROM PlayerInfo ORDER BY highestScore ASC";

    const leaderboardData = await db.db.all(sql);
    res.json(leaderboardData);
});

app.post("/signin", async (req, res)=>{
    
    console.log('Received data:', postData);
    res.json({ message: 'Data received successfully' });


    
    const email = req.body.email.trim();
    const password = req.body.password.trim();

    const user = await db.read('Users', [{column: "email", value: email}]);
    const player = await db.read('PlayerInfo', [{column: "id", value: user[0].id}]);
    if(user.length ==0){
        postData = {loggedIn: false, email: null, message:"User not found"};

    }

    if(user && bcrypt.compareSync(password, user[0].password))
    {
        req.session.user = user[0];
        console.log(req.session.user.id);
        postData =({loggedIn: true, id: user[0].id, firstName: user[0].firstName, lastName: user[0].lastName, email: user[0].email, points: player[0].highestScore, message:"User found"});

    }
    else{
        postData ={loggedIn: false, email: null, message:"Invalid Password"};
    }
});

app.post("/signup", async (req, res) => {
    const email = req.body.email.trim();
    const password = req.body.password.trim();
    const confirm_password = req.body.confirmPassword.trim();
    console.log("Hi");

    if (password !== confirm_password) {
        postData = { loggedIn: false, email: null, message: "Passwords do not match" };
        return res.status(400).json(postData); // Send response
    }

    try {
        const emailExists = await db.read('Users', [{ column: 'email', value: email }]);
        if (emailExists.length > 0) {
            postData = { loggedIn: false, email: null, message: "Email already exists" };
            return res.status(400).json(postData); // Send response
        } else {
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
                { column: 'firstName', value: req.body.firstName },
                { column: 'lastName', value: req.body.lastName },
                { column: 'highestScore', value: Number.MAX_VALUE }
            ]);

            const user = await db.read('Users', [{ column: 'email', value: email }]);
            const playerInfo = await db.read('PlayerInfo', [{ column: 'id', value: id }]);

            console.log(user);
            req.session.user = user[0];
            
            postData = { loggedIn: true, id: user[0].id,firstName: user[0].firstName, lastName: user[0].lastName, email: user[0].email, points: playerInfo[0].highestScore, message: "User created successfully" };
            return res.status(200).json(postData); // Send response
        }
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ message: "Internal Server Error" }); // Handle any unexpected errors
    }
});





app.post("/signout", (req, res) => {
    console.log('User signed out');
    req.session.destroy();
    
    postData = null;
    return res.json({ message: 'User signed out' });


});

app.post("/game", async (req, res) => {
    
    console.log('Received data:', req.body);
    console.log(req.session.user);

    const points = req.body.points;
    const user = await db.read('Users', [{ column: 'id', value: req.body.id}]);
    let player = await db.read('PlayerInfo', [{ column: 'id', value: req.body.id}]);
    if (player.length > 0) {
        if (points < player[0].highestScore || player[0].highestScore == -1) {
            await db.update('PlayerInfo', [{ column: 'highestScore', value: points }], [{ column: 'id', value: req.body.id}]);
            player = await db.read('PlayerInfo', [{ column: 'id', value: req.body.id}]);
            postData = { loggedIn: true, id: user[0].id,firstName: user[0].firstName, lastName: user[0].lastName, email: user[0].email, points: player[0].highestScore, message: "User created successfully" };

        }
    }
    return res.json({ message: 'Game data received' });

})

app.get("/api/search", (req, res) => {

    res.json(postUser);

});

app.post("/search", async (req, res) => {
    const usersearch = req.body.usersearch;
    const user = await db.read('Users', [{ column: 'email', value: usersearch }]);
    
    if (user.length > 0) {
        const player = await db.read('PlayerInfo', [{ column: 'id', value: user[0].id }]);
        postUser = { loggedIn: true, id: user[0].id, firstName: user[0].firstName, lastName: user[0].lastName, email: user[0].email, points: player[0].highestScore, message: "User found" };
        return res.json(postUser);
    }
    else {
        postUser = { loggedIn: false, firstName: "User Not Found", message: "User found" };
        return res.json(postUser);
    }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});