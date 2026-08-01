import { SetMetadata } from '@nestjs/common';

export const TOKEN_TYPE_KEY = 'token_type';

/**
 * Restrict endpoint access to specific JWT token types.
 * Usage: @TokenType('device') or @TokenType('user') or @TokenType('device', 'user')
 */
export const TokenType = (...types: string[]) => SetMetadata(TOKEN_TYPE_KEY, types);
