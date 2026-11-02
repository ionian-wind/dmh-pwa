import{c as q,g as K,P as E,E as w,o as u,a as r,b as t,H as l,m as s,G as e,J as L,t as a,a8 as d,F as c,p as y,a9 as b,a4 as x,l as g,A as M}from"./index-Cupx4wMS.js";/**
 * @license @tabler/icons-vue v3.44.0 - MIT
 *
 * This source code is licensed under the MIT license.
 * See the LICENSE file in the root directory of this source tree.
 */var N=q("outline","arrow-left","ArrowLeft",[["path",{d:"M5 12l14 0",key:"svg-0"}],["path",{d:"M5 12l6 6",key:"svg-1"}],["path",{d:"M5 12l6 -6",key:"svg-2"}]]);const B={class:"q-pa-md syntax-doc-page"},I={class:"row items-center q-gutter-sm q-mb-md"},A={class:"text-h5"},k={class:"text-caption text-grey-7"},S={class:"text-subtitle1 text-weight-medium q-mb-sm"},O={class:"q-mt-sm"},R={class:"text-subtitle1 text-weight-medium q-mb-sm"},D={class:"q-mt-md q-mb-none"},Q={class:"text-subtitle1 text-weight-medium q-mb-sm"},T={class:"text-subtitle2 q-mt-md q-mb-xs"},U={class:"q-mb-none"},V={class:"text-subtitle1 text-weight-medium q-mb-sm"},X={class:"q-mb-none"},G={class:"text-subtitle1 text-weight-medium q-mb-sm"},F={class:"q-mb-none"},H={class:"text-subtitle1 text-weight-medium q-mb-sm"},J={class:"text-subtitle1 text-weight-medium q-mb-sm"},$={class:"q-mb-none"},j={class:"text-subtitle1 text-weight-medium q-mb-sm"},z={class:"text-subtitle2 q-mb-xs"},W={class:"syntax-code"},Y=K({__name:"ProbabilitySyntaxView",setup(Z){const f=E(),{t:n,tm:m}=w(),C=[{syntax:"+ - * /",meaningKey:"probabilityCalculator.syntaxPage.operators.arithmetic",example:"output 2d6 + 3"},{syntax:"^",meaningKey:"probabilityCalculator.syntaxPage.operators.exponentiation",example:"output 2 ^ 3"},{syntax:"= != < > <= >=",meaningKey:"probabilityCalculator.syntaxPage.operators.comparison",example:"output 3d6 >= 15"},{syntax:"& | !",meaningKey:"probabilityCalculator.syntaxPage.operators.boolean",example:"output 1d6 > 3 & 1d6 != 6"},{syntax:"@",meaningKey:"probabilityCalculator.syntaxPage.operators.access",example:"output 1@3d6"},{syntax:"#",meaningKey:"probabilityCalculator.syntaxPage.operators.length",example:"output #(3d6)"},{syntax:"d",meaningKey:"probabilityCalculator.syntaxPage.operators.dice",example:"output 4d6"},{syntax:"..",meaningKey:"probabilityCalculator.syntaxPage.operators.range",example:"{1..6}"},{syntax:":",meaningKey:"probabilityCalculator.syntaxPage.operators.colon",example:"{1:4}  X: 3"}],P=[{syntax:"absolute NUMBER",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.absolute"},{syntax:"SEQUENCE contains NUMBER",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.contains"},{syntax:"count VALUES in SEQUENCE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.count"},{syntax:"explode DIE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.explode"},{syntax:"highest N of DICE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.highest"},{syntax:"lowest N of DICE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.lowest"},{syntax:"middle N of DICE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.middle"},{syntax:"highest of A and B",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.highestOf"},{syntax:"lowest of A and B",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.lowestOf"},{syntax:"maximum of DIE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.maximum"},{syntax:"minimum of DIE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.minimum"},{syntax:"reverse SEQUENCE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.reverse"},{syntax:"sort SEQUENCE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.sort"}],_=[{titleKey:"probabilityCalculator.syntaxPage.exampleTitles.dropLowest",code:`output [highest 3 of 4d6] named "4d6 drop lowest"

ABILITIES: 6 d [highest 3 of 4d6]
loop P over {1..6} {
  output P @ ABILITIES named "Ability [P]"
}`},{titleKey:"probabilityCalculator.syntaxPage.exampleTitles.blades",code:`function: blades ROLL:s {
  if 1@ROLL = 6 {
    result: 2 + (2@ROLL = 6)
  }
  result: 1@ROLL >= 4
}

output [blades 2d6] named "0d"
loop P over {1..7} {
  output [blades Pd6] named "[P]d"
}`},{titleKey:"probabilityCalculator.syntaxPage.exampleTitles.exploding",code:`set "explode depth" to 3
output [explode d6] named "one exploding d6"
output 2d[explode d6] named "two independent exploding dice"`},{titleKey:"probabilityCalculator.syntaxPage.exampleTitles.casting",code:`function: double N:n if above B:n {
  if N > B { result: N + N }
  result: N
}

output [double d6 if above 3] named "1, 2, 3, 8, 10, 12"

function: ROLL:s count fives and above and subtract ones {
  result: (ROLL >= 5) - (ROLL = 1)
}

output [3d6 count fives and above and subtract ones]`}],h=g(()=>m("probabilityCalculator.syntaxPage.basics.bullets")),v=g(()=>m("probabilityCalculator.syntaxPage.functions.params"));return(tt,i)=>(u(),r("div",B,[t("div",I,[l(L,{flat:"",round:"","aria-label":e(n)("probabilityCalculator.syntaxPage.back"),onClick:i[0]||(i[0]=o=>e(f).push("/probability-calculator"))},{default:s(()=>[l(e(N))]),_:1},8,["aria-label"]),t("div",null,[t("div",A,a(e(n)("probabilityCalculator.syntaxPage.title")),1),t("div",k,a(e(n)("probabilityCalculator.syntaxPage.subtitle")),1)])]),l(b,{flat:"",bordered:"",class:"q-mb-md"},{default:s(()=>[l(d,null,{default:s(()=>[t("div",S,a(e(n)("probabilityCalculator.syntaxPage.sections.basics")),1),t("p",null,a(e(n)("probabilityCalculator.syntaxPage.basics.description")),1),i[1]||(i[1]=t("pre",{class:"syntax-code"},`X: 3
output X + 1 named "four"

DAMAGE: 2d6 + 3
output DAMAGE named "sword damage"`,-1)),t("ul",O,[(u(!0),r(c,null,y(h.value,(o,p)=>(u(),r("li",{key:p},a(o),1))),128))])]),_:1})]),_:1}),l(b,{flat:"",bordered:"",class:"q-mb-md"},{default:s(()=>[l(d,null,{default:s(()=>[t("div",R,a(e(n)("probabilityCalculator.syntaxPage.sections.operators")),1),l(x,{dense:"",flat:"",class:"syntax-table"},{default:s(()=>[t("thead",null,[t("tr",null,[t("th",null,a(e(n)("probabilityCalculator.syntaxPage.table.syntax")),1),t("th",null,a(e(n)("probabilityCalculator.syntaxPage.table.meaning")),1),t("th",null,a(e(n)("probabilityCalculator.syntaxPage.table.example")),1)])]),t("tbody",null,[(u(),r(c,null,y(C,o=>t("tr",{key:o.syntax},[t("td",null,[t("code",null,a(o.syntax),1)]),t("td",null,a(e(n)(o.meaningKey)),1),t("td",null,[t("code",null,a(o.example),1)])])),64))])]),_:1}),t("p",D,a(e(n)("probabilityCalculator.syntaxPage.dice.description")),1)]),_:1})]),_:1}),l(b,{flat:"",bordered:"",class:"q-mb-md"},{default:s(()=>[l(d,null,{default:s(()=>[t("div",Q,a(e(n)("probabilityCalculator.syntaxPage.sections.sequences")),1),t("p",null,a(e(n)("probabilityCalculator.syntaxPage.sequences.description")),1),i[2]||(i[2]=t("pre",{class:"syntax-code"},`{1, 2, 3}
{1..6}
{1:4, 2, 3}
{1..3:2}
{{1,2,4}:2, 5, 6}
{d6}
{}`,-1)),t("div",T,a(e(n)("probabilityCalculator.syntaxPage.sections.position")),1),i[3]||(i[3]=t("pre",{class:"syntax-code"},`1 @ {2,4,6}    \\ 2 \\
3 @ {2,4,6}    \\ 6 \\
{1,3} @ {2,4,6} \\ 8 \\
# {2,4,6}      \\ 3 \\
1 @ 246        \\ 2 \\
# 1234         \\ 4 \\
# (3d6)        \\ 3 \\
{1,2} @ 3d6`,-1)),t("p",U,a(e(n)("probabilityCalculator.syntaxPage.sequences.positionOrder")),1)]),_:1})]),_:1}),l(b,{flat:"",bordered:"",class:"q-mb-md"},{default:s(()=>[l(d,null,{default:s(()=>[t("div",V,a(e(n)("probabilityCalculator.syntaxPage.sections.flow")),1),i[4]||(i[4]=t("pre",{class:"syntax-code"},`loop N over {1..4} {
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
}`,-1)),t("p",X,a(e(n)("probabilityCalculator.syntaxPage.flow.note")),1)]),_:1})]),_:1}),l(b,{flat:"",bordered:"",class:"q-mb-md"},{default:s(()=>[l(d,null,{default:s(()=>[t("div",G,a(e(n)("probabilityCalculator.syntaxPage.sections.functions")),1),t("p",null,a(e(n)("probabilityCalculator.syntaxPage.functions.description")),1),i[5]||(i[5]=t("pre",{class:"syntax-code"},`function: add A to B {
  result: A + B
}

output [add 1 to 2]
output [add d4 to d6]`,-1)),t("p",null,a(e(n)("probabilityCalculator.syntaxPage.functions.paramsIntro")),1),t("ul",null,[(u(!0),r(c,null,y(v.value,(o,p)=>(u(),r("li",{key:p},a(o),1))),128))]),t("p",F,a(e(n)("probabilityCalculator.syntaxPage.functions.recursion")),1)]),_:1})]),_:1}),l(b,{flat:"",bordered:"",class:"q-mb-md"},{default:s(()=>[l(d,null,{default:s(()=>[t("div",H,a(e(n)("probabilityCalculator.syntaxPage.sections.library")),1),l(x,{dense:"",flat:"",class:"syntax-table"},{default:s(()=>[t("thead",null,[t("tr",null,[t("th",null,a(e(n)("probabilityCalculator.syntaxPage.table.function")),1),t("th",null,a(e(n)("probabilityCalculator.syntaxPage.table.meaning")),1)])]),t("tbody",null,[(u(),r(c,null,y(P,o=>t("tr",{key:o.syntax},[t("td",null,[t("code",null,"["+a(o.syntax)+"]",1)]),t("td",null,a(e(n)(o.meaningKey)),1)])),64))])]),_:1})]),_:1})]),_:1}),l(b,{flat:"",bordered:"",class:"q-mb-md"},{default:s(()=>[l(d,null,{default:s(()=>[t("div",J,a(e(n)("probabilityCalculator.syntaxPage.sections.settings")),1),i[6]||(i[6]=t("pre",{class:"syntax-code"},`set "position order" to "highest first"
set "position order" to "lowest first"
set "explode depth" to 2
set "maximum function depth" to 5`,-1)),t("p",$,a(e(n)("probabilityCalculator.syntaxPage.settings.note")),1)]),_:1})]),_:1}),l(b,{flat:"",bordered:""},{default:s(()=>[l(d,null,{default:s(()=>[t("div",j,a(e(n)("probabilityCalculator.syntaxPage.sections.examples")),1),(u(),r(c,null,y(_,o=>t("div",{key:o.titleKey,class:"q-mb-lg"},[t("div",z,a(e(n)(o.titleKey)),1),t("pre",W,a(o.code),1)])),64))]),_:1})]),_:1})]))}}),et=M(Y,[["__scopeId","data-v-9b5a41b0"]]);export{et as default};
