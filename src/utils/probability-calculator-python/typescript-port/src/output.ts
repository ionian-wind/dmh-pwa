import { T_ifsr, MetaSeq } from './typings';

export function output(
  rv: T_ifsr | null,
  named?: string | null,
  show_pdf?: boolean,
  blocks_width?: number | null,
  print_?: boolean,
  print_fn?: ((msg: string) => void) | null,
  cdf_cut?: number
): unknown {
  return null;
}

function _output_blank(
  named: string | null,
  blocks_width: number,
  print_: boolean,
  print_fn: ((msg: string) => void) | null
): unknown {
  return null;
}