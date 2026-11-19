import { useState } from 'react';
import { api } from '../lib/api';
import type { Candidate, SearchResult } from '../address-types';

export function AddressFields({value,onChange,onReady,existing=false}:{value:string;onChange:(value:string)=>void;onReady:(ready:boolean)=>void;existing?:boolean}) {
  const [postal,setPostal]=useState(''); const [result,setResult]=useState<SearchResult|null>(null);
  const [selected,setSelected]=useState<Candidate|null>(null); const [unit,setUnit]=useState('');
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [manual,setManual]=useState(false);
  async function search() {
    if (!/^\d{6}$/.test(postal)) {setError('Enter a six-digit Singapore postal code.');return;}
    setBusy(true);setError('');setResult(null);setSelected(null);onReady(false);
    try {const data=await api<SearchResult>(`/addresses/search?postalCode=${postal}`,{timeout:30000});setResult(data);
      if(data.status==='UNAVAILABLE')setError("We couldn't verify your address right now. Please try again or request a manual review.");
    } catch {setError("We couldn't verify your address right now. Please try again or request a manual review.");}
    finally {setBusy(false);}
  }
  function choose(candidate:Candidate) {setSelected(candidate);setManual(false);onChange(candidate.address+(unit?`, Unit ${unit}`:''));onReady(true);}
  return <div className="form-body address-fields">
    {existing && !selected && !manual && <p>Current requested address: <strong>{value}</strong>. Search below if you need to change it.</p>}
    <div className="postal-search"><label>New postal code<input inputMode="numeric" autoComplete="postal-code" maxLength={6} value={postal} onChange={e=>{setPostal(e.target.value.replace(/\D/g,''));setSelected(null);setResult(null);onReady(false);}}/></label><button type="button" className="button secondary" onClick={()=>void search()} disabled={busy}>{busy?'Finding address...':'Find address'}</button></div>
    {error && <p role="status" className="lookup-message">{error}</p>}
    {result && result.candidates.length>0 && <fieldset className="address-choices"><legend>Select your building address</legend>{result.candidates.map(c=><label key={c.id}><input type="radio" name="address-candidate" checked={selected?.id===c.id} onChange={()=>choose(c)}/><span>{c.address}</span></label>)}</fieldset>}
    {result && !result.candidates.length && !error && <p role="status">No address found. Check the postal code or request a manual review.</p>}
    {selected && <><p className="address-confirmed" role="status">Building address found. We will check it again when you submit.</p><label>Unit number (if applicable)<input value={unit} maxLength={30} placeholder="#12-34" onChange={e=>{setUnit(e.target.value);onChange(selected.address+(e.target.value?`, Unit ${e.target.value}`:''));}}/></label><small>The lookup confirms the building address only. It does not verify your unit, identity or occupancy.</small></>}
    {!selected && <button type="button" className="text-button" onClick={()=>{setManual(true);onReady(!!value.trim());}}>Enter address for manual review</button>}
    {manual && <label>Requested address<input required value={value} maxLength={500} onChange={e=>{onChange(e.target.value);onReady(!!e.target.value.trim());}}/><small>This address is unverified. It will require supporting evidence and review.</small></label>}
  </div>;
}
