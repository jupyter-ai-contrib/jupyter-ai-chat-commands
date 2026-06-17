import { fileCommandPlugin } from './file-command';
import { personaCommandPlugin } from './persona-commands';
import { slashCommandPlugin } from './slash-commands';

export const chatCommandPlugins = [
  fileCommandPlugin,
  slashCommandPlugin,
  personaCommandPlugin
];
