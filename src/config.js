const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/home_tutor')
//check database connected or not
.then(()=>{
    console.log("Database connected successfully");
})
.catch(err=> {
    console.log("Database cannot be connected");
    console.log(err);
})

//Create a schema
const LoginSchema = new mongoose.Schema({
    username:{
        type: String,
        required: true
    },
    password:{
        type:String,
        required: true
    },
    name:{
        type:String,
        required: false
    },
    age:{
        type:Number,
        required: false
    },
    phone:{
        type: Number,
        required:false
    },
    email:{
        type:String,
        required: false
    },
    edu:{
        type:String,
        required: false
    },
    course:{
        type:String,
        required: false
    },
    city:{
        type:String,
        required: false
    },
    state:{
        type:String,
        required: false
    },
    zipcode:{
        type: Number,
        required:false
    }
});

//Create a Teacher schema
const TeacherSchema = new mongoose.Schema({
    username:{
        type: String,
        required: true
    },
    password:{
        type:String,
        required: true
    },
    name:{
        type:String,
        required: false
    },
    age:{
        type:Number,
        required: false
    },
    phone:{
        type: Number,
        required:false
    },
    email:{
        type:String,
        required: false
    },
    edu:{
        type:String,
        required: false
    },
    course:{
        type:String,
        required: false
    },
    years:{
        type: Number,
        required:false
    },
    fee:{
        type: Number,
        required:false
    },
    city:{
        type:String,
        required: false
    },
    state:{
        type:String,
        required: false
    },
    zipcode:{
        type: Number,
        required:false
    },
    lat:{
        type: String,
        required : false
    },
    lon:{
        type: String,
        required : false
    },
    enrolledStudents : [LoginSchema]
});

const DonateSchema = new mongoose.Schema({
    amount:{
        type: Number,
        required: true
    },
    donors:{
        type: Number,
        required: true
    }
})

//Collection Part
const student = new mongoose.model("students",LoginSchema);
const teacher = new mongoose.model("teachers",TeacherSchema);
const donate = new mongoose.model("donates",DonateSchema);

module.exports = {student, teacher, donate};