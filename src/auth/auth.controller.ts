import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LoginUserDto, RegisterUserDto } from './dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.register.user')
  async registerUser(@Payload() registerUserDto: RegisterUserDto) {
    console.log(registerUserDto)
    return await this.authService.RegisterUser(registerUserDto);
  }

  @MessagePattern('auth.login.user')
  async loginUser(@Payload() loginUserDto: LoginUserDto) {
    return await this.authService.loginUser(loginUserDto);
  }
  @MessagePattern('auth.verify.user')
  async veryfiToken(@Payload() token: string) {
    return await this.authService.verifyToken(token);
  }
}
