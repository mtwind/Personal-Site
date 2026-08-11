-- ─────────────────────────────────────────────────────────────────────
-- Starter ads: things the owner actually does, written as ad copy.
--
-- Every brand here has a Simple Icons slug, so each one renders with a
-- real logo rather than the initial-tile fallback. Keywords are the
-- targeting surface — a search for "skiing" should turn up the snow ad.
--
-- Guarded on the table being empty so this seeds a fresh database and
-- does nothing to one that already has ads in it.
-- ─────────────────────────────────────────────────────────────────────

insert into public.ads
  (brand, headline, description, display_url, target_url,
   icon_slug, color, keywords, slots, sort_order)
select *
from (
  values
    (
      'Burton'::text,
      'Snowboards Built for Deep Days'::text,
      'Boards, boots and bindings for everything the mountain does in February.'::text,
      'www.burton.com'::text,
      'https://www.burton.com/'::text,
      'burton'::text,
      '#000000'::text,
      '["ski","skiing","snowboard","snowboarding","snow","mountain","mountains","winter","powder","slopes","resort","alpine"]'::jsonb,
      '["sponsored","rail","banner"]'::jsonb,
      0::integer
    ),
    (
      'AllTrails',
      'Find Your Next Trail',
      'Over 450,000 routes with maps, photos and reviews from people who walked them.',
      'www.alltrails.com',
      'https://www.alltrails.com/',
      'alltrails',
      '#142800',
      '["hike","hiking","hikes","trail","trails","backpacking","walk","walking","summit","outdoors","nature","map","maps"]',
      '["sponsored","rail","banner"]',
      1
    ),
    (
      'Strava',
      'Every Run and Ride, Recorded',
      'Track the effort, watch the numbers move, and argue about segments afterwards.',
      'www.strava.com',
      'https://www.strava.com/',
      'strava',
      '#FC4C02',
      '["run","running","runner","cycling","bike","biking","ride","training","fitness","marathon","workout","endurance","cardio"]',
      '["sponsored","rail","banner"]',
      2
    ),
    (
      'The North Face',
      'Gear That Outlasts the Forecast',
      'Shells, insulation and packs for weather that had other plans.',
      'www.thenorthface.com',
      'https://www.thenorthface.com/',
      'thenorthface',
      '#000000',
      '["gear","jacket","outdoor","outdoors","camping","camp","backpack","cold","expedition","hiking","climbing","travel"]',
      '["sponsored","rail","banner"]',
      3
    ),
    (
      'Garmin',
      'Know Exactly Where You Went',
      'GPS watches that turn a morning outside into data you can actually read.',
      'www.garmin.com',
      'https://www.garmin.com/',
      'garmin',
      '#000000',
      '["gps","watch","navigation","tracking","data","metrics","running","hiking","cycling","altitude","technology"]',
      '["sponsored","rail","banner"]',
      4
    ),
    (
      'NBA',
      'League Pass — Every Game, Live',
      'Follow the whole season, including the games nobody else stayed up for.',
      'www.nba.com',
      'https://www.nba.com/',
      'nba',
      '#253B73',
      '["basketball","sports","sport","nba","hoops","game","games","playoffs","team","teams","league"]',
      '["sponsored","rail","banner"]',
      5
    )
) as seed (
  brand, headline, description, display_url, target_url,
  icon_slug, color, keywords, slots, sort_order
)
where not exists (select 1 from public.ads);
