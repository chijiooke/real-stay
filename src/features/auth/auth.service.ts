import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { RedisService } from 'src/redis/redis';
import { generateOtp } from 'src/utils/helpers';
import { MailgunService } from '../notifications/mail/mailgun/mailgun.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallets/wallet.service';

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailgunService,
    private readonly configService: ConfigService,
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
    // 1. Check if user already exists by email
    const existingUser = await this.usersService.findByEmail(payload.email);

    // Idempotent: return existing user (instead of error) if signup retried
    if (existingUser) {
      // Ensure wallet exists for this user too
      await this.walletService.ensureUserWallet(existingUser._id);
      return this.sanitizeUser(existingUser);
    }

    // 2. Create new user
    const user = await this.usersService.createUser(payload);

    // 3. Ensure wallet exists (safe & idempotent)
    await this.walletService.ensureUserWallet(user._id);

    // 4. Return sanitized user
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

  async login(user: UserDocument): Promise<{
    user: Partial<UserDocument>;
    access_token: string;
    refresh_token: string;
  }> {
    const payload = { id: user.id, email: user.email };

    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // store refresh token in Redis
    const key = `refresh:${user.id}`;
    await this.redisService.set(key, refresh_token, 60 * 60 * 24 * 7); // TTL 7 days

    return {
      user: { id: user.id, email: user.email },
      access_token,
      refresh_token,
    };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const key = `refresh:${userId}`;
    const storedToken = await this.redisService.get(key);

    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = (await this.usersService.getUser(userId))?.user;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = { id: user.id, email: user.email };

    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const new_refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    await this.redisService.set(key, new_refresh_token, 60 * 60 * 24 * 7); //7days TTL

    return {
      access_token,
      refresh_token: new_refresh_token,
    };
  }

  async logout(userId: string) {
    const key = `refresh:${userId}`;
    await this.redisService.del(key);
    return { message: 'Logged out successfully' };
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

    // Save OTP in Redis with 5 minutes expiry
    await this.redisService.set(key, otp, 300);

    // Send the OTP email
    await this.mailService.sendTemplateEmail({
      from: 'Real Stay <hello@edgetechino.com>',
      to: email,
      subject: 'Reset your password',
      templateName: 'forgot-password', // password-reset.hbs in templates folder
      context: { otp }, // this will be available in the template
    });

    return { message: 'OTP sent to email successfully' };
  }

  async changePassword(
    email: string,
    password: string,
    otp: string,
  ): Promise<Partial<UserDocument>> {
    const key = `${email}-password-reset`;
    const redisOtp = await this.redisService.get(key);

    if (!redisOtp || otp?.trim() != redisOtp) {
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
