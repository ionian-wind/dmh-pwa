// Based on https://github.com/luukdv/color.js/

type Args = {
  amount: number;
  format: 'array' | 'hex';
  group: number;
  sample: number;
};

type Data = Uint8ClampedArray;

type Hex = string;

type Input = (Hex | Rgb)[];

type Output = Hex | Rgb | (Hex | Rgb)[];

type Rgb = [r: number, g: number, b: number];

const getArgs = ({
  amount = 3,
  format = 'array',
  group = 20,
  sample = 10,
} = {}): Args => ({ amount, format, group, sample });

const format = (input: Input, args: Args): Output => {
  const list = input.map((val) => {
    const rgb = Array.isArray(val) ? val : (val.split(',').map(Number) as Rgb);
    return args.format === 'hex' ? rgbToHex(rgb) : rgb;
  });

  return args.amount === 1 || list.length === 1 ? list[0] : list;
};

const group = (number: number, grouping: number): number => {
  const grouped = Math.round(number / grouping) * grouping;

  return Math.min(grouped, 255);
};

const rgbToHex = (rgb: Rgb): Hex =>
  '#' +
  rgb
    .map((val) => {
      const hex = val.toString(16);

      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('');

const getAverage = (data: Data, args: Args): Output => {
  const gap = 4 * args.sample;
  const amount = data.length / gap;
  const rgb = { r: 0, g: 0, b: 0 };

  for (let i = 0; i < data.length; i += gap) {
    rgb.r += data[i];
    rgb.g += data[i + 1];
    rgb.b += data[i + 2];
  }

  return format(
    [
      [
        Math.round(rgb.r / amount),
        Math.round(rgb.g / amount),
        Math.round(rgb.b / amount),
      ],
    ],
    args,
  );
};

const getProminent = (data: Data, args: Args): Output => {
  const gap = 4 * args.sample;
  const colors: { [key: string]: number } = {};

  for (let i = 0; i < data.length; i += gap) {
    const rgb = [
      group(data[i], args.group),
      group(data[i + 1], args.group),
      group(data[i + 2], args.group),
    ].join();

    colors[rgb] = colors[rgb] ? colors[rgb] + 1 : 1;
  }

  return format(
    Object.entries(colors)
      .sort(([_keyA, valA], [_keyB, valB]) => (valA > valB ? -1 : 1))
      .slice(0, args.amount)
      .map(([rgb]) => rgb),
    args,
  );
};

export const getColor = (data: Data, args?: Partial<Args>) =>
  getAverage(data, getArgs(args));
export const getPalette = (data: Data, args?: Partial<Args>) =>
  getProminent(data, getArgs(args));
