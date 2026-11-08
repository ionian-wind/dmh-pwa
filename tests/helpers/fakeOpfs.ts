type FakeEntry = FakeFileHandle | FakeDirectoryHandle;

export class FakeFileHandle {
  kind = 'file' as const;

  constructor(
    public name: string,
    public blob: Blob = new Blob(),
  ) {}

  async getFile(): Promise<File> {
    return new File([this.blob], this.name, {
      type: this.blob.type,
      lastModified: this.blob instanceof File ? this.blob.lastModified : 1,
    });
  }

  async createWritable() {
    const parts: BlobPart[] = [];
    const handle = this;

    return {
      async write(data: BlobPart) {
        parts.push(data);
      },
      async close() {
        handle.blob = new Blob(parts, { type: handle.blob.type });
      },
      async abort() {
        // No-op for the fake.
      },
    };
  }
}

export class FakeDirectoryHandle {
  kind = 'directory' as const;
  children = new Map<string, FakeEntry>();

  constructor(public name = 'root') {}

  async getDirectoryHandle(
    name: string,
    options: { create?: boolean } = {},
  ): Promise<FakeDirectoryHandle> {
    const existing = this.children.get(name);
    if (existing) {
      if (existing.kind !== 'directory') {
        throw new DOMException('Not a directory', 'TypeMismatchError');
      }
      return existing;
    }
    if (!options.create) {
      throw new DOMException('Not found', 'NotFoundError');
    }
    const directory = new FakeDirectoryHandle(name);
    this.children.set(name, directory);
    return directory;
  }

  async getFileHandle(
    name: string,
    options: { create?: boolean } = {},
  ): Promise<FakeFileHandle> {
    const existing = this.children.get(name);
    if (existing) {
      if (existing.kind !== 'file') {
        throw new DOMException('Not a file', 'TypeMismatchError');
      }
      return existing;
    }
    if (!options.create) {
      throw new DOMException('Not found', 'NotFoundError');
    }
    const file = new FakeFileHandle(name);
    this.children.set(name, file);
    return file;
  }

  async removeEntry(
    name: string,
    options: { recursive?: boolean } = {},
  ): Promise<void> {
    const entry = this.children.get(name);
    if (!entry) throw new DOMException('Not found', 'NotFoundError');
    if (entry.kind === 'directory' && !options.recursive) {
      throw new DOMException(
        'Directory is not empty',
        'InvalidModificationError',
      );
    }
    this.children.delete(name);
  }

  async *values() {
    for (const entry of this.children.values()) {
      yield entry;
    }
  }

  async *entries(): AsyncGenerator<[string, FakeEntry]> {
    for (const [name, entry] of this.children) {
      yield [name, entry];
    }
  }
}

export interface FakeOpfs {
  root: FakeDirectoryHandle;
  storage: {
    getDirectory: () => Promise<FakeDirectoryHandle>;
    estimate: () => Promise<{ usage: number; quota: number }>;
    persisted: () => Promise<boolean>;
    persist: () => Promise<boolean>;
  };
  restore: () => void;
}

export function installFakeOpfs(): FakeOpfs {
  const root = new FakeDirectoryHandle('root');
  const storage = {
    getDirectory: async () => root,
    estimate: async () => ({ usage: 1024, quota: 10 * 1024 }),
    persisted: async () => false,
    persist: async () => true,
  };
  const original = Object.getOwnPropertyDescriptor(navigator, 'storage');

  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: storage,
  });

  return {
    root,
    storage,
    restore: () => {
      if (original) {
        Object.defineProperty(navigator, 'storage', original);
      } else {
        delete (navigator as any).storage;
      }
    },
  };
}
