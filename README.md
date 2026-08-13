# BellesPinBoutique91 Event Page

Standalone static event page for the BellesPinBoutique91 Disney pin trading community monthly event.

## Files

- `index.html` - event page markup
- `styles.css` - page styling
- `assets/event-flyer.png` - flyer image used on the page

## Preview

Open `index.html` directly in a browser, or serve the folder with any static file server.

Vendor logos and table placement can be added later in the `#vendors` section.

## Admin Editor

The private editor is available at `/admin` after deployment. The table field is
free-form and supports one table, a range, or non-adjacent tables, such as `1`,
`1-2`, or `3, 4, 5`.

Before using it, run `supabase-setup.sql` in the Supabase SQL Editor and create
an admin user in Supabase Authentication. The website uses the public anon key
only; never add the Supabase service role key to this repo.

Rerun `supabase-setup.sql` after updates that add new admin fields. It is written
to be safe to rerun and now creates vendor placement fields, event information,
header branding, upcoming events, flyer storage, marker types, and map click behavior.
