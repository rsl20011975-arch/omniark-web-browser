# Local Browser — P0 compatibility probe

Approved design: ../../outputs/Aside 로컬 브라우저 구현 설계.md

This repository starts the approved Chromium-based browser project. P0 currently
uses an **unmodified official Chromium snapshot**, not our own source build.
Full Chromium compilation is pending a volume with at least 100 GB free.
No claim of Aside parity or general bot-detection immunity is made by this probe.

## Structure

- browser/: upstream version, acquisition and dedicated-profile launch
- research/: rendered-page extraction with provenance
- config/: test inputs and paths
- evidence/: private local observations (ignored)
- profiles/: dedicated user authentication state (ignored)
- runtime/: downloaded official binary (ignored)

## P0 contract

Input: pinned upstream revision, dedicated profile, user-approved page URL.
Output: JSON evidence containing runtime identity, timestamp, source URL,
status, content count and SHA256, plus an actual artifact where applicable.
Statuses: PASS, FAIL, BLOCKED, WAITING_USER, NOT_RUN. No empty PASS.

Gates: Google web login; Flow image generation and downloaded image; rendered
public-page extraction; authenticated-page extraction. These are distinct gates.
Google browser sync, passkeys, custom Chromium patches and universal website
compatibility are not proven by Google web login.

Authentication is manual. No credentials, cookies or tokens enter evidence or git.
Never terminate another profile, copy an existing profile, retry a rejected Flow
submission, or disguise automation signals. One new generation at a time; an
uncertain submission must be reconciled before any new submission.

Research stores only the specifically requested visible document, not background
tabs or browsing history. Login pages are excluded from extraction.

## Commands

Run from this directory using Python 3.12:

    python -m browser.acquire
    python -m browser.launch

Runtime and profile paths are relative to this repository. The launcher records
its PID and opens Flow in a separate browser. Do not use system-wide kill commands.

## Build constraint source

https://chromium.googlesource.com/chromium/src/+/main/docs/windows_build_instructions.md
Official minimum: 100 GB free NTFS disk, 8 GB RAM, VS 2026 C++/ATL/MFC.
Initial measured disk free: C 60.5, D 50.8, E 54.7, F 40.7 GiB.

## Windows blank-page repair (2026-10-18)

Startup logs reproduced `Sandbox cannot access executable` (access denied 0x5)
and a NetworkService restart on both Flow and chromium.org. The downloaded
runtime lacked app-container read/execute permissions. Acquisition now grants RX
only to `runtime/chrome-win`, after backing up its ACL. Profiles are excluded.
Sandbox disabling is not used. Source: https://pptr.dev/troubleshooting#chrome-reports-sandbox-errors-on-windows

After granting runtime permissions and relaunching after a user reboot, the local
target endpoint reported Google's sign-in page. Flow/about and Google's sign-in
JavaScript were loaded according to startup logs. This proves progress past the
blank-page failure, not successful authentication or generation.

The active manually relaunched profile is `profiles/diagnostic`, port 19263.
`profiles/p0` remains preserved. Never infer a live session from a stale
DevToolsActivePort file after reboot. Verify the owning process before attachment.
The current native UI tool cannot reliably resolve this Chromium's URL; a failed
policy check must not be bypassed with another UI automation transport.
