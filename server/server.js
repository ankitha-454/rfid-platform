require('dotenv').config();
const express=require('express'),cors=require('cors'),mongoose=require('mongoose');
const app=express();
app.use(cors({origin:process.env.CLIENT_URL||'http://localhost:5173'}),express.json());
app.use('/api',require('./routes'));
app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.status?e.message:'Server error'}));
mongoose.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/rfid_retail')
 .then(()=>app.listen(process.env.PORT||5000,()=>console.log('API up')));
