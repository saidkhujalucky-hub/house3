import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, ParseIntPipe, Post, Query, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, resolve } from 'node:path';
import type { Response } from 'express';
import { ListingType, PropertyStatus, Prisma } from '@prisma/client';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';

class CreatePropertyDto {
  @IsString() @MinLength(5) @MaxLength(140) title!: string;
  @IsString() @MinLength(20) @MaxLength(5000) description!: string;
  @Type(() => Number) @IsNumber() @Min(1) price!: number;
  @IsEnum(ListingType) listingType!: ListingType;
  @IsString() @MinLength(3) @MaxLength(240) address!: string;
  @IsString() @MinLength(2) @MaxLength(100) city!: string;
  @Type(() => Number) @IsNumber() @Min(1) area!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(100) rooms!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(100) bathrooms!: number;
  @Type(() => Number) @IsInt() @Min(1) categoryId!: number;
}
class SearchDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @Type(() => Number) @IsInt() categoryId?: number;
  @IsOptional() @IsEnum(ListingType) listingType?: ListingType;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) rooms?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
}
class InquiryDto {
  @IsString() @MinLength(10) @MaxLength(2000) message!: string;
  @IsString() @MinLength(7) @MaxLength(35) phone!: string;
}
const details = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  owner: { select: { id: true, fullName: true, phone: true } }
};
@Injectable()
class MarketplaceService {
  constructor(private readonly db: PrismaService) {}
  async search(q: SearchDto) {
    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.APPROVED,
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.listingType ? { listingType: q.listingType } : {}),
      ...(q.city ? { city: { contains: q.city, mode: 'insensitive' } } : {}),
      ...(q.rooms !== undefined ? { rooms: { gte: q.rooms } } : {}),
      ...(q.minPrice !== undefined || q.maxPrice !== undefined ? { price: { gte: q.minPrice, lte: q.maxPrice } } : {}),
      ...(q.q ? { OR: [
        { title: { contains: q.q, mode: 'insensitive' } },
        { address: { contains: q.q, mode: 'insensitive' } },
        { description: { contains: q.q, mode: 'insensitive' } }
      ] } : {})
    };
    const page=q.page||1, limit=q.limit||24;
    const [items,total]=await Promise.all([
      this.db.property.findMany({where,include:details,skip:(page-1)*limit,take:limit,orderBy:{createdAt:'desc'}}),
      this.db.property.count({where})
    ]);
    return { items,total,page,limit };
  }
  async one(id:number) {
    const p=await this.db.property.findFirst({where:{id,status:PropertyStatus.APPROVED},include:details});
    if(!p)throw new NotFoundException('E’lon topilmadi');
    return p;
  }
  mine(userId:number) {
    return this.db.property.findMany({where:{ownerId:userId},include:details,orderBy:{createdAt:'desc'}});
  }
  async add(ownerId:number, dto:CreatePropertyDto) {
    const category=await this.db.category.findUnique({where:{id:dto.categoryId}});
    if(!category)throw new BadRequestException('Kategoriya topilmadi');
    return this.db.property.create({data:{...dto,ownerId,status:PropertyStatus.APPROVED},include:details});
  }
  async remove(id:number,user:{id:number;role:string}) {
    const p=await this.db.property.findUnique({where:{id}});
    if(!p)throw new NotFoundException('E’lon topilmadi');
    if(p.ownerId!==user.id&&user.role!=='ADMIN')throw new ForbiddenException('Ruxsat yo‘q');
    await this.db.property.delete({where:{id}});
    return {ok:true};
  }
  async images(id:number, ownerId:number, files:Express.Multer.File[]) {
    const p=await this.db.property.findUnique({where:{id}});
    if(!p)throw new NotFoundException('E’lon topilmadi');
    if(p.ownerId!==ownerId)throw new ForbiddenException('Faqat e’lon egasi rasm yuklaydi');
    if(!files.length)throw new BadRequestException('Rasmlar topilmadi');
    const count=await this.db.propertyImage.count({where:{propertyId:id}});
    if(count+files.length>12)throw new BadRequestException('Jami 12 ta rasmdan oshmasin');
    await this.db.propertyImage.createMany({data:files.map((f,i)=>({propertyId:id,url:'/properties/uploads/'+f.filename,sortOrder:count+i,altText:p.title}))});
    return this.db.property.findUnique({where:{id},include:details});
  }
  async favorites(userId:number) {
    return this.db.favorite.findMany({where:{userId},include:{property:{include:details}},orderBy:{createdAt:'desc'}});
  }
  async like(userId:number,propertyId:number) {
    await this.one(propertyId);
    await this.db.favorite.upsert({where:{userId_propertyId:{userId,propertyId}},create:{userId,propertyId},update:{}});
    return {ok:true};
  }
  async unlike(userId:number,propertyId:number) {
    await this.db.favorite.deleteMany({where:{userId,propertyId}});
    return {ok:true};
  }
  async contact(senderId:number,propertyId:number,body:InquiryDto) {
    const p=await this.one(propertyId);
    if(p.ownerId===senderId)throw new BadRequestException('O‘z e’loningizga xabar yuborolmaysiz');
    return this.db.inquiry.create({data:{senderId,propertyId,...body},select:{id:true,createdAt:true}});
  }
  received(ownerId:number) {
    return this.db.inquiry.findMany({where:{property:{ownerId}},include:{property:{select:{id:true,title:true}},sender:{select:{id:true,fullName:true}}},orderBy:{createdAt:'desc'}});
  }
}
const storage=diskStorage({
  destination:(_req,_file,cb)=>{const dir=resolve(process.cwd(),'uploads');mkdirSync(dir,{recursive:true});cb(null,dir);},
  filename:(_req,file,cb)=>{const ext:{[key:string]:string}={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'};cb(null,randomUUID()+(ext[file.mimetype]||'.bin'));}
});
@Controller('properties')
class PropertiesController {
  constructor(private readonly market:MarketplaceService){}
  @Get() list(@Query() q:SearchDto){return this.market.search(q);}
  @UseGuards(JwtAuthGuard) @Get('mine') mine(@Req() req:any){return this.market.mine(req.user.id);}
  @UseGuards(JwtAuthGuard) @Get('inquiries/received') inbox(@Req() req:any){return this.market.received(req.user.id);}
  @Get('uploads/:filename') photo(@Param('filename') filename:string,@Res() res:Response){
    if(!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(filename))throw new NotFoundException();
    return res.sendFile(basename(filename),{root:resolve(process.cwd(),'uploads'),dotfiles:'deny'});
  }
  @Get(':id') detail(@Param('id',ParseIntPipe) id:number){return this.market.one(id);}
  @UseGuards(JwtAuthGuard) @Post() create(@Req() req:any,@Body() body:CreatePropertyDto){return this.market.add(req.user.id,body);}
  @UseGuards(JwtAuthGuard) @Delete(':id') remove(@Req() req:any,@Param('id',ParseIntPipe) id:number){return this.market.remove(id,req.user);}
  @UseGuards(JwtAuthGuard) @Post(':id/inquiries') contact(@Req() req:any,@Param('id',ParseIntPipe) id:number,@Body() body:InquiryDto){return this.market.contact(req.user.id,id,body);}
  @UseGuards(JwtAuthGuard)
  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('files',8,{
    storage,
    limits:{fileSize:5*1024*1024,files:8},
    fileFilter:(_req,file,cb)=>{const ok=['image/jpeg','image/png','image/webp'].includes(file.mimetype);cb(ok?null:new BadRequestException('Faqat JPEG PNG yoki WebP mumkin'),ok);}
  }))
  addImages(@Req() req:any,@Param('id',ParseIntPipe) id:number,@UploadedFiles() files:Express.Multer.File[]){
    return this.market.images(id,req.user.id,files||[]);
  }
}
@Controller('favorites')
@UseGuards(JwtAuthGuard)
class FavoritesController {
  constructor(private readonly market:MarketplaceService){}
  @Get() list(@Req() req:any){return this.market.favorites(req.user.id);}
  @Post(':id') add(@Req() req:any,@Param('id',ParseIntPipe) id:number){return this.market.like(req.user.id,id);}
  @Delete(':id') remove(@Req() req:any,@Param('id',ParseIntPipe) id:number){return this.market.unlike(req.user.id,id);}
}
@Module({imports:[PrismaModule,AuthModule],providers:[MarketplaceService],controllers:[PropertiesController,FavoritesController]})
export class MarketplaceModule {}
