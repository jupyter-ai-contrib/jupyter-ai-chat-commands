# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a JupyterLab extension package that provides default chat commands for Jupyter AI. It consists of:

- A Python server extension (`jupyter_ai_chat_commands`)
- A TypeScript frontend extension (`@jupyter-ai/chat-commands`)

The extension currently provides two chat commands:

- `@file:<path>`: Add a file as an attachment to a message
- `/refresh-personas`: Reload local personas defined in `.jupyter/personas`

## Development Setup

Initial setup requires micromamba/conda and Node.js 22:

```bash
micromamba install uv jupyterlab nodejs=22
jlpm
jlpm dev:install
```

The `dev:install` script handles the complete development setup including building the extension, installing Python dependencies, and enabling the server extension.

## Common Commands

### Building

- `jlpm build` - Build both TypeScript and labextension for development
- `jlpm build:prod` - Production build with optimization
- `jlpm build:lib` - Build TypeScript source with source maps
- `jlpm build:labextension` - Build the JupyterLab extension

### Development Workflow

- `jlpm watch` - Watch mode for development (runs both TypeScript and labextension watch)
- `jupyter lab` - Start JupyterLab (run in separate terminal alongside watch)

### Linting and Testing

- `jlpm lint` - Run all linters (stylelint, prettier, eslint)
- `jlpm lint:check` - Check without fixing
- `jlpm test` - Run Jest tests with coverage
- `pytest -vv -r ap --cov jupyter_ai_chat_commands` - Run Python server tests

### Extension Management

- `jlpm dev:uninstall` - Remove development extension
- `jupyter server extension list` - Check server extension status
- `jupyter labextension list` - Check frontend extension status

## Architecture

### Frontend (TypeScript)

- Entry point: `src/index.ts` - exports main plugin and chat command plugins
- Chat commands: `src/chat-command-plugins/` contains individual command implementations
- Uses JupyterLab 4.x plugin system and `@jupyter/chat` for chat integration

### Backend (Python)

- Server extension: `jupyter_ai_chat_commands/extension_app.py`
- Request handlers: `jupyter_ai_chat_commands/handlers.py`
- Depends on `jupyterlab_chat`, `jupyter_ai_router`, and `jupyter_ai_persona_manager`

### Key Dependencies

- Frontend: `@jupyter/chat`, `@jupyterlab/application`, Material-UI icons
- Backend: `jupyter_server`, `jupyterlab_chat`, `jupyter_ai_router`

## Code Style

- TypeScript: ESLint with TypeScript rules, Prettier formatting, single quotes
- Interface naming: Must start with 'I' and use PascalCase
- CSS: Stylelint with standard config
- Python: No specific linter configured (follows standard Python conventions)

## Testing

- Frontend: Jest with coverage reporting
- Backend: Pytest with pytest-asyncio for server testing
- Integration: Playwright tests in `ui-tests/` (currently skipped)

Note: Integration tests are currently disabled - see recent commit "skip integration tests for now".
