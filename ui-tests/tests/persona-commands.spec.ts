/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  expect,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';
import { User } from '@jupyterlab/services';
import { UUID } from '@lumino/coreutils';
import { Locator } from '@playwright/test';

const FILENAME = 'persona-commands.chat';

const USER: User.IUser = {
  identity: {
    username: UUID.uuid4(),
    name: 'jovyan',
    display_name: 'jovyan',
    initials: 'JP',
    color: 'var(--jp-collaborator-color1)'
  },
  permissions: {}
};

const openChat = async (
  page: IJupyterLabPageFixture,
  filename: string
): Promise<Locator> => {
  let panel = await page.activity.getPanelLocator(filename);
  if (panel !== null && (await panel.count())) {
    return panel;
  }
  await page.evaluate(async filepath => {
    await window.jupyterapp.commands.execute('jupyterlab-chat:open', {
      filepath
    });
  }, filename);
  const splitPath = filename.split('/');
  const tabName = splitPath[splitPath.length - 1];
  await page.waitForCondition(
    async () => await page.activity.isTabActive(tabName)
  );
  panel = await page.activity.getPanelLocator(tabName);
  return panel as Locator;
};

test.use({
  mockUser: USER
});

/**
 * Verifies the @-mention /command platform: the chat-commands extension's
 * `PersonaCommandProvider` fetches per-persona commands from
 * `/api/ai/persona-commands` and surfaces them in the autocomplete dropdown
 * when the user types `/` at the leading command position.
 *
 * The endpoint is mocked here so the test does not depend on a persona
 * actually being registered with `@persona_command` in the running env.
 */
test.describe('#persona-commands', () => {
  test.beforeEach(async ({ page }) => {
    await page.filebrowser.contents.uploadContent('{}', 'text', FILENAME);
    await page.route(/api\/ai\/persona-commands/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          commands: [
            { name: '/clear', description: 'Clear the conversation' },
            { name: '/help', description: 'Show available commands' },
            { name: '/login', description: 'Authenticate with the agent' }
          ]
        })
      });
    });
  });

  test.afterEach(async ({ page }) => {
    if (await page.filebrowser.contents.fileExists(FILENAME)) {
      await page.filebrowser.contents.deleteFile(FILENAME);
    }
  });

  test('should list persona /commands when user types /', async ({ page }) => {
    const chatPanel = await openChat(page, FILENAME);
    const input = chatPanel
      .locator('.jp-chat-input-container')
      .getByRole('combobox');
    const chatCommandName = page.locator('.jp-chat-command-name');

    await input.pressSequentially('/');

    // The dropdown surfaces our 3 mocked commands (other slash-providers may
    // contribute additional entries — assert by content, not exact count).
    await expect(chatCommandName.filter({ hasText: '/clear' })).toHaveCount(1);
    await expect(chatCommandName.filter({ hasText: '/help' })).toHaveCount(1);
    await expect(chatCommandName.filter({ hasText: '/login' })).toHaveCount(1);
  });

  test('should filter persona /commands by prefix', async ({ page }) => {
    const chatPanel = await openChat(page, FILENAME);
    const input = chatPanel
      .locator('.jp-chat-input-container')
      .getByRole('combobox');
    const chatCommandName = page.locator('.jp-chat-command-name');

    await input.pressSequentially('/he');

    // `/clear` and `/login` no longer match; only `/help` should remain among
    // the persona commands. Other providers may still surface unrelated
    // entries (e.g. emoji), so assert by inclusion.
    await expect(chatCommandName.filter({ hasText: '/help' })).toHaveCount(1);
    await expect(chatCommandName.filter({ hasText: '/clear' })).toHaveCount(0);
    await expect(chatCommandName.filter({ hasText: '/login' })).toHaveCount(0);
  });

  test('should not list persona /commands mid-message', async ({ page }) => {
    const chatPanel = await openChat(page, FILENAME);
    const input = chatPanel
      .locator('.jp-chat-input-container')
      .getByRole('combobox');
    const chatCommandName = page.locator('.jp-chat-command-name');

    // A `/` that is not the leading token must NOT trigger persona-command
    // autocomplete — those commands only make sense at the start of input.
    await input.pressSequentially('hello /he');
    await expect(chatCommandName.filter({ hasText: '/help' })).toHaveCount(0);
    await expect(chatCommandName.filter({ hasText: '/clear' })).toHaveCount(0);
    await expect(chatCommandName.filter({ hasText: '/login' })).toHaveCount(0);
  });

  test('should list persona /commands after an @-mention', async ({ page }) => {
    const chatPanel = await openChat(page, FILENAME);
    const input = chatPanel
      .locator('.jp-chat-input-container')
      .getByRole('combobox');
    const chatCommandName = page.locator('.jp-chat-command-name');

    // The realistic flow: user types `@SomePersona ` then `/` to discover the
    // commands that persona supports. Activation must still fire here.
    await input.pressSequentially('@SomePersona /');
    await expect(chatCommandName.filter({ hasText: '/clear' })).toHaveCount(1);
    await expect(chatCommandName.filter({ hasText: '/help' })).toHaveCount(1);
    await expect(chatCommandName.filter({ hasText: '/login' })).toHaveCount(1);
  });
});
