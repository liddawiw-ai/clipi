// Only format the structured prefix written by the wallet. Contact labels and replies are user data.
export function rewardDetail(detail,unit,locale){
  const match=/^(\d+)\.(\d{2}) USD · (.*)$/s.exec(detail);
  const current=/^(\d+) نقطة · (.*)$/s.exec(detail);
  if(!match&&!current)return detail;
  const points=match?Number(match[1]+match[2]):Number(current[1]);
  return points.toLocaleString(locale)+' '+unit+' · '+(match?match[3]:current[2]);
}
