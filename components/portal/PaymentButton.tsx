"use client";
import { CreditCard } from "lucide-react";
import { useState } from "react";
export function PaymentButton({invoiceId}:{invoiceId:string}){const[busy,setBusy]=useState(false);const[error,setError]=useState("");async function pay(){setBusy(true);setError("");const response=await fetch(`/api/invoices/${invoiceId}/checkout`,{method:"POST"});const body=await response.json();if(response.ok&&body.url)location.assign(body.url);else{setError(body.error??"Payment is unavailable");setBusy(false)}}return <span className="pay-wrap"><button className="pay-button" onClick={pay} disabled={busy}><CreditCard/>{busy?"Opening…":"Pay"}</button>{error&&<small className="form-error">{error}</small>}</span>}
