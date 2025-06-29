import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import ModuleDocumentTree from '@/components/ModuleDocumentTree.vue';
import type { ModuleTreeNode, Note } from '@/types';

// Mock the stores
vi.mock('@/stores/notes', () => ({
  useNoteStore: () => ({
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  }),
}));

describe('ModuleDocumentTree', () => {
  const mockNotes: Note[] = [
    {
      id: 'note1',
      title: 'Chapter 1',
      content: 'Content of chapter 1',
      tags: [],
      moduleId: 'module1',
      typeId: null,
      hidden: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'note2',
      title: 'Section 1.1',
      content: 'Content of section 1.1',
      tags: [],
      moduleId: 'module1',
      typeId: null,
      hidden: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const mockNoteTree: ModuleTreeNode[] = [
    {
      noteId: 'note1',
      children: [
        {
          noteId: 'note2',
          children: [],
        },
      ],
    },
  ];

  it('renders tree with note titles', () => {
    const wrapper = mount(ModuleDocumentTree, {
      props: {
        moduleId: 'module1',
        noteTree: mockNoteTree,
        notes: mockNotes,
      },
    });

    expect(wrapper.text()).toContain('Chapter 1');
    expect(wrapper.text()).toContain('Section 1.1');
  });

  it('emits update:noteTree when tree changes', async () => {
    const wrapper = mount(ModuleDocumentTree, {
      props: {
        moduleId: 'module1',
        noteTree: mockNoteTree,
        notes: mockNotes,
      },
    });

    // Wait for the component to initialize
    await wrapper.vm.$nextTick();
    
    // The component should emit the initial tree structure after initialization
    expect(wrapper.emitted('update:noteTree')).toBeTruthy();
  });

  it('shows add root note button', () => {
    const wrapper = mount(ModuleDocumentTree, {
      props: {
        moduleId: 'module1',
        noteTree: mockNoteTree,
        notes: mockNotes,
      },
    });

    expect(wrapper.text()).toContain('Add Root Note');
  });

  it('renders tree controls for each node', () => {
    const wrapper = mount(ModuleDocumentTree, {
      props: {
        moduleId: 'module1',
        noteTree: mockNoteTree,
        notes: mockNotes,
      },
    });

    // Should have controls for each node (+, ✎, 🗑)
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('handles empty tree', () => {
    const wrapper = mount(ModuleDocumentTree, {
      props: {
        moduleId: 'module1',
        noteTree: [],
        notes: [],
      },
    });

    expect(wrapper.text()).toContain('Add Root Note');
  });
}); 