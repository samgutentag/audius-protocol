-- Add new ddl changes to the bottom of the file.
-- Wrap your changes with begin; / commit;
-- Every change needs to be idempotent!

-- helper function to make add column if not exists faster
CREATE OR REPLACE FUNCTION table_has_column(text, text) RETURNS boolean AS $$
  SELECT EXISTS (SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2)
$$ LANGUAGE SQL;

-- helper function to make add constraint if not exists easier
CREATE OR REPLACE FUNCTION table_has_constraint(text, text) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = $1::regclass AND conname = $2)
$$ LANGUAGE SQL;

-- 3/28/23: add is_available to users table
BEGIN;
  DO $$ BEGIN
  IF NOT table_has_column('users', 'is_available') THEN

      alter table users
      add column if not exists is_available boolean not null default true;

  END IF;
  END $$;
COMMIT;


-- 3/29/23: define `to_timestamp_safe`
begin;
  CREATE OR REPLACE FUNCTION to_timestamp_safe(p_timestamp VARCHAR, p_format VARCHAR)
  RETURNS TIMESTAMP
  LANGUAGE plpgsql
  as $$
  DECLARE
      ret_timestamp TIMESTAMP;
  BEGIN
      IF p_timestamp = '' THEN
          RETURN NULL;
      END IF;
      RETURN to_timestamp( p_timestamp, p_format );
  EXCEPTION
  WHEN others THEN
      RETURN null;
  END;
  $$;
commit;

-- 4/4/23: drop blocks_copy
begin;
  drop table if exists blocks_copy;
commit;

-- 4/10/23: inverse supporter rank up and supporting rank up notifications
-- context: supporter rank up and supporting rank up notifications were
-- reversed when we first added them to the handle_supporter_rank_up.sql trigger.
-- this migration is meant to swap those types for any notification made when this migration
-- was first run. we indicate whether the entry is from when a migration was first run
-- by looking at whether type_v2 is null. supporter/ing_rank_up notifications
-- created after this migration was run should have type_v2 as not null
-- (see handle_supporter_rank_ups.sql)
begin;

    DO $$ BEGIN
    IF NOT table_has_column('notification', 'type_v2') THEN

      alter table notification
      add column if not exists type_v2 varchar default null;

    END IF;
    END $$;

    -- Step 1: Change 'supporting_rank_up' to temporary value 'temp_rank_up'
    update notification n
    set type = 'temp_rank_up', type_v2 = 'temp_rank_up', group_id = 'temp_rank_up' || substring(group_id from position(':' in group_id))
    where type = 'supporting_rank_up' and type_v2 is null;

    -- Step 2: Change 'supporter_rank_up' to 'supporting_rank_up'
    update notification n
    set type = 'supporting_rank_up', type_v2 = 'supporting_rank_up', group_id = 'supporting_rank_up' || substring(group_id from position(':' in group_id))
    where type = 'supporter_rank_up' and type_v2 is null;

    -- Step 3: Change temporary value 'temp_rank_up' to 'supporter_rank_up'
    update notification n
    set type = 'supporter_rank_up', type_v2 = 'supporter_rank_up', group_id = 'supporter_rank_up' || substring(group_id from position(':' in group_id))
    where type = 'temp_rank_up' and type_v2 = 'temp_rank_up';

commit;

-- 4/13/23: add is_storage_v2 to users table
BEGIN;
    DO $$ BEGIN
    IF NOT table_has_column('users', 'is_storage_v2') THEN
        alter table users
        add column if not exists is_storage_v2 boolean not null default false;
    END IF;
    END $$;
COMMIT;

-- 4/18/23: add is_available index
begin;
    create index if not exists users_is_available_false_idx on users (is_available) where is_available = false;
commit;

-- 4/25/23: add duration to tracks table
BEGIN;
    DO $$ BEGIN
    IF NOT table_has_column('tracks', 'duration') THEN
        alter table tracks
        add column if not exists duration integer default 0;
    END IF;
    END $$;
COMMIT;

-- 4/26/23: create app delegates table
begin;
  create table if not exists public.app_delegates (
    address varchar primary key not null,
    blockhash varchar references blocks(blockhash),
    blocknumber integer references blocks(number),
    user_id integer,
    name varchar not null,
    is_personal_access boolean not null default false,
    is_revoked boolean not null default false,
    created_at timestamp not null,
    txhash varchar not null
  );
commit;

-- 4/26/23: add AI columns
BEGIN;
    DO $$ BEGIN
    IF NOT table_has_column('tracks', 'ai_attribution_user_id') THEN
        alter table tracks
        add column if not exists ai_attribution_user_id integer;

        alter table users
        add column if not exists allow_ai_attribution boolean not null default false;
    END IF;
    END $$;
COMMIT;

-- 5/1/23: add ai_attribution_user_id index

BEGIN;
    create index if not exists tracks_ai_attribution_user_id on tracks (ai_attribution_user_id, is_current) where is_current = true and ai_attribution_user_id is not null;
COMMIT;


-- 5/4/23: strip newline for cid
BEGIN;
  UPDATE "tracks"
  SET "track_cid" = regexp_replace(trim("track_cid"), E'\\s+', '', 'g')
  WHERE is_current = true AND LENGTH(track_cid) = 47 AND track_cid LIKE 'Qm%';
COMMIT;

-- 5/4/23: create delegations table
BEGIN;
  create table if not exists public.delegations (
    shared_address varchar not null,
    blockhash varchar references blocks(blockhash),
    blocknumber integer references blocks(number),
    delegate_address varchar not null,
    user_id integer not null,
    is_revoked boolean not null default false,
    is_current boolean not null,
    is_approved boolean not null default false,
    updated_at timestamp not null,
    created_at timestamp not null,
    txhash varchar not null,
    primary key (shared_address, is_current, txhash)
  );
COMMIT;

-- 5/4/23: fix app_delegates table to support revokes
BEGIN;
    alter table app_delegates
    add column if not exists is_current boolean not null;

    alter table app_delegates
    add column if not exists updated_at timestamp not null;

    DO $$ BEGIN
    IF NOT table_has_column('app_delegates', 'is_delete') THEN
      alter table app_delegates rename column is_revoked to is_delete;
    END IF;
    END $$;
    
    DO $$ BEGIN
    IF
      table_has_constraint('app_delegates', 'app_delegates_pkey') AND
      NOT table_has_constraint('app_delegates', 'app_delegates_primary_key')
    THEN
      alter table app_delegates drop constraint app_delegates_pkey;
      alter table app_delegates add constraint app_delegates_primary_key primary key (address, is_current, txhash);    
    END IF;
    END $$;
COMMIT;

-- 5/23/23: Fix skreamizm
BEGIN;
  DO $$ BEGIN
  -- Gate for only prod
  IF EXISTS (SELECT * FROM "blocks" WHERE "blockhash" = '0x8d5e6984014505e1e11bcbb1ca1a13bcc6ae85ac74014710a73271d82ca49f01') THEN
    INSERT INTO users
    (blockhash, user_id, is_current, handle, wallet, name, bio, location, metadata_multihash, creator_node_endpoint, blocknumber, is_verified, created_at, updated_at, handle_lc, cover_photo_sizes, profile_picture_sizes, primary_id, secondary_ids, txhash)
    VALUES
    ('0x8d5e6984014505e1e11bcbb1ca1a13bcc6ae85ac74014710a73271d82ca49f01', 433967780, true, 'skreamizm', '0x6ec71440333d343969b4d39ffeb4a414cdc685ca', 'Skream', 'Skream.', 'Croydon', 'QmQDwnKmBEScRv4Y1dwJWarLcMqB6LQSPzcAt6CvgJVZiE', 'https://creatornode2.audius.co,https://blockdaemon-audius-content-05.bdnodes.net,https://cn3.mainnet.audiusindex.org', 31420186, true, '2023-03-15 17:07:37', '2023-03-15 17:07:37', 'skreamizm', null, 'QmaAzdXCrHA6C4Uo8vXEpPRbhbhD8vqgrTATC7hyMj3c4A', 2, ARRAY [47,70], '0xa25516594adc42562e498b2c9f4e4365c9cbfea223a4e55624ae0ac316708a62') ON CONFLICT DO NOTHING;
    INSERT INTO follows
    (blockhash, blocknumber, follower_user_id, followee_user_id, is_current, is_delete, created_at, txhash)
    VALUES
    ('0xc26c84a6e595c106f9f73b7657e4968a984dd4b6b72d9b62caaf7d2bac870f1d', 31420284, 433967780, 90136, true, false, '2023-03-15 17:07:37', '0xdb4e0fb0cea20175fd72ddd16db77cbbcdb59fd2cd0f3c2c2576669a0a577832') ON CONFLICT DO NOTHING;
    INSERT INTO follows
    (blockhash, blocknumber, follower_user_id, followee_user_id, is_current, is_delete, created_at, txhash)
    VALUES
    ('0xc26c84a6e595c106f9f73b7657e4968a984dd4b6b72d9b62caaf7d2bac870f1d', 31420284, 433967780, 117827, true, false, '2023-03-15 17:07:37', '0x9a53ad76f1620f4d29037fe8fe5198f64e25cd1ec748f834742ad941fdcca035') ON CONFLICT DO NOTHING;
    INSERT INTO follows
    (blockhash, blocknumber, follower_user_id, followee_user_id, is_current, is_delete, created_at, txhash)
    VALUES
    ('0xc26c84a6e595c106f9f73b7657e4968a984dd4b6b72d9b62caaf7d2bac870f1d', 31420284, 433967780, 67658, true, false, '2023-03-15 17:07:37', '0xcd8555cf9d6af4b453514d2ea499ce70a5a8252fb6c26ef6280aba49e874aafd') ON CONFLICT DO NOTHING;
    INSERT INTO follows
    (blockhash, blocknumber, follower_user_id, followee_user_id, is_current, is_delete, created_at, txhash)
    VALUES
    ('0xc26c84a6e595c106f9f73b7657e4968a984dd4b6b72d9b62caaf7d2bac870f1d', 31420284, 433967780, 395602, true, false, '2023-03-15 17:07:37', '0x20b59b2981b01e53892fb49c4bf4fee98d92332db72bbd017b8084c6f23e5593') ON CONFLICT DO NOTHING;
    INSERT INTO follows
    (blockhash, blocknumber, follower_user_id, followee_user_id, is_current, is_delete, created_at, txhash)
    VALUES
    ('0xc26c84a6e595c106f9f73b7657e4968a984dd4b6b72d9b62caaf7d2bac870f1d', 31420284, 433967780, 51, true, false, '2023-03-15 17:07:37', '0x0f7be324622bb0048afcc8d960386f827ae8a15f81bed4b2e51e47e080ed6f5a') ON CONFLICT DO NOTHING;
    INSERT INTO follows
    (blockhash, blocknumber, follower_user_id, followee_user_id, is_current, is_delete, created_at, txhash)
    VALUES
    ('0xc26c84a6e595c106f9f73b7657e4968a984dd4b6b72d9b62caaf7d2bac870f1d', 31420284, 433967780, 53770, true, false, '2023-03-15 17:07:37', '0xd2c9f10ec4fd12ad9993fec399c08ff926a6fb4cd56a692b883390ede29f51a0') ON CONFLICT DO NOTHING;
  END IF;
  END $$;
COMMIT;
