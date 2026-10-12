/* RFID processing service.
 * In production: readers -> RFID gateway/edge -> REST/queue -> POST /api/rfid/events -> processScan().
 * The simulator calls the same function, so real hardware can be added without changing business logic. */
const {Item,Reader,Event,Alert,Product}=require('../models');
const err=(s,m)=>Object.assign(new Error(m),{status:s});
async function raise(a){const dup=await Alert.findOne({type:a.type,location:a.location,sku:a.sku,tag:a.tag,status:{$ne:'RESOLVED'}});return dup||Alert.create(a);}
async function checkStock(sku,location){
 const p=await Product.findOne({sku});if(!p)return;
 const n=await Item.countDocuments({sku,location,status:'AVAILABLE'});
 if(n===0)await raise({type:'OUT_OF_STOCK',severity:'CRITICAL',location,sku,message:`${p.name} is out of stock at ${location}`});
 else if(n<p.minStock)await raise({type:'LOW_STOCK',severity:'HIGH',location,sku,message:`${p.name}: ${n} left (min ${p.minStock}) at ${location}`});
}
async function processScan({tag,readerId,type='ITEM_DETECTED',zone}){
 const item=await Item.findOne({tag});if(!item)throw err(404,'Invalid RFID tag');
 const rd=await Reader.findOne({readerId});if(!rd)throw err(404,'Unknown reader');
 const prevLocation=item.location,prevZone=item.zone;
 zone=zone||rd.zone;
 item.location=rd.location;item.zone=zone;item.lastScan=new Date();
 item.status=type==='ITEM_SOLD'?'SOLD':type==='ITEM_SHIPPED'?'IN_TRANSIT':'AVAILABLE';
 let status='SUCCESS';const alerts=[];
 if(item.status==='AVAILABLE'&&zone.startsWith('Floor')&&item.expectedZone&&zone!==item.expectedZone){
  type='MISPLACED_ITEM';status='WARNING';
  alerts.push(await raise({type:'MISPLACED_ITEM',severity:'MEDIUM',tag,sku:item.sku,location:rd.location,message:`${item.name} expected in ${item.expectedZone}, detected in ${zone}`}));}
 await item.save();
 const event=await Event.create({tag,product:item.name,readerId,location:rd.location,prevLocation,prevZone,zone,type,status});
 rd.scans+=1;rd.lastHeartbeat=new Date();await rd.save();
 await checkStock(item.sku,prevLocation);await checkStock(item.sku,rd.location);
 return {event,item,alerts};
}
module.exports={processScan,err};
