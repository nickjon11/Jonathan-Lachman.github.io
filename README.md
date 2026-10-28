# Jonathan-Lachman.github.io
Interactive Website showcasing my tech projects


## v0.3.3 notes
Luclid-ii fullscreen now removes max-width/max-height caps. System Status widget removed. Audio player is anchored above the bottom-right clock and can be dragged by its title bar.

**AI model:** Do not open index.html directly using a file:/// URL. From the portfolio root, run `python3 -m http.server 8000` and open `http://localhost:8000`. Model files download from Hugging Face; internet access and browser support are required. First load can take several minutes. Browser-based inference has not been verified on all browsers.

## Portfolio v0.3.4 update (October 2026)
- Added SFTP Manager.exe browser demo in `apps/sftp-manager/`, accessible from desktop and Projects.
- Demo files, simulated transfers, permissions, activity, and Docker status; no real SFTP/SSH credentials or connection.
- Help/About links search the owner's public GitHub repositories. These are discovery links, not verified direct project URLs; replace them with the real repository URLs when published.
- Updated Luclid-ii chat to exclude loading warnings from history and use deterministic generation with a repetition penalty. This is still a small 135M-parameter model, and inference quality is not guaranteed.
- Audio player spectrum uses Web Audio frequency analysis; radio visualizations require CORS-enabled streams. Audio widget stays behind desktop application windows.
- Test through `python3 -m http.server 8000`, not `file://`.

## v0.8.5 - Project Properties
Right-click a project icon inside Projects and select Properties. Shift+F10 also works. SFTP Manager desktop shortcut removed; the project remains in Projects. Three GitHub descriptions are based on public README files.

## v0.8.5 theme and dialogue patch
- About Me last-updated date: 10-28-2026.
- Properties dialogs use light/dark theme.
- Luclid-ii close conversation uses a retro confirmation dialog.
- Luclid-ii message history scrolls independently of the header.
- Luclid-ii About links directly to the public repository.
- Browser AI response quality remains experimental and requires additional testing.
