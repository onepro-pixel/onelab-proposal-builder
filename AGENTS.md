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
- PDF export uses browser print with A4 print CSS; why: no server-side PDF dependency on the Worker runtime.
- Public share reads go through the SECURITY DEFINER rpc get_shared_proposal; why: no anon SELECT policy on proposals.
- Access is limited to @onelab.se emails in RLS (is_onelab()) and in the auth gate; why: internal tool.
- AI settings (services, standard texts, tone) live in the single-row app_settings table; why: editable from the settings page without deploys.
- AI revisions use the saved current document and preserve its contact; why: follow-up prompts must keep prior edits rather than restart from meeting notes.
- Examination contents are shared by the renderer and AI prompt in a browser-safe catalog; why: editor, public share, print and generated package descriptions stay consistent.
- Gateway calls stream structured Responses output inside a server-only helper with request-local run IDs; why: keep credentials private and prevent invalid schemas or duplicate automatic retries.
