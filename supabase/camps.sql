-- Camps are their own category (Evan, 2026-11-17). Run once in the Supabase SQL editor.
-- 1) A theme column: what a camp is about (a Discover category, or 'All-around').
-- 2) Every live listing that is mainly a camp moves to Camps. Its subcategory
--    becomes WHEN it runs ('Summer weeks', 'School breaks', 'Overnight',
--    'Before & after care'; several are comma-separated), and its theme is
--    its subject. Listings that are mainly classes and also run camps
--    ("Kids Baking Classes, Camps & After-School") stay in their subject.
-- Until this runs, Discover reads When and Theme from each title instead.

alter table public.submissions add column if not exists camp_theme text;

update public.submissions s
set category = 'Camps', subcategory = v.sub, camp_theme = v.theme
from (values
  -- moved in from a subject category
  ('c35179a5-2dcb-4e98-8ea3-7f9a1fd776d9', 'School breaks', 'Cooking'),              -- Kids Culinary & Baking Camps (Winter Break)
  ('b5ca9f31-39f6-4893-b920-f3374a5d1082', 'Summer weeks', 'Cooking'),               -- Cooking Camps for Middle & High Schoolers
  ('d0363611-53b4-434b-9480-28be6a7983c5', 'Summer weeks', 'Cooking'),               -- Kids Baking & Cooking Camps
  ('470e90f3-5747-455c-9acd-2a537fc998ca', 'Summer weeks', 'Outdoor'),               -- Inclusive Nature-Based Summer Camp
  ('71554e1b-c6c3-4712-84f7-1475f695aaf1', 'Summer weeks', 'Outdoor'),               -- Youth Sailing Camps, Ages 8-12
  ('e204f3b6-9ebb-4c80-80eb-d41ddd290630', 'Summer weeks', 'Outdoor'),               -- Youth Summer Sailing Camps
  ('e95d7ac6-4f45-4a7e-a138-9a176cbb167f', 'Summer weeks', 'Outdoor'),               -- Kids Camp: Kayak, Paddleboard & Sail
  ('a7cd78c4-30e3-4282-8713-38733f00b29c', 'Summer weeks', 'Outdoor'),               -- Stand-Up Paddleboard Summer Day Camp
  ('e4874454-9974-4b8d-b204-640deb203c19', 'Summer weeks', 'Sports'),                -- Youth Ultimate Summer Camps
  ('e7fa3266-5521-49a3-b9a9-c67a92d671d7', 'Summer weeks', 'Sports'),                -- Youth Pickleball Summer Camp
  -- already in Camps: label When + Theme
  ('f7c9f055-547b-4876-8c5d-18c01becf022', 'School breaks', 'STEM'),                 -- STEM School-Break Day Camps
  ('eff5385b-85c5-4f5b-a652-9865562c1459', 'School breaks', 'All-around'),           -- Mid-Winter Break Day Camp (Steve & Kate's)
  ('5debf36f-c575-4ae0-8abb-61c717ef0197', 'Summer weeks', 'Sports'),                -- Nike Soccer Camp
  ('1d9e6828-02b9-43ff-ac8b-438bc16279d5', 'Summer weeks', 'All-around'),            -- Themed Preschool Summer Camps
  ('5a3ffd56-d320-4352-9555-6436c987c322', 'Summer weeks', 'All-around'),            -- Free South Park Summer Camp
  ('5e9cb9aa-7776-439f-87a7-d8509aea25bc', 'Summer weeks', 'STEM'),                  -- Camp Galileo STEAM
  ('e73c3007-66f2-4ab2-a84b-b8d48d82855c', 'Summer weeks', 'All-around'),            -- Burien Teen Summer Crew
  ('2d24e2e0-2224-4ac9-8429-7a968350575f', 'Summer weeks', 'All-around'),            -- Camp CRAZ
  ('1b381b24-3d84-48aa-b2ec-06ba53d3f230', 'Summer weeks', 'All-around'),            -- Summer Day Camp at High Point
  ('876ff0fe-ebd5-48ab-8e8b-cfed6ef4fc9c', 'Summer weeks', 'All-around'),            -- Summer Day Camp at Delridge
  ('bf2d2777-9b60-4cf1-bb20-ea7cb7ca2869', 'Summer weeks', 'All-around'),            -- Summer Fun Camp
  ('7b366a6b-abf3-44de-af73-45be9a0e058b', 'Summer weeks', 'All-around'),            -- The Little Gym: Super Quest & Skill Thrill
  ('6566bfd5-7781-487a-a4a9-285ced22f391', 'School breaks', 'All-around'),           -- The Little Gym: Winter Camp
  ('9c88909d-ae58-4344-bf33-959b53b3269d', 'Summer weeks', 'Martial Arts'),          -- Alpha Martial Arts summer camps
  ('070f5e24-5454-4405-867e-fa90695971ee', 'School breaks', 'STEM'),                 -- Pokemon LEGO Masters (Winter Camp)
  ('e55ba4ff-8eb3-4621-9221-9a9689a7ba4c', 'School breaks', 'STEM'),                 -- Minecraft Big Builders (Winter Camp)
  ('105d125c-3c24-4384-8f28-64beab934e5e', 'School breaks', 'Arts'),                 -- NeoArt: Spring Break
  ('f389c021-3320-431c-bde6-4bcc3b6eec08', 'School breaks', 'Arts'),                 -- NeoArt: MidWinter Break
  ('25a69365-e907-4033-b9a6-275fd12a6a3b', 'School breaks', 'Arts'),                 -- NeoArt: Winter Break
  ('710e4936-6cef-470a-ab23-f178af97bd7a', 'School breaks', 'Arts'),                 -- NeoArt: Thanksgiving Break
  ('0f367d3c-3740-47fb-976f-e58d31254e08', 'School breaks', 'All-around'),           -- Kids Co. Conference Week
  ('ba3a90dd-2505-4272-8778-385967351dc6', 'School breaks', 'Theater'),              -- SCT Drama Quest: Create a Festival (Dec)
  ('e4db8483-9851-4b80-9799-2e38f2555283', 'School breaks', 'Theater'),              -- SCT Costume Quest (Dec)
  ('2e21fdd0-86c7-4b83-b1fc-e9a4f69bfff7', 'School breaks', 'Theater'),              -- SCT Story Explorers
  ('8dcfa86e-d4dc-44f3-a0a2-12801b715c49', 'School breaks', 'Theater'),              -- SCT Drama Quest: Around the World
  ('e92064c9-f67b-4e0e-b0e2-a21bf4a3f772', 'Summer weeks', 'Martial Arts'),          -- Emerald City Karate: Secret Agent Camp (season not checked)
  ('d40b99c5-64ee-4652-8b06-80fd5c437525', 'Summer weeks, School breaks', 'Sports'), -- Skateboard Camps (Summer, Winter, Day)
  ('577a1b36-74b3-4d3b-a9f4-3ab2868c2f12', 'Before & after care', 'Arts'),           -- Gage Creative Care
  ('a000d770-25e7-42c1-b0c1-3e0ba98bea5a', 'Summer weeks, School breaks', 'Swimming'), -- Lake Union Swim: Summer and School Break Camps
  ('7654f746-0a8b-4ee6-abb9-1f92d530cf62', 'Overnight', 'All-around'),               -- YMCA Overnight (Colman & Orkila)
  ('1b111a3d-7b74-428e-80e5-652bca36ca34', 'Summer weeks', 'Arts')                   -- Gage Youth Summer Camps 2027
) as v(id, sub, theme)
where s.id::text = v.id;

notify pgrst, 'reload schema';
