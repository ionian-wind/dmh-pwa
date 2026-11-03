<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { IconArrowLeft, IconLink } from '@tabler/icons-vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import TableOfContents from '@/components/common/TableOfContents.vue';
import { useLayout, useRightDrawer } from '@/composables/useLayout';

const router = useRouter();
const { t, tm } = useI18n();

interface OperatorRow {
  syntax: string;
  meaningKey: string;
  example: string;
}

interface FunctionRow {
  syntax: string;
  meaningKey: string;
}

interface Example {
  titleKey: string;
  code: string;
}

const operators: OperatorRow[] = [
  {
    syntax: '+ - * /',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.arithmetic',
    example: 'output 2d6 + 3',
  },
  {
    syntax: '^',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.exponentiation',
    example: 'output 2 ^ 3',
  },
  {
    syntax: '= != < > <= >=',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.comparison',
    example: 'output 3d6 >= 15',
  },
  {
    syntax: '& | !',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.boolean',
    example: 'output 1d6 > 3 & 1d6 != 6',
  },
  {
    syntax: '@',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.access',
    example: 'output 1@3d6',
  },
  {
    syntax: '#',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.length',
    example: 'output #(3d6)',
  },
  {
    syntax: 'd',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.dice',
    example: 'output 4d6',
  },
  {
    syntax: '..',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.range',
    example: '{1..6}',
  },
  {
    syntax: ':',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.colon',
    example: '{1:4}  X: 3',
  },
];

const functions: FunctionRow[] = [
  {
    syntax: 'absolute NUMBER',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.absolute',
  },
  {
    syntax: 'SEQUENCE contains NUMBER',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.contains',
  },
  {
    syntax: 'count VALUES in SEQUENCE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.count',
  },
  {
    syntax: 'explode DIE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.explode',
  },
  {
    syntax: 'highest N of DICE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.highest',
  },
  {
    syntax: 'lowest N of DICE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.lowest',
  },
  {
    syntax: 'middle N of DICE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.middle',
  },
  {
    syntax: 'highest of A and B',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.highestOf',
  },
  {
    syntax: 'lowest of A and B',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.lowestOf',
  },
  {
    syntax: 'maximum of DIE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.maximum',
  },
  {
    syntax: 'minimum of DIE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.minimum',
  },
  {
    syntax: 'reverse SEQUENCE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.reverse',
  },
  {
    syntax: 'sort SEQUENCE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.sort',
  },
];

const examples: Example[] = [
  {
    titleKey: 'probabilityCalculator.syntaxPage.exampleTitles.dropLowest',
    code: `output [highest 3 of 4d6] named "4d6 drop lowest"

ABILITIES: 6 d [highest 3 of 4d6]
loop P over {1..6} {
  output P @ ABILITIES named "Ability [P]"
}`,
  },
  {
    titleKey: 'probabilityCalculator.syntaxPage.exampleTitles.blades',
    code: `function: blades ROLL:s {
  if 1@ROLL = 6 {
    result: 2 + (2@ROLL = 6)
  }
  result: 1@ROLL >= 4
}

output [blades 2d6] named "0d"
loop P over {1..7} {
  output [blades Pd6] named "[P]d"
}`,
  },
  {
    titleKey: 'probabilityCalculator.syntaxPage.exampleTitles.exploding',
    code: `set "explode depth" to 3
output [explode d6] named "one exploding d6"
output 2d[explode d6] named "two independent exploding dice"`,
  },
  {
    titleKey: 'probabilityCalculator.syntaxPage.exampleTitles.casting',
    code: `function: double N:n if above B:n {
  if N > B { result: N + N }
  result: N
}

output [double d6 if above 3] named "1, 2, 3, 8, 10, 12"

function: ROLL:s count fives and above and subtract ones {
  result: (ROLL >= 5) - (ROLL = 1)
}

output [3d6 count fives and above and subtract ones]`,
  },
];

const basicsBullets = computed(
  () =>
    tm(
      'probabilityCalculator.syntaxPage.basics.bullets',
    ) as unknown as string[],
);

const parameterBullets = computed(
  () =>
    tm(
      'probabilityCalculator.syntaxPage.functions.params',
    ) as unknown as string[],
);

interface TOCItem {
  id: string;
  level: number;
  anchorId: string;
  title: string;
}

const tocItems = computed<TOCItem[]>(() => [
  {
    id: 'basics',
    level: 2,
    anchorId: 'basics',
    title: t('probabilityCalculator.syntaxPage.sections.basics'),
  },
  {
    id: 'operators',
    level: 2,
    anchorId: 'operators',
    title: t('probabilityCalculator.syntaxPage.sections.operators'),
  },
  {
    id: 'sequences',
    level: 2,
    anchorId: 'sequences',
    title: t('probabilityCalculator.syntaxPage.sections.sequences'),
  },
  {
    id: 'position',
    level: 3,
    anchorId: 'position',
    title: t('probabilityCalculator.syntaxPage.sections.position'),
  },
  {
    id: 'flow',
    level: 2,
    anchorId: 'flow',
    title: t('probabilityCalculator.syntaxPage.sections.flow'),
  },
  {
    id: 'functions',
    level: 2,
    anchorId: 'functions',
    title: t('probabilityCalculator.syntaxPage.sections.functions'),
  },
  {
    id: 'library',
    level: 2,
    anchorId: 'library',
    title: t('probabilityCalculator.syntaxPage.sections.library'),
  },
  {
    id: 'settings',
    level: 2,
    anchorId: 'settings',
    title: t('probabilityCalculator.syntaxPage.sections.settings'),
  },
  {
    id: 'examples',
    level: 2,
    anchorId: 'examples',
    title: t('probabilityCalculator.syntaxPage.sections.examples'),
  },
]);

const SECTION_IDS = tocItems.value.map((item) => item.anchorId);
const initialHash = window.location.hash.replace(/^#/, '');
const activeAnchorId = ref(
  SECTION_IDS.includes(initialHash) ? initialHash : SECTION_IDS[0],
);

function scrollToSection(anchorId: string) {
  activeAnchorId.value = anchorId;
  if (window.location.hash !== `#${anchorId}`) {
    history.replaceState(null, '', `#${anchorId}`);
  }
  document.getElementById(anchorId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function scrollContainer(): HTMLElement | null {
  for (const selector of [
    '.q-page-container',
    '.entity-main-column',
    '.base-entity-view',
    '.entity-content',
  ]) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element && element.scrollHeight > element.clientHeight) {
      return element;
    }
  }
  return null;
}

function isNearBottom(container: HTMLElement | null) {
  if (container) {
    return (
      container.scrollTop + container.clientHeight >= container.scrollHeight - 8
    );
  }
  const page = document.scrollingElement ?? document.documentElement;
  return window.innerHeight + window.scrollY >= page.scrollHeight - 8;
}

function updateActiveAnchor() {
  const headings = SECTION_IDS.map((id) => ({
    id,
    element: document.getElementById(id),
  })).filter(
    (heading): heading is { id: string; element: HTMLElement } =>
      heading.element !== null,
  );
  if (headings.length === 0) return;

  const container = scrollContainer();
  const threshold = (container?.getBoundingClientRect().top ?? 0) + 96;
  let active = headings[0].id;

  for (const heading of headings) {
    if (heading.element.getBoundingClientRect().top <= threshold) {
      active = heading.id;
    } else {
      break;
    }
  }

  if (isNearBottom(container)) {
    active = headings[headings.length - 1].id;
  }
  if (activeAnchorId.value !== active) activeAnchorId.value = active;
}

let spyFrame: number | null = null;
let spyContainer: HTMLElement | null = null;

function handleScroll() {
  if (spyFrame !== null) return;
  spyFrame = window.requestAnimationFrame(() => {
    spyFrame = null;
    updateActiveAnchor();
  });
}

function setupScrollSpy() {
  spyContainer = scrollContainer();
  if (spyContainer) {
    spyContainer.addEventListener('scroll', handleScroll, { passive: true });
  } else {
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
  updateActiveAnchor();
}

function teardownScrollSpy() {
  if (spyFrame !== null) {
    window.cancelAnimationFrame(spyFrame);
    spyFrame = null;
  }
  if (spyContainer) {
    spyContainer.removeEventListener('scroll', handleScroll);
  } else {
    window.removeEventListener('scroll', handleScroll);
  }
  spyContainer = null;
}

const sidebarProps = reactive({
  items: tocItems.value,
  activeAnchorId: activeAnchorId.value,
  onItemClick: scrollToSection,
});

watch(
  [tocItems, activeAnchorId],
  ([items, active]) => {
    sidebarProps.items = items;
    sidebarProps.activeAnchorId = active;
  },
  { immediate: true },
);

const layout = useLayout();
const rightDrawer = useRightDrawer();

onMounted(() => {
  layout.setTopMenuContent({
    component: ViewHeader,
    props: {
      title: t('probabilityCalculator.syntaxPage.title'),
      subtitle: t('probabilityCalculator.syntaxPage.subtitle'),
      buttons: [
        {
          icon: IconArrowLeft,
          color: 'primary',
          title: 'probabilityCalculator.syntaxPage.back',
          event: () => router.push('/probability-calculator'),
        },
      ],
    },
  });
  rightDrawer.set({ component: TableOfContents, props: sidebarProps });
  setupScrollSpy();
});

onBeforeUnmount(() => {
  teardownScrollSpy();
  layout.setTopMenuContent(null);
  rightDrawer.clear();
});
</script>

<template>
  <div class="q-pa-md syntax-doc-page">
    <QCard id="basics" flat bordered class="q-mb-md">
      <QCardSection>
        <a
          class="syntax-section-link text-subtitle1 text-weight-medium q-mb-sm"
          href="#basics"
          :title="t('probabilityCalculator.syntaxPage.copySectionLink')"
          @click.prevent="scrollToSection('basics')"
        >
          <span>{{
            t('probabilityCalculator.syntaxPage.sections.basics')
          }}</span>
          <IconLink class="syntax-section-anchor-icon" :size="16" />
        </a>
        <p>{{ t('probabilityCalculator.syntaxPage.basics.description') }}</p>
        <pre v-pre class="syntax-code">
X: 3
output X + 1 named "four"

DAMAGE: 2d6 + 3
output DAMAGE named "sword damage"</pre
        >
        <ul class="q-mt-sm">
          <li v-for="(bullet, index) in basicsBullets" :key="index">
            {{ bullet }}
          </li>
        </ul>
      </QCardSection>
    </QCard>

    <QCard id="operators" flat bordered class="q-mb-md">
      <QCardSection>
        <a
          class="syntax-section-link text-subtitle1 text-weight-medium q-mb-sm"
          href="#operators"
          :title="t('probabilityCalculator.syntaxPage.copySectionLink')"
          @click.prevent="scrollToSection('operators')"
        >
          <span>{{
            t('probabilityCalculator.syntaxPage.sections.operators')
          }}</span>
          <IconLink class="syntax-section-anchor-icon" :size="16" />
        </a>
        <QMarkupTable dense flat class="syntax-table">
          <thead>
            <tr>
              <th>{{ t('probabilityCalculator.syntaxPage.table.syntax') }}</th>
              <th>{{ t('probabilityCalculator.syntaxPage.table.meaning') }}</th>
              <th>{{ t('probabilityCalculator.syntaxPage.table.example') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="operator in operators" :key="operator.syntax">
              <td>
                <code>{{ operator.syntax }}</code>
              </td>
              <td>{{ t(operator.meaningKey) }}</td>
              <td>
                <code>{{ operator.example }}</code>
              </td>
            </tr>
          </tbody>
        </QMarkupTable>
        <p class="q-mt-md q-mb-none">
          {{ t('probabilityCalculator.syntaxPage.dice.description') }}
        </p>
      </QCardSection>
    </QCard>

    <QCard id="sequences" flat bordered class="q-mb-md">
      <QCardSection>
        <a
          class="syntax-section-link text-subtitle1 text-weight-medium q-mb-sm"
          href="#sequences"
          :title="t('probabilityCalculator.syntaxPage.copySectionLink')"
          @click.prevent="scrollToSection('sequences')"
        >
          <span>{{
            t('probabilityCalculator.syntaxPage.sections.sequences')
          }}</span>
          <IconLink class="syntax-section-anchor-icon" :size="16" />
        </a>
        <p>{{ t('probabilityCalculator.syntaxPage.sequences.description') }}</p>
        <pre v-pre class="syntax-code">
{1, 2, 3}
{1..6}
{1:4, 2, 3}
{1..3:2}
{{1,2,4}:2, 5, 6}
{d6}
{}</pre
        >
        <a
          id="position"
          class="syntax-section-link syntax-section-link--sub text-subtitle2 q-mt-md q-mb-xs"
          href="#position"
          :title="t('probabilityCalculator.syntaxPage.copySectionLink')"
          @click.prevent="scrollToSection('position')"
        >
          <span>{{
            t('probabilityCalculator.syntaxPage.sections.position')
          }}</span>
          <IconLink class="syntax-section-anchor-icon" :size="16" />
        </a>
        <pre v-pre class="syntax-code">
1 @ {2,4,6}    \ 2 \
3 @ {2,4,6}    \ 6 \
{1,3} @ {2,4,6} \ 8 \
# {2,4,6}      \ 3 \
1 @ 246        \ 2 \
# 1234         \ 4 \
# (3d6)        \ 3 \
{1,2} @ 3d6</pre
        >
        <p class="q-mb-none">
          {{ t('probabilityCalculator.syntaxPage.sequences.positionOrder') }}
        </p>
      </QCardSection>
    </QCard>

    <QCard id="flow" flat bordered class="q-mb-md">
      <QCardSection>
        <a
          class="syntax-section-link text-subtitle1 text-weight-medium q-mb-sm"
          href="#flow"
          :title="t('probabilityCalculator.syntaxPage.copySectionLink')"
          @click.prevent="scrollToSection('flow')"
        >
          <span>{{ t('probabilityCalculator.syntaxPage.sections.flow') }}</span>
          <IconLink class="syntax-section-anchor-icon" :size="16" />
        </a>
        <pre v-pre class="syntax-code">
loop N over {1..4} {
  output Nd4 named "[N]d4"
}

X: 1
if X = 1 {
  output 1
}
else if X = 2 {
  output 2
}
else {
  output 1d6
}</pre
        >
        <p class="q-mb-none">
          {{ t('probabilityCalculator.syntaxPage.flow.note') }}
        </p>
      </QCardSection>
    </QCard>

    <QCard id="functions" flat bordered class="q-mb-md">
      <QCardSection>
        <a
          class="syntax-section-link text-subtitle1 text-weight-medium q-mb-sm"
          href="#functions"
          :title="t('probabilityCalculator.syntaxPage.copySectionLink')"
          @click.prevent="scrollToSection('functions')"
        >
          <span>{{
            t('probabilityCalculator.syntaxPage.sections.functions')
          }}</span>
          <IconLink class="syntax-section-anchor-icon" :size="16" />
        </a>
        <p>{{ t('probabilityCalculator.syntaxPage.functions.description') }}</p>
        <pre v-pre class="syntax-code">
function: add A to B {
  result: A + B
}

output [add 1 to 2]
output [add d4 to d6]</pre
        >
        <p>{{ t('probabilityCalculator.syntaxPage.functions.paramsIntro') }}</p>
        <ul>
          <li v-for="(bullet, index) in parameterBullets" :key="index">
            {{ bullet }}
          </li>
        </ul>
        <p class="q-mb-none">
          {{ t('probabilityCalculator.syntaxPage.functions.recursion') }}
        </p>
      </QCardSection>
    </QCard>

    <QCard id="library" flat bordered class="q-mb-md">
      <QCardSection>
        <a
          class="syntax-section-link text-subtitle1 text-weight-medium q-mb-sm"
          href="#library"
          :title="t('probabilityCalculator.syntaxPage.copySectionLink')"
          @click.prevent="scrollToSection('library')"
        >
          <span>{{
            t('probabilityCalculator.syntaxPage.sections.library')
          }}</span>
          <IconLink class="syntax-section-anchor-icon" :size="16" />
        </a>
        <QMarkupTable dense flat class="syntax-table">
          <thead>
            <tr>
              <th>
                {{ t('probabilityCalculator.syntaxPage.table.function') }}
              </th>
              <th>{{ t('probabilityCalculator.syntaxPage.table.meaning') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fn in functions" :key="fn.syntax">
              <td>
                <code>[{{ fn.syntax }}]</code>
              </td>
              <td>{{ t(fn.meaningKey) }}</td>
            </tr>
          </tbody>
        </QMarkupTable>
      </QCardSection>
    </QCard>

    <QCard id="settings" flat bordered class="q-mb-md">
      <QCardSection>
        <a
          class="syntax-section-link text-subtitle1 text-weight-medium q-mb-sm"
          href="#settings"
          :title="t('probabilityCalculator.syntaxPage.copySectionLink')"
          @click.prevent="scrollToSection('settings')"
        >
          <span>{{
            t('probabilityCalculator.syntaxPage.sections.settings')
          }}</span>
          <IconLink class="syntax-section-anchor-icon" :size="16" />
        </a>
        <pre v-pre class="syntax-code">
set "position order" to "highest first"
set "position order" to "lowest first"
set "explode depth" to 2
set "maximum function depth" to 5</pre
        >
        <p class="q-mb-none">
          {{ t('probabilityCalculator.syntaxPage.settings.note') }}
        </p>
      </QCardSection>
    </QCard>

    <QCard id="examples" flat bordered>
      <QCardSection>
        <a
          class="syntax-section-link text-subtitle1 text-weight-medium q-mb-sm"
          href="#examples"
          :title="t('probabilityCalculator.syntaxPage.copySectionLink')"
          @click.prevent="scrollToSection('examples')"
        >
          <span>{{
            t('probabilityCalculator.syntaxPage.sections.examples')
          }}</span>
          <IconLink class="syntax-section-anchor-icon" :size="16" />
        </a>
        <div
          v-for="example in examples"
          :key="example.titleKey"
          class="q-mb-lg"
        >
          <div class="text-subtitle2 q-mb-xs">
            {{ t(example.titleKey) }}
          </div>
          <pre class="syntax-code">{{ example.code }}</pre>
        </div>
      </QCardSection>
    </QCard>
  </div>
</template>

<style scoped>
.syntax-doc-page {
  max-width: 1100px;
  margin: 0 auto;
}

.syntax-doc-page [id] {
  scroll-margin-top: 1rem;
}

.syntax-section-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: inherit;
  text-decoration: none;
}

.syntax-section-link:hover,
.syntax-section-link:focus-visible {
  color: var(--color-primary);
}

.syntax-section-anchor-icon {
  flex: none;
  opacity: 0.35;
  transition: opacity 0.2s;
}

.syntax-section-link:hover .syntax-section-anchor-icon,
.syntax-section-link:focus-visible .syntax-section-anchor-icon {
  opacity: 0.9;
}

.syntax-code {
  margin: 0.5rem 0 1rem;
  padding: 0.85rem 1rem;
  border-radius: 6px;
  background: var(--q-grey-2, #f4f4f4);
  color: var(--q-dark, #1d1d1d);
  font-family: monospace;
  font-size: 13px;
  line-height: 1.55;
  overflow-x: auto;
  white-space: pre;
}

.syntax-table {
  width: 100%;
}

.syntax-table code {
  white-space: nowrap;
}
</style>
