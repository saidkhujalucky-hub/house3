// Assemble a public-only directory for Cloudflare Pages.
import { readdirSync, statSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
const root=process.cwd(),out=join(root,'dist-pages');
rmSync(out,{recursive:true,force:true});
mkdirSync(out,{recursive:true});
const exclude=new Set(['backend','functions','scripts','node_modules','dist-pages','.git','.github','.vscode','tests','coverage']);
const assetDirs=new Set(['assets','textures','models','images','static','public','3d']);
const allowed=new Set(['.html','.htm','.css','.js','.mjs','.json','.svg','.ico','.webmanifest','.png','.jpg','.jpeg','.webp','.avif','.gif','.glb','.gltf','.bin','.wasm','.mp3','.ogg','.wav','.woff','.woff2','.ttf','.txt','.obj','.mtl']);
for(const entry of readdirSync(root)){
  if(exclude.has(entry)||entry.startsWith('.')||entry==='package.json'||entry==='package-lock.json'||entry.toLowerCase().startsWith('readme')||entry==='server.mjs')continue;
  const src=join(root,entry),dest=join(out,entry);
  if(statSync(src).isDirectory()){
    if(assetDirs.has(entry))cpSync(src,dest,{recursive:true});
  } else if(allowed.has(extname(entry).toLowerCase())) {
    cpSync(src,dest);
  }
}
if(!readdirSync(out).includes('index.html'))throw new Error('index.html missing from Cloudflare Pages output');
console.log('Cloudflare Pages output: dist-pages/');
