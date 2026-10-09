(() => {
'use strict';
if(document.querySelector('[data-deribit-apr]'))return;
const C=globalThis.DeribitAPR,A=globalThis.DeribitAPRAdapter;
let panel=null,dialog=null,mode='auto',lastName='',lastData=null,lastSignature='',dirtyAt=0,dialogKey='';
const host=document.createElement('div');host.dataset.deribitApr='1';
host.style.cssText='display:block;width:100%;min-width:0;margin:10px 0;position:relative;z-index:1';
const shadow=host.attachShadow({mode:'open'});
shadow.innerHTML=`<style>
:host{color-scheme:dark}*{box-sizing:border-box}section{font:12px/1.45 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#e8edf5;background:#18212b;border:1px solid #3b4b60;border-radius:8px;padding:10px;min-width:0}header{display:flex;justify-content:space-between;align-items:center;gap:6px}b{font-size:12px}button,select,input{font:inherit;color:#e8edf5;background:#101720;border:1px solid #50617a;border-radius:4px;padding:5px;min-width:0}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid #a9c9ff;outline-offset:2px}.rates{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:9px 0 5px}.rates span{display:block;color:#b5c3d5;font-size:11px}.rates strong{font:600 24px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;color:#e0edff}.rates div+div{border-left:1px solid #3b4b60;padding-left:10px}#status{font-size:11px;color:#b5c3d5;overflow-wrap:anywhere}summary{cursor:pointer;color:#c7d6ed;margin-top:7px}.row{display:flex;justify-content:space-between;gap:8px;margin:5px 0}.row span:last-child{text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}label{display:block;margin:7px 0;color:#c4d1e2}input,select{width:100%;margin-top:3px}p{color:#aebdd0;font-size:11px;margin:8px 0 0}.error{color:#ffd396!important}.manual{display:none}.manual.on{display:block}#name{font-size:11px;overflow-wrap:anywhere;margin-bottom:7px}#basis{font-size:11px;color:#c4d1e2;margin-top:6px}
</style><section aria-label="卖出权利金年化计算器">
<header><b>卖出权利金 · APR</b><button id="mode" type="button">手动修正</button></header>
<div class="rates"><div><span>未扣费年化</span><strong id="gross">—</strong></div><div><span>扣开仓费年化</span><strong id="net">—</strong></div></div>
<div id="status" role="status">等待期权输入</div>
<details><summary>本金、费用与计算明细</summary><div id="name"></div>
<div class="row"><span>预计权利金</span><span id="premium">—</span></div>
<div class="row"><span>计算本金</span><span id="capitalValue">—</span></div>
<div class="row"><span>本期未扣费收益率</span><span id="period">—</span></div>
<div class="row"><span>开仓费 / 来源</span><span id="feeValue">—</span></div>
<div class="row"><span>到期（北京时间）</span><span id="expiry">—</span></div>
<div id="basis"></div>
<label>自定义本金（结算币种；留空用足额本金）<input id="capital" inputmode="decimal" placeholder="自动按持币数量或行权价计算"></label>
<label>自定义开仓总费用（结算币种；留空读取页面）<input id="fee" inputmode="decimal" placeholder="无法读取时只显示未扣费年化"></label>
<div class="manual" id="manual">
<label>合约代码<input id="instrument" placeholder="BTC-30OCT26-62000-P"></label>
<label>数量（BTC 数量）<input id="quantity" inputmode="decimal"></label>
<label>每 BTC 的期权价格<input id="price" inputmode="decimal"></label>
<label>价格单位<select id="unit"><option>BTC</option><option>USD</option><option>USDC</option></select></label>
<label>BTC 指数（美元）<input id="index" inputmode="decimal"></label>
</div>
<p>APR = 权利金 ÷ 本金 × 365 ÷ 剩余天数；扣费口径减去开仓费。按输入价格成交假设，不是已实现收益；不含交割、平仓费用及结算损失。币本位看跌的美元本金仅供比较，不保证免于强平。</p>
</details></section>`;
const $=id=>shadow.getElementById(id);
const set=(id,t)=>{if($(id).textContent!==t)$(id).textContent=t;};
const fmt=(v,d=8)=>v.toLocaleString('en-US',{maximumFractionDigits:d});
function error(msg){set('gross','—');set('net','—');set('status',msg);$('status').classList.add('error');for(const k of ['premium','capitalValue','period','feeValue','expiry','name','basis'])set(k,'—');}
function refresh(force=false){
  if(!dialog?.isConnected)return;
  try{
    let data;
    if(mode==='auto'){
      data=A.read(dialog,location.href);
      if(lastName&&lastName!==data.name){$('capital').value='';$('fee').value='';lastData=null;}
      lastName=data.name;lastData=data;
    }else data={name:$('instrument').value.trim(),quantity:$('quantity').value,price:$('price').value,unit:$('unit').value,index:$('index').value,fee:''};
    data={...data,capital:$('capital').value,fee:$('fee').value!==''?$('fee').value:data.fee};
    const sig=JSON.stringify(data,(k,v)=>k==='anchor'?undefined:v)+Math.floor(Date.now()/60000);
    if(!force&&sig===lastSignature)return;lastSignature=sig;
    const r=C.calculate(data);const u=r.nativeUnit;
    set('gross',fmt(r.apr,2)+'%');
    // Allow the site's fee estimate to catch up with an input update.
    const waiting=mode==='auto'&&Date.now()-dirtyAt<650&&$('fee').value==='';
    set('net',waiting||r.netApr===null?'—':fmt(r.netApr,2)+'%');
    $('status').classList.remove('error');
    set('status',`${mode==='auto'?'跟随下单框':'手动数据，不跟随下单框'} · 剩余 ${fmt(r.days,2)} 天${waiting?' · 费用更新中':r.fee===null?' · 费用未读取':''}`);
    set('name',r.name);set('premium',fmt(r.premium)+' '+u);set('capitalValue',fmt(r.capital)+' '+u);
    set('period',fmt(r.gross,4)+'%');
    set('feeValue',r.fee===null?'未读取':fmt(r.fee)+' '+u+' / '+($('fee').value!==''?'手填':'页面估算'));
    set('expiry',new Date(r.expiry).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}));
    set('basis',r.custom?`自定义本金，单位 ${u}`:r.type==='P'?`足额本金：${fmt(r.strike,2)} × ${fmt(r.q)} = ${fmt(r.strike*r.q,2)} ${r.linear?'USDC':'USD；按当前指数折算为 BTC'}`:r.linear?`持币本金：${fmt(r.q)} BTC 按当前指数折算为 USDC`:`持币本金：${fmt(r.q)} BTC`);
    if(waiting)setTimeout(()=>{lastSignature='';refresh();},700);
  }catch(e){lastSignature='';if(mode==='auto')lastData=null;error(e.message);}
}
$('mode').addEventListener('click',()=>{
  if(mode==='auto'){
    mode='manual';$('manual').classList.add('on');shadow.querySelector('details').open=true;$('mode').textContent='恢复自动';
    if(lastData){for(const [id,key] of [['instrument','name'],['quantity','quantity'],['price','price'],['unit','unit'],['index','index']])$(id).value=lastData[key];}
  }else{mode='auto';$('manual').classList.remove('on');$('mode').textContent='手动修正';$('capital').value='';$('fee').value='';}
  lastSignature='';refresh(true);
});
shadow.addEventListener('input',()=>refresh(true));shadow.addEventListener('change',()=>refresh(true));
document.addEventListener('input',e=>{if(dialog?.contains(e.target)&&e.target.matches('input[data-id]')){dirtyAt=Date.now();refresh(true);}},true);
function tick(){
 const candidates=[...document.querySelectorAll('[role="dialog"]')].filter(d=>A.visible(d)&&d.querySelector('input[data-id="amountInput"]'));
 if(candidates.length!==1){host.remove();dialog=null;lastData=null;lastName='';lastSignature='';return;}
 const next=candidates[0];
 const nextKey=[...next.querySelectorAll('[role="combobox"]')].slice(0,3).map(e=>e.textContent).join('|');
 if(next!==dialog||nextKey!==dialogKey){dialog=next;dialogKey=nextKey;lastName='';lastData=null;mode='auto';$('manual').classList.remove('on');$('mode').textContent='手动修正';$('capital').value='';$('fee').value='';lastSignature='';}
 const a=dialog.querySelector('input[data-id="amountInput"]');const anchor=a.closest('.MuiFormControl-root')||a.parentElement;
 if(!host.isConnected||!dialog.contains(host))anchor.insertAdjacentElement('afterend',host);
 refresh();
}
// Polling also catches React property-only changes, programmatic quotes, and SPA navigation.
setInterval(tick,500);tick();
})();
