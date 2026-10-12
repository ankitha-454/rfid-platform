const m=require('mongoose'),S=m.Schema;
const M=(n,s)=>m.model(n,new S(s,{timestamps:true}));
module.exports={
 User:M('User',{name:String,email:{type:String,unique:true},password:String,role:{type:String,enum:['ADMIN','STORE_MANAGER','WAREHOUSE_MANAGER']},location:String}),
 Location:M('Location',{code:String,name:String,city:String,type:{type:String,enum:['STORE','WAREHOUSE']}}), // Store + Warehouse share one model
 Product:M('Product',{sku:{type:String,unique:true},name:String,category:String,brand:String,gender:String,price:Number,minStock:{type:Number,default:10}}),
 // Item = one RFID-tagged garment (RFIDTag + Inventory record)
 Item:M('Item',{tag:{type:String,unique:true},sku:String,name:String,category:String,size:String,color:String,location:String,zone:String,expectedZone:String,status:{type:String,default:'AVAILABLE'},lastScan:Date}),
 Reader:M('Reader',{readerId:{type:String,unique:true},name:String,location:String,zone:String,status:{type:String,default:'ONLINE'},lastHeartbeat:Date,scans:{type:Number,default:0}}),
 Event:M('Event',{tag:String,product:String,readerId:String,location:String,prevLocation:String,prevZone:String,zone:String,type:String,status:String,at:{type:Date,default:Date.now}}),
 Transfer:M('Transfer',{transferId:String,from:String,to:String,qty:Number,tags:[String],status:{type:String,default:'REQUESTED'}}),
 Alert:M('Alert',{type:String,severity:String,message:String,location:String,tag:String,sku:String,status:{type:String,default:'NEW'}})
};
