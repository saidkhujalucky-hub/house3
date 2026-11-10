// Cloudflare-native authentication. No Node.js server or JWT secret required.
const encoder = new TextEncoder();
const columns = 'id, fullName, email, phone, role, createdAt';
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
const json = (data, status = 200) => Response.json(data, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
const random = length => hex(crypto.getRandomValues(new Uint8Array(length)));
async function digest(value) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
async function derive(password, salt) {
  const key = await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256));
}
async function hashPassword(password) {
  const salt = random(16);
  return 'pbkdf2-sha256$100000$'+salt+'$'+await derive(password,salt);
}
async function verifyPassword(password, stored) {
  const [algorithm, cost, salt, expected] = String(stored).split('$');
  if(algorithm!=='pbkdf2-sha256'||cost!=='100000'||!salt||!expected) return false;
  const actual = await derive(password,salt);
  let diff = actual.length ^ expected.length;
  for(let i=0;i<actual.length;i++) diff |= actual.charCodeAt(i) ^ (expected.charCodeAt(i)||0);
  return diff===0;
}
async function body(request) {
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(415,'Send application/json');
  if(Number(request.headers.get('content-length'))>8192) fail(413,'Request is too large');
  const reader=request.body?.getReader();
  if(!reader) fail(400,'JSON body required');
  let size=0, chunks=[];
  for(;;) {
    const {done,value}=await reader.read(); if(done) break;
    size+=value.byteLength; if(size>8192){await reader.cancel();fail(413,'Request is too large');}
    chunks.push(value);
  }
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{fail(400,'Invalid JSON');}
  if(!data||typeof data!=='object'||Array.isArray(data)) fail(400,'JSON object required');
  return data;
}
function text(value,name,min,max) {
  if(typeof value!=='string') fail(400,name+' is required');
  const result=value.trim();
  if(result.length<min||result.length>max) fail(400,name+' must be '+min+'–'+max+' characters');
  return result;
}
function credentials(data) {
  const email=text(data.email,'Email',3,254).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400,'Invalid email');
  if(typeof data.password!=='string'||data.password.length<8||data.password.length>128) fail(400,'Password must be 8–128 characters');
  return {email,password:data.password};
}
async function currentUser(request,db) {
  const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if(!token) fail(401,'Login required');
  const user=await db.prepare('SELECT u.id,u.fullName,u.email,u.phone,u.role,u.createdAt FROM cf_users u JOIN cf_sessions s ON s.userId=u.id WHERE s.tokenHash=? AND s.expiresAt>?').bind(await digest(token),Date.now()).first();
  if(!user) fail(401,'Invalid or expired token');
  return user;
}
async function throttle(request,db) {
  // Cloudflare sets this header in production; do not trust forwarded-for headers.
  const ip=request.headers.get('cf-connecting-ip')||'local';
  const key=await digest(ip);
  const now=Date.now(), window=Math.floor(now/600000);
  const row=await db.prepare('INSERT INTO cf_auth_limits (key,window,count) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END, window=excluded.window RETURNING count').bind(key,window).first();
  if(row.count>30) fail(429,'Too many authentication attempts. Try again in 10 minutes.');
}
export async function handleCloudflareAuth({request,env,waitUntil}) {
  const path=new URL(request.url).pathname.replace(/^\/api/,'').replace(/\/$/,'');
  if(!env.DB) return json({message:'Connect a Cloudflare D1 database with binding DB and run cloudflare/migrations/0001_auth.sql, or configure BACKEND_ORIGIN.'},503);
  try {
    const db=env.DB, method=request.method;
    if(['POST','PATCH','DELETE'].includes(method)) {
      const origin=request.headers.get('origin');
      if(origin && origin!==new URL(request.url).origin) fail(403,'Cross-origin requests are not allowed');
    }
    if(path==='/health'&&method==='GET') {
      await db.prepare('SELECT id FROM cf_users LIMIT 1').first();
      return json({status:'ok',backend:'cloudflare-d1',capabilities:['register','login','profile']});
    }
    if(['/auth/register','/auth/login'].includes(path)&&method==='POST') {
      const data=await body(request),{email,password}=credentials(data);
      await throttle(request,db);
      if(path==='/auth/register') {
        const fullName=text(data.fullName,'Full name',2,100);
        const phone=data.phone===undefined?'':text(data.phone,'Phone',0,30);
        const passwordHash=await hashPassword(password);
        const user=await db.prepare('INSERT INTO cf_users (fullName,email,passwordHash,phone) VALUES (?,?,?,?) ON CONFLICT(email) DO NOTHING RETURNING '+columns).bind(fullName,email,passwordHash,phone).first();
        if(!user) fail(409,'Email already registered');
        return json(user,201);
      }
      const record=await db.prepare('SELECT * FROM cf_users WHERE email=?').bind(email).first();
      // Perform the KDF even when the account does not exist.
      const valid=await verifyPassword(password,record?.passwordHash||'pbkdf2-sha256$100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000');
      if(!record||!valid) fail(401,'Invalid credentials');
      const accessToken=random(32), expiresAt=Date.now()+7*24*60*60*1000;
      await db.prepare('INSERT INTO cf_sessions (tokenHash,userId,expiresAt) VALUES (?,?,?)').bind(await digest(accessToken),record.id,expiresAt).run();
      const cleanup=db.batch([
        db.prepare('DELETE FROM cf_sessions WHERE expiresAt<?').bind(Date.now()),
        db.prepare('DELETE FROM cf_auth_limits WHERE window<?').bind(Math.floor(Date.now()/600000)-2)
      ]);
      if(waitUntil) waitUntil(cleanup.catch(()=>{})); else await cleanup;
      const {passwordHash,...user}=record;
      return json({accessToken,user,expiresAt});
    }
    if(['/auth/me','/users/me'].includes(path)&&method==='GET') return json(await currentUser(request,db));
    if(path==='/users/me'&&method==='PATCH') {
      const user=await currentUser(request,db), data=await body(request);
      if(Object.keys(data).some(key=>!['fullName','phone'].includes(key))) fail(400,'Only fullName and phone can be updated');
      const fullName=data.fullName===undefined?user.fullName:text(data.fullName,'Full name',2,100);
      const phone=data.phone===undefined?user.phone:text(data.phone,'Phone',0,30);
      return json(await db.prepare('UPDATE cf_users SET fullName=?,phone=? WHERE id=? RETURNING '+columns).bind(fullName,phone,user.id).first());
    }
    if(path==='/auth/logout'&&method==='POST') {
      await currentUser(request,db);
      await db.prepare('DELETE FROM cf_sessions WHERE tokenHash=?').bind(await digest(request.headers.get('authorization').slice(7))).run();
      return json({success:true});
    }
    if(['/auth/register','/auth/login','/auth/me','/users/me','/auth/logout','/health'].includes(path)) return json({message:'Method not allowed'},405);
    return json({message:'This endpoint requires the existing NestJS backend. Cloudflare D1 mode currently supports registration, login and profile only.'},501);
  } catch(error) {
    if(error.status) return json({message:error.message},error.status);
    // Do not disclose SQL, account records or stack traces.
    return json({message:'Authentication database unavailable. Check DB binding and apply cloudflare/migrations/0001_auth.sql.'},503);
  }
}
