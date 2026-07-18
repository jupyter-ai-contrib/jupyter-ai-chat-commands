/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';
import { FixturePersona, installPersonas, TestHelpers } from './test-helpers';

// This suite's working directory and the fixture persona installed into it.
const TEST_DIR = 'restart';
const PERSONAS = [FixturePersona.Lifecycle];

// Markers the Lifecycle fixture posts on start and stop (kept in sync with
// fixtures/personas/lifecycle_persona.py, shared with persona-manager).
const START_MARKER = 'lifecycle:started';
const STOP_MARKER = 'lifecycle:stopped';

/**
 * Exercises the `/restart` slash command end to end. The Lifecycle fixture posts
 * a start message when it is constructed and a stop message when it shuts down.
 * Selecting it stamps `metadata.to_persona` on outgoing messages; sending
 * `/restart` then drives the chat-commands server extension, which reads that
 * metadata and restarts exactly that persona.
 *
 * A restart tears one instance down and reconstructs a fresh one under the same
 * ID, so in the chat it must show up as: the original start, then a stop, then a
 * brand-new start — proving the command path took the persona down and brought
 * it back up. The sibling suite in jupyter-ai-persona-manager asserts the same
 * markers by calling `restart()` directly.
 */
test.describe('restart command', () => {
  test.beforeAll(async ({ request }) => {
    await installPersonas(request, TEST_DIR, PERSONAS);
  });

  test('/restart takes the routed persona down and brings it back up', async ({
    page
  }) => {
    const helpers = new TestHelpers({ dir: TEST_DIR, page });
    await helpers.openChat();
    await helpers.selectPersona(FixturePersona.Lifecycle);

    // The persona posts its start marker when the chat first constructs it.
    await expect
      .poll(async () => helpers.countMessagesContaining(START_MARKER), {
        timeout: 30000
      })
      .toBe(1);

    // Send the global /restart command, routed to the selected persona.
    await helpers.send('/restart');

    // The stop message proves the old instance shut down.
    await expect
      .poll(async () => helpers.countMessagesContaining(STOP_MARKER), {
        timeout: 30000
      })
      .toBe(1);

    // A fresh start message proves a new instance came up under the same ID.
    await expect
      .poll(async () => helpers.countMessagesContaining(START_MARKER), {
        timeout: 30000
      })
      .toBe(2);
  });
});
