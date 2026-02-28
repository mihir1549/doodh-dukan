import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductPrice } from './product-price.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Product, ProductPrice])],
    controllers: [ProductsController],
    providers: [ProductsService],
    exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule { }
