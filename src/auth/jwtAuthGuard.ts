import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authorization token not found');
    }

    const [bearer, token] = authHeader.split(' ');
    if (!token || bearer !== 'Bearer') {
      throw new UnauthorizedException('Invalid token format');
    }

    console.log({ context });
    return super.canActivate(context);
  }
}
