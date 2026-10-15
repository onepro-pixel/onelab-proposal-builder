# Etapp 1: testplan innan driftsättning

## Förutsättningar
- Kör migreringen i en separat testmiljö eller efter uttryckligt godkännande av målmiljön.
- Uppdatera genererade Supabase TypeScript-typer så de motsvarar migreringen.
- Säkerställ att Vite-klienten får rätt publika Supabase-miljövariabler. Serverhemligheter får aldrig exponeras.
- Kör projektets TypeScript-kontroll och bygg. Kontrollera att routes `/workspace` och `/offers` fungerar.

## Behörighetstest (två företag)
Skapa A och B med separata administratörer och säljare. Logga in med respektive konto och verifiera:
1. Admin A ser alla A:s offerter men inga från B.
2. Säljare A ser enbart egna offerter, inte kollegans.
3. Säljare A kan skapa och uppdatera sin offert i A, men inte en kollegas.
4. Admin A kan läsa kollegornas offerter men inte ändra ägarskap genom klienten.
5. A:s användare kan inte skapa, läsa, uppdatera eller ta bort offerter i B ens genom direkta API-anrop.
6. En oinloggad användare får inte läsa tabellerna eller anropa create_organization.
7. En användare kan inte själv sätta rollen admin via organization_members.
8. Ändring av organization_id och owner_id på en befintlig offert avvisas.
9. En användare som saknar medlemskap ser inga företag eller offerter.
10. Organisationer kan skapas via create_organization av en inloggad användare och skaparen blir admin.

## Kvar innan release
- Testa databaspolicyer med faktiska autentiserade användare, inte service_role.
- Säker implementering för adminstyrda inbjudningar och medlemskap.
- Redigering och automatisk sparning av offertinnehåll.
- Verifiera åtkomst till eventuella filer och storage buckets.
- Uppdatera routning från demo till nya flödet först efter godkända tester.
- Ingen merge till huvudgrenen innan dessa punkter är klara.
