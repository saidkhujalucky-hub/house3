import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/[[path]].js';

function database() {
  const sql=new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../cloudflare/migrations/0001_auth.sql',import.meta.url),'utf8'));
  function prepare(query) {
    let values=[];
    return {bind(...args){values=args;return this;},async first(){return sql.prepare(query).get(...values)||null;},async run(){return sql.prepare(query).run(...values);}};
  }
  return {sql,prepare,async batch(statements){return Promise.all(statements.map(s=>s.run()));}};
}
function call(db,path,method='GET',body,token,extra={}) {
  const headers={...(body!==undefined?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{}),...extra};
  return onRequest({request:new Request('https://house3.pages.dev/api'+path,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})}),env:{DB:db},params:{path:path.slice(1).split('/')}});
}
const account={fullName:'Test User',email:'TEST@example.com',password:'test-password-123'};

test('registration, duplicate email, login, profile, expiry and logout use real SQL',async()=>{
  const db=database();
  try {
    let r=await call(db,'/auth/register','POST',account);assert.equal(r.status,201);
    const user=await r.json();assert.equal(user.role,'USER');assert.equal(user.email,'test@example.com');assert.equal(user.passwordHash,undefined);
    assert.notEqual(db.sql.prepare('SELECT passwordHash FROM cf_users').get().passwordHash,account.password);
    r=await call(db,'/auth/register','POST',{...account,email:'test@example.com'});assert.equal(r.status,409);
    r=await call(db,'/auth/login','POST',{...account,password:'wrong-password'});assert.equal(r.status,401);
    r=await call(db,'/auth/login','POST',account);assert.equal(r.status,200);
    const {accessToken}=await r.json();assert.match(accessToken,/^[a-f0-9]{64}$/);
    assert.notEqual(db.sql.prepare('SELECT tokenHash FROM cf_sessions').get().tokenHash,accessToken);
    r=await call(db,'/auth/me','GET',undefined,accessToken);assert.equal(r.status,200);assert.equal((await r.json()).id,user.id);
    r=await call(db,'/users/me','PATCH',{fullName:'Updated Name',phone:'+998901234567'},accessToken);assert.equal(r.status,200);
    r=await call(db,'/users/me','GET',undefined,accessToken);assert.equal((await r.json()).fullName,'Updated Name');
    r=await call(db,'/users/me','PATCH',{role:'ADMIN'},accessToken);assert.equal(r.status,400);
    r=await call(db,'/auth/logout','POST',undefined,accessToken);assert.equal(r.status,200);
    r=await call(db,'/auth/me','GET',undefined,accessToken);assert.equal(r.status,401);
    r=await call(db,'/auth/login','POST',account);const second=(await r.json()).accessToken;
    db.sql.exec('UPDATE cf_sessions SET expiresAt=0');
    r=await call(db,'/auth/me','GET',undefined,second);assert.equal(r.status,401);
    assert.equal((await call(db,'/health')).status,200);
    assert.equal((await call(db,'/properties')).status,501);
  } finally {db.sql.close();}
});

test('validation, authorization, role injection and SQL injection are handled',async()=>{
  const db=database();
  try {
    for(const body of [{},{...account,email:'bad'}, {...account,password:'short'}, {...account,fullName:' '}, {...account,password:'x'.repeat(129)}]) {
      assert.equal((await call(db,'/auth/register','POST',body)).status,400);
    }
    assert.equal((await call(db,'/auth/me')).status,401);
    assert.equal((await call(db,'/auth/register','GET')).status,405);
    assert.equal((await call(db,'/auth/register','POST',account,undefined,{origin:'https://evil.test'})).status,403);
    const r=await call(db,'/auth/register','POST',{...account,fullName:"Robert'); DROP TABLE cf_users;--",role:'ADMIN'});
    assert.equal(r.status,201);assert.equal((await r.json()).role,'USER');
    assert.equal(db.sql.prepare('SELECT count(*) AS n FROM cf_users').get().n,1);
    const malformed=await onRequest({request:new Request('https://house3.pages.dev/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:'{' }),env:{DB:db},params:{path:['auth','login']}});
    assert.equal(malformed.status,400);
    assert.equal((await call(db,'/auth/register','POST',{...account,fullName:'x'.repeat(9000)})).status,413);
  }finally{db.sql.close();}
});

test('database-backed authentication throttling stops repeated attempts',async()=>{
  const db=database();
  try {
    // Invalid full names count before any expensive password hashing.
    for(let i=0;i<30;i++) assert.equal((await call(db,'/auth/register','POST',{...account,fullName:''})).status,400);
    assert.equal((await call(db,'/auth/register','POST',account)).status,429);
    db.sql.exec('UPDATE cf_auth_limits SET window=0');
    assert.equal((await call(db,'/auth/register','POST',account)).status,201);
  }finally{db.sql.close();}
});

test('missing schema reports a controlled setup error',async()=>{
  const db=database();db.sql.exec('DROP TABLE cf_auth_limits; DROP TABLE cf_sessions; DROP TABLE cf_users;');
  try{assert.equal((await call(db,'/health')).status,503);}finally{db.sql.close();}
});

