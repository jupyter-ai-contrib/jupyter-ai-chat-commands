"""Tests for the `/restart` slash command handler in `JaiChatCommandsExtension`.

`handle_restart` reads the target persona from the message metadata
(`to_persona`, the key the chat input's persona picker stamps) and asks the
room's `PersonaManager` to restart just that persona. These tests exercise that
routing without a running server by stubbing `_get_persona_manager`.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from jupyter_ai_persona_manager import PersonaManager

from jupyter_ai_chat_commands.extension_app import JaiChatCommandsExtension


def _make_extension(persona_manager):
    """A JaiChatCommandsExtension wired to return `persona_manager` for a room."""
    ext = JaiChatCommandsExtension.__new__(JaiChatCommandsExtension)
    ext.log = MagicMock()
    ext._get_persona_manager = AsyncMock(return_value=persona_manager)
    return ext


def _message(metadata):
    message = MagicMock()
    message.metadata = metadata
    return message


@pytest.mark.asyncio
async def test_restarts_the_persona_named_in_metadata():
    pm = MagicMock()
    pm.restart_persona = AsyncMock(return_value=True)
    pm.send_system_message = MagicMock()
    ext = _make_extension(pm)

    await ext.handle_restart("room", _message({"to_persona": "pid"}))

    pm.restart_persona.assert_awaited_once_with("pid")
    pm.send_system_message.assert_not_called()


@pytest.mark.asyncio
async def test_no_target_persona_sends_system_message_and_does_not_restart():
    pm = MagicMock()
    pm.restart_persona = AsyncMock()
    pm.send_system_message = MagicMock()
    ext = _make_extension(pm)

    await ext.handle_restart("room", _message(None))

    pm.restart_persona.assert_not_awaited()
    pm.send_system_message.assert_called_once()
    assert "routed to a persona" in pm.send_system_message.call_args[0][0]


@pytest.mark.asyncio
async def test_empty_metadata_treated_as_no_target():
    pm = MagicMock()
    pm.restart_persona = AsyncMock()
    pm.send_system_message = MagicMock()
    ext = _make_extension(pm)

    await ext.handle_restart("room", _message({}))

    pm.restart_persona.assert_not_awaited()
    pm.send_system_message.assert_called_once()


@pytest.mark.asyncio
async def test_unavailable_persona_reports_failure():
    pm = MagicMock()
    pm.restart_persona = AsyncMock(return_value=False)
    pm.send_system_message = MagicMock()
    ext = _make_extension(pm)

    await ext.handle_restart("room", _message({"to_persona": "gone"}))

    pm.restart_persona.assert_awaited_once_with("gone")
    pm.send_system_message.assert_called_once()
    assert "gone" in pm.send_system_message.call_args[0][0]


def test_uses_shared_metadata_key():
    # The handler must read the same metadata key the persona picker writes, so
    # bind to PersonaManager's constant rather than a hardcoded string.
    assert PersonaManager.TO_PERSONA_METADATA_KEY == "to_persona"
