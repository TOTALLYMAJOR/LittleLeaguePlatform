# Brand Governance

Team logo assets are metadata records until a storage provider is explicitly configured. Admins can register HTTPS logo URLs for review, but approved branding must still satisfy child-safety, sponsor-separation, and contrast rules.

Rules:

- Logos must use HTTPS URLs.
- Logos start in `pending` status and require admin review before family-facing use.
- Team branding cannot override safety, RSVP, schedule, or parent action clarity.
- Sponsor logos and team logos remain separate records.
- Rejected or removed logos should stay visible in audit evidence, not family views.

## Launch Validation

Before launch, create several published test brands with visibly different logos, banners, colors, and copy. Verify each published profile across these 20 surfaces:

1. Team logo
2. Team banner / hero image
3. Primary color
4. Secondary color
5. Accent / button color
6. Team display name
7. Team short name or abbreviation
8. Default team avatar/icon fallback
9. Team home/dashboard header
10. Navigation accents
11. Chat/message thread header
12. Announcement cards
13. Event/game schedule cards
14. RSVP buttons and status badges
15. Roster page header
16. Photo/gallery page header
17. Invite landing page
18. Invite emails
19. Announcement/reminder emails
20. Push notification team identity

Success means a coach can configure one team brand profile, publish it immediately, and have parents see the same brand across web, invite, email, and push surfaces without code changes or deployments per team. The token model must also remain portable to future iOS work.

## Monitoring

Track these events:

- `brand_profile_created`
- `brand_profile_updated`
- `brand_profile_published`
- `brand_asset_uploaded`
- `brand_asset_rejected`
- `brand_render_failed`
- `brand_fallback_used`

Alert when:

- Brand API error rate > 1%
- Brand asset upload failures spike
- Published brand missing required tokens
- Email rendering fails due to brand data
- Public invite page cannot load brand

After the first teams use the editor, ask coaches whether each field was clear, whether preview matched parent-visible output, whether publishing was easy, whether any brand areas were missing, and whether the final result felt like their team.
