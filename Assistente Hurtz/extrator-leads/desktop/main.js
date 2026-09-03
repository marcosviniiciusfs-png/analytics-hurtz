const { app, BrowserWindow, dialog } = require("electron");
const { spawn, execFileSync } = require("child_process");
const path = require("path");
const project = path.resolve(__dirname, "..");
const localUrl = "http://127.0.0.1:3340";
let window, backend;
async function health(){try{const r=await fetch(`${localUrl}/health`,{signal:AbortSignal.timeout(700)});return r.ok?r.json():null}catch{return null}}
async function waitForBackend(){for(let i=0;i<50;i++){if((await health())?.version==="1.2.1")return true;await new Promise(r=>setTimeout(r,200))}return false}
function stopWrongBackend(){try{execFileSync("powershell.exe",["-NoProfile","-Command","$p=(Get-NetTCPConnection -LocalPort 3340 -State Listen -ErrorAction SilentlyContinue|Select-Object -First 1 -Expand OwningProcess);if($p){Stop-Process -Id $p -Force}"],{windowsHide:true,stdio:"ignore"})}catch{}}
function startBackend(){backend=spawn(process.execPath,[path.join(project,"src","server.js")],{cwd:project,windowsHide:true,stdio:"ignore",env:{...process.env,ELECTRON_RUN_AS_NODE:"1"}})}
function createWindow(){window=new BrowserWindow({width:1440,height:900,minWidth:840,minHeight:620,show:false,autoHideMenuBar:true,backgroundColor:"#090b0c",title:"Hurtz — Extrator de Leads",icon:path.resolve(project,"..","assets","hurtz-logo.ico"),webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});window.loadURL(localUrl);window.once("ready-to-show",()=>window.show())}
async function boot(){const current=await health();if(current&&current.version!=="1.2.1"){stopWrongBackend();await new Promise(r=>setTimeout(r,400))}if((await health())?.version!=="1.2.1")startBackend();if(!(await waitForBackend())){dialog.showErrorBox("Extrator de Leads","Não foi possível iniciar o módulo local.");app.quit();return}createWindow()}
if(!app.requestSingleInstanceLock())app.quit();else{app.on("second-instance",()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus()}});app.whenReady().then(boot);app.on("window-all-closed",()=>{if(backend&&!backend.killed)backend.kill();app.quit()})}
