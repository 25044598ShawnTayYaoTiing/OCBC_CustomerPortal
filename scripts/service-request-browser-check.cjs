/* Real service-backed browser check. No API interception or fabricated responses. */
const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');const assert=require('assert/strict');
(async()=>{
  const source=process.env.AFI_SERVICE_BROWSER_STATE;
  if(!source)throw Error('Run the shared run_service_request_e2e.ps1 -Browser harness against temporary Docker PostgreSQL first. AFI_SERVICE_BROWSER_STATE is required.');
  const state=JSON.parse(fs.readFileSync(source,'utf8').replace(/^\uFEFF/,''));
  assert(['http://127.0.0.1:18080','http://localhost:18080'].includes(state.baseUrl));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000}});const errors=[];
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:15174/submissions/'+encodeURIComponent(state.caseId));
    await page.getByLabel('Customer username').fill(state.username);await page.getByLabel('Password',{exact:true}).fill(state.password);
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.getByRole('heading',{name:'Mailing-address change',exact:true}).waitFor();
    await page.getByRole('heading',{name:'Your application is with Operations.',exact:true}).waitFor();
    const rm=await context.newPage();rm.on('pageerror',e=>errors.push(e.message));
    await rm.goto('http://127.0.0.1:15173/submissions/'+encodeURIComponent(state.caseId));
    assert.equal(await rm.getByRole('button',{name:/operator/i}).count(),0);
    await rm.getByLabel('Username',{exact:true}).fill('reviewer');
    await rm.getByLabel('Password',{exact:true}).fill(process.env.REVIEWER_PASSWORD||'reviewer-demo');
    await rm.getByRole('button',{name:'Sign in to workspace'}).click();
    await rm.getByText('Package received by Operations',{exact:true}).waitFor();
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    const report={passed:true,scope:'Real React views against the same local Spring/PostgreSQL case after the real HTTP workflow; no intercepted APIs',caseId:state.caseId,portalStatus:'OPERATIONS',rmStatus:'OPERATIONS',mobile390NoOverflow:true};
    fs.writeFileSync(path.join(path.dirname(source),'browser-verification.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
