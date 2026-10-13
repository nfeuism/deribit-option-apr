const assert=require('node:assert/strict');
require('../adapter.js');
const parse=globalThis.DeribitAPRAdapter.parseSide;
for(const s of ['看涨','看涨期权',' Call ','CALL'])assert.equal(parse(s),'C',s);
for(const s of ['看跌','看跌期权',' Put ','put'])assert.equal(parse(s),'P',s);
for(const s of ['','看涨期货','平值'])assert.equal(parse(s),null,s);
console.log('11 option-side parsing assertions passed');
