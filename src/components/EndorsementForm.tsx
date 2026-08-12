"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EndorsementForm({loanId}:{loanId:number}) { const router=useRouter(); const [saving,setSaving]=useState(false); return <form className="mt-4" onSubmit={async(e)=>{e.preventDefault();setSaving(true);const f=new FormData(e.currentTarget);await fetch(`/api/loans/${loanId}/endorse`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({remarks:f.get("remarks")})});setSaving(false);router.refresh();}}><textarea className="input min-h-20" name="remarks" placeholder="Endorsement remarks"/><button className="btn-primary mt-2" disabled={saving}>{saving?"Endorsing...":"Endorse CI/BI"}</button></form> }
