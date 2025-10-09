import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './handler';
import { chatCommandPlugins } from './chat-command-plugins';

/**
 * Initialization data for the @jupyter-ai/chat-commands extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-ai/chat-commands:plugin',
  description:
    'Package providing the set of default chat commands in Jupyter AI.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension @jupyter-ai/chat-commands is activated!');

    requestAPI<any>('get-example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The jupyter_ai_chat_commands server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default [plugin, ...chatCommandPlugins];
