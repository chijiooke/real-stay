import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { RedisService } from 'src/utility-services/redis';
import { MailService } from 'src/utility-services/nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async signup(payload: User): Promise<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  }> {
    // Check if the user already exists
    const existingUser = await this.usersService.findByEmail(payload?.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const user = await this.usersService.createUser(payload);

    // Return only the necessary fields
    return {
      id: user._id.toHexString(),
      email: user.email,
      first_name: user.first_name,
      last_name: user.first_name,
    };
  }

  async validateUser(
    email: string,
    userPassword: string,
  ): Promise<Omit<UserDocument, 'password'> | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(userPassword, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid email or password');

    return {
      id: user._id.toHexString(),
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    } as Omit<UserDocument, 'password'>;
  }

  login(user: UserDocument): { user: UserDocument; access_token: string } {
    return { user, access_token: this.jwtService.sign(user) };
  }

  async initiatePasswordChange({
    email,
  }: {
    email: string;
  }): Promise<{ message: string }> {
    //send otp email, sms
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.set(`otp:${email}`, otp, 300);

    return { message: 'Otp sent to email successfully' };
  }

  async changePassword({
    email,
    password,
    otp,
  }: {
    email: string;
    password: string;
    otp: string;
  }): Promise<UserDocument> {
    const key = email + '-password-reset';
    const redisOtp = await this.redisService.get(key);

    if (redisOtp !== otp) {
      throw new BadRequestException('Invalid otp provided');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await this.usersService.updateByFilter(
      { email },
      { password: hashedPassword },
    );

    if (!updatedUser) {
      throw new BadRequestException(
        'Failed to update. Please confirm the email provided.',
      );
    }

    return updatedUser;
  }
}
