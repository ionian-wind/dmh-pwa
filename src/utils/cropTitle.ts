export function cropTitle(title: string, max = 25): string {
  return title.length > max ? title.slice(0, max) + '…' : title;
}
