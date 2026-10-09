<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Proposal content is stored as one jsonb document (shape in src/lib/proposal-types.ts) and rendered by ProposalDocument for both editor and public share; why: one renderer keeps edit, share and print identical.
- PDF export uses browser print with reference-sized landscape pages for versioned offers and A4 for legacy documents; why: match the reference without a server-side PDF dependency.
- Public share reads go through the SECURITY DEFINER rpc get_shared_proposal; why: no anon SELECT policy on proposals.
- Access is limited to @onelab.se emails in RLS (is_onelab()) and in the auth gate; why: internal tool.
- AI settings (services, standard texts, tone) live in the single-row app_settings table; why: editable from the settings page without deploys.
- AI revisions use the saved current document and preserve its contact; why: follow-up prompts must keep prior edits rather than restart from meeting notes.
- Examination contents are shared by the renderer and AI prompt in a browser-safe catalog; why: editor, public share, print and generated package descriptions stay consistent.
- Uploaded product and whitepaper facts are curated into editable app settings rather than rereading PDFs at generation time; why: keep proposals grounded, fast and maintainable while current user prices override historical source prices.
- The AI revision form stays fixed beside the document on wide screens and collapsible at the bottom on narrow screens; why: adjustments remain available while scrolling without obscuring the document on wide screens.
- Gateway calls stream structured Responses output inside a server-only helper with request-local run IDs; why: keep credentials private and prevent invalid schemas or duplicate automatic retries.
- New proposals store an offer payload based on a browser-safe fixed-copy template; legacy proposals keep their original renderer and revision schema; why: adopt the reference layout without silently overwriting saved proposals.
- Extra services paginate in groups of four in the shared offer renderer; why: keep optional tests, prices and mandatory conditions readable in print.
