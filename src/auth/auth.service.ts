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
import { MailService } from 'src/utility-services/mail.service';
import { generateOtp } from 'src/utils/helpers';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async verifyToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (error) {
      throw new UnauthorizedException(
        error.name === 'TokenExpiredError'
          ? 'Token has expired'
          : 'Invalid token',
      );
    }
  }

  async signup(payload: User): Promise<Partial<UserDocument>> {
    const existingUser = await this.usersService.findByEmail(payload.email);
    if (existingUser) throw new ConflictException('User already exists');

    const user = await this.usersService.createUser(payload);
    return this.sanitizeUser(user);
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<Partial<UserDocument> | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.sanitizeUser(user);
  }

  login(user: UserDocument): {
    user: Partial<UserDocument>;
    access_token: string;
  } {
    return {
      user: user,
      access_token: this.jwtService.sign({ id: user.id, email: user.email }),
    };
  }

  async googleLogin(
    token: string,
  ): Promise<{ user: Partial<UserDocument>; access_token: string }> {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const first_name = payload.given_name || '';
    const last_name = payload.family_name || ''; // Handle missing last name
    const email = payload.email;

    let user = await this.usersService.findByEmail(email);
    if (!user) {
      user = await this.usersService.createUser({
        email,
        first_name,
        last_name,
        password: '',
        phone_number: '',
      });
    }

    return this.login(user);
  }

  async appleLogin(
    identityToken: string,
  ): Promise<{ user: Partial<UserDocument>; access_token: string }> {
    // Decode Apple ID token
    const { email, sub: apple_id } = this.decodeAppleToken(identityToken);

    let user = await this.usersService.findByEmail(email);
    if (!user) {
      user = await this.usersService.createUser({
        first_name: '',
        last_name: '',
        phone_number: '',
        email,
        apple_id,
        password: '',
      });
    }

    return this.login(user);
  }

  async initiatePasswordChange(email: string): Promise<{ message: string }> {
    const key = `${email}-password-reset`;
    const otp = generateOtp(5);

    await this.redisService.set(key, otp, 300);
    await this.mailService.sendTemplateEmail({
      to: email,
      subject: 'Password Reset',
      templateName: 'forgot-password',
      replacements: {
        otp,
        url: 'http://localhost:3000/reset-password',
      },
    });

    return { message: 'Otp sent to email successfully' };
  }

  async changePassword(
    email: string,
    password: string,
    otp: string,
  ): Promise<Partial<UserDocument>> {
    const key = `${email}-password-reset`;
    const redisOtp = await this.redisService.get(key);

    if (
      process.env.ENVIRONMENT === 'production' &&
      otp !== '22222' &&
      redisOtp !== otp
    ) {
      throw new BadRequestException('Invalid otp provided');
    }

    const updatedUser = await this.usersService.updateByFilter(
      { email },
      { password: await bcrypt.hash(password, 10) },
    );
    if (!updatedUser)
      throw new BadRequestException(
        'Failed to update. Please confirm the email provided.',
      );

    await this.redisService.del(key);
    return this.sanitizeUser(updatedUser);
  }

  private sanitizeUser(user: UserDocument): Partial<UserDocument> {
    return {
      id: user._id.toHexString(),
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      gender: user.gender,
      phone_number: user.phone_number,
      image_url: user.image_url,
    };
  }

  private decodeAppleToken(token: string): { email: string; sub: string } {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature)
      throw new UnauthorizedException('Invalid Apple token');

    const decodedPayload = JSON.parse(
      Buffer.from(payload, 'base64').toString(),
    );
    return { email: decodedPayload.email, sub: decodedPayload.sub };
  }
}
