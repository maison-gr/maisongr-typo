# Security

[Français](SECURITY.md) · **English**

## Reporting a problem

Please report security problems privately, through GitHub: **Security → Report a vulnerability** on this repository. Don't open a public issue.

Say what you found, how to reproduce it, and what it lets someone do. You'll get a reply within a week, and a fix or a plan once the problem is confirmed. Reports are credited in the release notes unless you'd rather not be named.

## Supported versions

Security fixes go into the latest release.

## What the package does that matters here

- **`typeset()` and `check()`** read the string they are given and return a new one. They read no file, make no network request and keep nothing between calls. The patterns are written so they can't backtrack without end, and a test runs them on large hostile inputs (`test/performance.test.ts`); an input that makes one hang is a security bug.
- **In HTML**, only text between tags changes: tags, attributes, comments, entities and the contents of `<script>`, `<style>`, `<pre>` and `<code>` come back as written, so typesetting never turns text into markup. It is not a sanitiser: typeset HTML you trust, or sanitise it after.
- **The CLI** reads the files and folders it is given. `fix` writes those files and no others. It sends nothing anywhere.
