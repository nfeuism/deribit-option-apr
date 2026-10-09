/* Pure calculations. No network, storage, or trading APIs. */
(function(root){
  'use strict';
  const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  function number(v){
    const s=String(v??'').trim().replace(/,/g,'');
    return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)?Number(s):NaN;
  }
  function contract(s){
    const m=String(s).toUpperCase().match(/^(BTC(?:_USDC)?)-(\d{1,2})([A-Z]{3})(\d{2})-(\d+(?:\.\d+)?)-([CP])$/);
    if(!m)throw Error('请选择单个 BTC 或 BTC_USDC 期权合约');
    const month=months.indexOf(m[3]), day=+m[2],year=2000+(+m[4]);
    const expiry=Date.UTC(year,month,day,8);
    if(month<0||new Date(expiry).getUTCDate()!==day||!(+m[5]>0))throw Error('合约日期或行权价无效');
    return {name:m[0],linear:m[1].includes('_USDC'),strike:+m[5],type:m[6],expiry};
  }
  function calculate(x,now=Date.now()){
    const c=contract(x.name),days=(c.expiry-now)/86400000;
    if(!(days>0))throw Error('合约已到期，无法计算年化');
    const q=number(x.quantity),p=number(x.price),s=number(x.index);
    if(!(q>0&&p>0))throw Error('请输入大于 0 的数量和期权价格');
    if(!(s>0))throw Error('未读取到 BTC 指数，请手动填写');
    const unit=x.unit;
    if(!['BTC','USD','USDC'].includes(unit))throw Error('暂不支持此报价单位，请使用限价或美元报价');
    if(c.linear&&unit==='BTC')throw Error('USDC 合约必须使用美元或 USDC 报价');
    // For inverse contracts use BTC; for linear contracts use USDC.
    const nativePrice=c.linear?p:(unit==='BTC'?p:p/s);
    const premium=nativePrice*q;
    const nativeUnit=c.linear?'USDC':'BTC';
    const defaultCapital=c.type==='P'?c.strike*q/(c.linear?1:s):q*(c.linear?s:1);
    const custom=x.capital!==''&&x.capital!=null;
    const capital=custom?number(x.capital):defaultCapital;
    if(!(capital>0))throw Error('自定义本金必须大于 0');
    let fee=null;
    if(x.fee!==''&&x.fee!=null){fee=number(x.fee);if(!Number.isFinite(fee)||fee<0)throw Error('费用必须是非负数');}
    const gross=premium/capital*100;
    return {...c,days,q,price:nativePrice,premium,capital,fee,nativeUnit,custom,gross,apr:gross*365/days,
      net:fee===null?null:(premium-fee)/capital*100,
      netApr:fee===null?null:(premium-fee)/capital*100*365/days};
  }
  const api={number,contract,calculate};root.DeribitAPR=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
