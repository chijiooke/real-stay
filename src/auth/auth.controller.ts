import { Controller, Post, Body, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User, UserDocument } from 'src/users/schemas/user.schema';

@Controller('auth') // This must match your route prefix
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() payload: User) {
    return this.authService.signup(payload);
  }

  @Post('login')
  async login(
    @Body() { email, password }: { email: string; password: string },
  ) {
    const user = await this.authService.validateUser(email, password);
    return this.authService.login(user as UserDocument);
  }

  @Post('forgot-password')
  async initiatePasswordChange(@Body() { email }: { email: string }) {
    return this.authService.initiatePasswordChange({ email });
  }

  @Patch('change-password')
  async update(
    @Body()
    { email, password, otp }: { email: string; password: string; otp: string },
  ) {
    return this.authService.changePassword({ email, password, otp });
  }
}
