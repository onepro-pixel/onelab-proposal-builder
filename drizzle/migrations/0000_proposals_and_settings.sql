CREATE OR REPLACE FUNCTION public.is_onelab()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(lower(auth.jwt() ->> 'email') LIKE '%@onelab.se', false)
$$;

CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  customer_name text NOT NULL,
  contact_person text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  content jsonb,
  share_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.proposals FOR SELECT TO authenticated USING (auth.uid() = user_id AND public.is_onelab());
CREATE POLICY "own insert" ON public.proposals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_onelab());
CREATE POLICY "own update" ON public.proposals FOR UPDATE TO authenticated USING (auth.uid() = user_id AND public.is_onelab());
CREATE POLICY "own delete" ON public.proposals FOR DELETE TO authenticated USING (auth.uid() = user_id AND public.is_onelab());

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER proposals_touch BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.get_shared_proposal(_token uuid)
RETURNS TABLE(customer_name text, contact_person text, content jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT customer_name, contact_person, content FROM public.proposals
  WHERE share_token = _token AND is_shared = true AND content IS NOT NULL
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_proposal(uuid) TO anon, authenticated;

CREATE TABLE public.app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  services text NOT NULL DEFAULT '',
  standard_texts text NOT NULL DEFAULT '',
  tone text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onelab read" ON public.app_settings FOR SELECT TO authenticated USING (public.is_onelab());
CREATE POLICY "onelab update" ON public.app_settings FOR UPDATE TO authenticated USING (public.is_onelab());
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.app_settings (id, services, standard_texts, tone) VALUES (1,
$s$HÄLSOUNDERSÖKNINGAR
- Bred hälsoundersökning: fysisk och digital. Fysisk och psykisk hälsa, blodtryck och syremättnad, relevanta blodprover, levnadsvanor, sömn, stress, arbetsmiljö och kvinnohälsa. Personlig återkoppling.
- Genomförs på arbetsplatsen. För distribuerade medarbetare finns samarbetskliniker, hemprovtagning och digitala upplägg.

LAGSTADGADE MEDICINSKA KONTROLLER
- Spirometri: lungfunktionstest vid exponering för damm, gaser eller kemikalier.
- Hörsel/audiometri: hörselkontroll vid bullerexponering.
- Vibrationer: screening ingår i OneLab Plus. Läkarledda vibrationstester med läkarintyg som tillägg.
- Nattarbete: hälsoundersökning för medarbetare som arbetar natt. Ingår i OneLab Plus.

TILLÄGG
- Synundersökning, PSA-prov.

HÄLSOPROGRAM
- Riktat, personligt stöd för individer med större eller långvariga behov. Plan tillsammans med OneLab, uppföljning över tid av sjuksköterska, psykolog eller läkare. Startas bara med kundens godkännande.

HR-PORTALEN
- Analysplattform: anonymiserade, aggregerade insikter, riskområden och rekommenderade åtgärder. OneLab AI ger rekommendationer.
- Medarbetarundersökningar och pulsverktyg.
- Sjuk- och friskanmälan med överblick över frånvaro.
- Dedikerad Customer Success Manager.
- Stöd i systematiskt arbetsmiljöarbete (SAM).

PRISMODELL (fast pris per person)
- OneLab Bas: från 1 990 kr/person. Fysisk och digital hälsoundersökning, personlig återkoppling och rådgivning, samtalsstöd över tid, personlig hälsoapp, HR-portal med analysplattform, dedikerad CSM.
- OneLab Plus: från 2 490 kr/person. Allt i Bas + utökade organspecifika markörer, vibrationsscreening, nattarbetsundersökning, medarbetarundersökningar inkl. pulsmätningar, sjuk- och friskanmälan.
- Tillägg per person: Spirometri 490 kr, Hörsel/audiometri 490 kr, Synundersökning 490 kr, PSA-test 490 kr, Läkarledda vibrationstester med läkarintyg 1 490 kr.
- Årskostnad = antal personer × styckpris. Ingen möjlighet till merkostnad.$s$,
$t$Kostnadskontroll: Kostnaden är priset per person – inget annat. Varken medarbetare eller OneLab kan skapa merkostnad. Insatser utanför avtalet startas bara med kundens godkännande.
Avslutning: Vi berättar gärna mer om hur vi kan skapa en hållbar och förebyggande företagshälsa för [kund].$t$,
$o$Saklig, varm och självsäker. Korta meningar. Fokus på förebyggande hälsa, tydlighet och kostnadskontroll. Undvik säljfloskler. Skriv "ni" till kunden.$o$);