const r=require('express').Router(),jwt=require('jsonwebtoken'),bcrypt=require('bcryptjs');
const {User,Location,Product,Item,Reader,Event,Transfer,Alert}=require('../models');
const {processScan,err}=require('../services/rfid');
const SECRET=()=>process.env.JWT_SECRET||'dev-secret';
const h=f=>(q,s,n)=>f(q,s,n).catch(n);
const auth=(...roles)=>(q,s,n)=>{try{q.user=jwt.verify((q.headers.authorization||'').slice(7),SECRET());}catch{return n(err(401,'Unauthorized'));}
 if(roles.length&&!roles.includes(q.user.role))return n(err(403,'Forbidden'));n();};
const any=auth();
const esc=t=>(t||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const scope=u=>u.role==='ADMIN'?{}:{location:u.location}; // managers see only their location

r.post('/auth/login',h(async(q,s)=>{const {email,password}=q.body||{};
 const u=await User.findOne({email});if(!u||!(await bcrypt.compare(password||'',u.password)))throw err(401,'Invalid credentials');
 const user={id:u._id,name:u.name,role:u.role,location:u.location};
 s.json({token:jwt.sign(user,SECRET(),{expiresIn:'8h'}),user});}));

r.get('/dashboard',any,h(async(q,s)=>{
 const sc=scope(q.user),items=await Item.find(sc),locs=await Location.find(),prods=await Product.find();
 const live=items.filter(i=>i.status!=='SOLD'),wk=Date.now()-7*864e5;
 const isStore=n=>locs.find(l=>l.name===n)?.type==='STORE';
 const byLoc={},acc={};
 live.forEach(i=>{byLoc[i.location]=(byLoc[i.location]||0)+1;const a=acc[i.location]||(acc[i.location]={t:0,v:0});a.t++;if(i.lastScan>wk)a.v++;});
 const today=new Date();today.setHours(0,0,0,0);
 const ev=await Event.find(sc).sort({at:-1});
 const days={};ev.forEach(e=>{const d=e.at.toISOString().slice(5,10);days[d]=(days[d]||0)+1;});
 const alerts=await Alert.find({status:{$ne:'RESOLVED'},...sc});
 const t=live.length,v=live.filter(i=>i.lastScan>wk).length;
 s.json({kpis:{products:prods.length,totalItems:t,inStores:live.filter(i=>isStore(i.location)).length,inWarehouses:live.filter(i=>!isStore(i.location)).length,
  lowStock:alerts.filter(a=>a.type==='LOW_STOCK').length,outOfStock:alerts.filter(a=>a.type==='OUT_OF_STOCK').length,
  scansToday:ev.filter(e=>e.at>=today).length,inTransit:live.filter(i=>i.status==='IN_TRANSIT').length,activeReaders:await Reader.countDocuments({...sc,status:'ONLINE'}),activeStores:locs.filter(l=>l.type==='STORE').length,accuracy:t?+(v/t*100).toFixed(1):0},
  byLocation:Object.entries(byLoc).map(([name,count])=>({name:name.replace(' Store','').replace('Warehouse','WH'),count})),
  distribution:[{name:'Stores',value:live.filter(i=>isStore(i.location)).length},{name:'Warehouses',value:live.filter(i=>!isStore(i.location)&&i.status!=='IN_TRANSIT').length},{name:'In Transit',value:live.filter(i=>i.status==='IN_TRANSIT').length}],
  status:[{name:'Available',value:live.filter(i=>i.status==='AVAILABLE').length},{name:'Low/Out alerts',value:alerts.filter(a=>/STOCK/.test(a.type)).length},{name:'In Transit',value:live.filter(i=>i.status==='IN_TRANSIT').length}],
  scans:Object.entries(days).sort().map(([day,count])=>({day,count})),
  accuracy:Object.entries(acc).map(([name,a])=>({name:name.replace(' Store',''),acc:+(a.v/a.t*100).toFixed(1)})),
  recent:ev.slice(0,8)});}));

r.get('/inventory',any,h(async(q,s)=>{const {q:t,status,category,location,page=1}=q.query;const f={...scope(q.user)};
 if(status)f.status=status;if(category)f.category=category;if(location&&q.user.role==='ADMIN')f.location=location;
 if(t){const x=new RegExp(esc(t),'i');f.$or=[{tag:x},{sku:x},{name:x}];}
 s.json({total:await Item.countDocuments(f),items:await Item.find(f).sort({lastScan:-1}).skip((page-1)*15).limit(15)});}));
r.get('/inventory/:id',any,h(async(q,s)=>s.json(await Item.findById(q.params.id))));

r.get('/rfid/events',any,h(async(q,s)=>{const {type,status,tag,location,page=1}=q.query;const f={...scope(q.user)};
 if(type)f.type=type;if(status)f.status=status;if(tag)f.tag=new RegExp(esc(tag),'i');if(location&&q.user.role==='ADMIN')f.location=location;
 s.json({total:await Event.countDocuments(f),items:await Event.find(f).sort({at:-1}).skip((page-1)*20).limit(20)});}));
r.post('/rfid/events',any,h(async(q,s)=>s.status(201).json(await processScan(q.body)))); // gateway ingestion endpoint
r.post('/rfid/simulate',any,h(async(q,s)=>{let {tag,readerId,type,zone}=q.body||{};
 if(!readerId){const rs=await Reader.find({status:'ONLINE',...scope(q.user)});readerId=rs[Math.floor(Math.random()*rs.length)]?.readerId;}
 if(!tag){const rd=await Reader.findOne({readerId});const its=await Item.find({location:rd?.location,status:{$ne:'SOLD'}}).limit(50);tag=its[Math.floor(Math.random()*its.length)]?.tag;}
 s.json(await processScan({tag,readerId,type,zone}));}));
r.get('/rfid/readers',any,h(async(q,s)=>s.json(await Reader.find(scope(q.user)))));

const locRoute=type=>[any,h(async(q,s)=>s.json(await Location.find({type})))];
const locOne=type=>[any,h(async(q,s)=>{const l=await Location.findOne({_id:q.params.id,type});if(!l)throw err(404,type+' not found');
 s.json({...l.toObject(),inventory:await Item.countDocuments({location:l.name,status:{$ne:'SOLD'}})});})];
r.get('/stores',...locRoute('STORE'));r.get('/stores/:id',...locOne('STORE'));
r.get('/warehouses',...locRoute('WAREHOUSE'));r.get('/warehouses/:id',...locOne('WAREHOUSE'));

r.get('/products',any,h(async(q,s)=>{const st=await Item.aggregate([{$match:{status:'AVAILABLE'}},{$group:{_id:'$sku',n:{$sum:1}}}]);
 const m=Object.fromEntries(st.map(x=>[x._id,x.n]));s.json((await Product.find()).map(p=>({...p.toObject(),stock:m[p.sku]||0})));}));
r.get('/locations/stats',any,h(async(q,s)=>{const [locs,items,rds,al,tr]=await Promise.all([Location.find(q.query.type?{type:q.query.type}:{}),Item.find({status:{$ne:'SOLD'}}),Reader.find(),Alert.find({status:{$ne:'RESOLVED'}}),Transfer.find({status:{$nin:['COMPLETED','CANCELLED']}})]);
 const wk=Date.now()-7*864e5;
 s.json(locs.map(l=>{const it=items.filter(i=>i.location===l.name),a=t=>al.filter(x=>x.location===l.name&&x.type===t).length;
  return {...l.toObject(),inventory:it.length,accuracy:it.length?+(it.filter(i=>i.lastScan>wk).length/it.length*100).toFixed(1):0,readers:rds.filter(x=>x.location===l.name).length,
   lowStock:a('LOW_STOCK'),outOfStock:a('OUT_OF_STOCK'),incoming:tr.filter(t=>t.to===l.name).length,outgoing:tr.filter(t=>t.from===l.name).length,status:'ACTIVE'};}));}));
r.post('/products',auth('ADMIN'),h(async(q,s)=>s.status(201).json(await Product.create(q.body))));
r.get('/products/:id',any,h(async(q,s)=>{const p=await Product.findById(q.params.id);if(!p)throw err(404,'Product not found');s.json(p);}));
r.put('/products/:id',auth('ADMIN'),h(async(q,s)=>s.json(await Product.findByIdAndUpdate(q.params.id,q.body,{new:true}))));
r.delete('/products/:id',auth('ADMIN'),h(async(q,s)=>{await Product.findByIdAndDelete(q.params.id);s.json({ok:true});}));

const FLOW=['REQUESTED','APPROVED','PICKING','PACKED','IN_TRANSIT','RECEIVED','COMPLETED'];
r.get('/transfers',any,h(async(q,s)=>s.json(await Transfer.find().sort({createdAt:-1}))));
r.post('/transfers',auth('ADMIN','STORE_MANAGER'),h(async(q,s)=>{const {from,to,qty}=q.body||{};
 if(!from||!to||from===to||!(qty>0))throw err(400,'Invalid transfer');
 const its=await Item.find({location:from,status:'AVAILABLE'}).limit(qty);if(!its.length)throw err(400,'No stock at source');
 s.status(201).json(await Transfer.create({transferId:'TRF-'+(10100+await Transfer.countDocuments()),from,to,qty:its.length,tags:its.map(i=>i.tag)}));}));
// advance status; RECEIVED writes ITEM_RECEIVED events, moves items and re-checks stock levels
r.put('/transfers/:id',auth('ADMIN','WAREHOUSE_MANAGER'),h(async(q,s)=>{
 const t=await Transfer.findById(q.params.id);if(!t)throw err(404,'Transfer not found');
 if(q.body.status==='CANCELLED'){t.status='CANCELLED';return s.json(await t.save());}
 const nx=FLOW[FLOW.indexOf(t.status)+1];if(!nx)throw err(400,'Invalid transfer state');
 t.status=nx;
 if(nx==='IN_TRANSIT')await Item.updateMany({tag:{$in:t.tags}},{status:'IN_TRANSIT'});
 if(nx==='RECEIVED'){const rd=await Reader.findOne({location:t.to,zone:'Entrance'})||await Reader.findOne({location:t.to});
  for(const tag of t.tags)await processScan({tag,readerId:rd.readerId,type:'ITEM_RECEIVED',zone:'Stockroom'});}
 s.json(await t.save());}));

r.get('/alerts',any,h(async(q,s)=>{const f={...scope(q.user)};if(q.query.location&&q.user.role==='ADMIN')f.location=q.query.location;s.json(await Alert.find(f).sort({createdAt:-1}).limit(100));}));
r.put('/alerts/:id',any,h(async(q,s)=>s.json(await Alert.findByIdAndUpdate(q.params.id,{status:q.body.status},{new:true}))));

r.get('/trace/:tag',any,h(async(q,s)=>{const item=await Item.findOne({tag:q.params.tag});if(!item)throw err(404,'Invalid RFID tag');
 s.json({item,journey:await Event.find({tag:q.params.tag}).sort({at:1})});}));
r.get('/search',any,h(async(q,s)=>{const x=new RegExp(esc(q.query.q),'i');
 const [items,transfers,locations]=await Promise.all([Item.find({$or:[{tag:x},{sku:x},{name:x}]}).limit(10),Transfer.find({transferId:x}).limit(5),Location.find({name:x}).limit(5)]);
 s.json({items,transfers,locations});}));
r.get('/analytics',any,h(async(q,s)=>{const ev=await Event.find();const by={};
 ev.forEach(e=>{const d=e.at.toISOString().slice(5,10),o=by[d]||(by[d]={day:d,received:0,moved:0,sold:0,returned:0});
  if(e.type==='ITEM_RECEIVED')o.received++;else if(e.type==='ITEM_SOLD')o.sold++;else if(e.type==='ITEM_RETURNED')o.returned++;else o.moved++;});
 const top={};ev.filter(e=>e.type==='ITEM_SOLD').forEach(e=>top[e.product]=(top[e.product]||0)+1);
 s.json({movement:Object.values(by).sort((a,b)=>a.day>b.day?1:-1),topProducts:Object.entries(top).map(([name,sold])=>({name,sold})).sort((a,b)=>b.sold-a.sold).slice(0,5)});}));
module.exports=r;
