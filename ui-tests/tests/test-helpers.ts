/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 *
 * Helpers for the chat-commands E2E suites.
 *
 * Adapted from jupyter-ai-persona-manager's `ui-tests/tests/test-helpers.ts`.
 * The two harnesses share the same idea: one test server, per-suite isolation by
 * directory. In `beforeAll`, `installPersonas(request, dir, [...])` copies the
 * named fixture personas into `<dir>/.jupyter/personas/`; the PersonaManager
 * loads the nearest `.jupyter/personas` walking up from a chat's directory, so a
 * chat created under `<dir>/` (via `TestHelpers#openChat`) sees only that
 * suite's personas.
 *
 * chat-commands tests exercise the slash-command path end to end: selecting a
 * persona stamps `metadata.to_persona` on outgoing messages, and sending
 * `/restart` drives the server extension's `/restart` handler for that persona.
 */

import { expect, galata, IJupyterLabPageFixture } from '@jupyterlab/galata';
import { APIRequestContext, Locator } from '@playwright/test';
import { UUID } from '@lumino/coreutils';
import * as fs from 'fs';
import * as path from 'path';

const PERSONAS_SRC = path.resolve(__dirname, '..', 'fixtures', 'personas');

/**
 * The fixture personas available under `fixtures/personas/`. The value is the
 * fixture's file stem (`<value>_persona.py`) and the id a suite passes to
 * `installPersonas`.
 */
export enum FixturePersona {
  Lifecycle = 'lifecycle'
}

interface FixturePersonaInfo {
  /** Display name shown in the persona picker (its `PersonaDefaults.name`). */
  name: string;
}

/** Single source of truth for each fixture persona's metadata. */
export const FIXTURE_PERSONAS: Record<FixturePersona, FixturePersonaInfo> = {
  [FixturePersona.Lifecycle]: { name: 'Lifecycle Persona' }
};

const PICKER = '.jp-jai-personaControls-persona-btn';
const INPUT = '.jp-chat-input-container';
const MESSAGE = '.jp-chat-rendered-message';

const TIMEOUT = 30000;

/**
 * Install the named fixture personas into `<dir>/.jupyter/personas/`. Call from
 * `beforeAll` with the worker-scoped `request` fixture (no browser needed).
 */
export async function installPersonas(
  request: APIRequestContext,
  dir: string,
  personas: FixturePersona[]
): Promise<void> {
  const contents = galata.newContentsHelper(request);
  for (const persona of personas) {
    const file = `${persona}_persona.py`;
    const source = fs.readFileSync(path.join(PERSONAS_SRC, file), 'utf-8');
    const uploaded = await contents.uploadContent(
      source,
      'text',
      `${dir}/.jupyter/personas/${file}`
    );
    // uploadContent resolves false on failure rather than throwing; fail the
    // suite here instead of timing out later on a picker with no personas.
    if (!uploaded) {
      throw new Error(`Failed to install fixture persona ${file} into ${dir}`);
    }
  }
}

/**
 * Per-test helper bound to one suite directory and one page. Drives the chat UI:
 * open a chat, pick a persona, send messages and slash commands, read messages.
 */
export class TestHelpers {
  readonly dir: string;
  readonly page: IJupyterLabPageFixture;
  private _chat: Locator | null = null;

  constructor(options: { dir: string; page: IJupyterLabPageFixture }) {
    this.dir = options.dir;
    this.page = options.page;
  }

  /** The current chat panel (throws if `openChat` hasn't run). */
  get chat(): Locator {
    if (!this._chat) {
      throw new Error('Call openChat() first.');
    }
    return this._chat;
  }

  /** Open a fresh chat under this suite's directory. */
  async openChat(): Promise<Locator> {
    const filepath = `${this.dir}/chat-${UUID.uuid4()}.chat`;
    await this.page.filebrowser.contents.uploadContent('{}', 'text', filepath);
    await this.page.evaluate(async (name: string) => {
      await window.jupyterapp.commands.execute('jupyterlab-chat:open', {
        filepath: name
      });
    }, filepath);
    const tab = filepath.split('/').pop()!;
    await this.page.waitForCondition(async () =>
      this.page.activity.isTabActive(tab)
    );
    this._chat = (await this.page.activity.getPanelLocator(tab)) as Locator;
    return this._chat;
  }

  /** The persona picker button in the toolbar. */
  get personaPicker(): Locator {
    return this.chat.locator(PICKER);
  }

  /** Select a fixture persona from the picker and wait for it to take. */
  async selectPersona(persona: FixturePersona): Promise<void> {
    const { name } = FIXTURE_PERSONAS[persona];
    const picker = this.chat.locator(PICKER);
    await expect(picker).toBeVisible({ timeout: TIMEOUT });
    await picker.click();
    await this.page.getByRole('menuitem', { name }).click();
    await expect(picker).toContainText(name);
  }

  /** Type a message and click send, without waiting for a reply. */
  async send(text: string): Promise<void> {
    await this.chat
      .locator(INPUT)
      .getByRole('combobox')
      .pressSequentially(text);
    await this.chat.locator(`${INPUT} .jp-chat-send-button`).click();
  }

  /** The text of every rendered message, in order. */
  async allMessageTexts(): Promise<string[]> {
    return this.chat.locator(MESSAGE).allTextContents();
  }

  /** How many rendered messages contain `text` as a substring. */
  async countMessagesContaining(text: string): Promise<number> {
    const texts = await this.allMessageTexts();
    return texts.filter(t => t.includes(text)).length;
  }
}
