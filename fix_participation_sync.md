# Fixing Event Participation Sync

The issue where clicking "Participate" didn't reflect on the admin site was caused by a combination of two factors:
1. **Supabase Schema Cache**: The `events` and `event_participants` tables were missing from the PostgREST schema cache, preventing the API from seeing updates.
2. **Event ID Mismatch**: Reconstructed events (from bookings) used string IDs, while participant records used numeric IDs, causing them to not match in filters.

## Step 1: Refresh Supabase Schema Cache

Please run the following SQL command in your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql):

```sql
-- Refresh the API schema cache so it can see any new tables or structural changes
NOTIFY pgrst, 'reload schema';
```

> [!IMPORTANT]
> If you haven't recently run the `supabase_setup.sql` script, please ensure all tables are created by running the following section first:
> ```sql
> -- Ensure Events tables exist
> create table if not exists public.events (
>   id          bigserial primary key,
>   name        text not null,
>   date        date not null,
>   start_time  time not null,
>   end_time    time not null,
>   type        text not null,
>   courts      integer[] not null,
>   created_at  timestamptz default now()
> );
> 
> create table if not exists public.event_participants (
>   id          bigserial primary key,
>   event_id    bigint references public.events(id) on delete cascade not null,
>   user_id     uuid references auth.users(id) on delete set null,
>   user_email  text not null,
>   player      text not null,
>   joined_at   timestamptz default now()
> );
> 
> -- Refresh after creation
> NOTIFY pgrst, 'reload schema';
> ```

## Step 2: Code Enhancements Applied

I have updated the following files to ensure the system is more robust:

1. **`js/store.js`**: 
   - Improved `addEventParticipant` to handle "ghost events" (reconstructed string IDs) gracefully.
   - Added duplicate prevention for both local cache and database transitions.
   - Ensured optimistic updates work even if the database is temporarily unreachable.
2. **`js/admin.js` & `js/app.js`**:
   - Fixed the filtering logic to consistently compare IDs using string conversion.
   - Added support for both `eventId` and `event_id` field names to prevent mapping misses.

## Verification

To verify the fix:
1. Refresh both your user portal and admin portal tabs.
2. Click "Participate" on an event in the user portal.
3. Check the Admin portal (Events module). You should see the participant's name appear in real-time.
