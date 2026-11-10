import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const db=new PrismaClient();
async function main(){
  const categories=[['Kvartira','apartment'],['Uy','house'],['Villa','villa'],['Tijorat','commercial']];
  for(const [name,slug] of categories) await db.category.upsert({where:{slug},update:{name},create:{name,slug}});
  if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){
    if(process.env.ADMIN_PASSWORD.length<12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
    await db.user.upsert({where:{email:process.env.ADMIN_EMAIL.toLowerCase()},update:{role:'ADMIN'},create:{email:process.env.ADMIN_EMAIL.toLowerCase(),fullName:'Marketplace Admin',passwordHash:await bcrypt.hash(process.env.ADMIN_PASSWORD,12),role:'ADMIN'}});
  }
  if(process.env.DEMO_SEED==='true'){
    if(!process.env.DEMO_SELLER_PASSWORD||process.env.DEMO_SELLER_PASSWORD.length<8) throw new Error('Set DEMO_SELLER_PASSWORD with at least 8 characters');
    const sellers=[];
    for(let i=1;i<=2;i++){
      const email='demo-seller-'+i+'@example.invalid';
      sellers.push(await db.user.upsert({where:{email},update:{},create:{email,fullName:'Demo Seller '+i,passwordHash:await bcrypt.hash(process.env.DEMO_SELLER_PASSWORD,12)}}));
    }
    const cats=await db.category.findMany({orderBy:{id:'asc'}});
    for(let i=0;i<8;i++){
      const title='Demo property '+(i+1);
      const exists=await db.property.findFirst({where:{title,sellerId:sellers[i%2].id}});
      if(!exists)await db.property.create({data:{title,description:'Demo listing for testing. No real property is being offered.',price:50000+i*10000,currency:'USD',listingType:i%2?'RENT':'SALE',status:'APPROVED',address:'Demo address '+(i+1),city:'Tashkent',area:50+i*10,rooms:2+i%3,bathrooms:1,sellerId:sellers[i%2].id,categoryId:cats[i%cats.length].id}});
    }
  }
}
main().finally(()=>db.$disconnect()).catch(e=>{console.error(e);process.exitCode=1});
