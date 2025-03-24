import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UsersService, // Assuming you have a UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || '',
    });
  }

  async validate(payload: any) {
    // Find user by userId from the JWT payload
    const user = await this.userService.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user; // Return the user, it will be available in the request object as `request.user`
  }
}
