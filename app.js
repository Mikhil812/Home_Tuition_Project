//jshint esversion:6
//Test comment
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const Razorpay = require("razorpay")
const cors = require("cors")

const https = require("https");

const app = express();

let members = []; 
var latitude = "";
var longitude = "";

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(cors());

app.get("/", function(req, res){
  res.render("home");
});

app.get("/view", function(req, res){
  res.render("view", {
    detail : members
  });
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/analyse", function(req, res){

  res.render("analyse", {
    markDetail : members
  });
})

app.post("/register", function(request, response){

  //-------------------------DIRECT GEOLOCATION-----------------------------------//
  const apikey  = "9103a9a41851460cc35c0475fd42acac";
  const query = request.body.city;

  const url = "https://api.openweathermap.org/geo/1.0/direct?q=" + query + "&limit=5&appid="+apikey;

  https.get(url, function(response){
    response.on("data", function(data){
      const coordinateData = JSON.parse(data);

      latitude = coordinateData[0].lat;
      longitude = coordinateData[0].lon;

    })
  })

  //-------------------------PHONE NUMBER VALIDATION-----------------------------------//
  const number = request.body.phone;

  const options = {
    method: 'GET',
    hostname: 'phonenumbervalidatefree.p.rapidapi.com',
    port: null,
    path: '/ts_PhoneNumberValidateTest.jsp?number=%2B91' + number + '&country=IN',
    headers: {
        'X-RapidAPI-Key': '7e98973274msh649245247ddbf5ap17f005jsn76349966ce4b',
        'X-RapidAPI-Host': 'phonenumbervalidatefree.p.rapidapi.com'
    }
  };

const req = https.request(options, function (res) {
    const chunks = [];

    res.on('data', function (chunk) {
        chunks.push(chunk);
    });

    res.on('end', function () {
        const body = Buffer.concat(chunks);

        const Data = JSON.parse(body);

        const validity = Data.isValidNumber;
        if(validity == true)
        {
          const details = {
            // Personal Details : 
            fullname : request.body.name,
            phoneno : request.body.phone,
            mailid : request.body.email,
            age : request.body.age,
            
            // Educational Qualification : 
            level : request.body.edu,
            courseTaught : request.body.course,
            years : request.body.years,
            fees : request.body.fee,
            
            // Address : 
            lat : latitude,
            lon : longitude
          }
        
          members.push(details);
        
          response.render("view", {
            detail : members
          })
        }
        else
        {
          response.render("failure");
        }
    });
});

req.end();
});

app.post("/view", function(req, res){
  res.sendFile(__dirname + "/views/payment.html");
});

app.post("/payment", async(req,res)=>{

  let {amount} = req.body;

  var instance = new Razorpay({
      key_id : 'rzp_test_K7xYtmFSKURbFu',
      key_secret : 'LgHgkTqsONtNp7Qed0dfDWCX'
  })

  let order = await instance.orders.create({
      amount : amount * 100,
      currency : "INR",
      receipt : "receipt#1",
  })

  res.status(201).json({
      success : true,
      order,
      amount
  })
});

app.listen(3000, function() {
  console.log("Server started on port 3000 boi");
});


// appid 
// 5058447

// api key
// 7e98973274msh649245247ddbf5ap17f005jsn76349966ce4b