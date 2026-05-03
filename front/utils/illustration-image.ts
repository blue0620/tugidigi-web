import type { Illustration } from '~/types/domain';

const paddedPage = (page: number) => String(page).padStart(7, '0');

export const illustrationCropUrl = (illustration: Illustration, height?: number) => {
  if (!illustration.pid || !illustration.page) return '';
  const region = `pct:${illustration.x || 0},${illustration.y || 0},${illustration.w || 100},${illustration.h || 100}`;
  const size = height ? `,${height}` : 'full';
  return `https://www.dl.ndl.go.jp/api/iiif/${encodeURIComponent(illustration.pid)}/R${paddedPage(illustration.page)}/${region}/${size}/0/default.jpg`;
};
