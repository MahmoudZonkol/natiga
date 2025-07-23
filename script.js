// =================== أهم خطوة على الإطلاق ===================
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyRPejgM1JvJW2b7mMNXyc8b_0Hw5HxqYoA017_ElQbYks6BEn9IjXe_T0nF02nf-ei/exec';
// =============================================================

// DOM Elements & Global State
const searchBox = document.getElementById('search-box');
const resultArea = document.getElementById('result-area');
const searchBtn = document.getElementById('search-btn');
const input = document.getElementById('seating-no-input');
const progressBar = document.getElementById('progress-bar');
const alertBox = document.getElementById('alert-box');
const alertMessage = document.getElementById('alert-message');
const printableArea = document.getElementById('printable-area');
const searchHistoryContainer = document.getElementById('search-history');
let currentStudentData = null;

// --- Core Search Function ---
async function searchResult(seatingNoFromHistory = null) {
    const seatingNo = seatingNoFromHistory || input.value;
    if (!seatingNo) { showAlert('الرجاء إدخال رقم الجلوس.'); return; }
    
    input.value = seatingNo;
    hideAlert();
    setLoadingState(true);
    startProgress();
    
    try {
        const response = await fetch(`${WEB_APP_URL}?action=search&seatingNo=${seatingNo}`);
        const result = await response.json();
        
        if (result.success) {
            currentStudentData = result.data;
            displayBasicResults(currentStudentData);
            if(currentStudentData.status === 'ناجح') celebrate();
            saveSearchHistory(seatingNo);
            loadSearchHistory();
            completeProgress();
            
            fetchAdvancedAnalysis(seatingNo); 

        } else {
            showAlert(result.error || 'حدث خطأ غير متوقع.');
            resetAndGoToSearch();
        }
    } catch (error) {
        showAlert('فشل الاتصال بالخادم. تحقق من اتصالك بالإنترنت.');
        resetAndGoToSearch();
    } finally {
        setLoadingState(false);
    }
}

function displayBasicResults(student) {
    searchBox.style.display = 'none';
    resultArea.innerHTML = '';

    resultArea.insertAdjacentHTML('beforeend', createResultCard(student));
    const collegesCardHTML = createCollegesCard(student.suggested_colleges);
    if (collegesCardHTML) resultArea.insertAdjacentHTML('beforeend', collegesCardHTML);

    resultArea.insertAdjacentHTML('beforeend', '<div id="advanced-analysis-placeholder" class="card" style="text-align:center; padding: 40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:10px; font-weight:bold;">جارِ حساب التحليلات المتقدمة...</p></div>');
    
    const actionsHTML = `<div class="actions-footer"><button class="new-search-btn" onclick="resetAndGoToSearch()"><i class="fas fa-redo"></i> بحث جديد</button></div>`;
    resultArea.insertAdjacentHTML('beforeend', actionsHTML);
    resultArea.style.display = 'block';
}

async function fetchAdvancedAnalysis(seatingNo) {
    try {
        const response = await fetch(`${WEB_APP_URL}?action=analyze&seatingNo=${seatingNo}`);
        const result = await response.json();
        const placeholder = document.getElementById('advanced-analysis-placeholder');

        if (result.success && placeholder) {
            currentStudentData.analysis = result.data;
            
            const analysisCardHTML = createAnalysisCard(currentStudentData);
            const subjectsCardHTML = createSubjectsCard(currentStudentData);
            const radarChartCardHTML = createRadarChartCard(currentStudentData);
            
            const advancedCardsContainer = document.createElement('div');
            if (analysisCardHTML) advancedCardsContainer.innerHTML += analysisCardHTML;
            if (subjectsCardHTML) advancedCardsContainer.innerHTML += subjectsCardHTML;
            if (radarChartCardHTML) advancedCardsContainer.innerHTML += radarChartCardHTML;

            placeholder.replaceWith(advancedCardsContainer);
            
            const radarChartCanvas = document.getElementById('radarChart');
            if(radarChartCanvas) drawRadarChart(radarChartCanvas, currentStudentData);
        } else if (placeholder) {
            placeholder.style.display = 'none'; // Hide placeholder if analysis fails
        }
    } catch (error) {
        const placeholder = document.getElementById('advanced-analysis-placeholder');
        if (placeholder) placeholder.style.display = 'none';
    }
}

function htmlToElement(html) {
    const template = document.createElement('template');
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild;
}

function createResultCard(student){const isPass=student.status==='ناجح';return`<div class="card" id="result-card-to-download" style="animation-delay: 0s"><div class="card-header"><h2><i class="fas fa-address-card"></i> ${student.arabic_name}</h2><div class="actions" style="display:flex;gap:10px;"><button class="action-icon" onclick="downloadResult()" title="تنزيل كصورة"><i class="fas fa-download"></i></button><button class="action-icon" onclick="printResult()" title="طباعة"><i class="fas fa-print"></i></button></div></div><div class="card-body"><div class="analysis-grid"><div class="analysis-item"><strong>رقم الجلوس</strong><span class="value">${student.seating_no}</span></div><div class="analysis-item"><strong>المجموع</strong><span class="value">${student.total_degree}/320</span></div><div class="analysis-item"><strong>النسبة</strong><span class="value" style="color:${isPass?'var(--success-color)':'var(--fail-color)'};">%${student.percentage}</span></div><div class="analysis-item"><strong>الحالة</strong><span class="status ${isPass?'status-pass':'status-fail'}">${student.status}</span></div></div></div></div>`}
function createAnalysisCard(student){if(!student.analysis)return'';const{rank,totalStudents}=student.analysis;return`<div class="card" style="animation-delay: 0.1s"><div class="card-header"><h2><i class="fas fa-chart-line"></i> تحليل الأداء العام</h2></div><div class="card-body"><div class="analysis-grid"><div class="analysis-item"><strong>ترتيبك</strong><span class="value">${rank}</span></div><div class="analysis-item"><strong>من إجمالي</strong><span class="value">${totalStudents}</span></div></div></div></div>`}
function createSubjectsCard(student){const subjectMap={'arabic':'لغة عربية','english':'لغة إنجليزية','french':'لغة فرنسية','physics':'فيزياء','chemistry':'كيمياء','biology':'أحياء','geology':'جيولوجيا','math':'رياضيات','history':'تاريخ','geography':'جغرافيا','philosophy':'فلسفة'};let subjectRows='';const averages=student.analysis?student.analysis.subjectAverages:{};for(const key in student){if(subjectMap[key]&&student[key]){const avg=averages[key];let comparisonClass='';if(avg){comparisonClass=parseFloat(student[key])>=parseFloat(avg)?'above-avg':'below-avg'}subjectRows+=`<tr><td>${subjectMap[key]}</td><td>${student[key]}</td><td class="${comparisonClass}">${avg||'-'}</td></tr>`}}if(!subjectRows)return'';return`<div class="card" style="animation-delay: 0.2s"><div class="card-header"><h2><i class="fas fa-book-open"></i> تفاصيل الدرجات</h2></div><div class="card-body" style="padding:15px 0;"><table class="subjects-table"><thead><tr><th>المادة</th><th>درجتك</th><th>المتوسط العام</th></tr></thead><tbody>${subjectRows}</tbody></table></div></div>`}
function createRadarChartCard(student){const subjectMap={'arabic':'عربي','english':'إنجليزي','french':'فرنسي','physics':'فيزياء','chemistry':'كيمياء','biology':'أحياء','geology':'جيولوجيا','math':'رياضيات','history':'تاريخ','geography':'جغرافيا','philosophy':'فلسفة'};const labels=[],studentScores=[],averageScores=[];const averages=student.analysis?student.analysis.subjectAverages:{};for(const key in student){if(subjectMap[key]&&student[key]&&averages[key]){labels.push(subjectMap[key]);studentScores.push(student[key]);averageScores.push(averages[key])}}if(labels.length<3)return'';return`<div class="card" style="animation-delay: 0.3s"><div class="card-header"><h2><i class="fas fa-bullseye"></i> مخطط الأداء</h2></div><div class="card-body"><canvas id="radarChart"></canvas></div></div>`}
function createCollegesCard(colleges){if(!colleges||colleges.length===0)return'';const listItems=colleges.map(college=>`<li>${college}</li>`).join('');return`<div class="card" style="animation-delay: 0.1s"><div class="card-header"><h2><i class="fas fa-graduation-cap"></i> الكليات المتوقعة (${colleges.length})</h2></div><div class="card-body" style="padding:0;"><ul id="colleges-list">${listItems}</ul></div></div>`}
function drawRadarChart(ctx,student){const subjectMap={'arabic':'عربي','english':'إنجليزي','french':'فرنسي','physics':'فيزياء','chemistry':'كيمياء','biology':'أحياء','geology':'جيولوجيا','math':'رياضيات','history':'تاريخ','geography':'جغرافيا','philosophy':'فلسفة'};const labels=[],studentScores=[],averageScores=[];const averages=student.analysis.subjectAverages;for(const key in student){if(subjectMap[key]&&student[key]&&averages[key]){labels.push(subjectMap[key]);studentScores.push(student[key]);averageScores.push(averages[key])}}new Chart(ctx,{type:'radar',data:{labels:labels,datasets:[{label:'درجتك',data:studentScores,fill:true,backgroundColor:'rgba(74,105,189,0.2)',borderColor:'rgb(74,105,189)',pointBackgroundColor:'rgb(74,105,189)'},{label:'المتوسط العام',data:averageScores,fill:true,backgroundColor:'rgba(46,204,113,0.2)',borderColor:'rgb(46,204,113)',pointBackgroundColor:'rgb(46,204,113)'}]},options:{responsive:true,maintainAspectRatio:true}})}
function setLoadingState(isLoading){searchBtn.disabled=isLoading;searchBtn.innerHTML=isLoading?'<span><i class="fas fa-spinner fa-spin"></i> جارِ البحث...</span>':'<i class="fas fa-search"></i> <span>عرض النتيجة</span>'}
function showAlert(message){alertMessage.textContent=message;alertBox.classList.add('show')}
function hideAlert(){alertBox.classList.remove('show')}
function resetAndGoToSearch(){resultArea.style.display='none';searchBox.style.display='block';input.value='';input.focus();completeProgress()}
function printResult(){const printable=document.getElementById('result-card-to-download');if(!printable)return;printableArea.innerHTML=printable.outerHTML;window.print()}
function downloadResult(){const element=document.getElementById('result-card-to-download');if(element)html2canvas(element,{useCORS:true,backgroundColor:null,scale:2}).then(canvas=>{const link=document.createElement('a');link.download=`natijah-${currentStudentData.seating_no}.png`;link.href=canvas.toDataURL('image/png');link.click()})}
function saveSearchHistory(seatingNo){let history=JSON.parse(localStorage.getItem('searchHistory'))||[];history=history.filter(item=>item!==seatingNo);history.unshift(seatingNo);if(history.length>5)history.pop();localStorage.setItem('searchHistory',JSON.stringify(history))}
function loadSearchHistory(){const history=JSON.parse(localStorage.getItem('searchHistory'))||[];searchHistoryContainer.innerHTML='';if(history.length>0){const title=document.createElement('h3');title.textContent='عمليات البحث الأخيرة:';searchHistoryContainer.appendChild(title);const tagsContainer=document.createElement('div');tagsContainer.className='history-tags';history.forEach(seatingNo=>{const tag=document.createElement('div');tag.className='history-tag';tag.textContent=seatingNo;tag.onclick=()=>searchResult(seatingNo);tagsContainer.appendChild(tag)});searchHistoryContainer.appendChild(tagsContainer)}}
function startProgress(){progressBar.classList.add('visible');progressBar.style.width='0%';setTimeout(()=>{progressBar.style.width='70%'},100)}
function completeProgress(){progressBar.style.width='100%';setTimeout(()=>{progressBar.classList.remove('visible')},500)}
function celebrate(){confetti({particleCount:150,spread:90,origin:{y:0.6},zIndex:1001})}
input.addEventListener('keyup',e=>e.key==='Enter'&&searchBtn.click());document.addEventListener('DOMContentLoaded',()=>{loadSearchHistory();const printStyle=document.createElement('style');printStyle.innerHTML=`@media print{body *{visibility:hidden}#printable-area,#printable-area *{visibility:visible}#printable-area{position:absolute;left:0;top:0;width:100%}.action-icon{display:none}}`;document.head.appendChild(printStyle)});
