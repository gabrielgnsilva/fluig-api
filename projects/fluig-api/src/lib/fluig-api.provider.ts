/** @format */

import {
  provideAppInitializer,
  EnvironmentProviders,
  Provider,
} from '@angular/core';

import { FLUIG_API_CONFIG, FluigAPIConfig } from './fluig-api.config';
import { cacheExternalLibs } from './fluig-api.external';

export function provideFluigAPI(
  config: FluigAPIConfig
): (Provider | EnvironmentProviders)[] {
  return [
    { provide: FLUIG_API_CONFIG, useValue: config },
    provideAppInitializer(() => {
      if (config.local === true) {
        return Promise.all([import('oauth-1.0a'), import('crypto-js')]).then(
          ([oauth, crypto]) => cacheExternalLibs(oauth, crypto)
        );
      }
      return;
    }),
  ];
}
