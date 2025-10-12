/** @format */

import { FluigAPIConfig } from 'fluig-api';

type Environment = Record<string, any> & { fluigAPI: FluigAPIConfig };

export const environment: Environment = {
  fluigAPI: {
    /* Set `local` to true for local development with a proxy,
     * false for production.
     *
     * No other configuration is needed when `local` is false.
     */
    local: true,
    url: 'https://your-fluig-server.com',
    endpoints: ['/content-management', '/public', '/api', '/portal'],
    oauth: {
      consumerKey: 'consumer_key',
      consumerSecret: 'consumer_secret',
      accessToken: 'access_token',
      tokenSecret: 'token_secret',
    },
  },
};
