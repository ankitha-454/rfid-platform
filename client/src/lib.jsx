import {useState,useEffect,useCallback} from 'react';
import axios from 'axios';
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api'});
api.interceptors.request.use(c=>{const t=localStorage.getItem('token');if(t)c.headers.Authorization='Bearer '+t;return c;});
api.interceptors.response.use(r=>r,e=>{if(e.response?.status===401&&!e.config.url.includes('/auth/login')){localStorage.clear();location.assign('/login');}return Promise.reject(e);}); // expired JWT
export const msg=e=>e.response?.data?.message||'Request failed';
const COL={SUCCESS:'bg-green-100 text-green-700',WARNING:'bg-amber-100 text-amber-700',AVAILABLE:'bg-green-100 text-green-700',ACTIVE:'bg-green-100 text-green-700',SOLD:'bg-slate-200 text-slate-700',IN_TRANSIT:'bg-blue-100 text-blue-700',CRITICAL:'bg-red-100 text-red-700',HIGH:'bg-orange-100 text-orange-700',MEDIUM:'bg-amber-100 text-amber-700',MISPLACED_ITEM:'bg-amber-100 text-amber-700',ITEM_SOLD:'bg-slate-200 text-slate-700',ITEM_RECEIVED:'bg-blue-100 text-blue-700',RESOLVED:'bg-green-100 text-green-700',NEW:'bg-red-100 text-red-700',ONLINE:'bg-green-100 text-green-700',OFFLINE:'bg-red-100 text-red-700'};
export const Badge=({v})=><span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${COL[v]||'bg-slate-100 text-slate-600'}`}>{v}</span>;
export const Card=({title,children,className=''})=><div className={`bg-white border border-slate-200 rounded-lg p-4 ${className}`}>{title&&<h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>}{children}</div>;
export const fmt=d=>d?new Date(d).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'-';
export const toast=(m,ok=true)=>window.dispatchEvent(new CustomEvent('toast',{detail:{m,ok}}));
export function Toaster(){const [l,setL]=useState([]);
 useEffect(()=>{const f=e=>{const id=Math.random();setL(x=>[...x,{...e.detail,id}]);setTimeout(()=>setL(x=>x.filter(t=>t.id!==id)),3500);};window.addEventListener('toast',f);return()=>window.removeEventListener('toast',f);},[]);
 return <div className="fixed bottom-4 right-4 space-y-2 z-50">{l.map(t=><div key={t.id} className={`px-4 py-2 rounded shadow text-sm text-white ${t.ok?'bg-green-600':'bg-red-600'}`}>{t.ok?'✓':'✕'} {t.m}</div>)}</div>;}
export function useFetch(url,params){const [d,setD]=useState(null),[e,setE]=useState(null),k=JSON.stringify(params);
 const load=useCallback(()=>{setE(null);api.get(url,{params}).then(r=>setD(r.data)).catch(x=>setE(msg(x)));},[url,k]); // eslint-disable-line
 useEffect(()=>{load();},[load]);return {d,e,load};}
export const Load=({d,e,retry,what='data',children})=>e?<Card><p className="text-red-600 text-sm">Unable to load {what}. {e}</p>{retry&&<button className="mt-2 text-sm text-indigo-600" onClick={retry}>Retry</button>}</Card>
 :!d?<div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-10 bg-slate-200 rounded animate-pulse"/>)}<p className="text-xs text-slate-400">Loading {what}...</p></div>:children;
export const Empty=({text})=><p className="text-sm text-slate-500 p-6 text-center">{text}</p>;
