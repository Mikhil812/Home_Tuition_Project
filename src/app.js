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
const { rmSync } = require("fs");

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

// All get pages just redirect the control to the respective ejs files.

// Home Route
app.get("/", function(req, res){
  res.render("home");
});

// Get page for financial aid 
app.get("/view", function(req, res){
  res.render("view");
});

// Get page for statistics
app.get("/analyse", async function(req, res){

  const teacherData = await collection.teacher.find();

  res.render("analyse", {
    teacherDetail : teacherData,
  });
})

// Post page for collecting financial aid money
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

// Razorpay credential thing
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

// Get page for signup for teachers
app.get("/signupt", (req,res)=>{
  res.render("signupteach");
});

// Post page for signup for teachers -> All data except enrolledStudents is added here in the database and redirected to viewt
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

// Get page for login for teachers 
app.get("/logint", (req,res)=>{
  res.render("loginteach");
})

// Post page for login for teachers -> Credentials are verified here and redirected to viewt
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

// Get page for signup for students
app.get("/signups", (req,res)=>{
  res.render("signupstud");
});

// Post page for signup for students -> Query of teachers in same city and same course is executed here
app.post("/signups",async(request,response)=>{

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
      // console.log(body.toString());
      const Data = JSON.parse(body);
      // console.log(Data);

      // response.write("<h1>This Phone number validity is : " + Data.isValidNumber + "</h1>");
      // response.send();

      const validity = Data.isValidNumber;
      if(validity == true){
        console.log("Phone number is valid");
      }else{
        console.log("Phone number not valid");
      }
    });
  });

      const data = {
        username: request.body.username,
        password: request.body.password,
        name: request.body.name,
        age: request.body.age,
        phone: request.body.phone,
        email: request.body.email,

        edu: request.body.edu,
        course: request.body.course,

        city: request.body.city,
        state: request.body.state,
        zipcode: request.body.zipcode,
      }
        //check if student already exists
        const existingTeacher = await collection.student.findOne({username: data.username});
        if(existingTeacher)
        {
            response.send("Username already exists. Please choose another username");
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

          response.render("viewst", {
            sdata : studentData,
            tdata : query
          });
        }
});
        

// Get page for login for students
app.get("/logins", (req,res)=>{
  res.render("loginstud");
})

// Post page for login for students -> Credentials are verified and same query is done
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

// Post page for embedding enrolledStudents in teachersSchema 
app.post("/enrollteacher", async (req, res) => {
  try {
    const { studentUsername, teacherUsername } = req.body;
    console.log("boom" + teacherUsername);
    console.log("student username : " + studentUsername);

    // Find the student based on the provided username
    const student = await collection.student.findOne({ username: studentUsername });
    if (!student) {
      res.send("<h1>Student not found.</h1>")
    }

    // Find the teacher based on the provided username
    const teacher = await collection.teacher.findOne({ username: teacherUsername });
    if (!teacher) {
      res.send("<h1>Teacher not found.</h1>")
    }

    // Check if the student is already enrolled with this teacher
    const isEnrolled = teacher.enrolledStudents.some(function(enrolledStudent) {
      return enrolledStudent.username === studentUsername;
    });
    console.log(isEnrolled);

    if (isEnrolled) {
      res.send("Already enrolled")
    }else{
      // Add the student's entire schema to the teacher's enrolled students array
      teacher.enrolledStudents.push(student);
      await teacher.save();

      res.render("paypage", {
        feeAmt : teacher.fee
      })

      console.log("Enrollment successfull");
      }
    }catch(error){
      console.log("error");
    }
});

// Post page saying application for financial aid is successful
app.post("/paypage", function(req, res){
  res.send("Application for reimbursement succesfful, we will keep you updated")
})

// Get page for login of admins
app.get("/logina", (req,res)=>{
  res.render("loginadmin");
})

// Post page for login of admins -> Keeps track of money collected via donations
app.post("/logina", async (req,res)=>{
  try{
      if(req.body.username=='admin')
      {
        if(req.body.password=='admin')
        {
          const donate = await collection.donate.find();
          const re = await collection.reimburse.find();
          res.render("viewadmin",{amt: donate[0].amount, num: donate[0].donors, reimb:re});
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

// Get page for reimbursememt
app.get("/reimburse", (req,res)=>{
  res.render("reimburse");
})

// Post page for reimursements -> Collects all account details of students who are applying
app.post("/reimburse", async (req,res)=>{

  const data = {
    username: req.body.username,
    name: req.body.name,
    email:req.body.email,
    phone: req.body.phone,
    fee: req.body.fee,
    accname: req.body.accname,
    accnum: req.body.accnum,
    income: req.body.income,
    drive: req.body.drive,
    para: req.body.para
  }
  const insertedData = await collection.reimburse.insertMany(data);
  console.log(insertedData);
  res.send("Your application for reimbursement is accepted. We will get back to you in 3-5 business days.")

})

app.listen(3000, function() {
  console.log("Server started on port 3000");
});

// RazorPay : 

// appid 
// 5058447

// api key
// 7e98973274msh649245247ddbf5ap17f005jsn76349966ce4b