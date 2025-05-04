import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwtAuthGuard';
import { UserTypeEnum } from './interfaces/user.types';
import { User, UserDocument } from './schemas/user.schema';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() authData: any,
    @Body() payload: Partial<User>,
    @Param('id') id: string,
  ) {
    const authUser: UserDocument = authData.user;

    //only allow admins update other user details
    if (
      authUser._id.toString() !== id &&
      authUser.user_type != UserTypeEnum.ADMIN
    ) {
      throw new ForbiddenException('You can only update your own account');
    }

    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException("user doesn't exist");
    }

    payload = { ...payload, password: user.password, email: user.email }; //prevent email and password change
    return this.userService.updateById(id, payload);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async get(
    @Query('filter') filter?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedFilter: Record<string, any> = {};
    if (filter) {
      try {
        parsedFilter = JSON.parse(filter);
      } catch (error) {
        console.log(error);
        throw new BadRequestException(
          'Invalid filter format. Must be valid JSON.',
        );
      }
    }

    const pageFilter = Math.max(1, parseInt(page, 10) || 1);
    const limitFilter = Math.min(100, parseInt(limit, 10) || 10); // Optional cap at 100

    return this.userService.getUsers(
      parsedFilter,
      search?.trim() || '',
      pageFilter,
      limitFilter,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() authData: any,
    @Param('id') id: string,
  ) {
    // const authUser: UserDocument = authData.user;

    //only allow admins update other user details
    // if (
    //   authUser._id.toString() !== id &&
    //   authUser.user_type != UserTypeEnum.ADMIN
    // ) {
    //   throw new UnauthorizedException(
    //     "You don't have access to other user's information, contact admin",
    //   );
    // }

    const user = await this.userService.findById(id);
    if (!user) {
      throw new BadRequestException('failed to get user');
    }

    user.password = '';
    return user;
  }

  @Get('/check-email-availability')
  async check(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const userExists = await this.userService.existsByEmail(email);

    return { user_exist: userExists };
  }
}
