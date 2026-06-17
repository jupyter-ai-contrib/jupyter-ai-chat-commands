/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

/**
 * Metadata for a single `/command` registered on a persona.
 */
export type IPersonaCommand = {
  name: string;
  description: string;
};

type IPersonaCommandsResponse = {
  commands: IPersonaCommand[];
};

/**
 * Fetches the list of `/commands` registered on the given persona for the chat
 * at `chatPath`. If `personaMentionName` is `null`, the server returns the
 * commands of the chat's last-mentioned persona (falling back to the default
 * persona). Returns an empty array on any error so that the autocomplete UI
 * can degrade gracefully.
 */
export async function getPersonaCommands(
  chatPath: string,
  personaMentionName: string | null = null
): Promise<IPersonaCommand[]> {
  const settings = ServerConnection.makeSettings();
  const params = new URLSearchParams({ chat_path: chatPath });
  if (personaMentionName !== null) {
    params.set('persona', personaMentionName);
  }
  const requestUrl =
    URLExt.join(settings.baseUrl, 'api/ai/persona-commands') +
    `?${params.toString()}`;

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, {}, settings);
  } catch (e) {
    console.warn('Error retrieving persona commands: ', e);
    return [];
  }

  if (!response.ok) {
    console.warn(
      `Persona commands endpoint returned ${response.status} ${response.statusText}`
    );
    return [];
  }

  let data: IPersonaCommandsResponse;
  try {
    data = await response.json();
  } catch (e) {
    console.warn('Persona commands response was not valid JSON: ', e);
    return [];
  }

  return data?.commands ?? [];
}
