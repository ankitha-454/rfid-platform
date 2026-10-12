import {useState,useEffect,useCallback} from 'react';
import {BarChart,Bar,LineChart,Line,PieChart,Pie,Cell,XAxis,YAxis,Tooltip,ResponsiveContainer} from 'recharts';
import {Search,Zap} from 'lucide-react';
import {api,msg,Badge,Card,fmt,Load,toast} from './lib.jsx';

const Events=({rows})=><table className="w-full text-sm"><tbody>{rows.map(e=><tr key={e._id} className="border-t"><td className="py-1.5">{e.tag}</td><td>{e.product}</td><td>{e.location}</td><td>{e.zone}</td><td><Badge v={e.type}/></td><td className="text-slate-500">{fmt(e.at)}</td><td><Badge v={e.status}/></td></tr>)}</tbody></table>;

export function Dashboard(){
 const [d,setD]=useState(null),[readers,setReaders]=useState([]),[res,setRes]=useState(null),[readerId,setR]=useState(''),[type,setT]=useState('ITEM_MOVED'),[zone,setZ]=useState('Floor-Women');
 const load=useCallback(()=>api.get('/dashboard').then(r=>setD(r.data)),[]);
 useEffect(()=>{load();api.get('/rfid/readers').then(r=>{setReaders(r.data);setR(r.data[0]?.readerId);});},[load]);
 const sim=async()=>{try{const {data}=await api.post('/rfid/simulate',{readerId,type,zone});setRes(data);toast('RFID scan processed');load();}catch(e){setRes({error:msg(e)});}};
 return <Load d={d}><div className="space-y-4">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['Total Items',d?.kpis.totalItems],['In Stores',d?.kpis.inStores],['In Warehouses',d?.kpis.inWarehouses],['Products',d?.kpis.products],['Scans Today',d?.kpis.scansToday],['Inventory Accuracy',d?.kpis.accuracy+'%'],['In Transit',d?.kpis.inTransit],['Active Readers',d?.kpis.activeReaders],['Active Stores',d?.kpis.activeStores],['Low Stock',d?.kpis.lowStock],['Out of Stock',d?.kpis.outOfStock]].map(([k,v])=>
   <Card key={k}><p className="text-xs text-slate-500">{k}</p><p className="text-2xl font-semibold">{typeof v==='number'?v.toLocaleString():v}</p></Card>)}</div>
  <Card title="Live RFID Simulator"><div className="flex flex-wrap gap-2 items-center text-sm">
   <select className="border rounded p-2" value={readerId} onChange={e=>setR(e.target.value)}>{readers.map(r=><option key={r.readerId} value={r.readerId}>{r.readerId} · {r.location}</option>)}</select>
   <select className="border rounded p-2" value={type} onChange={e=>setT(e.target.value)}>{['ITEM_DETECTED','ITEM_MOVED','ITEM_SOLD','ITEM_RETURNED','ITEM_RECEIVED'].map(t=><option key={t}>{t}</option>)}</select>
   <select className="border rounded p-2" value={zone} onChange={e=>setZ(e.target.value)}>{['Stockroom','Floor-Men','Floor-Women'].map(t=><option key={t}>{t}</option>)}</select>
   <button onClick={sim} className="bg-indigo-600 text-white rounded px-3 py-2 flex gap-1 items-center"><Zap size={14}/>Simulate RFID Scan</button></div>
   {res&&(res.error?<p className="text-red-600 text-sm mt-3">{res.error}</p>:<div className="mt-3 text-sm bg-slate-50 rounded p-3"><b>RFID EVENT DETECTED</b> <Badge v={res.event.status}/><br/>{res.event.tag} · {res.event.product} · {res.event.location}<br/>{res.event.prevZone} → {res.event.zone} ({res.event.type})<br/>✓ Inventory Updated ✓ Location Updated ✓ Event Recorded{res.alerts.length>0&&<span className="text-amber-700"> ⚠ {res.alerts[0].message}</span>}</div>)}</Card>
  <div className="grid md:grid-cols-2 gap-4">
   <Card title="Inventory by Location"><ResponsiveContainer height={220}><BarChart data={d?.byLocation}><XAxis dataKey="name" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Bar dataKey="count" fill="#4f46e5"/></BarChart></ResponsiveContainer></Card>
   <Card title="RFID Scans per Day"><ResponsiveContainer height={220}><LineChart data={d?.scans}><XAxis dataKey="day" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Line dataKey="count" stroke="#4f46e5"/></LineChart></ResponsiveContainer></Card>
   <Card title="Inventory Distribution"><ResponsiveContainer height={220}><PieChart><Pie data={d?.distribution} dataKey="value" nameKey="name" innerRadius={50} label>{d?.status.map((_,i)=><Cell key={i} fill={['#16a34a','#f59e0b','#2563eb'][i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></Card>
   <Card title="Inventory Accuracy by Location (%)"><ResponsiveContainer height={220}><BarChart data={d?.accuracy}><XAxis dataKey="name" fontSize={10}/><YAxis domain={[0,100]} fontSize={10}/><Tooltip/><Bar dataKey="acc" fill="#0d9488"/></BarChart></ResponsiveContainer></Card></div>
  <Card title="Recent RFID Activity"><Events rows={d?.recent||[]}/></Card></div></Load>;
}

export function Inventory(){
 const [q,setQ]=useState(''),[st,setSt]=useState(''),[page,setP]=useState(1),[data,setD]=useState(null),[trace,setTr]=useState(null);
 useEffect(()=>{api.get('/inventory',{params:{q,status:st,page}}).then(r=>setD(r.data));},[q,st,page]);
 const open=async tag=>setTr((await api.get('/trace/'+tag)).data);
 return <div className="space-y-3"><div className="flex gap-2"><div className="relative"><Search size={14} className="absolute left-2 top-3 text-slate-400"/><input placeholder="Search tag, SKU, product" className="border rounded p-2 pl-7 text-sm" onChange={e=>{setQ(e.target.value);setP(1);}}/></div>
  <select className="border rounded p-2 text-sm" onChange={e=>{setSt(e.target.value);setP(1);}}><option value="">All status</option><option>AVAILABLE</option><option>IN_TRANSIT</option><option>SOLD</option></select></div>
  <Load d={data}><Card><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr>{['RFID Tag','SKU','Product','Size','Color','Location','Zone','Status','Last Scan'].map(h=><th key={h} className="pb-2">{h}</th>)}</tr></thead>
  <tbody>{data?.items.map(i=><tr key={i._id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={()=>open(i.tag)}><td className="py-1.5 text-indigo-600">{i.tag}</td><td>{i.sku}</td><td>{i.name}</td><td>{i.size}</td><td>{i.color}</td><td>{i.location}</td><td>{i.zone}</td><td><Badge v={i.status}/></td><td>{fmt(i.lastScan)}</td></tr>)}</tbody></table>
  <div className="flex justify-between text-sm mt-3"><span>{data?.total} items · click a row for traceability</span><span><button disabled={page<2} onClick={()=>setP(page-1)} className="px-2">Prev</button>Page {page}<button onClick={()=>setP(page+1)} className="px-2">Next</button></span></div></Card></Load>
  {trace&&<Card title={`Journey · ${trace.item.tag} · ${trace.item.name}`}>{trace.journey.length?trace.journey.map(e=><div key={e._id} className="text-sm border-l-2 border-indigo-400 pl-3 pb-2"><b>{e.type}</b> — {e.location} / {e.zone} <span className="text-slate-500">{fmt(e.at)}</span></div>):<p className="text-sm text-slate-500">No events yet.</p>}<button className="text-xs text-slate-500" onClick={()=>setTr(null)}>Close</button></Card>}</div>;
}

export function Transfers(){
 const [rows,setRows]=useState(null),[err,setErr]=useState(''),[locs,setLocs]=useState([]),[f,setF]=useState({from:'',to:'',qty:5});
 const load=()=>api.get('/transfers').then(r=>setRows(r.data));
 useEffect(()=>{load();Promise.all([api.get('/stores'),api.get('/warehouses')]).then(r=>{const l=[...r[1].data,...r[0].data];setLocs(l);setF(x=>({...x,from:l[0]?.name,to:l[3]?.name}));});},[]);
 const act=async fn=>{try{setErr('');await fn();toast('Transfer updated');load();}catch(e){setErr(msg(e));toast(msg(e),false);}};
 return <div className="space-y-3">{err&&<p className="text-red-600 text-sm">{err}</p>}
  <Card title="Request transfer"><div className="flex gap-2 text-sm">{['from','to'].map(k=><select key={k} className="border rounded p-2" value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}>{locs.map(l=><option key={l._id}>{l.name}</option>)}</select>)}
   <input type="number" className="border rounded p-2 w-20" value={f.qty} onChange={e=>setF({...f,qty:+e.target.value})}/><button className="bg-indigo-600 text-white rounded px-3" onClick={()=>act(()=>api.post('/transfers',f))}>Create</button></div></Card>
  <Load d={rows}><Card><table className="w-full text-sm"><tbody>{rows?.map(t=><tr key={t._id} className="border-t"><td className="py-2">{t.transferId}</td><td>{t.from} → {t.to}</td><td>{t.qty} items</td><td><Badge v={t.status}/></td>
   <td>{!['COMPLETED','CANCELLED'].includes(t.status)&&<button className="text-indigo-600" onClick={()=>act(()=>api.put('/transfers/'+t._id,{}))}>Advance →</button>}</td></tr>)}</tbody></table></Card></Load></div>;
}

export function Alerts(){
 const [rows,setRows]=useState(null);const load=()=>api.get('/alerts').then(r=>setRows(r.data));useEffect(()=>{load();},[]);
 const set=async(id,status)=>{await api.put('/alerts/'+id,{status});toast('Alert '+status.toLowerCase());load();};
 return <Load d={rows}><Card><table className="w-full text-sm"><tbody>{rows?.map(a=><tr key={a._id} className="border-t"><td className="py-2"><Badge v={a.severity}/></td><td>{a.type}</td><td>{a.message}</td><td><Badge v={a.status}/></td>
  <td>{a.status==='NEW'&&<button className="text-indigo-600 mr-2" onClick={()=>set(a._id,'ACKNOWLEDGED')}>Ack</button>}{a.status!=='RESOLVED'&&<button className="text-green-700" onClick={()=>set(a._id,'RESOLVED')}>Mark as Resolved</button>}</td></tr>)}</tbody></table></Card></Load>;
}

export function Readers(){
 const [rows,setRows]=useState(null);useEffect(()=>{api.get('/rfid/readers').then(r=>setRows(r.data));},[]);
 return <Load d={rows}><Card><table className="w-full text-sm"><tbody>{rows?.map(r=><tr key={r._id} className="border-t"><td className="py-1.5">{r.readerId}</td><td>{r.location}</td><td>{r.zone}</td><td><Badge v={r.status==='ONLINE'?'SUCCESS':r.status==='WARNING'?'WARNING':'CRITICAL'}/> {r.status}</td><td>{r.scans} scans</td><td className="text-slate-500">{fmt(r.lastHeartbeat)}</td></tr>)}</tbody></table></Card></Load>;
}

