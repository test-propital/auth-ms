import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { LoginUserDto, RegisterUserDto } from './dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload';
import { envs, NAST_SERVICE } from 'src/config';
import { catchError, firstValueFrom } from 'rxjs';
@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('authService');
  constructor(
    private readonly jwtService: JwtService,
    @Inject(NAST_SERVICE) private readonly nastClient: ClientProxy,
  ) {
    super();
  }
  onModuleInit() {
    try {
      this.$connect();
      this.logger.log('mongoDb connected');
    } catch (error) {
      console.log(error);
    }
  }
  async signJwt(payload: JwtPayload) {
    return await this.jwtService.signAsync(payload);
  }

  async verifyToken(token: string) {
    try {
      const { sub, iat, exp, ...user } = this.jwtService.verify(token, {
        secret: envs.jwtSecret,
      });
      return {
        user: user,
        token: await this.signJwt(user),
      };
    } catch (error) {
      console.log(error);
      throw new RpcException({
        status: 401,
        messaje: 'invalid token',
      });
    }
  }
  async RegisterUser(registerUserdto: RegisterUserDto) {
    const { email, name, password } = registerUserdto;
    try {
      const user = await this.user.findUnique({
        where: {
          email: email,
        },
      });
      if (user) {
        throw new RpcException({
          status: 400,
          messaje: 'user already exists',
        });
      }
      return await this.$transaction(async (prisma) => {
        const newUser = await this.user.create({
          data: {
            email: email,
            password: bcrypt.hashSync(password, 10),
            name: name,
          },
        });

        ///
        const metadata_ref = {
          authId: newUser.authId,
          name: newUser.name,
        };
        const userInfo = await firstValueFrom(
          this.nastClient.send({ cmd: 'create_owner' }, metadata_ref).pipe(
            catchError((err) => {
              // Si ocurre un error, lanzar una excepción para revertir la transacción
              throw new RpcException(err);
            }),
          ),
        );

        const { password: _, ...rest } = newUser;
        return {
          user: rest,
          userInfo: userInfo,
          token: await this.signJwt(rest),
        };
      });
    } catch (error) {
      throw new RpcException({
        status: 400,
        messaje: 'Hubo un problema en la autentificacion',
      });
    }
  }

  async loginUser(loginUserdto: LoginUserDto) {
    const { email, password } = loginUserdto;
    try {
      const user = await this.user.findUnique({
        where: {
          email: email,
        },
      });
      if (!user) {
        throw new RpcException({
          status: 400,
          messaje: 'invalid credentials',
        });
      }

      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) {
        throw new RpcException({
          status: 400,
          messaje: 'invalid credentials',
        });
      }
      const { password: _, ...rest } = user;
      return {
        user: rest,
        token: await this.signJwt(rest),
      };
    } catch (error) {
      throw new RpcException({
        status: 400,
        messaje: 'Hubo un problema al crear tu usuario',
      });
    }
  }
}
