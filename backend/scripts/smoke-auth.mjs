// Smoke test for real NestJS + Postgres registration. Execute against a TEST database only.
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3000';
async function req(path,body,token,method){
  const response=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
  const data=await response.json().catch(()=>null);
  return {status:response.status,data};
}
let ready=false;
for(let i=0;i<45;i++){
  try{const r=await req('/health');if(r.status===200 && r.data?.status==='ok'){ready=true;break;}}catch{}
  await setTimeout(1000);
}
assert.ok(ready,'/health should return 200 once database is ready');
const email='smoke.'+Date.now()+'@example.invalid';
const password='Test-only-password-123!';
const user={fullName:'Smoke Test User',email,password};
let r=await req('/auth/register',user);
assert.equal(r.status,201,'register must create an account');
assert.equal(r.data.email,email);
assert.equal(r.data.passwordHash,undefined,'password hash must not be exposed');
r=await req('/auth/register',user);
assert.equal(r.status,409,'duplicate registration must be rejected');
r=await req('/auth/login',{email,password:'incorrect-password'});
assert.equal(r.status,401,'wrong password should fail');
r=await req('/auth/login',{email,password});
assert.equal(r.status,201,'valid login should succeed');
assert.ok(typeof r.data.accessToken==='string' && r.data.accessToken.length>20,'JWT missing');
const token=r.data.accessToken;
r=await req('/auth/me',undefined,token);
assert.equal(r.status,200,'authenticated /auth/me should work');
assert.equal(r.data.email,email);
r=await req('/users/me',{fullName:'Updated User'},token,'PATCH');
assert.equal(r.status,200,'profile PATCH should work');
assert.equal(r.data.fullName,'Updated User');
r=await req('/properties?search=house&minPrice=10&sort=price_asc&page=1&limit=5');
assert.equal(r.status,200,'Prisma property queries should work');
assert.ok(Array.isArray(r.data?.data) && typeof r.data?.meta?.total==='number','listing pagination response invalid');
console.log('SUCCESS: register, duplicate, login, invalid login, JWT, profile and Prisma list all passed');
