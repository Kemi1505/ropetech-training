import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';

/** Marks a Swagger route/controller as needing a logged-in user */
export const ApiAuth = () => applyDecorators(ApiBearerAuth(), ApiCookieAuth('access_token'));
