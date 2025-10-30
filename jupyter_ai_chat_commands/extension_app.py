import asyncio
from jupyter_server.extension.application import ExtensionApp
from .handlers import RouteHandler

from jupyterlab_chat.models import Message
from jupyter_ai_router.router import MessageRouter
from jupyter_ai_persona_manager import PersonaManager

class JaiChatCommandsExtension(ExtensionApp):
    
    name = "jupyter_ai_chat_commands"
    handlers = [
        (r"jupyter-ai-chat-commands/get-example/?", RouteHandler)
    ]

    @property
    def event_loop(self) -> asyncio.AbstractEventLoop:
        """
        Returns a reference to the asyncio event loop.
        """
        return asyncio.get_event_loop_policy().get_event_loop()

    def initialize_settings(self):
        """
        See `self.initialize_async()`.
        """
        super().initialize_settings()
        self.event_loop.create_task(self.initialize_async())
    
    async def initialize_async(self):
        """
        This method waits for the `MessageRouter` singleton to be initialized by
        `jupyter_ai_router`. It attaches an observer to listen to when a chat is
        initialized, which in turn attaches an observer to listen to when a
        slash command is called in any chat.
        """
        router: MessageRouter = await self._get_router()
        self.log.debug("Obtained reference to router.")

        router.observe_chat_init(lambda room_id, ychat: self.on_chat_init(router, room_id))
    
    def on_chat_init(self, router: MessageRouter, room_id: str):
        router.observe_slash_cmd_msg(room_id, "refresh-personas", self.on_slash_command)
        self.log.info("Attached router observer.")
    
    def on_slash_command(self, room_id: str, command: str, message: Message):
        self.event_loop.create_task(self.handle_refresh_personas(room_id))
    
    async def handle_refresh_personas(self, room_id: str):
        self.log.info(f"Received /refresh-personas in room '{room_id}'.")
        persona_manager = await self._get_persona_manager(room_id)
        self.log.info(f"Retrieved PersonaManager in room '{room_id}'.")
        await persona_manager.refresh_personas()
        self.log.info(f"Handled /refresh-personas in room '{room_id}'.")


    async def _get_router(self) -> MessageRouter:
        """
        Returns the `MessageRouter` singleton initialized by
        `jupyter_ai_router`.
        """
        while True:
            router = self.serverapp.web_app.settings.get("jupyter-ai", {}).get("router")
            if router is not None:
                return router
            await asyncio.sleep(0.1)  # Check every 100ms
    
    async def _get_persona_manager(self, room_id: str) -> PersonaManager:
        """
        Returns the `PersonaManager` for a chat given its room ID.
        """
        while True:
            persona_managers_by_room = self.serverapp.web_app.settings.get("jupyter-ai", {}).get("persona-managers", {})
            manager = persona_managers_by_room.get(room_id)
            if manager is not None:
                return manager
            await asyncio.sleep(0.1)  # Check every 100ms

        
def get_first_word(input_str: str) -> str | None:
    """
    Finds the first word in a given string, ignoring leading whitespace.
    Returns the first word, or None if there is no first word.
    """
    start = 0

    # Skip leading whitespace
    while start < len(input_str) and input_str[start].isspace():
        start += 1

    # Find end of first word
    end = start
    while end < len(input_str) and not input_str[end].isspace():
        end += 1

    first_word = input_str[start:end]
    return first_word if first_word else None