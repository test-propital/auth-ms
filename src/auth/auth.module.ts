import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt/dist/jwt.module';
import { envs } from 'src/config';
import { NastModule } from 'src/transports/nast.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: envs.jwtSecret,
      signOptions: { expiresIn: '2h' },
    }),
    NastModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
