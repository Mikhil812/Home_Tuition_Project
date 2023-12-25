//jshint esversion:6
//Test comment
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const Razorpay = require("razorpay")
const cors = require("cors")
const path = require("path");
const bcrypt = require("bcrypt");
const collection = require("./config");
const https = require("https");
const { send } = require("process");
const { log } = require("console");
const { request } = require("http");

const app = express();

//convert data to json
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(cors());

var latitude = "";
var longitude = "";

app.get("/", function(req, res){
  res.render("home");
});

app.get("/view", function(req, res){
  res.render("view");
});

app.get("/analyse", async function(req, res){

  console.log("Tu aaloo");

  const teacherData = await collection.teacher.find();

  res.render("analyse", {
    teacherDetail : teacherData,
  });
})

app.post("/view", async function(req, res){
 
  //Get amount in database
  const existing = await collection.donate.find();
  console.log(existing);
  const newamt = existing[0].amount + parseInt(req.body.amount);
  const newdonor = existing[0].donors + 1;
  await collection.donate.updateOne({amount:existing[0].amount},{amount:newamt,donors:newdonor});
  const updated = await collection.donate.find();
  console.log(updated);
  res.sendFile(path.join(__dirname, '../views/payment.html'));
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


app.get("/signupt", (req,res)=>{
  res.render("signupteach");
});

//Teacher signup
app.post("/signupt",async(req,res)=>{

  //-------------------------DIRECT GEOLOCATION-----------------------------------//
  const apikey  = "9103a9a41851460cc35c0475fd42acac";

  var url = "https://api.openweathermap.org/geo/1.0/direct?q=" + req.body.city + "&limit=5&appid="+apikey;
  console.log(url);
  
  https.get(url, function(response){
    response.on("data", async function(data){
      
      console.log("anu frustrated");
      const coordinateData =  JSON.parse(data);
      console.log(coordinateData[0]);
      latitude = coordinateData[0].lat;
      longitude = coordinateData[0].lon;

      var data1 = {
        username: req.body.username,
        password: req.body.password,
        name: req.body.name,
        age: req.body.age,
        phone: req.body.phone,
        email: req.body.email,
    
        edu: req.body.edu,
        course: req.body.course,
        years: req.body.years, //teaching experience
        fee: req.body.fee,
    
        city: req.body.city,
        state: req.body.state,
        zipcode: req.body.zipcode, 
    
        lat : latitude,
        lon : longitude
      }
    
      //check if teacher already exists
      const existingTeacher = await collection.teacher.findOne({username: data1.username});
      if(existingTeacher)
      {
        res.send("Username already exists. Please choose another username");
      }
      else{
        //hash the password so it does not get hacked
        const saltrounds = 10;                                              //No of saltrounds for bcrypt
        const hashedPassword = await bcrypt.hash(data1.password, saltrounds);
        data1.password = hashedPassword;                                     // replace original passsword with hashed password
    
        const TeacherData = await collection.teacher.insertMany(data1);      // Inserting in Database
        console.log(TeacherData);
        
        res.render("viewt", {tdata:TeacherData[0]});
      }
    });
    })
  })

app.get("/logint", (req,res)=>{
  res.render("loginteach");
})

//Teacher Login
app.post("/logint", async (req,res)=>{
  try{
      const check = await collection.teacher.findOne({username: req.body.username});
      if(!check){
          res.send("User name cannot be found");
      }

      //compare password from teh plain text to the hash password stored in database
      const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
      if(isPasswordMatch)
      {
          res.render("viewt", {tdata:check});
      }
      else{
          res.send("Wrong password");
      }
  }
  catch{
     res.send("Wrong Credentials");
  }
});

app.get("/signups", (req,res)=>{
  res.render("signupstud");
});

//Student signup
app.post("/signups",async(req,res)=>{
  const data = {
    username: req.body.username,
    password: req.body.password,
    name: req.body.name,
    age: req.body.age,
    phone: req.body.phone,
    email: req.body.email,

    edu: req.body.edu,
    course: req.body.course,

    city: req.body.city,
    state: req.body.state,
    zipcode: req.body.zipcode,
  }
  //check if student already exists
  const existingTeacher = await collection.student.findOne({username: data.username});
  if(existingTeacher)
  {
      res.send("Username already exists. Please choose another username");
  }
  else{
    //hash the password so it does not get hacked
    const saltrounds = 10; //No of saltrounds for bcrypt
    const hashedPassword = await bcrypt.hash(data.password, saltrounds);
    data.password = hashedPassword;// replace original passsword with hashed password
    const studentData = await collection.student.insertMany(data);
    console.log(studentData);

    const query = await collection.teacher.find({$and:[{city:{$eq:studentData[0].city}},{course: {$eq: studentData[0].course}}]})
    console.log(query);

    res.render("viewst", {
      sdata : studentData,
      tdata : query
    });
  }
});

app.get("/logins", (req,res)=>{
  res.render("loginstud");
})

//Student Login
app.post("/logins", async (req,res)=>{
  try{
      const check = await collection.student.findOne({username: req.body.username});
      if(!check){
          res.send("User name cannot be found");
      }

      //compare password from the plain text to the hash password stored in database
      const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
      if(isPasswordMatch)
      {
          var send=[];
          send.push(check);
          const query = await collection.teacher.find({$and:[{city:{$eq:send[0].city}},{course: {$eq: send[0].course}}]})
          console.log(query);

          res.render("viewst", {sdata:send, tdata:query});

      }
      else{
          res.send("Wrong password");
      }
  }
  catch{
     res.send("Wrong Credentials");
  }
})

app.listen(3000, function() {
  console.log("Server started on port 3000");
});

app.post("/enrollteacher", async (req, res) => {
  try {
    const { studentUsername, teacherUsername } = req.body;
    console.log("boom" + teacherUsername);

    // Find the student based on the provided username
    const student = await collection.student.findOne({ username: studentUsername });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find the teacher based on the provided username
    const teacher = await collection.teacher.findOne({ username: teacherUsername });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Add the student's entire schema to the teacher's enrolled students array
    teacher.enrolledStudents.push(student);
    await teacher.save();

    return res.status(200).json({ message: 'Enrollment successful', teacher });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Enrollment failed' });
  }
});

app.get("/logina", (req,res)=>{
  res.render("loginadmin");
})

//Admin Login
app.post("/logina", async (req,res)=>{
  try{
      if(req.body.username=='admin')
      {
        if(req.body.password=='admin')
        {
          const donate = await collection.donate.find();
          res.render("viewadmin",{amt: donate[0].amount, num: donate[0].donors});
        }
        else{
          res.send("Wrong Password");
        }
      }
      else{
        res.send("Wrong Username");
      }
    }
    catch{
      res.send("Some error occured");
    }
})


// appid 
// 5058447

// api key
// 7e98973274msh649245247ddbf5ap17f005jsn76349966ce4b