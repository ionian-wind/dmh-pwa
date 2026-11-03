import{c as N,g as Q,P as X,E as F,j as G,k as j,w as Y,T as J,U as W,h as Z,V as tt,a8 as et,y as at,o as p,a as b,H as o,m as r,a9 as m,b as t,K as u,G as a,t as l,F as P,p as v,aa as x,a4 as B,l as _,A as nt}from"./index-DJoxVGHz.js";/**
 * @license @tabler/icons-vue v3.44.0 - MIT
 *
 * This source code is licensed under the MIT license.
 * See the LICENSE file in the root directory of this source tree.
 */var lt=N("outline","arrow-left","ArrowLeft",[["path",{d:"M5 12l14 0",key:"svg-0"}],["path",{d:"M5 12l6 6",key:"svg-1"}],["path",{d:"M5 12l6 -6",key:"svg-2"}]]);/**
 * @license @tabler/icons-vue v3.44.0 - MIT
 *
 * This source code is licensed under the MIT license.
 * See the LICENSE file in the root directory of this source tree.
 */var y=N("outline","link","Link",[["path",{d:"M9 15l6 -6",key:"svg-0"}],["path",{d:"M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464",key:"svg-1"}],["path",{d:"M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463",key:"svg-2"}]]);const st={class:"q-pa-md syntax-doc-page"},ot=["title"],it={class:"q-mt-sm"},rt=["title"],ct={class:"q-mt-md q-mb-none"},ut=["title"],yt=["title"],dt={class:"q-mb-none"},pt=["title"],bt={class:"q-mb-none"},mt=["title"],xt={class:"q-mb-none"},gt=["title"],ft=["title"],Ct={class:"q-mb-none"},ht=["title"],Pt={class:"text-subtitle2 q-mb-xs"},vt={class:"syntax-code"},wt=Q({__name:"ProbabilitySyntaxView",setup(kt){const T=X(),{t:e,tm:E}=F(),R=[{syntax:"+ - * /",meaningKey:"probabilityCalculator.syntaxPage.operators.arithmetic",example:"output 2d6 + 3"},{syntax:"^",meaningKey:"probabilityCalculator.syntaxPage.operators.exponentiation",example:"output 2 ^ 3"},{syntax:"= != < > <= >=",meaningKey:"probabilityCalculator.syntaxPage.operators.comparison",example:"output 3d6 >= 15"},{syntax:"& | !",meaningKey:"probabilityCalculator.syntaxPage.operators.boolean",example:"output 1d6 > 3 & 1d6 != 6"},{syntax:"@",meaningKey:"probabilityCalculator.syntaxPage.operators.access",example:"output 1@3d6"},{syntax:"#",meaningKey:"probabilityCalculator.syntaxPage.operators.length",example:"output #(3d6)"},{syntax:"d",meaningKey:"probabilityCalculator.syntaxPage.operators.dice",example:"output 4d6"},{syntax:"..",meaningKey:"probabilityCalculator.syntaxPage.operators.range",example:"{1..6}"},{syntax:":",meaningKey:"probabilityCalculator.syntaxPage.operators.colon",example:"{1:4}  X: 3"}],D=[{syntax:"absolute NUMBER",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.absolute"},{syntax:"SEQUENCE contains NUMBER",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.contains"},{syntax:"count VALUES in SEQUENCE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.count"},{syntax:"explode DIE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.explode"},{syntax:"highest N of DICE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.highest"},{syntax:"lowest N of DICE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.lowest"},{syntax:"middle N of DICE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.middle"},{syntax:"highest of A and B",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.highestOf"},{syntax:"lowest of A and B",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.lowestOf"},{syntax:"maximum of DIE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.maximum"},{syntax:"minimum of DIE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.minimum"},{syntax:"reverse SEQUENCE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.reverse"},{syntax:"sort SEQUENCE",meaningKey:"probabilityCalculator.syntaxPage.functionMeanings.sort"}],O=[{titleKey:"probabilityCalculator.syntaxPage.exampleTitles.dropLowest",code:`output [highest 3 of 4d6] named "4d6 drop lowest"

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

output [3d6 count fives and above and subtract ones]`}],$=_(()=>E("probabilityCalculator.syntaxPage.basics.bullets")),z=_(()=>E("probabilityCalculator.syntaxPage.functions.params")),k=_(()=>[{id:"basics",level:2,anchorId:"basics",title:e("probabilityCalculator.syntaxPage.sections.basics")},{id:"operators",level:2,anchorId:"operators",title:e("probabilityCalculator.syntaxPage.sections.operators")},{id:"sequences",level:2,anchorId:"sequences",title:e("probabilityCalculator.syntaxPage.sections.sequences")},{id:"position",level:3,anchorId:"position",title:e("probabilityCalculator.syntaxPage.sections.position")},{id:"flow",level:2,anchorId:"flow",title:e("probabilityCalculator.syntaxPage.sections.flow")},{id:"functions",level:2,anchorId:"functions",title:e("probabilityCalculator.syntaxPage.sections.functions")},{id:"library",level:2,anchorId:"library",title:e("probabilityCalculator.syntaxPage.sections.library")},{id:"settings",level:2,anchorId:"settings",title:e("probabilityCalculator.syntaxPage.sections.settings")},{id:"examples",level:2,anchorId:"examples",title:e("probabilityCalculator.syntaxPage.sections.examples")}]),q=k.value.map(i=>i.anchorId),I=window.location.hash.replace(/^#/,""),h=G(q.includes(I)?I:q[0]);function c(i){h.value=i,window.location.hash!==`#${i}`&&history.replaceState(null,"",`#${i}`),document.getElementById(i)?.scrollIntoView({behavior:"smooth",block:"start"})}function K(){for(const i of[".q-page-container",".entity-main-column",".base-entity-view",".entity-content"]){const n=document.querySelector(i);if(n&&n.scrollHeight>n.clientHeight)return n}return null}function H(i){if(i)return i.scrollTop+i.clientHeight>=i.scrollHeight-8;const n=document.scrollingElement??document.documentElement;return window.innerHeight+window.scrollY>=n.scrollHeight-8}function S(){const i=q.map(g=>({id:g,element:document.getElementById(g)})).filter(g=>g.element!==null);if(i.length===0)return;const n=K(),s=(n?.getBoundingClientRect().top??0)+96;let d=i[0].id;for(const g of i)if(g.element.getBoundingClientRect().top<=s)d=g.id;else break;H(n)&&(d=i[i.length-1].id),h.value!==d&&(h.value=d)}let f=null,C=null;function w(){f===null&&(f=window.requestAnimationFrame(()=>{f=null,S()}))}function U(){C=K(),C?C.addEventListener("scroll",w,{passive:!0}):window.addEventListener("scroll",w,{passive:!0}),S()}function V(){f!==null&&(window.cancelAnimationFrame(f),f=null),C?C.removeEventListener("scroll",w):window.removeEventListener("scroll",w),C=null}const L=j({items:k.value,activeAnchorId:h.value,onItemClick:c});Y([k,h],([i,n])=>{L.items=i,L.activeAnchorId=n},{immediate:!0});const M=J(),A=W();return Z(()=>{M.setTopMenuContent({component:tt,props:{title:e("probabilityCalculator.syntaxPage.title"),subtitle:e("probabilityCalculator.syntaxPage.subtitle"),buttons:[{icon:lt,color:"primary",title:"probabilityCalculator.syntaxPage.back",event:()=>T.push("/probability-calculator")}]}}),A.set({component:et,props:L}),U()}),at(()=>{V(),M.setTopMenuContent(null),A.clear()}),(i,n)=>(p(),b("div",st,[o(x,{id:"basics",flat:"",bordered:"",class:"q-mb-md"},{default:r(()=>[o(m,null,{default:r(()=>[t("a",{class:"syntax-section-link text-subtitle1 text-weight-medium q-mb-sm",href:"#basics",title:a(e)("probabilityCalculator.syntaxPage.copySectionLink"),onClick:n[0]||(n[0]=u(s=>c("basics"),["prevent"]))},[t("span",null,l(a(e)("probabilityCalculator.syntaxPage.sections.basics")),1),o(a(y),{class:"syntax-section-anchor-icon",size:16})],8,ot),t("p",null,l(a(e)("probabilityCalculator.syntaxPage.basics.description")),1),n[9]||(n[9]=t("pre",{class:"syntax-code"},`X: 3
output X + 1 named "four"

DAMAGE: 2d6 + 3
output DAMAGE named "sword damage"`,-1)),t("ul",it,[(p(!0),b(P,null,v($.value,(s,d)=>(p(),b("li",{key:d},l(s),1))),128))])]),_:1})]),_:1}),o(x,{id:"operators",flat:"",bordered:"",class:"q-mb-md"},{default:r(()=>[o(m,null,{default:r(()=>[t("a",{class:"syntax-section-link text-subtitle1 text-weight-medium q-mb-sm",href:"#operators",title:a(e)("probabilityCalculator.syntaxPage.copySectionLink"),onClick:n[1]||(n[1]=u(s=>c("operators"),["prevent"]))},[t("span",null,l(a(e)("probabilityCalculator.syntaxPage.sections.operators")),1),o(a(y),{class:"syntax-section-anchor-icon",size:16})],8,rt),o(B,{dense:"",flat:"",class:"syntax-table"},{default:r(()=>[t("thead",null,[t("tr",null,[t("th",null,l(a(e)("probabilityCalculator.syntaxPage.table.syntax")),1),t("th",null,l(a(e)("probabilityCalculator.syntaxPage.table.meaning")),1),t("th",null,l(a(e)("probabilityCalculator.syntaxPage.table.example")),1)])]),t("tbody",null,[(p(),b(P,null,v(R,s=>t("tr",{key:s.syntax},[t("td",null,[t("code",null,l(s.syntax),1)]),t("td",null,l(a(e)(s.meaningKey)),1),t("td",null,[t("code",null,l(s.example),1)])])),64))])]),_:1}),t("p",ct,l(a(e)("probabilityCalculator.syntaxPage.dice.description")),1)]),_:1})]),_:1}),o(x,{id:"sequences",flat:"",bordered:"",class:"q-mb-md"},{default:r(()=>[o(m,null,{default:r(()=>[t("a",{class:"syntax-section-link text-subtitle1 text-weight-medium q-mb-sm",href:"#sequences",title:a(e)("probabilityCalculator.syntaxPage.copySectionLink"),onClick:n[2]||(n[2]=u(s=>c("sequences"),["prevent"]))},[t("span",null,l(a(e)("probabilityCalculator.syntaxPage.sections.sequences")),1),o(a(y),{class:"syntax-section-anchor-icon",size:16})],8,ut),t("p",null,l(a(e)("probabilityCalculator.syntaxPage.sequences.description")),1),n[10]||(n[10]=t("pre",{class:"syntax-code"},`{1, 2, 3}
{1..6}
{1:4, 2, 3}
{1..3:2}
{{1,2,4}:2, 5, 6}
{d6}
{}`,-1)),t("a",{id:"position",class:"syntax-section-link syntax-section-link--sub text-subtitle2 q-mt-md q-mb-xs",href:"#position",title:a(e)("probabilityCalculator.syntaxPage.copySectionLink"),onClick:n[3]||(n[3]=u(s=>c("position"),["prevent"]))},[t("span",null,l(a(e)("probabilityCalculator.syntaxPage.sections.position")),1),o(a(y),{class:"syntax-section-anchor-icon",size:16})],8,yt),n[11]||(n[11]=t("pre",{class:"syntax-code"},`1 @ {2,4,6}    \\ 2 \\
3 @ {2,4,6}    \\ 6 \\
{1,3} @ {2,4,6} \\ 8 \\
# {2,4,6}      \\ 3 \\
1 @ 246        \\ 2 \\
# 1234         \\ 4 \\
# (3d6)        \\ 3 \\
{1,2} @ 3d6`,-1)),t("p",dt,l(a(e)("probabilityCalculator.syntaxPage.sequences.positionOrder")),1)]),_:1})]),_:1}),o(x,{id:"flow",flat:"",bordered:"",class:"q-mb-md"},{default:r(()=>[o(m,null,{default:r(()=>[t("a",{class:"syntax-section-link text-subtitle1 text-weight-medium q-mb-sm",href:"#flow",title:a(e)("probabilityCalculator.syntaxPage.copySectionLink"),onClick:n[4]||(n[4]=u(s=>c("flow"),["prevent"]))},[t("span",null,l(a(e)("probabilityCalculator.syntaxPage.sections.flow")),1),o(a(y),{class:"syntax-section-anchor-icon",size:16})],8,pt),n[12]||(n[12]=t("pre",{class:"syntax-code"},`loop N over {1..4} {
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
}`,-1)),t("p",bt,l(a(e)("probabilityCalculator.syntaxPage.flow.note")),1)]),_:1})]),_:1}),o(x,{id:"functions",flat:"",bordered:"",class:"q-mb-md"},{default:r(()=>[o(m,null,{default:r(()=>[t("a",{class:"syntax-section-link text-subtitle1 text-weight-medium q-mb-sm",href:"#functions",title:a(e)("probabilityCalculator.syntaxPage.copySectionLink"),onClick:n[5]||(n[5]=u(s=>c("functions"),["prevent"]))},[t("span",null,l(a(e)("probabilityCalculator.syntaxPage.sections.functions")),1),o(a(y),{class:"syntax-section-anchor-icon",size:16})],8,mt),t("p",null,l(a(e)("probabilityCalculator.syntaxPage.functions.description")),1),n[13]||(n[13]=t("pre",{class:"syntax-code"},`function: add A to B {
  result: A + B
}

output [add 1 to 2]
output [add d4 to d6]`,-1)),t("p",null,l(a(e)("probabilityCalculator.syntaxPage.functions.paramsIntro")),1),t("ul",null,[(p(!0),b(P,null,v(z.value,(s,d)=>(p(),b("li",{key:d},l(s),1))),128))]),t("p",xt,l(a(e)("probabilityCalculator.syntaxPage.functions.recursion")),1)]),_:1})]),_:1}),o(x,{id:"library",flat:"",bordered:"",class:"q-mb-md"},{default:r(()=>[o(m,null,{default:r(()=>[t("a",{class:"syntax-section-link text-subtitle1 text-weight-medium q-mb-sm",href:"#library",title:a(e)("probabilityCalculator.syntaxPage.copySectionLink"),onClick:n[6]||(n[6]=u(s=>c("library"),["prevent"]))},[t("span",null,l(a(e)("probabilityCalculator.syntaxPage.sections.library")),1),o(a(y),{class:"syntax-section-anchor-icon",size:16})],8,gt),o(B,{dense:"",flat:"",class:"syntax-table"},{default:r(()=>[t("thead",null,[t("tr",null,[t("th",null,l(a(e)("probabilityCalculator.syntaxPage.table.function")),1),t("th",null,l(a(e)("probabilityCalculator.syntaxPage.table.meaning")),1)])]),t("tbody",null,[(p(),b(P,null,v(D,s=>t("tr",{key:s.syntax},[t("td",null,[t("code",null,"["+l(s.syntax)+"]",1)]),t("td",null,l(a(e)(s.meaningKey)),1)])),64))])]),_:1})]),_:1})]),_:1}),o(x,{id:"settings",flat:"",bordered:"",class:"q-mb-md"},{default:r(()=>[o(m,null,{default:r(()=>[t("a",{class:"syntax-section-link text-subtitle1 text-weight-medium q-mb-sm",href:"#settings",title:a(e)("probabilityCalculator.syntaxPage.copySectionLink"),onClick:n[7]||(n[7]=u(s=>c("settings"),["prevent"]))},[t("span",null,l(a(e)("probabilityCalculator.syntaxPage.sections.settings")),1),o(a(y),{class:"syntax-section-anchor-icon",size:16})],8,ft),n[14]||(n[14]=t("pre",{class:"syntax-code"},`set "position order" to "highest first"
set "position order" to "lowest first"
set "explode depth" to 2
set "maximum function depth" to 5`,-1)),t("p",Ct,l(a(e)("probabilityCalculator.syntaxPage.settings.note")),1)]),_:1})]),_:1}),o(x,{id:"examples",flat:"",bordered:""},{default:r(()=>[o(m,null,{default:r(()=>[t("a",{class:"syntax-section-link text-subtitle1 text-weight-medium q-mb-sm",href:"#examples",title:a(e)("probabilityCalculator.syntaxPage.copySectionLink"),onClick:n[8]||(n[8]=u(s=>c("examples"),["prevent"]))},[t("span",null,l(a(e)("probabilityCalculator.syntaxPage.sections.examples")),1),o(a(y),{class:"syntax-section-anchor-icon",size:16})],8,ht),(p(),b(P,null,v(O,s=>t("div",{key:s.titleKey,class:"q-mb-lg"},[t("div",Pt,l(a(e)(s.titleKey)),1),t("pre",vt,l(s.code),1)])),64))]),_:1})]),_:1})]))}}),Lt=nt(wt,[["__scopeId","data-v-dbf33470"]]);export{Lt as default};
