import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TOKEN_TYPE_KEY } from '../decorators/token-type.decorator';

@Injectable()
export class TokenTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedTypes = this.reflector.getAllAndOverride<string[]>(TOKEN_TYPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @TokenType decorator → allow all types
    if (!allowedTypes || allowedTypes.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.type) {
      throw new ForbiddenException('Token type not recognized');
    }

    if (!allowedTypes.includes(user.type)) {
      throw new ForbiddenException('This endpoint is not available for your token type');
    }

    return true;
  }
}
