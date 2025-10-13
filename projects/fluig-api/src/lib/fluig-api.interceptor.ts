/** @format */

import { inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { FLUIG_API_CONFIG } from './fluig-api.config';
import { FluigAPIService } from './fluig-api.service';

export const fluigAPIInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const config = inject(FLUIG_API_CONFIG);
  if (!config || !config.local || !config.endpoints) return next(req);

  const endpoints: string[] = 'endpoints' in config ? config.endpoints : [];
  if (endpoints.length > 0) {
    const matches = endpoints.filter((url) => req.url.startsWith(url));
    if (matches.length === 0) return next(req);
  }

  const authToken = inject(FluigAPIService).getAuthToken({
    url: req.urlWithParams,
    method: req.method,
    data: req.body,
  });
  const authHeader = req.headers.set('Authorization', authToken);
  const signedRequest = req.clone({ headers: authHeader });

  if ('debug' in config && config.debug) {
    console.log(
      `[FluigAPI] Request to ${req.url} intercepted. - Auth header added.`
    );
  }

  return next(signedRequest);
};
