(function(root){
'use strict';
const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
function read(dialog,url){
  const text=dialog.innerText;
  const combos=[...dialog.querySelectorAll('[role="combobox"]')].map(e=>e.innerText.trim());
  const base=combos.find(s=>/^BTC(?:_USDC)?-\d{1,2}[A-Z]{3}\d{2}$/.test(s));
  const start=combos.indexOf(base);
  const strike=combos[start+1]?.replace(/,/g,'');
  const side=combos[start+2];
  const type=/^(看涨|Call)$/i.test(side)?'C':/^(看跌|Put)$/i.test(side)?'P':null;
  const name=base&&/^\d+(\.\d+)?$/.test(strike)&&type?`${base}-${strike}-${type}`:null;
  if(!name)throw Error('未能确认下单框合约，请使用手动模式');
  const path=decodeURIComponent(new URL(url).pathname).split('/').pop();
  if(/^BTC(?:_USDC)?-\d+[A-Z]{3}\d{2}-\d+(\.\d+)?-[CP]$/.test(path)&&path!==name)throw Error('正在切换合约，等待页面更新');
  const amount=dialog.querySelector('input[data-id="amountInput"]');
  const prices=[...dialog.querySelectorAll('input[data-id="priceInput"]')].filter(e=>!e.disabled&&visible(e));
  if(!amount||prices.length!==1)throw Error('无法唯一确认价格和数量，请使用手动模式');
  const price=prices[0],unit=price.parentElement.querySelector('button')?.textContent.trim();
  if(!['BTC','USD','USDC'].includes(unit))throw Error('IV 报价不直接计算年化，请切换限价或美元报价');
  // Confirm quantity is base BTC, or one contract equals exactly one BTC.
  const amountText=amount.parentElement.parentElement.innerText;
  const isOne=/1\s*=\s*1\s*BTC/.test(amountText)||/(?:合约大小|Contract Size)\s*BTC\s*1(?:\s|$)/i.test(text);
  const baseAmount=/^BTC$/.test(amount.parentElement.querySelector('.MuiInputAdornment-root')?.innerText.trim()||'');
  if(!isOne&&!baseAmount)throw Error('未能确认每份合约的 BTC 数量，请手动填写 BTC 数量');
  const indexMatch=text.match(/(?:^|\n)\s*(?:指数|Index)\s*\n\s*\$?\s*([\d,]+(?:\.\d+)?)/i);
  const feeMatch=text.match(/(?:^|\n)\s*(?:Fee|手续费)\s*\n\s*([\d,]+(?:\.\d+)?)(?:\s|$)/i);
  return {name,quantity:amount.value,price:price.value,unit,index:indexMatch?.[1]||'',fee:feeMatch?.[1]||'',capital:'',anchor:amount.closest('.MuiFormControl-root')||amount.parentElement.parentElement};
}
root.DeribitAPRAdapter={read,visible};
})(globalThis);
