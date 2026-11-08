---
title: 'Markdown formatting'
description: 'Internal links, mentions, tags and Markdown formatting in Owlbear’s DMH.'
order: 20
---

# Markdown formatting

## Internal links

Link to other entities in your campaign with `[title](type://id)`:

- `[Note Title](note://123)` — link to a note
- `[Module Name](module://123)` — link to a module
- `[Party Name](party://123)` — link to a party
- `[Pawn Name](pawn://123)` — link to a pawn
- `[Encounter Name](encounter://123)` — link to an encounter

## Entity mentions

Use the mention buttons in the editor toolbar to link a note, module, party,
pawn, or encounter. Mentions use the same internal-link syntax:

`[Tavern](note://123)` mentions the Tavern note.

## Tags

Type `#` in the editor to search or create a tag, or write a hashtag directly.
Tags are collected in the note options menu.

- `#tavern` adds the “tavern” tag.
- `# Heading` headings such as this are not treated as tags.

## Markdown

Basic Markdown formatting:

| Syntax                           | Result                    |
| -------------------------------- | ------------------------- |
| `**bold**`                       | **Bold text**             |
| `*italic*`                       | _Italic text_             |
| `# Heading`                      | Section heading           |
| `- item`                         | Bullet list               |
| `1. item`                        | Numbered list             |
| `- [ ] Task item` / `- [x] Done` | Task list with checkboxes |

Task lists written as `- [ ]` or `- [x]` render as disabled checkboxes.
