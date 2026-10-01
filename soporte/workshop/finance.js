(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TSWorkshopFinance=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const cents=n=>Math.round(Number(n||0)*100);
 const day=timestamp=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp));
 const addDays=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 const monday=date=>{const d=new Date(date+'T12:00:00Z'),wd=d.getUTCDay();return addDays(date,-((wd+6)%7));};
 function summarize(data,from,to){
  const quotes=new Map(data.quotes.map(q=>[q.id,q])),linesByQuote=new Map();
  for(const l of data.lines){if(!linesByQuote.has(l.quote_id))linesByQuote.set(l.quote_id,[]);linesByQuote.get(l.quote_id).push(l);}
  const totals={quoted:0,received:0,labor:0,partRevenue:0,partCost:0,serviceRevenue:0,serviceCost:0},daily=new Map(),details=[];
  const row=date=>{if(!daily.has(date))daily.set(date,{date,quoted:0,received:0,labor:0,partProfit:0,serviceProfit:0});return daily.get(date);};
  for(const q of data.quotes){const date=day(q.quoted_at);if(q.state!=='cancelled'&&date>=from&&date<=to){totals.quoted+=Number(q.total);row(date).quoted+=Number(q.total);}}
  for(const p of data.payments){const date=day(p.paid_at),q=quotes.get(p.quote_id);if(date<from||date>to||!q||q.state==='cancelled')continue;
   const amount=Number(p.amount),ratio=amount/Number(q.total);totals.received+=amount;row(date).received+=amount;
   for(const l of linesByQuote.get(q.id)||[]){const revenue=Number(l.quantity)*Number(l.unit_price)*ratio,cost=Number(l.quantity)*Number(l.unit_cost)*ratio,profit=revenue-cost;
    if(l.kind==='labor'){totals.labor+=revenue;row(date).labor+=revenue;}
    if(l.kind==='part'){totals.partRevenue+=revenue;totals.partCost+=cost;row(date).partProfit+=profit;}
    if(l.kind==='service'){totals.serviceRevenue+=revenue;totals.serviceCost+=cost;row(date).serviceProfit+=profit;}
    details.push({date,payment:p.id,quote:q.id,client:q.client_name,order:q.order_id||'',description:l.description,kind:l.kind,revenue,cost,profit,method:p.method,reference:p.reference});
   }
  }
  const laborCents=cents(totals.labor),company=Math.round(laborCents*.5),freddy=Math.round(laborCents*.25),nelson=laborCents-company-freddy;
  return {...totals,partProfit:totals.partRevenue-totals.partCost,serviceProfit:totals.serviceRevenue-totals.serviceCost,totalProfit:totals.labor+totals.partRevenue-totals.partCost+totals.serviceRevenue-totals.serviceCost,split:{company:company/100,freddy:freddy/100,nelson:nelson/100},daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),details};
 }
 return {day,addDays,monday,summarize,cents};
});
