-- Storage Buckets & Policies
-- Spec reference: §3 Storage buckets

-- 1. Create the two private storage buckets
insert into storage.buckets (id, name, public)
values 
  ('proofs', 'proofs', false),
  ('documents', 'documents', false)
on conflict (id) do nothing;

-- 2. Storage RLS Policies for 'proofs' (owner read/write only)
create policy "proofs_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'proofs'
    and (auth.uid() = owner or auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "proofs_owner_select" on storage.objects
  for select using (
    bucket_id = 'proofs'
    and (auth.uid() = owner or auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "proofs_owner_update" on storage.objects
  for update using (
    bucket_id = 'proofs'
    and (auth.uid() = owner or auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "proofs_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'proofs'
    and (auth.uid() = owner or auth.uid()::text = (storage.foldername(name))[1])
  );

-- 3. Storage RLS Policies for 'documents' (owner read/write only)
create policy "documents_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (auth.uid() = owner or auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "documents_owner_select" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (auth.uid() = owner or auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "documents_owner_update" on storage.objects
  for update using (
    bucket_id = 'documents'
    and (auth.uid() = owner or auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "documents_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (auth.uid() = owner or auth.uid()::text = (storage.foldername(name))[1])
  );
