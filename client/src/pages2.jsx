import {useState,useEffect} from 'react';
import {useSearchParams} from 'react-router-dom';
import {BarChart,Bar,LineChart,Line,XAxis,YAxis,Tooltip,Legend,ResponsiveContainer} from 'recharts';
import {api,msg,Badge,Card,fmt,Load,Empty,useFetch,toast} from './lib.jsx';
const Sel=({v,set,opts,label})=><select className="border rounded p-2 text-sm" value={v} onChange={e=>set(e.target.value)}><option value="">{label}</option>{opts.map(o=><option key={o}>{o}</option>)}</select>;

export function EventsPage(){
 const [f,setF]=useState({type:'',status:'',tag:'',location:'',page:1}),{d,e,load}=useFetch('/rfid/events',f),locs=useFetch('/locations/stats');
 const up=k=>v=>setF({...f,[k]:v,page:1});
 return <div className="space-y-3"><div className="flex flex-wrap gap-2"><input placeholder="RFID tag" className="border rounded p-2 text-sm" onChange={ev=>up('tag')(ev.target.value)}/>
  <Sel v={f.type} set={up('type')} label="All events" opts={['ITEM_DETECTED','ITEM_MOVED','ITEM_RECEIVED','ITEM_SHIPPED','ITEM_SOLD','ITEM_RETURNED','UNEXPECTED_ITEM','MISPLACED_ITEM']}/>
  <Sel v={f.status} set={up('status')} label="All status" opts={['SUCCESS','WARNING']}/><Sel v={f.location} set={up('location')} label="All locations" opts={(locs.d||[]).map(l=>l.name)}/></div>
  <Load d={d} e={e} retry={load} what="RFID events">{d?.items.length?<Card className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap"><thead className="text-left text-slate-500"><tr>{['RFID Tag','Product','Reader','Location','Previous → Current','Event','Time','Status'].map(h=><th key={h} className="pb-2 pr-3">{h}</th>)}</tr></thead>
   <tbody>{d.items.map(x=><tr key={x._id} className="border-t"><td className="py-1.5 pr-3">{x.tag}</td><td className="pr-3">{x.product}</td><td className="pr-3">{x.readerId}</td><td className="pr-3">{x.location}</td><td className="pr-3">{x.prevZone} → {x.zone}</td><td className="pr-3"><Badge v={x.type}/></td><td className="pr-3">{fmt(x.at)}</td><td><Badge v={x.status}/></td></tr>)}</tbody></table>
   <div className="flex justify-between text-sm mt-3"><span>{d.total} events</span><span><button disabled={f.page<2} onClick={()=>setF({...f,page:f.page-1})} className="px-2">Prev</button>Page {f.page}<button disabled={f.page*20>=d.total} onClick={()=>setF({...f,page:f.page+1})} className="px-2">Next</button></span></div></Card>:<Empty text="No RFID events found."/>}</Load></div>;
}

function Detail({l,onClose}){
 const ev=useFetch('/rfid/events',{location:l.name}),al=useFetch('/alerts',{location:l.name}),tr=useFetch('/transfers');
 return <Card title={`${l.name} · detail`}><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">{[['Inventory',l.inventory],['Accuracy',l.accuracy+'%'],['Readers',l.readers],['Open alerts',al.d?.filter(a=>a.status!=='RESOLVED').length??'…']].map(([k,v])=><div key={k} className="bg-slate-50 rounded p-2"><p className="text-xs text-slate-500">{k}</p><b>{v}</b></div>)}</div>
  <div className="grid md:grid-cols-3 gap-4 text-sm"><div><b>Recent RFID activity</b>{ev.d?.items.slice(0,5).map(x=><p key={x._id} className="border-t py-1">{x.tag} · {x.type}</p>)}</div>
   <div><b>Alerts</b>{al.d?.slice(0,5).map(a=><p key={a._id} className="border-t py-1">{a.type} <Badge v={a.status}/></p>)}</div>
   <div><b>Transfers</b>{tr.d?.filter(t=>t.from===l.name||t.to===l.name).slice(0,5).map(t=><p key={t._id} className="border-t py-1">{t.transferId} <Badge v={t.status}/></p>)}</div></div>
  <button className="text-xs text-slate-500 mt-3" onClick={onClose}>Close</button></Card>;
}
function Locations({type,what}){
 const {d,e,load}=useFetch('/locations/stats',{type}),[sel,setSel]=useState(null),wh=type==='WAREHOUSE';
 const cols=wh?['ID','Name','City','Inventory','Incoming','Outgoing','Readers','Status']:['ID','Name','City','Inventory','Accuracy','Readers','Low','Out','Status'];
 return <div className="space-y-4"><Load d={d} e={e} retry={load} what={what}>{d?.length?<Card className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap"><thead className="text-left text-slate-500"><tr>{cols.map(c=><th key={c} className="pb-2 pr-3">{c}</th>)}</tr></thead>
  <tbody>{d.map(l=><tr key={l._id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={()=>setSel(l)}><td className="py-2 pr-3">{l.code}</td><td className="pr-3 text-indigo-600">{l.name}</td><td className="pr-3">{l.city}</td><td className="pr-3">{l.inventory}</td>
   {wh?<><td className="pr-3">{l.incoming}</td><td className="pr-3">{l.outgoing}</td></>:<td className="pr-3">{l.accuracy}%</td>}<td className="pr-3">{l.readers}</td>{!wh&&<><td className="pr-3">{l.lowStock}</td><td className="pr-3">{l.outOfStock}</td></>}<td><Badge v={l.status}/></td></tr>)}</tbody></table></Card>:<Empty text={`No ${what} found.`}/>}</Load>
  {sel&&<Detail l={sel} onClose={()=>setSel(null)}/>}</div>;
}
export const Stores=()=><Locations type="STORE" what="stores"/>;
export const Warehouses=()=><Locations type="WAREHOUSE" what="warehouses"/>;

export function Products(){
 const {d,e,load}=useFetch('/products'),[q,setQ]=useState(''),[cat,setCat]=useState(''),[sort,setSort]=useState('name');
 const rows=(d||[]).filter(p=>(!cat||p.category===cat)&&(p.name+p.sku).toLowerCase().includes(q.toLowerCase())).sort((a,b)=>a[sort]>b[sort]?1:-1);
 return <div className="space-y-3"><div className="flex flex-wrap gap-2"><input placeholder="Search SKU / product" className="border rounded p-2 text-sm" onChange={x=>setQ(x.target.value)}/>
  <Sel v={cat} set={setCat} label="All categories" opts={[...new Set((d||[]).map(p=>p.category))]}/><Sel v={sort} set={setSort} label="Sort" opts={['name','sku','price','stock']}/></div>
  <Load d={d} e={e} retry={load} what="products">{rows.length?<Card className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap"><thead className="text-left text-slate-500"><tr>{['SKU','Product','Category','Gender','Price','Min stock','Stock','Status'].map(h=><th key={h} className="pb-2 pr-3">{h}</th>)}</tr></thead>
   <tbody>{rows.map(p=><tr key={p._id} className="border-t"><td className="py-1.5 pr-3">{p.sku}</td><td className="pr-3">{p.name}</td><td className="pr-3">{p.category}</td><td className="pr-3">{p.gender}</td><td className="pr-3">₹{p.price}</td><td className="pr-3">{p.minStock}</td><td className="pr-3">{p.stock}</td><td><Badge v={p.stock===0?'CRITICAL':p.stock<p.minStock?'HIGH':'AVAILABLE'}/></td></tr>)}</tbody></table></Card>:<Empty text="No products found."/>}</Load></div>;
}

export function Trace(){
 const [sp]=useSearchParams(),[q,setQ]=useState(sp.get('tag')||''),[r,setR]=useState(null),[err,setErr]=useState('');
 const go=async v=>{setErr('');setR(null);try{let tag=v;if(!/^RFID-/i.test(v)){const s=(await api.get('/search',{params:{q:v}})).data;tag=s.items[0]?.tag;if(!tag)throw {response:{data:{message:'No item found'}}};}
  setR((await api.get('/trace/'+tag.toUpperCase())).data);}catch(x){setErr(msg(x));toast(msg(x),false);}};
 useEffect(()=>{if(sp.get('tag'))go(sp.get('tag'));},[sp]); // eslint-disable-line
 return <div className="space-y-3"><div className="flex gap-2"><input value={q} placeholder="RFID tag or SKU" className="border rounded p-2 text-sm" onChange={x=>setQ(x.target.value)} onKeyDown={x=>x.key==='Enter'&&go(q)}/><button className="bg-indigo-600 text-white rounded px-3 text-sm" onClick={()=>go(q)}>Trace</button></div>
  {err&&<p className="text-red-600 text-sm">{err}</p>}
  {r&&<Card title={`${r.item.tag} · ${r.item.name} · now at ${r.item.location} / ${r.item.zone}`}>{r.journey.length?r.journey.map((e,i)=><div key={e._id} className="flex gap-3 text-sm"><div className="flex flex-col items-center"><span className="w-3 h-3 rounded-full bg-indigo-600"/>{i<r.journey.length-1&&<span className="w-px flex-1 bg-indigo-200"/>}</div>
   <div className="pb-4"><b>{e.location} · {e.zone}</b> <Badge v={e.type}/><p className="text-slate-500">{fmt(e.at)} · reader {e.readerId}</p></div></div>):<Empty text="No RFID events recorded for this item yet."/>}</Card>}</div>;
}

export function Analytics(){
 const a=useFetch('/analytics'),d=useFetch('/dashboard'),s=useFetch('/locations/stats',{type:'STORE'});
 return <Load d={a.d&&d.d&&s.d} e={a.e||d.e||s.e} retry={()=>{a.load();d.load();s.load();}} what="analytics"><div className="space-y-4">
  <div className="grid md:grid-cols-3 gap-4"><Card><p className="text-xs text-slate-500">Inventory Accuracy</p><p className="text-3xl font-semibold">{d.d?.kpis.accuracy}%</p></Card>
   <Card title="Top Moving Products" className="md:col-span-2">{a.d?.topProducts.map(p=><p key={p.name} className="text-sm flex justify-between border-t py-1"><span>{p.name}</span><b>{p.sold} sold</b></p>)}</Card></div>
  <div className="grid md:grid-cols-2 gap-4"><Card title="RFID Scan Volume"><ResponsiveContainer height={220}><LineChart data={d.d?.scans}><XAxis dataKey="day" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Line dataKey="count" stroke="#4f46e5"/></LineChart></ResponsiveContainer></Card>
   <Card title="Stock Movement"><ResponsiveContainer height={220}><BarChart data={a.d?.movement}><XAxis dataKey="day" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Legend/><Bar dataKey="received" stackId="a" fill="#2563eb"/><Bar dataKey="moved" stackId="a" fill="#4f46e5"/><Bar dataKey="sold" stackId="a" fill="#16a34a"/><Bar dataKey="returned" stackId="a" fill="#f59e0b"/></BarChart></ResponsiveContainer></Card></div>
  <Card title="Store Comparison" className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap"><thead className="text-left text-slate-500"><tr>{['Store','Inventory','Accuracy','Low stock','Stock-outs'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{s.d?.map(l=><tr key={l._id} className="border-t"><td className="py-1">{l.name}</td><td>{l.inventory}</td><td>{l.accuracy}%</td><td>{l.lowStock}</td><td>{l.outOfStock}</td></tr>)}</tbody></table></Card></div></Load>;
}

export function SettingsPage({user}){
 return <Card title="Profile & system"><p className="text-sm">{user.name} · {user.role}{user.location?` · ${user.location}`:''}</p>
  <p className="text-sm text-slate-500 mt-3">RFID data in this prototype is simulated. Readers → RFID gateway → <code>POST /api/rfid/events</code> is the integration point for real hardware.</p></Card>;
}
