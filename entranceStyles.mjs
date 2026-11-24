// Numeric IDs travel in the existing ride column. Legacy true/1 is the welcome car.
export const entranceNames = ['', 'فيراري', 'مرسيدس', 'طائرة', 'منطاد', '', 'صاروخ'];
export const entranceOverrides = [0,3,4];
export function equippedEntrance(equipped) {
  if (!equipped?.ride) return 0;
  if (entranceOverrides.includes(equipped.entryStyle) && equipped.entryStyle) return equipped.entryStyle;
  if (equipped.ride==='دخول بسيارة') return 2;
  if (equipped.ride==='دخول بصاروخ') return 6;
  return 1;
}
export function incomingEntries(known,people,selfId) {
  const key=person=>person.uid+'/'+(person.entranceId||person.joined);
  const next=new Set(people.map(key));
  const arrivals=people.filter(person=>known ? !known.has(key(person)) : person.uid===selfId);
  return {known:next,arrivals};
}
