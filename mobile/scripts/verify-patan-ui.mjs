// Frontend-only smoke test with deterministic HTTP fixtures. No live service acceptance is implied.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const BASE=(process.argv[2] || 'http://localhost:8099').replace(/\/$/, '');
const out=process.env.LMS_UI_OUTPUT || path.resolve(process.cwd(),'patan-ui-artifacts');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();
const report={fixture:true,pageErrors:[],checks:[]};page.on('pageerror',error=>report.pageErrors.push(error.message));
const check=async(name,action)=>{await action();report.checks.push(name);console.log('PASS '+name);};
const shot=name=>page.screenshot({path:path.join(out,`${name}.png`),fullPage:true});
const ids={courseId:101,assessment:{id:201},enrollment:{id:301}};
const cert={id:401,certificateNo:'LOCAL-UI-TEST-ONLY',studentName:'Patan',courseName:'React Native · local test course',issuedAt:new Date().toISOString(),pdfUrl:'https://example.invalid/fixture.pdf'};
const user={id:1,name:'Patan · local test',email:'patan.ui@example.invalid',role:'Admin'};
const questions=[{id:1,questionText:'Which hook stores local component state?',questionType:'MCQ',marks:1,options:[{id:1,optionText:'useState'},{id:2,optionText:'useEffect'}]},{id:2,questionText:'Which component displays text?',questionType:'MCQ',marks:1,options:[{id:3,optionText:'Text'},{id:4,optionText:'View'}]}];
const course={id:101,title:'React Native · local test course',description:'Browser UI fixtures',modules:[{id:1,title:'React Native foundations',order:0,lessons:[{id:11,title:'Build your first component',durationSeconds:100,videoBytes:1000,videoUrl:'https://example.invalid/test-video.mp4',content:'Components turn data into native interfaces.',order:0}],assessments:[{id:201,title:'React Native knowledge check',status:'ACTIVE',duration:10}]}]};
let notes='';
await context.route('**/api/**',async route=> {
 const request=route.request(),url=new URL(request.url()),pathname=url.pathname;let data;
 if(pathname==='/api/auth/login')return route.fulfill({json:{success:true,token:'local-ui-fixture-token',user}});
 if(pathname.endsWith('/enrollments'))data=[{id:301,courseAccess:true,enrollmentStatus:'ENROLLED',batch:{course},summary:{percentage:0,completedLessons:0,totalLessons:1,eligible:false}}];
 else if(pathname.endsWith('/player'))data={course,enrollmentId:301,progress:[],summary:{percentage:0,completedLessons:0,totalLessons:1,eligible:false}};
 else if(pathname.endsWith('/notes')){if(request.method()==='PUT')notes=request.postDataJSON().text;data={text:notes};}
 else if(pathname.endsWith('/start'))data={attemptId:501,startedAt:new Date().toISOString(),serverTime:new Date().toISOString(),expiresAt:new Date(Date.now()+600000).toISOString(),assessment:{id:201,title:'React Native knowledge check',questions}};
 else if(pathname.endsWith('/submit'))data={attemptId:501,status:'GRADING'};
 else if(pathname.endsWith('/results'))data={attemptId:501,assessmentId:201,title:'React Native knowledge check',status:'GRADED',score:2,totalMarks:2,percentage:100,passed:true,canRetake:true,enrollmentId:301,certificateEligible:false,certificateId:null,questions:questions.map((q,i)=>({id:q.id,text:q.questionText,explanation:i?'Text renders native text.':'useState stores local state.',selectedAnswer:i?'Text':'useState',correctAnswer:i?'Text':'useState',flagged:!i,marks:1,marksObtained:1}))};
 else if(pathname.endsWith('/execute'))data={language:'python',results:[{status:'Accepted (local test adapter)',statusId:3,stdout:'42\n',stderr:'',compileOutput:'',passed:null,time:'0.1',memory:1024}]};
 else if(pathname.endsWith('/me'))data={user,stats:{coursesCompleted:0,certificatesEarned:1,totalHours:1.5},activity:[{type:'assessment',text:'Assessment graded',at:new Date().toISOString()}],certificates:[cert]};
 else if(pathname.endsWith('/analytics'))data={kpis:{enrollmentCount:10,completionRate:60,averageScore:80,activeUsers:8},trend:[{date:'2026-10-20',count:4},{date:'2026-10-21',count:6}],courses:[{id:101,title:course.title,enrollments:10,completed:6}]};
 else if(pathname.includes('/certificates/'))data=cert;
 else if(pathname.endsWith('/progress/sync'))data=[];
 else return route.fulfill({status:404,json:{success:false,message:'Unknown UI fixture route'}});
 await route.fulfill({json:{success:true,data}});
});
try{
 await page.goto(BASE);
 await check('Login gate and authenticated workspace',async()=>{
  await page.getByLabel('Email',{exact:true}).fill('patan.ui@example.invalid');await page.getByLabel('Password',{exact:true}).fill('local-ui-test-only');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByText('React Native · local test course',{exact:true}).waitFor();await shot('01-workspace');
 });
 await check('Course player, ordered lessons and notes',async()=>{
  await page.getByRole('button',{name:'Continue learning',exact:true}).click();await page.getByText('Build your first component',{exact:true}).first().waitFor();const notes=page.getByLabel('Your notes (save when leaving the field)',{exact:true});await notes.fill('Patan UI smoke: saved lesson notes');await notes.blur();await page.getByText('Notes saved',{exact:true}).waitFor();await shot('02-course-player');
 });
 await check('Assessment answers, flags, submit modal and results',async()=>{
  await page.goto(`${BASE}/learner/assessments/${ids.assessment.id}/take?enrollmentId=${ids.enrollment.id}`);
  const resume=page.getByRole('button',{name:'Resume Assessment',exact:true});if(await resume.isVisible())await resume.click();
  await page.getByRole('button',{name:'○ useState',exact:true}).click();await page.getByRole('button',{name:'Flag for review',exact:true}).click();await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:'○ Text',exact:true}).click();await shot('03-assessment');await page.getByRole('button',{name:'Submit assessment',exact:true}).click();await page.getByRole('button',{name:'Confirm submission',exact:true}).click();await page.getByText('100.0% · Passed',{exact:true}).waitFor({timeout:15000});await page.getByText('Flagged for review',{exact:true}).waitFor();await shot('04-results');
 });
 await check('Playground execution and persisted history',async()=>{
  await page.goto(`${BASE}/learner/playground`);await page.getByRole('button',{name:'Run code',exact:true}).click();await page.getByText(/Accepted \(local test adapter\)/).waitFor();await shot('05-playground');await page.getByRole('button',{name:'Execution history',exact:true}).click();await page.getByRole('button',{name:'Restore code',exact:true}).first().click();await page.getByText(/Accepted \(local test adapter\)/).waitFor();
 });
 await check('Profile stats and recent activity',async()=>{
  await page.goto(`${BASE}/learner/profile`);await page.getByText('Patan · local test',{exact:true}).waitFor();await page.getByText('Recent activity',{exact:true}).waitFor();await shot('06-profile');
 });
 await check('Admin analytics, trend buckets and date range',async()=>{
  await page.goto(`${BASE}/admin/analytics`);await page.getByText('Course performance',{exact:true}).waitFor();await page.getByRole('button',{name:'weekly',exact:true}).click();await page.getByText('Course performance',{exact:true}).waitFor();await page.getByRole('button',{name:'Apply date range',exact:true}).click();await shot('07-analytics');
 });
 await check('Certificate metadata, preview and copy link action',async()=>{
  await page.goto(`${BASE}/learner/certificates/${cert.id}`);await page.getByText('LOCAL-UI-TEST-ONLY',{exact:true}).waitFor();await page.getByRole('button',{name:'Copy link',exact:true}).waitFor();await shot('08-certificate');
 });
 await check('Sign out guards deep-linked learner data',async()=>{
  await page.goto(`${BASE}/learner/workspace`);await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();await page.goto(`${BASE}/learner/profile`);await page.getByLabel('Password',{exact:true}).waitFor();
 });
 if(report.pageErrors.length)throw new Error(report.pageErrors.join('\n'));
}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
