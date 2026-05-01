-- Migration: Add fine amounts to rooms
alter table public.rooms add column if not exists am_fine_amount numeric default 50;
alter table public.rooms add column if not exists pm_fine_amount numeric default 50;
