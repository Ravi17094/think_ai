import type { Language } from "./types";
export interface CodeEditorProps {
  code: string;
  language: Language;
  onChange: (code: string) => void;
  editable?: boolean;
}
const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");
export function editorHtml(code: string, language: Language, editable = true) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#editor,textarea{margin:0;width:100%;height:100%;background:#141a2e;color:#f1f3f9}textarea{box-sizing:border-box;padding:12px;border:0;font:14px monospace}</style></head><body><div id="editor"></div><script>
  var current={code:${json(code)},language:${json(language)},editable:${json(editable)}},editor,silent=false;
  function send(data){var s=JSON.stringify(data);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else parent.postMessage({thinkzEditor:true,...data},'*');}
  function changed(value){if(!silent&&current.editable!==false){current.code=value;send({type:'change',code:value});}}
  var area=document.createElement('textarea');area.setAttribute('aria-label','Source code');area.setAttribute('autocapitalize','off');area.setAttribute('autocomplete','off');area.setAttribute('autocorrect','off');area.spellcheck=false;area.readOnly=current.editable===false;area.value=current.code;area.oninput=function(){changed(area.value)};document.getElementById('editor').appendChild(area);
  function apply(event){try{var d=typeof event.data==='string'?JSON.parse(event.data):event.data;if(!d||typeof d.code!=='string')return;current={code:d.code,language:['python','javascript','java','cpp'].indexOf(d.language)>=0?d.language:current.language,editable:typeof d.editable==='boolean'?d.editable:current.editable};silent=true;if(editor){if(editor.getValue()!==current.code)editor.setValue(current.code);monaco.editor.setModelLanguage(editor.getModel(),current.language);editor.updateOptions({readOnly:current.editable===false})}else area.value=current.code;area.readOnly=current.editable===false;silent=false;}catch(e){silent=false;}}
  document.addEventListener('message',apply);window.addEventListener('message',apply);
  send({type:'ready'});
  var script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js';script.onload=function(){require.config({paths:{vs:'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'}});require(['vs/editor/editor.main'],function(){try{editor=monaco.editor.create(document.getElementById('editor'),{value:current.code,language:current.language,readOnly:current.editable===false,theme:'vs-dark',automaticLayout:true,minimap:{enabled:false},fontSize:14});area.remove();editor.onDidChangeModelContent(function(){changed(editor.getValue())});}catch(e){editor=null;document.getElementById('editor').innerHTML='';document.getElementById('editor').appendChild(area);}});};document.head.appendChild(script);
  </script></body></html>`;
}
