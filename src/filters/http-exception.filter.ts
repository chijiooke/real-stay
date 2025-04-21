// filters/http-exception.filter.ts
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  
  @Catch()
  export class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest();
  
      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      let message = 'Internal server error';
  

      console.log({exception})
      if (exception instanceof HttpException) {

        status = exception.getStatus();

       
        const res = exception.getResponse();
        message =
          typeof res === 'string'
            ? res
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            : (res as any).message || JSON.stringify(res);
      }
  
      response.status(status).json({
        data: { message, path: request.url },
        success: false,
      });
    }
  }
  