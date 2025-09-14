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
import { UserStatusEnum, UserTypeEnum } from './interfaces/user.types';
import { User, UserDocument } from './schemas/user.schema';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/features/auth/jwtAuthGuard';

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
  async get(@Query() filter: Record<string, string>) {
    return this.userService.getUsers(filter);
  }

  @Get('/check-email-availability')
  async check(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const userExists = await this.userService.existsByEmail(email);

    return { user_exist: userExists };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() authData: any,
    @Param('id') id: string,
  ) {
    const user = await this.userService.getUser(id);
    if (!user.user) {
      throw new BadRequestException('failed to get user');
    }

    user.user.password = '';
    return user;
  }

  @Patch(':id/:status')
  @UseGuards(JwtAuthGuard)
  async activateDeactivate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() authData: any,
    @Param('id') id: string,
    @Param('action') action: string,
  ) {
    const authUser: UserDocument = authData.user;

    if (!id || id == '' || id == ':id') {
      throw new BadRequestException('ID is required');
    }
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

    switch (action?.toLowerCase()) {
      case 'activate':
        user.status = UserStatusEnum.ACTIVE;
        break;

      case 'deactivate':
        user.status = UserStatusEnum.INACTIVE;
        break;

      default:
        throw new BadRequestException('invalid action');
    }

    return this.userService.updateById(id, user);
  }
}
