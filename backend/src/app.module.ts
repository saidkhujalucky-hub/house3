import { Module, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JwtModule } from '@nestjs/jwt';
import { AuthController, UsersController, CategoriesController, PropertiesController, FavoritesController, InquiriesController, AdminController, AuthService, PropertiesService, DbService } from './api';
@Module({ providers: [DbService, AuthService], controllers: [AuthController,UsersController] })
export class AuthModule {}
@Module({ providers: [DbService], controllers:[CategoriesController] })
export class CategoriesModule {}
@Module({ providers:[DbService, PropertiesService], controllers:[PropertiesController] })
export class PropertiesModule {}
@Module({ providers:[DbService], controllers:[FavoritesController] })
export class FavoritesModule {}
@Module({ providers:[DbService], controllers:[InquiriesController] })
export class InquiriesModule {}
@Module({ providers:[DbService], controllers:[AdminController] })
export class AdminModule {}
@Module({
 imports:[JwtModule.register({secret:process.env.JWT_SECRET}),AuthModule,CategoriesModule,PropertiesModule,FavoritesModule,InquiriesModule,AdminModule],
})
export class AppModule {}
