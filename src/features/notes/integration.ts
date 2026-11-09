import type { FeatureIntegration } from '@/features/types';
import { stripEntityMeta } from '@/features/create';
import { useNoteStore } from '@/stores/notes';
import { noteDisplayTitle } from '@/utils/noteTitle';
import { IconNote } from '@tabler/icons-vue';

const noteStore = () => useNoteStore();

export const notesFeature: FeatureIntegration = {
  id: 'notes',
  routes: [
    {
      path: '/notes',
      name: 'notes',
      component: () => import('@/notes/NotesView.vue'),
      meta: { exact: true },
    },
    {
      path: '/notes/:id',
      name: 'note-detail',
      component: () => import('@/notes/NoteView.vue'),
    },
  ],
  navigation: [
    {
      type: 'route',
      id: 'notes',
      labelKey: 'navigation.notes',
      path: '/notes',
      icon: IconNote,
      kind: 'entity',
      placement: 'primary',
      order: 20,
    },
  ],
  homeCard: {
    id: 'notes',
    titleKey: 'home.stats.notes',
    route: '/notes',
    icon: IconNote,
    order: 10,
    load: () => noteStore().load(),
    count: () => noteStore().items.length,
  },
  homeActions: [],
  globalComponents: [],
  linkKinds: [
    {
      kind: 'note',
      labelKey: 'notes.title',
      icon: IconNote,
      titleField: 'title',
      route: (id) => `/notes/${id}`,
      editor: () => import('@/notes/NoteEditor.vue'),
      create: async (payload) => {
        const data = stripEntityMeta(payload as Record<string, unknown>);
        const note = await useNoteStore().create(data as any);
        return { id: note.id, label: noteDisplayTitle(note) || note.id };
      },
      useStore: useNoteStore,
    },
  ],
  dragKinds: ['note'],
};

export const routes = notesFeature.routes;
export const navigation = notesFeature.navigation;
export const homeCard = notesFeature.homeCard;
export const homeActions = notesFeature.homeActions;
export const globalComponents = notesFeature.globalComponents;
export const linkKinds = notesFeature.linkKinds;
export const dragKinds = notesFeature.dragKinds;
