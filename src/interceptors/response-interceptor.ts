// interceptors/response-interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const { token, refresh_token, message, ...rest } = data || {};
        return {
          data: rest,
          success: true,
          ...(message && {message}),
          ...(token && { token }),
          ...(refresh_token && { refresh_token }),
        };
      }),
    );
  }
}
