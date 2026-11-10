import { Injectable, Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Headers, UnauthorizedException, ForbiddenException, NotFoundException, BadRequestException, ConflictException, UseInterceptors, UploadedFile, ParseIntPipe } from '@nestjs/common';
import { PrismaClient, Prisma, PropertyStatus, ListingType } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, basename, join } from 'path';
import { mkdirSync, unlinkSync } from 'fs';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsString, IsOptional, MinLength, IsInt, Min, IsNumber, IsIn, IsNotEmpty, MaxLength, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';
import type { Request } from 'express';

@Injectable()
export class DbService extends PrismaClient {
  constructor(){ super(); }
}
class RegisterDto {
  @IsString() @MinLength(2) fullName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsOptional() @IsString() phone?: string;
}
class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}
class ProfileDto {
  @IsOptional() @IsString() @MinLength(2) fullName?: string;
  @IsOptional() @IsString() phone?: string;
}
class CategoryDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() slug!: string;
}
class EditCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() slug?: string;
}
class PropertyDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() description!: string;
  @Type(()=>Number) @IsNumber() @Min(0.01) price!: number;
  @IsOptional() @IsString() currency?: string;
  @IsIn(['SALE','RENT']) listingType!: ListingType;
  @IsString() @IsNotEmpty() address!: string;
  @IsString() @IsNotEmpty() city!: string;
  @Type(()=>Number) @IsNumber() @Min(0.01) area!: number;
  @Type(()=>Number) @IsInt() @Min(1) rooms!: number;
  @Type(()=>Number) @IsInt() @Min(1) bathrooms!: number;
  @Type(()=>Number) @IsInt() @Min(1) categoryId!: number;
}
class EditPropertyDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsString() @IsNotEmpty() description?: string;
  @IsOptional() @Type(()=>Number) @IsNumber() @Min(0.01) price?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsIn(['SALE','RENT']) listingType?: ListingType;
  @IsOptional() @IsString() @IsNotEmpty() address?: string;
  @IsOptional() @IsString() @IsNotEmpty() city?: string;
  @IsOptional() @Type(()=>Number) @IsNumber() @Min(0.01) area?: number;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) rooms?: number;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) bathrooms?: number;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) categoryId?: number;
}
class PropertyQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsIn(['SALE','RENT']) type?: ListingType;
  @IsOptional() @Type(()=>Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(()=>Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) rooms?: number;
  @IsOptional() @IsIn(['asc','desc','price_asc','price_desc','newest','oldest']) sort?: string;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) limit?: number;
}
class InquiryDto {
  @IsString() @MinLength(1) @MaxLength(2000) message!: string;
  @IsOptional() @IsString() phone?: string;
}
class StatusDto {
  @IsIn(['APPROVED','REJECTED']) status!: 'APPROVED'|'REJECTED';
}
@Injectable()
export class AuthService {
  constructor(private readonly db: DbService, private readonly jwt: JwtService){}
  async user(header?: string, admin=false) {
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Login required');
    let payload: {sub:number};
    try { payload=await this.jwt.verifyAsync(header.slice(7)); }
    catch { throw new UnauthorizedException('Invalid or expired token'); }
    const user=await this.db.user.findUnique({where:{id:payload.sub},select:{id:true,email:true,fullName:true,phone:true,role:true,createdAt:true}});
    if(!user) throw new UnauthorizedException();
    if(admin && user.role!=='ADMIN') throw new ForbiddenException('Admin only');
    return user;
  }
  async register(d:RegisterDto){
    const exists=await this.db.user.findUnique({where:{email:d.email.toLowerCase()}});
    if(exists) throw new ConflictException('Email already registered');
    return this.db.user.create({data:{fullName:d.fullName,email:d.email.toLowerCase(),passwordHash:await bcrypt.hash(d.password,12),phone:d.phone},select:{id:true,fullName:true,email:true,phone:true,role:true}});
  }
  async login(d:LoginDto){
    const u=await this.db.user.findUnique({where:{email:d.email.toLowerCase()}});
    if(!u || !(await bcrypt.compare(d.password,u.passwordHash))) throw new UnauthorizedException('Invalid credentials');
    return {accessToken:await this.jwt.signAsync({sub:u.id,role:u.role}),user:{id:u.id,fullName:u.fullName,email:u.email,phone:u.phone,role:u.role}};
  }
}
@Controller('auth')
export class AuthController {
  constructor(private readonly auth:AuthService){}
  @Post('register') register(@Body() dto:RegisterDto){return this.auth.register(dto)}
  @Post('login') login(@Body() dto:LoginDto){return this.auth.login(dto)}
  @Get('me') me(@Headers('authorization') token?:string){return this.auth.user(token)}
}
@Controller('users')
export class UsersController {
  constructor(private readonly auth:AuthService,private readonly db:DbService){}
  @Get('me') me(@Headers('authorization') token?:string){return this.auth.user(token)}
  @Patch('me') async update(@Headers('authorization') token:string,@Body() dto:ProfileDto){
    const u=await this.auth.user(token);
    return this.db.user.update({where:{id:u.id},data:dto,select:{id:true,fullName:true,email:true,phone:true,role:true}});
  }
}
@Controller('categories')
export class CategoriesController {
  constructor(private readonly db:DbService,private readonly auth:AuthService){}
  @Get() list(){return this.db.category.findMany({orderBy:{name:'asc'}})}
  @Post() async create(@Headers('authorization') token:string,@Body() d:CategoryDto){
    await this.auth.user(token,true);
    if(await this.db.category.findUnique({where:{slug:d.slug}})) throw new ConflictException('Slug exists');
    return this.db.category.create({data:d});
  }
  @Patch(':id') async patch(@Headers('authorization') token:string,@Param('id',ParseIntPipe) id:number,@Body() d:EditCategoryDto){
    await this.auth.user(token,true);await requireEntity(this.db.category.findUnique({where:{id}}));
    return this.db.category.update({where:{id},data:d});
  }
  @Delete(':id') async remove(@Headers('authorization') token:string,@Param('id',ParseIntPipe) id:number){
    await this.auth.user(token,true); await requireEntity(this.db.category.findUnique({where:{id}}));
    if(await this.db.property.count({where:{categoryId:id}})) throw new ConflictException('Category has properties');
    await this.db.category.delete({where:{id}});return {success:true};
  }
}
async function requireEntity<T>(p:Promise<T|null>):Promise<T> {
  const item=await p;if(!item) throw new NotFoundException('Not found');return item;
}
const propertyInclude={images:{orderBy:{sortOrder:'asc' as const}},seller:{select:{id:true,fullName:true,phone:true,email:true}},category:true};
@Injectable()
export class PropertiesService {
  constructor(private readonly db:DbService){}
  async list(q:PropertyQueryDto,adminStatus?:PropertyStatus){
    const page=q.page??1,limit=Math.min(q.limit??12,50);
    if(q.minPrice!==undefined && q.maxPrice!==undefined && q.minPrice>q.maxPrice) throw new BadRequestException('minPrice must be <= maxPrice');
    const where:Prisma.PropertyWhereInput={
      status:adminStatus??'APPROVED',
      ...(q.search?{OR:[{title:{contains:q.search,mode:'insensitive'}},{description:{contains:q.search,mode:'insensitive'}},{address:{contains:q.search,mode:'insensitive'}}]}:{}),
      ...(q.city?{city:{contains:q.city,mode:'insensitive'}}:{}),
      ...(q.category?{category:{slug:q.category}}:{}),
      ...(q.type?{listingType:q.type}:{}),
      ...(q.rooms?{rooms:{gte:q.rooms}}:{}),
      price:{...(q.minPrice!==undefined?{gte:q.minPrice}:{}),...(q.maxPrice!==undefined?{lte:q.maxPrice}:{})}
    };
    const orderBy:Prisma.PropertyOrderByWithRelationInput=q.sort==='asc'||q.sort==='price_asc'?{price:'asc'}:q.sort==='desc'||q.sort==='price_desc'?{price:'desc'}:q.sort==='oldest'?{createdAt:'asc'}:{createdAt:'desc'};
    const [data,total]=await this.db.$transaction([
      this.db.property.findMany({where,orderBy,skip:(page-1)*limit,take:limit,include:propertyInclude}),
      this.db.property.count({where})
    ]);
    return {data,meta:{total,page,limit,totalPages:Math.ceil(total/limit)}};
  }
}
@Controller('properties')
export class PropertiesController {
  constructor(private readonly db:DbService,private readonly auth:AuthService,private readonly service:PropertiesService){}
  @Get() list(@Query() q:PropertyQueryDto){return this.service.list(q)}
  @Get('my') async mine(@Headers('authorization') token:string){
    const u=await this.auth.user(token);return this.db.property.findMany({where:{sellerId:u.id},include:propertyInclude,orderBy:{createdAt:'desc'}});
  }
  @Get(':id') async detail(@Param('id',ParseIntPipe) id:number){
    return requireEntity(this.db.property.findFirst({where:{id,status:'APPROVED'},include:propertyInclude}));
  }
  @Post() async create(@Headers('authorization') token:string,@Body() d:PropertyDto){
    const u=await this.auth.user(token);
    await requireEntity(this.db.category.findUnique({where:{id:d.categoryId}}));
    return this.db.property.create({data:{...d,sellerId:u.id,status:'PENDING'},include:propertyInclude});
  }
  @Patch(':id') async patch(@Headers('authorization') token:string,@Param('id',ParseIntPipe) id:number,@Body() d:EditPropertyDto){
    const u=await this.auth.user(token);await this.owned(id,u.id);
    if(d.categoryId) await requireEntity(this.db.category.findUnique({where:{id:d.categoryId}}));
    return this.db.property.update({where:{id},data:{...d,status:'PENDING'},include:propertyInclude});
  }
  @Delete(':id') async remove(@Headers('authorization') token:string,@Param('id',ParseIntPipe) id:number){
    const u=await this.auth.user(token);await this.owned(id,u.id);
    await this.db.property.delete({where:{id}});return {success:true};
  }
  async owned(id:number,userId:number){
    const p=await requireEntity(this.db.property.findUnique({where:{id}}));
    if(p.sellerId!==userId) throw new ForbiddenException('Not your listing');
    return p;
  }
  @Post(':id/images')
  @UseInterceptors(FileInterceptor('image',{
    storage:diskStorage({destination:(_req,_file,cb)=>{const dir=join(process.cwd(),'uploads');mkdirSync(dir,{recursive:true});cb(null,dir)},filename:(_req,file,cb)=>cb(null,Date.now()+'-'+Math.random().toString(36).slice(2)+extname(file.originalname).toLowerCase())}),
    limits:{fileSize:5*1024*1024},
    fileFilter:(_req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))
  }))
  async image(@Headers('authorization') token:string,@Param('id',ParseIntPipe) id:number,@UploadedFile() file:Express.Multer.File){
    if(!file) throw new BadRequestException('JPEG, PNG or WebP image required');
    try {
      const u=await this.auth.user(token);await this.owned(id,u.id);
      const url=(process.env.PUBLIC_API_URL||'http://localhost:3000').replace(/\/$/,'')+'/uploads/'+file.filename;
      return await this.db.propertyImage.create({data:{propertyId:id,url,sortOrder:await this.db.propertyImage.count({where:{propertyId:id}})}});
    } catch(e){try{unlinkSync(file.path)}catch{} throw e;}
  }
  @Delete(':id/images/:imageId') async removeImage(@Headers('authorization') token:string,@Param('id',ParseIntPipe) id:number,@Param('imageId',ParseIntPipe) imageId:number){
    const u=await this.auth.user(token);await this.owned(id,u.id);
    const img=await requireEntity(this.db.propertyImage.findFirst({where:{id:imageId,propertyId:id}}));
    await this.db.propertyImage.delete({where:{id:imageId}});
    try{unlinkSync(join(process.cwd(),'uploads',basename(new URL(img.url).pathname)))}catch{}
    return {success:true};
  }
}
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly db:DbService,private readonly auth:AuthService){}
  @Get() async list(@Headers('authorization') token:string){
    const u=await this.auth.user(token);return this.db.favorite.findMany({where:{userId:u.id},include:{property:{include:propertyInclude}}});
  }
  @Post(':propertyId') async add(@Headers('authorization') token:string,@Param('propertyId',ParseIntPipe) propertyId:number){
    const u=await this.auth.user(token);
    await requireEntity(this.db.property.findFirst({where:{id:propertyId,status:'APPROVED'}}));
    return this.db.favorite.upsert({where:{userId_propertyId:{userId:u.id,propertyId}},update:{},create:{userId:u.id,propertyId}});
  }
  @Delete(':propertyId') async remove(@Headers('authorization') token:string,@Param('propertyId',ParseIntPipe) propertyId:number){
    const u=await this.auth.user(token);await this.db.favorite.deleteMany({where:{userId:u.id,propertyId}});return {success:true};
  }
}
@Controller()
export class InquiriesController {
  constructor(private readonly db:DbService,private readonly auth:AuthService){}
  @Post('properties/:propertyId/inquiries') async send(@Headers('authorization') token:string,@Param('propertyId',ParseIntPipe) propertyId:number,@Body() d:InquiryDto){
    const u=await this.auth.user(token);
    const p=await requireEntity(this.db.property.findFirst({where:{id:propertyId,status:'APPROVED'}}));
    if(p.sellerId===u.id) throw new BadRequestException('Cannot inquire about your own listing');
    return this.db.inquiry.create({data:{...d,propertyId,senderId:u.id}});
  }
  @Get('inquiries/my') async mine(@Headers('authorization') token:string){
    const u=await this.auth.user(token);
    return this.db.inquiry.findMany({where:{senderId:u.id},include:{property:{select:{id:true,title:true,city:true}}},orderBy:{createdAt:'desc'}});
  }
}
@Controller('admin')
export class AdminController {
  constructor(private readonly db:DbService,private readonly auth:AuthService){}
  @Get('properties') async listings(@Headers('authorization') token:string,@Query('status') status?:string){
    await this.auth.user(token,true);
    if(status&&!['PENDING','APPROVED','REJECTED'].includes(status)) throw new BadRequestException('Invalid status');
    return this.db.property.findMany({where:status?{status:status as PropertyStatus}:{},include:propertyInclude,orderBy:{createdAt:'desc'}});
  }
  @Patch('properties/:id/status') async moderate(@Headers('authorization') token:string,@Param('id',ParseIntPipe) id:number,@Body() d:StatusDto){
    await this.auth.user(token,true);await requireEntity(this.db.property.findUnique({where:{id}}));
    return this.db.property.update({where:{id},data:{status:d.status},include:propertyInclude});
  }
  @Get('users') async users(@Headers('authorization') token:string){
    await this.auth.user(token,true);
    return this.db.user.findMany({select:{id:true,fullName:true,email:true,phone:true,role:true,createdAt:true},orderBy:{createdAt:'desc'}});
  }
}
