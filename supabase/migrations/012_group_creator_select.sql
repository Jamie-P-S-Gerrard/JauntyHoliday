-- Creating a group failed at the insert's RETURNING step: the owner
-- membership row is written by an AFTER-INSERT trigger, so at RETURNING
-- time is_group_member(id) is still false and the select policy hid the
-- brand-new row. Let creators always read groups they created.
drop policy "Members can read their groups" on public.groups;
create policy "Members and creator can read their groups" on public.groups
  for select using (is_group_member(id) or created_by = auth.uid());
