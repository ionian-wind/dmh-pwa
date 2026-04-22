import { roll } from './roller';
import { RV } from './randvar';

class __D_BASE {
  __mul__(other: number): RV {
    return roll(other);
  }

  __rmul__(other: number): D_WITH_LEFT {
    return new D_WITH_LEFT(other);
  }
}

class D_WITH_LEFT {
  left: number;

  constructor(left: number) {
    this.left = left;
  }

  __mul__(other: number): RV {
    return roll(this.left, other);
  }
}

export const D = new __D_BASE();