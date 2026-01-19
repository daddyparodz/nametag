# Relationship Types

This document explains how relationship types are created, how to modify them,
and how the UI shows translated labels.

## Where relationship types come from

Default relationship types are defined in:
- `lib/relationship-types.ts` (used when a new user is created)
- `prisma/seed.production.ts` (ensures defaults exist for existing users)
- `prisma/seed.ts` (demo/dev seed)

Each default type has:
- `name`: stable internal identifier (e.g. `PARENT`)
- `label`: the default English label stored in the DB
- `color`: the default color used in the UI
- inverse relationship (via `inverseName` or symmetric flag)

## How translations work in the UI

The UI does not translate everything blindly. It uses a mapping based on
the type `name` only when the label is still the default English label.

The mapping lives in:
- `lib/relationship-type-labels.ts`
- `locales/en.json`, `locales/es-ES.json`, `locales/it-IT.json` under
  `relationshipTypes.defaults`

Logic summary:
- If a relationship type has a custom label, the UI shows that label as-is.
- If the label matches the default English label for a known `name`, the UI
  shows the translated label for the current locale.
- Unknown `name` values always show the stored label.

This is why labels used to appear in English: the UI was rendering the DB
label directly without a translation mapping.

## Adding a new default relationship type

1) Add it to `lib/relationship-types.ts`
2) Add it to `prisma/seed.production.ts`
3) Add it to `prisma/seed.ts` (dev/demo)
4) Add it to `lib/relationship-type-labels.ts`
5) Add translations in:
   - `locales/en.json`
   - `locales/es-ES.json`
   - `locales/it-IT.json`
   under `relationshipTypes.defaults`

## Modifying or removing a default type

- Change its `label` or `color` in the same files above.
- If you remove a type, also remove its translation keys and mapping.
- For existing users, adjust `prisma/seed.production.ts` to backfill or
  delete records as needed.

## Default colors

Each default type ships with a color. Users can still edit the type in the UI
to set their own color. The production seed only updates colors when a type is
missing a color or was created with an older default color.

## Applying changes in a running environment

For existing users, run:
- `npm run seed:prod`

Then rebuild/redeploy the Docker image to pick up UI and server changes.
