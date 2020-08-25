import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const checkCustomerExists = await this.customersRepository.findById(
      customer_id,
    );

    if (!checkCustomerExists) {
      throw new AppError('Customer not found.');
    }

    const checkProducts = await this.productsRepository.findAllById(products);

    if (!checkProducts) {
      throw new AppError('Product not found, check your list.');
    }

    if (checkProducts.length === 0) {
      throw new AppError('Please, add at least one product.');
    }

    const updateQnt: IUpdateProductsQuantityDTO[] = [];

    const productsList = products.map(product => {
      const productItem = checkProducts.find(prod => prod.id === product.id);
      const price = productItem?.price || 0;

      if (!productItem) {
        throw new AppError('Product not found.');
      }

      if (productItem.quantity < product.quantity) {
        throw new AppError('Quantity of products available dos not match.');
      }

      updateQnt.push({
        id: product.id,
        quantity: productItem.quantity - product.quantity,
      });

      return {
        product_id: product.id,
        quantity: product.quantity,
        price,
      };
    });

    const order = await this.ordersRepository.create({
      customer: checkCustomerExists,
      products: productsList,
    });

    await this.productsRepository.updateQuantity(updateQnt);

    return order;
  }
}

export default CreateOrderService;
