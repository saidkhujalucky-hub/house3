import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/[[path]].js';

test('Cloudflare Pages reports configuration error clearly',async()=>{
  const response=await onRequest({request:new Request('https://site.pages.dev/api/auth/register',{method:'POST',body:'{}'}),env:{},params:{path:['auth','register']}});
  assert.equal(response.status,503);
  assert.match((await response.json()).message,/BACKEND_ORIGIN/);
});

test('Cloudflare Pages forwards registration method, JSON body and URL',async()=>{
  const original=globalThis.fetch;
  let called=false;
  globalThis.fetch=async request=>{
    called=true;
    assert.equal(request.url,'https://api.example.test/auth/register');
    assert.equal(request.method,'POST');
    assert.equal(request.headers.get('content-type'),'application/json');
    assert.deepEqual(await request.json(),{fullName:'Test User',email:'test@example.test',password:'strong-password'});
    return Response.json({id:1,email:'test@example.test'},{status:201});
  };
  try{
    const request=new Request('https://site.pages.dev/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({fullName:'Test User',email:'test@example.test',password:'strong-password'})});
    const response=await onRequest({request,env:{BACKEND_ORIGIN:'https://api.example.test'},params:{path:['auth','register']}});
    assert.equal(response.status,201);
    assert.equal((await response.json()).email,'test@example.test');
    assert.ok(called);
  }finally{globalThis.fetch=original;}
});

test('Proxy prevents invalid or insecure backend origins',async()=>{
  const request=new Request('https://site.pages.dev/api/health');
  for(const bad of ['http://api.example.test','https://api.example.test/admin','https://user:pass@api.example.test']){
    const response=await onRequest({request,env:{BACKEND_ORIGIN:bad},params:{path:['health']}});
    assert.equal(response.status,503);
  }
});
