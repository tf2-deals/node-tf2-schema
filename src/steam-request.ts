import axios from 'axios';
import type { AxiosRequestConfig, Method } from 'axios';

/**
 * Sends a request to the Steam API
 * @param {string} httpMethod Request method
 * @param {string} method API method
 * @param {string} version Version of API method
 * @param {Object} params Query string or body to send in the request
 * @param {Object} data Body to send in the request
 */
export async function SteamRequest<T>(
  httpMethod: Method,
  method: string,
  version: string,
  params?: AxiosRequestConfig['params'],
  data?: AxiosRequestConfig['data'],
): Promise<T | any> {
  const url = 'https://api.steampowered.com';
  const face = 'IEconItems_440';

  const options: AxiosRequestConfig = {
    url: `${url}/${face}/${method}/${version}`,
    method: httpMethod,
  };

  if (params) options.params = params;
  if (data) options.data = data;

  const res = await axios(options);
  const result = res.data.result;

  if (Object.keys(res.data).length === 0 || result === undefined)
    throw new Error('Empty response');

  if (result.status != 1) throw new Error(result.note);

  delete result.status;

  return result;
}
