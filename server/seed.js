require('dotenv').config();
const m=require('mongoose'),bcrypt=require('bcryptjs');
const {User,Location,Product,Item,Reader,Event,Transfer,Alert}=require('./models');
const pick=a=>a[Math.floor(Math.random()*a.length)];
(async()=>{
 await m.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/rfid_retail');
 await Promise.all([User,Location,Product,Item,Reader,Event,Transfer,Alert].map(x=>x.deleteMany()));
 const cities=['Bangalore','Mangalore','Mysore','Chennai','Hyderabad','Kochi','Pune','Mumbai'];
 const locs=await Location.insertMany([...cities.map((c,i)=>({code:'ST-0'+(i+1),name:`${c} Store #0${i+1}`,city:c,type:'STORE'})),
  ...['Central','South','West'].map((c,i)=>({code:'WH-0'+(i+1),name:`${c} Warehouse`,city:['Bangalore','Chennai','Pune'][i],type:'WAREHOUSE'}))]);
 const pw=await bcrypt.hash('Password@123',10);
 await User.insertMany([{name:'Admin',email:'admin@rfidretail.com',password:pw,role:'ADMIN'},
  {name:'Store Manager',email:'manager@rfidretail.com',password:pw,role:'STORE_MANAGER',location:locs[0].name},
  {name:'Warehouse Manager',email:'warehouse@rfidretail.com',password:pw,role:'WAREHOUSE_MANAGER',location:locs[8].name}]);
 const defs=[['TSH-001',"Basic Black T-Shirt",'T-Shirts','Men'],['MSH-001',"Men's Casual Shirt",'Shirts','Men'],['MSH-002',"Men's Blue Shirt",'Shirts','Men'],['JNS-001','Slim Fit Jeans','Jeans','Men'],
  ['WDR-001','Floral Summer Dress','Dresses','Women'],['WTP-001',"Women's Printed Top",'T-Shirts','Women'],['WJN-001',"Women's Skinny Jeans",'Jeans','Women'],['JKT-001','Bomber Jacket','Jackets','Men'],
  ['TRS-001','Formal Trousers','Trousers','Men'],['SHO-001','Running Shoes','Shoes','Men'],['ACC-001','Leather Belt','Accessories','Men'],['WKR-001','Kurta Set','Dresses','Women']];
 const prods=await Product.insertMany(defs.map(([sku,name,category,gender])=>({sku,name,category,gender,brand:'UrbanWeave',price:499+Math.floor(Math.random()*3500),minStock:10})));
 const readers=[];locs.forEach(l=>{const c=l.code;(l.type==='STORE'?['Entrance','Stockroom','Floor-Men','Floor-Women']:['Receiving','Dispatch']).forEach((z,i)=>
  readers.push({readerId:`READER-${c}-0${i+1}`,name:`${l.name} ${z}`,location:l.name,zone:z,status:Math.random()<.85?'ONLINE':pick(['WARNING','OFFLINE']),lastHeartbeat:new Date(Date.now()-Math.random()*6e5),scans:Math.floor(Math.random()*5000)}));});
 await Reader.insertMany(readers);
 const sizes=['S','M','L','XL'],colors=['Blue','Black','White','Red','Grey'],items=[];
 for(let i=0;i<1200;i++){const p=pick(prods),l=Math.random()<.8?pick(locs.slice(0,8)):pick(locs.slice(8)),st=l.type==='STORE';
  const sold=Math.random()<.05;items.push({tag:'RFID-'+(100000+i),sku:p.sku,name:p.name,category:p.category,size:pick(sizes),color:pick(colors),location:l.name,
   zone:st?pick(['Stockroom','Floor-'+p.gender]):'Receiving',expectedZone:'Floor-'+p.gender,status:sold?'SOLD':'AVAILABLE',lastScan:new Date(Date.now()-Math.random()*(Math.random()<.9?6:14)*864e5)});}
 await Item.insertMany(items);
 const types=['ITEM_DETECTED','ITEM_MOVED','ITEM_RECEIVED','ITEM_SOLD','ITEM_RETURNED'];
 await Event.insertMany(Array.from({length:300},()=>{const i=pick(items);return {tag:i.tag,product:i.name,readerId:'READER-'+pick(locs).code+'-01',location:i.location,prevZone:'Stockroom',zone:i.zone,type:pick(types),status:'SUCCESS',at:new Date(Date.now()-Math.random()*7*864e5)};}));
 await Alert.insertMany(Array.from({length:24},(_,k)=>{const l=pick(locs.slice(0,8)),p=pick(prods),t=['LOW_STOCK','OUT_OF_STOCK','MISPLACED_ITEM','UNEXPECTED_ITEM','READER_OFFLINE','TRANSFER_DELAYED'][k%6];
  return {type:t,severity:t==='OUT_OF_STOCK'?'CRITICAL':t==='LOW_STOCK'?'HIGH':'MEDIUM',location:l.name,sku:p.sku,message:`${t.replace(/_/g,' ')}: ${p.name} @ ${l.name}`,status:pick(['NEW','NEW','ACKNOWLEDGED'])};}));
 await Transfer.insertMany([['TRF-10021','APPROVED'],['TRF-10022','PACKED'],['TRF-10023','IN_TRANSIT'],['TRF-10024','REQUESTED']].map(([transferId,status],i)=>
  ({transferId,status,from:locs[8].name,to:locs[i].name,qty:5,tags:items.filter(x=>x.location===locs[8].name&&x.status==='AVAILABLE').slice(i*5,i*5+5).map(x=>x.tag)})));
 console.log('Seeded');process.exit();})();
