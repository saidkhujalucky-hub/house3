import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController, UsersController, CategoriesController, PropertiesController, FavoritesController, InquiriesController, AdminController, AuthService, PropertiesService, DbService, HealthController } from './api';
@Global()
@Module({ providers: [DbService, AuthService], exports:[DbService,AuthService], controllers: [HealthController,AuthController,UsersController] })
export class AuthModule {}
@Module({ controllers:[CategoriesController] })
export class CategoriesModule {}
@Module({ providers:[PropertiesService], controllers:[PropertiesController] })
export class PropertiesModule {}
@Module({ controllers:[FavoritesController] })
export class FavoritesModule {}
@Module({ controllers:[InquiriesController] })
export class InquiriesModule {}
@Module({ controllers:[AdminController] })
export class AdminModule {}
@Module({
 imports:[JwtModule.register({global:true,secret:process.env.JWT_SECRET}),AuthModule,CategoriesModule,PropertiesModule,FavoritesModule,InquiriesModule,AdminModule],
})
export class AppModule {}
