import {useState,useEffect} from 'react';
import {BrowserRouter,Routes,Route,NavLink,Navigate,useNavigate} from 'react-router-dom';
import {LayoutDashboard,Boxes,Activity,Radio,Store,Warehouse,Tag,Truck,Bell,BarChart3,GitBranch,Settings,LogOut,Menu,Search} from 'lucide-react';
import {api,msg,Card,Toaster,toast,Badge,fmt} from './lib.jsx';
import * as P from './pages.jsx';
import * as N from './pages2.jsx';

const ALL=['ADMIN','STORE_MANAGER','WAREHOUSE_MANAGER'],ADM=['ADMIN'];
const NAV=[['/dashboard','Dashboard',LayoutDashboard,P.Dashboard,ALL],['/inventory','Inventory',Boxes,P.Inventory,ALL],['/rfid-events','RFID Events',Activity,N.EventsPage,ALL],['/rfid-readers','RFID Readers',Radio,P.Readers,ALL],
 ['/stores','Stores',Store,N.Stores,['ADMIN','STORE_MANAGER']],['/warehouses','Warehouses',Warehouse,N.Warehouses,['ADMIN','WAREHOUSE_MANAGER']],['/products','Products',Tag,N.Products,ADM],
 ['/transfers','Transfers',Truck,P.Transfers,ALL],['/alerts','Alerts',Bell,P.Alerts,ALL],['/analytics','Analytics',BarChart3,N.Analytics,['ADMIN','STORE_MANAGER']],['/traceability','Traceability',GitBranch,N.Trace,ALL],['/settings','Settings',Settings,N.SettingsPage,ALL]];

function Login({onLogin}){
 const nav=useNavigate(),[email,setEmail]=useState('admin@rfidretail.com'),[password,setPw]=useState('Password@123'),[err,setErr]=useState('');
 const go=async()=>{try{const {data}=await api.post('/auth/login',{email,password});localStorage.setItem('token',data.token);localStorage.setItem('user',JSON.stringify(data.user));onLogin(data.user);nav('/dashboard');}catch(e){setErr(msg(e));}};
 return <div className="min-h-screen grid place-items-center p-4"><Card className="w-96 max-w-full space-y-3"><h1 className="text-xl font-bold text-slate-800">RFID Retail Intelligence</h1><p className="text-xs text-slate-500">Real-Time Inventory Visibility Across Every Store</p>
  <select className="border rounded w-full p-2 text-sm" onChange={e=>setEmail(e.target.value)}><option value="admin@rfidretail.com">Admin</option><option value="manager@rfidretail.com">Store Manager</option><option value="warehouse@rfidretail.com">Warehouse Manager</option></select>
  <input className="border rounded w-full p-2 text-sm" type="password" value={password} onChange={e=>setPw(e.target.value)}/>{err&&<p className="text-red-600 text-sm">{err}</p>}
  <button onClick={go} className="w-full bg-indigo-600 text-white rounded p-2 text-sm">Sign in</button></Card></div>;
}

function GlobalSearch(){
 const [q,setQ]=useState(''),[r,setR]=useState(null),nav=useNavigate();
 useEffect(()=>{if(q.length<3){setR(null);return;}const t=setTimeout(()=>api.get('/search',{params:{q}}).then(x=>setR(x.data)).catch(e=>toast(msg(e),false)),300);return()=>clearTimeout(t);},[q]);
 const pick=p=>{setQ('');setR(null);nav(p);};
 return <div className="relative"><Search size={14} className="absolute left-2 top-2.5 text-slate-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search RFID, SKU, product, store, transfer" className="border rounded pl-7 p-2 text-sm w-64 md:w-96"/>
  {r&&<div className="absolute z-20 mt-1 w-full bg-white border rounded shadow text-sm max-h-80 overflow-auto">
   {r.items.map(i=><button key={i._id} onClick={()=>pick('/traceability?tag='+i.tag)} className="block w-full text-left p-2 hover:bg-slate-50 border-b"><b>{i.tag}</b> {i.name}<br/><span className="text-slate-500">{i.location} · {i.zone} · <Badge v={i.status}/> · last scan {fmt(i.lastScan)} · <u>View Journey</u></span></button>)}
   {r.transfers.map(t=><button key={t._id} onClick={()=>pick('/transfers')} className="block w-full text-left p-2 hover:bg-slate-50 border-b">{t.transferId} · {t.from} → {t.to} <Badge v={t.status}/></button>)}
   {r.locations.map(l=><button key={l._id} onClick={()=>pick(l.type==='STORE'?'/stores':'/warehouses')} className="block w-full text-left p-2 hover:bg-slate-50 border-b">{l.name} ({l.type})</button>)}
   {!r.items.length&&!r.transfers.length&&!r.locations.length&&<p className="p-3 text-slate-500">No results.</p>}</div>}</div>;
}

function Shell({user,logout}){
 const [open,setOpen]=useState(false),items=NAV.filter(n=>n[4].includes(user.role));
 return <div className="flex min-h-screen"><aside className={`fixed md:static z-30 inset-y-0 w-56 bg-slate-900 text-slate-300 p-3 space-y-1 transition-transform ${open?'':'-translate-x-full md:translate-x-0'}`}>
  <p className="text-white font-semibold px-2 py-3">RFID RETAIL</p>
  {items.map(([p,n,Ic])=><NavLink key={p} to={p} onClick={()=>setOpen(false)} className={({isActive})=>`flex gap-2 items-center text-sm px-2 py-2 rounded ${isActive?'bg-indigo-600 text-white':'hover:bg-slate-800'}`}><Ic size={16}/>{n}</NavLink>)}
  <button onClick={logout} className="flex gap-2 items-center text-sm px-2 py-2 text-slate-400"><LogOut size={16}/>Logout</button></aside>
  <div className="flex-1 min-w-0"><header className="bg-white border-b p-3 flex items-center gap-3"><button className="md:hidden" onClick={()=>setOpen(!open)}><Menu size={20}/></button><GlobalSearch/><span className="ml-auto text-sm text-slate-500 hidden sm:block">{user.name} · {user.role}</span></header>
   <main className="p-4 md:p-5"><Routes>{items.map(([p,,,C])=><Route key={p} path={p} element={<C user={user}/>}/>)}<Route path="*" element={<Navigate to="/dashboard"/>}/></Routes></main></div></div>;
}

export default function App(){
 const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem('user')||'null'));
 const logout=()=>{localStorage.clear();setUser(null);};
 return <BrowserRouter><Toaster/><Routes><Route path="/login" element={user?<Navigate to="/dashboard"/>:<Login onLogin={setUser}/>}/><Route path="/*" element={user?<Shell user={user} logout={logout}/>:<Navigate to="/login"/>}/></Routes></BrowserRouter>;
}
