// StatAI Karmayogi - Main Interactive Application Logic

let currentRole = 'officer'; // 'officer', 'trainer', 'admin'
let currentLang = 'en';
let userProfile = null;
let radarChartInstance = null;
let diagnosticQuestions = [];
let diagnosticUserAnswers = {};
let diagnosticTimer = null;
let diagnosticTimeLeft = 600; // 10 minutes
let currentQuizId = null;
let currentGeneratedQuestions = [];
let currentSlideIndex = 0;

// Translations dictionary
const translations = {
  en: {
    portal_title: "StatAI Karmayogi",
    portal_sub: "AI-Powered Competency & Personalized Learning Platform for India's Official Statistical System",
    integrated_badge: "Integrated with iGOT Karmayogi (Mission Karmayogi, GoI)",
    tab_dashboard: "Competency Dashboard",
    tab_diagnostic: "AI Diagnostic Assessment",
    tab_courses: "Personalized iGOT Courses",
    tab_mcqgen: "AI MCQ & RAG Generator",
    tab_analytics: "Ministry & Cadre Analytics",
    tab_pitchdeck: "SIH 2026 Pitch Deck",
    overall_competency: "Overall Competency Index",
    status_strong: "Strong",
    status_needs_improvement: "Needs Improvement",
    status_critical: "Critical Skill Gap",
    btn_start_test: "Start Diagnostic Assessment",
    btn_upload_doc: "Process Document with AI (RAG)",
    btn_enroll: "Enroll on iGOT",
    btn_complete: "Complete Module"
  },
  hi: {
    portal_title: "स्टेटएआई कर्मयोगी",
    portal_sub: "भारत की आधिकारिक सांख्यिकी प्रणाली के लिए एआई-संचालित योग्यता एवं वैयक्तिकृत शिक्षण मंच",
    integrated_badge: "आईजीओटी कर्मयोगी (मिशन कर्मयोगी, भारत सरकार) से एकीकृत",
    tab_dashboard: "योग्यता डैशबोर्ड",
    tab_diagnostic: "एआई नैदानिक मूल्यांकन",
    tab_courses: "वैयक्तिकृत आईजीओटी पाठ्यक्रम",
    tab_mcqgen: "एआई प्रश्न एवं आरएजी जनरेटर",
    tab_analytics: "मंत्रालय एवं संवर्ग विश्लेषण",
    tab_pitchdeck: "एस.आई.एच. 2026 प्रस्तुति",
    overall_competency: "समग्र योग्यता सूचकांक",
    status_strong: "मजबूत",
    status_needs_improvement: "सुधार की आवश्यकता",
    status_critical: "गंभीर कौशल अंतर",
    btn_start_test: "मूल्यांकन प्रारंभ करें",
    btn_upload_doc: "दस्तावेज़ को एआई द्वारा विश्लेषित करें",
    btn_enroll: "आईजीओटी पर नामांकन करें",
    btn_complete: "मॉड्यूल पूर्ण करें"
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  setupEventListeners();
  await fetchProfile();
  await loadSampleManuals();
  await loadCourses();
  setupRadarChart();
}

function setupEventListeners() {
  // Tab buttons
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-tab');
      switchTab(target);
    });
  });

  // Role selector
  const roleSelect = document.getElementById('roleSelector');
  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      currentRole = e.target.value;
      handleRoleChange();
    });
  }

  // Language toggle
  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) {
    langBtn.addEventListener('click', toggleLanguage);
  }

  // Contrast & text size accessibility
  const contrastBtn = document.getElementById('contrastToggleBtn');
  if (contrastBtn) {
    contrastBtn.addEventListener('click', () => {
      document.body.classList.toggle('high-contrast');
    });
  }

  const textSizeBtn = document.getElementById('textSizeBtn');
  if (textSizeBtn) {
    textSizeBtn.addEventListener('click', () => {
      document.body.classList.toggle('large-text');
    });
  }
}

function switchTab(tabId) {
  // Hide all tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.add('hidden');
  });

  // Deactivate all tab triggers
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.remove('border-blue-700', 'text-blue-700', 'bg-blue-50', 'font-semibold');
    btn.classList.add('border-transparent', 'text-slate-600');
  });

  // Activate chosen tab
  const activePane = document.getElementById(`tab-${tabId}`);
  const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
  
  if (activePane) activePane.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.add('border-blue-700', 'text-blue-700', 'bg-blue-50', 'font-semibold');
    activeBtn.classList.remove('border-transparent', 'text-slate-600');
  }

  // Sub-actions on tab open
  if (tabId === 'diagnostic' && diagnosticQuestions.length === 0) {
    loadDiagnosticQuestions();
  } else if (tabId === 'analytics') {
    loadAdminAnalytics();
  }
}

function handleRoleChange() {
  const roleBadge = document.getElementById('userRoleBadge');
  const trainerSection = document.getElementById('trainerControlsSection');
  
  if (currentRole === 'officer') {
    if (roleBadge) roleBadge.textContent = "Learner / Statistical Officer (SSS Cadre)";
    if (trainerSection) trainerSection.classList.add('hidden');
    showToast("Switched to Statistical Officer view (Learner Mode)", "info");
  } else if (currentRole === 'trainer') {
    if (roleBadge) roleBadge.textContent = "Master Trainer (NSSTA / MoSPI)";
    if (trainerSection) trainerSection.classList.remove('hidden');
    showToast("Switched to Master Trainer view (AI Validation Mode)", "info");
  } else if (currentRole === 'admin') {
    if (roleBadge) roleBadge.textContent = "Ministry Administrator (DoPT / MoSPI)";
    if (trainerSection) trainerSection.classList.remove('hidden');
    switchTab('analytics');
    showToast("Switched to Ministry Administrator view", "info");
  }
}

function toggleLanguage() {
  currentLang = (currentLang === 'en') ? 'hi' : 'en';
  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) langBtn.textContent = (currentLang === 'en') ? 'हिंदी' : 'English';
  
  // Apply translation dictionary
  const dict = translations[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
  showToast(currentLang === 'hi' ? "भाषा हिंदी में बदली गई" : "Language changed to English", "info");
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white';
  toast.className = `${bg} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium transition-all transform duration-300 translate-y-2 opacity-0`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });
  
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Profile & Competency Dashboard
async function fetchProfile() {
  try {
    const res = await fetch('/api/profile');
    const data = await res.json();
    if (data.success) {
      userProfile = data.profile;
      renderProfileUI();
      updateRadarChart();
    }
  } catch (err) {
    console.error("Error loading profile:", err);
  }
}

function renderProfileUI() {
  if (!userProfile) return;
  
  // Profile elements
  const nameEl = document.getElementById('officerName');
  if (nameEl) nameEl.textContent = userProfile.name;
  
  const idEl = document.getElementById('officerId');
  if (idEl) idEl.textContent = `ID: ${userProfile.employee_id} | Karmayogi: ${userProfile.karmayogi_id}`;
  
  const unitEl = document.getElementById('officerUnit');
  if (unitEl) unitEl.textContent = `${userProfile.designation} • ${userProfile.unit}`;

  // Stat counters
  const overallScoreEl = document.getElementById('overallScoreVal');
  if (overallScoreEl) overallScoreEl.textContent = `${userProfile.overall_score}%`;
  
  const streakEl = document.getElementById('streakDaysVal');
  if (streakEl) streakEl.textContent = `${userProfile.streak_days} Days`;
  
  const creditsEl = document.getElementById('creditsEarnedVal');
  if (creditsEl) creditsEl.textContent = userProfile.credits_earned;

  // Active gaps count
  const gapsCount = Object.values(userProfile.competencies).filter(c => c.score < 75).length;
  const gapsEl = document.getElementById('activeGapsVal');
  if (gapsEl) gapsEl.textContent = gapsCount;

  // Render competency list
  const listContainer = document.getElementById('competencyListContainer');
  if (listContainer) {
    listContainer.innerHTML = '';
    Object.entries(userProfile.competencies).forEach(([name, c]) => {
      let badgeClass = 'badge-strong';
      let icon = 'fa-circle-check';
      if (c.status === 'Needs Improvement') {
        badgeClass = 'badge-warning';
        icon = 'fa-triangle-exclamation';
      } else if (c.status === 'Critical Gap') {
        badgeClass = 'badge-critical';
        icon = 'fa-circle-xmark';
      }

      const item = document.createElement('div');
      item.className = 'p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all';
      item.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-800">${name}</span>
            <span class="text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeClass}">
              <i class="fa-solid ${icon} mr-1"></i>${c.status}
            </span>
          </div>
          <span class="text-lg font-bold text-slate-900">${c.score}%</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div class="h-2.5 rounded-full transition-all duration-700 ${
            c.score >= 75 ? 'bg-emerald-600' : c.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
          }" style="width: ${c.score}%"></div>
        </div>
      `;
      listContainer.appendChild(item);
    });
  }

  // Recent activity log
  const historyContainer = document.getElementById('recentActivityList');
  if (historyContainer && userProfile.history) {
    historyContainer.innerHTML = '';
    userProfile.history.slice(0, 5).forEach(h => {
      const li = document.createElement('div');
      li.className = 'flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 text-sm';
      li.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400 font-mono">${h.date}</span>
          <span class="text-slate-700">${h.activity}</span>
        </div>
        <span class="font-semibold text-emerald-600 text-xs">${h.delta} pts</span>
      `;
      historyContainer.appendChild(li);
    });
  }
}

function setupRadarChart() {
  const ctx = document.getElementById('competencyRadarChart');
  if (!ctx || !userProfile) return;

  const labels = Object.keys(userProfile.competencies);
  const dataValues = Object.values(userProfile.competencies).map(c => c.score);
  const benchmarkValues = [80, 85, 80, 85, 75]; // Target official benchmarks

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Current Competency',
          data: dataValues,
          backgroundColor: 'rgba(37, 99, 235, 0.2)',
          borderColor: '#2563eb',
          borderWidth: 2.5,
          pointBackgroundColor: '#1d4ed8',
          pointRadius: 4
        },
        {
          label: 'MoSPI National Target',
          data: benchmarkValues,
          backgroundColor: 'rgba(22, 163, 74, 0.05)',
          borderColor: '#16a34a',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointBackgroundColor: '#16a34a',
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            color: '#64748b'
          },
          grid: {
            color: '#e2e8f0'
          },
          pointLabels: {
            font: {
              size: 11,
              weight: '600'
            },
            color: '#334155'
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 12 }
          }
        }
      }
    }
  });
}

function updateRadarChart() {
  if (!radarChartInstance || !userProfile) return;
  const dataValues = Object.values(userProfile.competencies).map(c => c.score);
  radarChartInstance.data.datasets[0].data = dataValues;
  radarChartInstance.update();
}

// Diagnostic Assessment Engine
async function loadDiagnosticQuestions() {
  const container = document.getElementById('diagnosticQuestionsList');
  if (!container) return;
  
  container.innerHTML = `
    <div class="text-center py-12 text-slate-500">
      <i class="fa-solid fa-spinner fa-spin text-3xl text-blue-600 mb-3"></i>
      <p>Loading Official Statistical Competency Diagnostic Question Bank...</p>
    </div>
  `;

  try {
    const res = await fetch('/api/diagnostic/questions');
    const data = await res.json();
    if (data.success) {
      diagnosticQuestions = data.questions;
      renderDiagnosticQuestions();
      startDiagnosticTimer();
    }
  } catch (err) {
    container.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-lg">Failed to load questions. Please check server.</div>`;
  }
}

function startDiagnosticTimer() {
  clearInterval(diagnosticTimer);
  diagnosticTimeLeft = 600;
  const timerEl = document.getElementById('diagnosticTimerDisplay');
  
  diagnosticTimer = setInterval(() => {
    diagnosticTimeLeft--;
    const mins = Math.floor(diagnosticTimeLeft / 60);
    const secs = diagnosticTimeLeft % 60;
    if (timerEl) {
      timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    if (diagnosticTimeLeft <= 0) {
      clearInterval(diagnosticTimer);
      showToast("Time expired! Submitting assessment automatically...", "info");
      submitDiagnosticAssessment();
    }
  }, 1000);
}

function renderDiagnosticQuestions() {
  const container = document.getElementById('diagnosticQuestionsList');
  if (!container) return;
  container.innerHTML = '';
  diagnosticUserAnswers = {};

  diagnosticQuestions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'p-5 rounded-xl border border-slate-200 bg-white mb-4 hover:border-blue-200 transition-all';
    
    let optionsHtml = '';
    q.options.forEach((opt, optIdx) => {
      optionsHtml += `
        <label class="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all option-label mb-2">
          <input type="radio" name="diag_q_${q.id}" value="${optIdx}" class="mt-1 text-blue-600 focus:ring-blue-500" onchange="recordDiagnosticAnswer('${q.id}', ${optIdx})">
          <span class="text-sm text-slate-700">${opt}</span>
        </label>
      `;
    });

    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
          Domain: ${q.category}
        </span>
        <span class="text-xs font-medium text-slate-400">Question ${idx + 1} of ${diagnosticQuestions.length}</span>
      </div>
      <h4 class="text-base font-semibold text-slate-800 mb-3">${idx + 1}. ${q.question}</h4>
      <div class="space-y-1">${optionsHtml}</div>
    `;
    container.appendChild(card);
  });
}

function recordDiagnosticAnswer(qid, optIdx) {
  diagnosticUserAnswers[qid] = optIdx;
  const answeredCount = Object.keys(diagnosticUserAnswers).length;
  const countEl = document.getElementById('diagnosticAnsweredCount');
  if (countEl) countEl.textContent = `${answeredCount}/${diagnosticQuestions.length} Answered`;
}

async function submitDiagnosticAssessment() {
  clearInterval(diagnosticTimer);
  const submitBtn = document.getElementById('btnSubmitDiagnostic');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Analyzing Competency Gaps...`;
  }

  try {
    const res = await fetch('/api/diagnostic/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: diagnosticUserAnswers })
    });
    const data = await res.json();
    
    if (data.success) {
      // Trigger confetti celebration
      if (window.confetti) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      
      // Update local profile state
      await fetchProfile();
      await loadCourses();
      
      // Display diagnostic results modal
      renderDiagnosticResultsModal(data);
      showToast(`Diagnostic Complete! Score: ${data.total_score} (${data.percentage}%)`, "success");
    }
  } catch (err) {
    showToast("Error submitting diagnostic test.", "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-check mr-2"></i> Submit & Analyze Gaps`;
    }
  }
}

function renderDiagnosticResultsModal(data) {
  const modal = document.getElementById('diagnosticResultsModal');
  if (!modal) return;

  const scoreEl = document.getElementById('diagResultScore');
  if (scoreEl) scoreEl.textContent = `${data.total_score} (${data.percentage}%)`;

  const breakdownEl = document.getElementById('diagResultBreakdown');
  if (breakdownEl) {
    breakdownEl.innerHTML = '';
    Object.entries(data.results_by_category).forEach(([cat, st]) => {
      const pct = st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0;
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-sm';
      row.innerHTML = `
        <span class="font-medium text-slate-700">${cat}</span>
        <span class="font-semibold ${pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-600'}">
          ${st.correct}/${st.total} (${pct}%)
        </span>
      `;
      breakdownEl.appendChild(row);
    });
  }

  modal.classList.remove('hidden');
}

function closeDiagnosticModal() {
  const modal = document.getElementById('diagnosticResultsModal');
  if (modal) modal.classList.add('hidden');
  switchTab('dashboard');
}

// iGOT Courses & Adaptive Learning Path
async function loadCourses() {
  const container = document.getElementById('coursesContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/courses');
    const data = await res.json();
    if (data.success) {
      renderCourses(data.courses);
    }
  } catch (err) {
    console.error("Error loading courses:", err);
  }
}

function renderCourses(courses) {
  const container = document.getElementById('coursesContainer');
  if (!container) return;
  container.innerHTML = '';

  courses.forEach(c => {
    const card = document.createElement('div');
    card.className = 'gov-card overflow-hidden flex flex-col justify-between';
    
    // Check if course addresses user critical gap
    let gapAlert = '';
    for (const [comp, boost] of Object.entries(c.competency_boost || {})) {
      if (userProfile && userProfile.competencies[comp] && userProfile.competencies[comp].score < 75) {
        gapAlert = `<span class="bg-rose-50 text-rose-700 text-xs font-semibold px-2 py-0.5 rounded border border-rose-200">
          <i class="fa-solid fa-bolt mr-1"></i>Targets your gap: ${comp} (+${boost}%)
        </span>`;
        break;
      }
    }

    card.innerHTML = `
      <div>
        <div class="relative h-44 overflow-hidden bg-slate-900">
          <img src="${c.thumbnail}" alt="${c.title}" class="w-full h-full object-cover opacity-85 hover:scale-105 transition-all duration-300">
          <span class="absolute top-3 left-3 bg-blue-900 text-white text-xs font-semibold px-2.5 py-1 rounded shadow">
            ${c.id}
          </span>
          <span class="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded shadow">
            ${c.badge || 'iGOT Certified'}
          </span>
        </div>
        <div class="p-5">
          <div class="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span><i class="fa-solid fa-building-columns mr-1"></i>${c.provider}</span>
            <span class="font-semibold text-amber-600"><i class="fa-solid fa-star mr-1"></i>${c.rating}</span>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-2 leading-snug">${c.title}</h3>
          <p class="text-xs text-slate-600 mb-3 line-clamp-2">${c.description}</p>
          <div class="mb-3">${gapAlert}</div>
          <div class="flex flex-wrap gap-1.5 mb-4">
            ${(c.topics || []).slice(0, 3).map(t => `<span class="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded">${t}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <div class="text-xs text-slate-500">
          <i class="fa-regular fa-clock mr-1"></i>${c.duration}
        </div>
        <div>
          ${
            c.is_completed ? 
            `<button class="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold cursor-default">
              <i class="fa-solid fa-circle-check mr-1"></i>Completed
            </button>` :
            c.is_enrolled ?
            `<button onclick="simulateCourseComplete('${c.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition-all">
              <i class="fa-solid fa-graduation-cap mr-1"></i>Complete & Boost
            </button>` :
            `<button onclick="enrollInCourse('${c.id}')" class="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow transition-all">
              <i class="fa-solid fa-plus mr-1"></i>Enroll
            </button>`
          }
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function enrollInCourse(cid) {
  try {
    const res = await fetch('/api/courses/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: cid })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Successfully enrolled in ${cid} on iGOT Karmayogi!`, "success");
      await fetchProfile();
      await loadCourses();
    }
  } catch (err) {
    showToast("Enrollment failed.", "error");
  }
}

async function simulateCourseComplete(cid) {
  try {
    const res = await fetch('/api/courses/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: cid })
    });
    const data = await res.json();
    if (data.success) {
      if (window.confetti) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      }
      showToast(`Course completed! Credits and competencies boosted.`, "success");
      await fetchProfile();
      await loadCourses();
    }
  } catch (err) {
    showToast("Completion update failed.", "error");
  }
}

// Sample Manuals & Document Upload (RAG)
async function loadSampleManuals() {
  const selectEl = document.getElementById('sampleManualSelector');
  if (!selectEl) return;
  
  try {
    const res = await fetch('/api/sample-manuals');
    const data = await res.json();
    if (data.success) {
      selectEl.innerHTML = `<option value="">-- Choose official MoSPI guideline --</option>`;
      data.manuals.forEach(m => {
        selectEl.innerHTML += `<option value="${m.id}">${m.title}</option>`;
      });
    }
  } catch (err) {
    console.error("Error loading sample manuals:", err);
  }
}

let activeExtractedText = "";
let activeDocName = "";

async function processDocumentRAG() {
  const fileInput = document.getElementById('manualFileInput');
  const sampleSelect = document.getElementById('sampleManualSelector');
  const stepContainer = document.getElementById('ragPipelineVisualizer');
  
  const formData = new FormData();
  if (fileInput && fileInput.files.length > 0) {
    formData.append('file', fileInput.files[0]);
  } else if (sampleSelect && sampleSelect.value) {
    formData.append('sample_id', sampleSelect.value);
  } else {
    showToast("Please select a sample manual or upload a PDF/TXT document first.", "error");
    return;
  }

  // Show RAG animated pipeline steps
  if (stepContainer) {
    stepContainer.classList.remove('hidden');
    stepContainer.innerHTML = `
      <div class="space-y-2 p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl shadow-inner border border-slate-700">
        <div class="flex items-center gap-2"><i class="fa-solid fa-check text-emerald-400"></i> Step 1: Ingesting official MoSPI document...</div>
        <div class="flex items-center gap-2"><i class="fa-solid fa-spinner fa-spin text-amber-400"></i> Step 2: Extracting clean text & normalizing tokens...</div>
      </div>
    `;
  }

  try {
    const res = await fetch('/api/upload-document', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    
    if (data.success) {
      activeExtractedText = data.full_text || data.extracted_preview;
      activeDocName = data.doc_name;

      if (stepContainer) {
        stepContainer.innerHTML = `
          <div class="p-4 bg-slate-900 font-mono text-xs rounded-xl border border-slate-700 text-slate-300">
            <div class="text-emerald-400 font-bold mb-2 flex items-center justify-between">
              <span><i class="fa-solid fa-circle-check mr-2"></i>Document Parsed & Indexed in Vector DB</span>
              <span class="text-slate-400">${data.total_words} words | ${data.chunks_count} chunks</span>
            </div>
            <div class="text-xs text-slate-400 mb-3">Target: <strong class="text-white">${data.doc_name}</strong></div>
            <div class="space-y-1.5">
              ${(data.sample_chunks || []).map(ch => `
                <div class="p-2 bg-slate-800 rounded border border-slate-700 flex items-start justify-between">
                  <span class="text-slate-300 pr-2">"${ch.text}"</span>
                  <span class="text-amber-400 font-bold whitespace-nowrap">cos θ: ${ch.similarity_score}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      const previewBox = document.getElementById('docPreviewContainer');
      if (previewBox) {
        previewBox.classList.remove('hidden');
        document.getElementById('docPreviewTitle').textContent = `Loaded Source: ${data.doc_name}`;
        document.getElementById('docPreviewText').textContent = data.extracted_preview;
      }

      showToast(`Document parsed! ${data.chunks_count} semantic chunks indexed.`, "success");
    } else {
      showToast(data.message || "Document processing failed.", "error");
    }
  } catch (err) {
    showToast("Error uploading/processing document.", "error");
  }
}

async function triggerAIGenerateMCQs() {
  const btn = document.getElementById('btnGenerateMCQs');
  const countSelect = document.getElementById('mcqCountSelect');
  const diffSelect = document.getElementById('mcqDifficultySelect');
  const count = countSelect ? countSelect.value : 4;
  const diff = diffSelect ? diffSelect.value : 'Mixed';

  if (!activeExtractedText) {
    showToast("Please process a document first to ground the AI question generation.", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-brain fa-bounce mr-2"></i> LLM Synthesizing Grounded MCQs...`;
  }

  try {
    const res = await fetch('/api/generate-mcqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_text: activeExtractedText,
        doc_id: activeDocName,
        count: count,
        difficulty: diff
      })
    });
    const data = await res.json();
    
    if (data.success) {
      currentQuizId = data.quiz_id;
      currentGeneratedQuestions = data.questions;
      renderGeneratedMCQs();
      showToast(`AI successfully synthesized ${data.total_generated} grounded questions!`, "success");
    }
  } catch (err) {
    showToast("Error generating MCQs.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Generate Grounded MCQs`;
    }
  }
}

function renderGeneratedMCQs() {
  const container = document.getElementById('generatedMCQsContainer');
  if (!container) return;
  container.classList.remove('hidden');
  
  const listEl = document.getElementById('generatedMCQsList');
  if (!listEl) return;
  listEl.innerHTML = '';

  currentGeneratedQuestions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'p-5 rounded-xl border border-slate-200 bg-white mb-4 hover:border-blue-300 transition-all shadow-sm';
    
    let optionsHtml = '';
    q.options.forEach((opt, optIdx) => {
      optionsHtml += `
        <label class="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-blue-50 cursor-pointer transition-all mb-2">
          <input type="radio" name="practice_q_${q.id}" value="${optIdx}" class="mt-1 text-blue-600 focus:ring-blue-500">
          <span class="text-sm text-slate-800">${opt}</span>
        </label>
      `;
    });

    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            ${q.topic}
          </span>
          <span class="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
            ${q.taxonomy || "Bloom's L3"}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200" id="statusBadge_${q.id}">
            ${q.status || 'AI Synthesized'}
          </span>
          <!-- Trainer Action Controls -->
          <div class="flex items-center gap-1">
            <button onclick="trainerValidateAction('${q.id}', 'approve')" title="Trainer Approve" class="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
              <i class="fa-solid fa-check-circle"></i>
            </button>
            <button onclick="trainerValidateAction('${q.id}', 'reject')" title="Trainer Reject (Hallucination Guard)" class="p-1 text-rose-600 hover:bg-rose-50 rounded">
              <i class="fa-solid fa-times-circle"></i>
            </button>
          </div>
        </div>
      </div>
      <h4 class="text-base font-semibold text-slate-900 mb-3">${idx + 1}. ${q.question}</h4>
      <div class="space-y-1 mb-3">${optionsHtml}</div>
      <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
        <strong class="text-slate-800"><i class="fa-solid fa-quote-left text-blue-600 mr-1"></i>Source Evidence Grounding:</strong>
        <p class="mt-1 italic">${q.source_chunk || q.explanation}</p>
      </div>
    `;
    listEl.appendChild(card);
  });
}

async function trainerValidateAction(qid, action) {
  try {
    const res = await fetch('/api/trainer/validate-mcq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_id: currentQuizId,
        question_id: qid,
        action: action
      })
    });
    const data = await res.json();
    if (data.success) {
      const badge = document.getElementById(`statusBadge_${qid}`);
      if (badge) {
        badge.textContent = action === 'approve' ? 'Trainer Approved ✅' : 'Rejected ❌';
        badge.className = action === 'approve' ? 'text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300' : 'text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300';
      }
      showToast(action === 'approve' ? "Question approved for official assessment!" : "Question flagged as invalid and removed.", "info");
    }
  } catch (err) {
    showToast("Validation action failed.", "error");
  }
}

async function submitAIQuizAnswers() {
  const answers = {};
  currentGeneratedQuestions.forEach(q => {
    const selected = document.querySelector(`input[name="practice_q_${q.id}"]:checked`);
    if (selected) {
      answers[q.id] = parseInt(selected.value);
    }
  });

  if (Object.keys(answers).length === 0) {
    showToast("Please select at least one answer before submitting.", "error");
    return;
  }

  try {
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_id: currentQuizId,
        answers: answers
      })
    });
    const data = await res.json();
    
    if (data.success) {
      if (window.confetti) {
        confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 } });
      }
      showToast(`Quiz Evaluated! Score: ${data.score} (${data.percentage}%)`, "success");
      await fetchProfile();
      await loadCourses();
      
      // Highlight answers in UI
      data.feedback.forEach(fb => {
        const rads = document.querySelectorAll(`input[name="practice_q_${fb.id}"]`);
        rads.forEach((r, idx) => {
          const parent = r.closest('label');
          if (idx === fb.correct_choice) {
            parent.classList.add('bg-emerald-50', 'border-emerald-500', 'text-emerald-900', 'font-semibold');
          } else if (idx === fb.user_choice && !fb.is_correct) {
            parent.classList.add('bg-rose-50', 'border-rose-400', 'text-rose-800');
          }
        });
      });
    }
  } catch (err) {
    showToast("Error submitting quiz.", "error");
  }
}

// Institutional Admin Analytics
async function loadAdminAnalytics() {
  try {
    const res = await fetch('/api/admin/analytics');
    const data = await res.json();
    if (data.success) {
      renderAdminAnalytics(data);
    }
  } catch (err) {
    console.error("Error loading analytics:", err);
  }
}

function renderAdminAnalytics(data) {
  const cadresList = document.getElementById('cadreStrengthList');
  if (cadresList && data.cadres) {
    cadresList.innerHTML = '';
    data.cadres.forEach(cd => {
      const item = document.createElement('div');
      item.className = 'p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-sm';
      item.innerHTML = `
        <div>
          <strong class="text-slate-800 block">${cd.cadre}</strong>
          <span class="text-xs text-slate-500">${cd.strength.toLocaleString()} Officers</span>
        </div>
        <div class="text-right">
          <span class="text-sm font-bold text-slate-900 block">${cd.avg_competency}%</span>
          <span class="text-xs px-2 py-0.5 rounded-full ${cd.status === 'Strong' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${cd.status}</span>
        </div>
      `;
      cadresList.appendChild(item);
    });
  }

  const heatmaps = document.getElementById('stateHeatmapContainer');
  if (heatmaps && data.state_heatmaps) {
    heatmaps.innerHTML = '';
    data.state_heatmaps.forEach(st => {
      const card = document.createElement('div');
      card.className = `p-3 rounded-xl border text-center transition-all ${
        st.score >= 75 ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
        st.score >= 65 ? 'bg-amber-50 border-amber-300 text-amber-900' :
        'bg-rose-50 border-rose-300 text-rose-900'
      }`;
      card.innerHTML = `
        <div class="text-xs font-mono font-bold">${st.code}</div>
        <div class="text-sm font-semibold truncate">${st.state}</div>
        <div class="text-lg font-black mt-1">${st.score}%</div>
        <div class="text-xs mt-0.5 opacity-80">${st.status}</div>
      `;
      heatmaps.appendChild(card);
    });
  }
}

// SIH 2026 Presentation Viewer
const sihSlides = [
  {
    slide_num: 1,
    title: "SMART INDIA HACKATHON 2026",
    subtitle: "AI-Enabled Personalized Learning & Competency Development Platform for India's Official Statistical System",
    badge: "PS ID: SIH26101 | Category: Software | Theme: Education / Skill Development / AI",
    content: `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6">
        <div class="space-y-4">
          <div class="inline-flex items-center gap-2 bg-blue-100 text-blue-900 font-bold px-3 py-1 rounded-full text-xs">
            <i class="fa-solid fa-trophy"></i> Team ID: 356 | Team Name: SKILL FORGE
          </div>
          <h2 class="text-3xl font-extrabold text-slate-900 leading-tight">StatAI Karmayogi</h2>
          <p class="text-lg text-slate-700 italic border-l-4 border-amber-500 pl-4">
            “Empowering India's Statistical Workforce through AI-Powered Personalized Learning.”
          </p>
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-2 text-slate-600">
            <div><strong>Ministry:</strong> Ministry of Statistics & Programme Implementation (MoSPI)</div>
            <div><strong>Ecosystem:</strong> iGOT Karmayogi / Mission Karmayogi (NPCSCB)</div>
            <div><strong>Target Cadres:</strong> ISS, SSS, FOD Field Enumerators, State DES</div>
          </div>
        </div>
        <div class="text-center p-6 bg-gradient-to-br from-blue-900 to-indigo-950 rounded-2xl text-white shadow-xl">
          <div class="text-5xl mb-3">🇮🇳</div>
          <h3 class="text-xl font-bold mb-2">Integrated Tech Domain</h3>
          <code class="bg-blue-950 text-amber-300 px-3 py-1 rounded text-sm font-mono border border-blue-800 block mb-4">
            https://statai.igotkarmayogi.gov.in
          </code>
          <p class="text-xs text-blue-200">
            Connecting competency gaps with personalized iGOT learning modules and automated RAG quiz generation from official MoSPI survey manuals.
          </p>
        </div>
      </div>
    `
  },
  {
    slide_num: 2,
    title: "IDEA TITLE & PROPOSED SOLUTION",
    subtitle: "StatAI Karmayogi — Purpose-Built for Official Statistics Capacity Building",
    badge: "Slide 2 of 6",
    content: `
      <div class="space-y-6 py-4">
        <p class="text-sm text-slate-700 leading-relaxed font-medium">
          <strong>Problem Addressed:</strong> Current government training is often one-size-fits-all, requiring extensive manual effort by trainers to draft assessments, while individual statistical officers struggle with specialized skill gaps in modern sampling, econometrics, and CAPI tools.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div class="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
            <div class="text-blue-700 text-xl mb-2 font-bold"><i class="fa-solid fa-stethoscope mr-2"></i>1. Assess & Diagnose</div>
            <p class="text-xs text-slate-600">Initial diagnostic testing across 5 pillars: Sampling, National Accounts, Econometrics, Field Operations, and AI.</p>
          </div>
          <div class="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
            <div class="text-amber-700 text-xl mb-2 font-bold"><i class="fa-solid fa-brain mr-2"></i>2. Identify Skill Gaps</div>
            <p class="text-xs text-slate-600">Categorizes competencies into 🟢 Strong (>=75%), 🟡 Needs Improvement (50-74%), and 🔴 Critical Gap (<50%).</p>
          </div>
          <div class="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <div class="text-emerald-700 text-xl mb-2 font-bold"><i class="fa-solid fa-route mr-2"></i>3. Adaptive iGOT Path</div>
            <p class="text-xs text-slate-600">Recommends courses on iGOT Karmayogi specifically matching identified deficits, with automated RAG quiz generation from PDFs.</p>
          </div>
        </div>
        <div class="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs flex items-center justify-between">
          <span>Formula: Competency Score = w1(Assessment) + w2(Course) + w3(Quiz) + w4(Field Experience)</span>
          <span class="text-amber-300">Continuous Feedback Loop ↺</span>
        </div>
      </div>
    `
  },
  {
    slide_num: 3,
    title: "TECHNICAL APPROACH & RAG WORKFLOW",
    subtitle: "End-to-End System Architecture and AI Pipeline",
    badge: "Slide 3 of 6",
    content: `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 items-center">
        <div class="space-y-3 text-xs text-slate-700">
          <div class="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <strong class="text-blue-700 block text-sm mb-1"><i class="fa-brands fa-react mr-1"></i>Frontend</strong>
            Next.js / React, Tailwind CSS, Chart.js, bilingual English/Hindi interface.
          </div>
          <div class="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <strong class="text-emerald-700 block text-sm mb-1"><i class="fa-brands fa-python mr-1"></i>Backend & Storage</strong>
            Python FastAPI/Flask REST API, PostgreSQL, Chroma / FAISS Vector DB.
          </div>
          <div class="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <strong class="text-purple-700 block text-sm mb-1"><i class="fa-solid fa-microchip mr-1"></i>AI & NLP RAG Engine</strong>
            Document parsing (PDF/DOCX) $\\to$ Chunking $\\to$ Embeddings $\\to$ LLM Grounded Question Synthesis $\\to$ Bloom's Taxonomy Tagging.
          </div>
          <div class="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <strong class="text-amber-700 block text-sm mb-1"><i class="fa-solid fa-shield-halved mr-1"></i>Integration & Security</strong>
            iGOT Karmayogi FRAC framework APIs, Jan Parichay SSO, Role-Based Access Control.
          </div>
        </div>
        <div class="p-4 bg-slate-900 text-white rounded-xl font-mono text-xs space-y-2 border border-slate-700 shadow-lg">
          <div class="text-amber-400 font-bold border-b border-slate-700 pb-1">TECHNICAL WORKFLOW</div>
          <div class="text-slate-300">Statistical Officer $\\to$ Competency Test</div>
          <div class="text-slate-400 pl-4">$\\downarrow$ AI Gap Analyzer</div>
          <div class="text-slate-300">Identified Gaps $\\to$ Personalized Learning Path</div>
          <div class="text-slate-400 pl-4">$\\downarrow$ iGOT Karmayogi Courses</div>
          <div class="text-slate-300">Uploaded MoSPI PDFs $\\to$ RAG AI Quiz Gen</div>
          <div class="text-slate-400 pl-4">$\\downarrow$ Trainer Quality Gate (Zero Hallucination)</div>
          <div class="text-slate-300">Practice Quiz $\\to$ Updated Competency Profile ↺</div>
        </div>
      </div>
    `
  },
  {
    slide_num: 4,
    title: "FEASIBILITY & VIABILITY",
    subtitle: "Risk Mitigation, Data Privacy & Scalability",
    badge: "Slide 4 of 6",
    content: `
      <div class="space-y-4 py-4 text-xs">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <h4 class="font-bold text-emerald-900 text-sm mb-2"><i class="fa-solid fa-check-double mr-1"></i>Feasibility Pillars</h4>
            <ul class="space-y-1.5 text-slate-700">
              <li>• <strong>Technical:</strong> Built on open-source Python, PyPDF, HuggingFace, and REST standards.</li>
              <li>• <strong>Operational:</strong> Seamlessly fits NSSTA training curricula and field officer routines.</li>
              <li>• <strong>Scalability:</strong> Containerized Docker architecture capable of serving 50,000+ officers.</li>
            </ul>
          </div>
          <div class="p-4 bg-rose-50 rounded-xl border border-rose-200">
            <h4 class="font-bold text-rose-900 text-sm mb-2"><i class="fa-solid fa-shield-virus mr-1"></i>Challenges & Mitigations</h4>
            <ul class="space-y-1.5 text-slate-700">
              <li>• <strong>Data Privacy:</strong> Role-based access, encryption at rest, Parichay SSO compliance.</li>
              <li>• <strong>AI Hallucination:</strong> Grounded RAG with source chunk citations + Trainer review gate.</li>
              <li>• <strong>Varying Role Needs:</strong> Role-specific competency trees (ISS vs SSS vs FOD).</li>
            </ul>
          </div>
        </div>
      </div>
    `
  },
  {
    slide_num: 5,
    title: "IMPACT & BENEFITS",
    subtitle: "Empowering India's Public Statistical Ecosystem",
    badge: "Slide 5 of 6",
    content: `
      <div class="space-y-5 py-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div class="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div class="text-3xl font-extrabold text-blue-800">+35%</div>
            <div class="text-xs text-slate-600 mt-1">Average Competency Improvement</div>
          </div>
          <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div class="text-3xl font-extrabold text-emerald-800">-70%</div>
            <div class="text-xs text-slate-600 mt-1">Assessment Creation Time for Trainers</div>
          </div>
          <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div class="text-3xl font-extrabold text-amber-800">42,000+</div>
            <div class="text-xs text-slate-600 mt-1">Statistical Officers Empowered</div>
          </div>
          <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div class="text-3xl font-extrabold text-indigo-800">100%</div>
            <div class="text-xs text-slate-600 mt-1">Aligned with Mission Karmayogi</div>
          </div>
        </div>
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
          <strong>National Macroeconomic Impact:</strong> Higher workforce competency in data collection, survey design, and index calculation directly elevates the quality of GDP estimates, CPI inflation figures, and poverty statistics—enabling robust, evidence-based governance across India.
        </div>
      </div>
    `
  },
  {
    slide_num: 6,
    title: "RESEARCH & REFERENCES",
    subtitle: "Policy Foundation and Literature Review",
    badge: "Slide 6 of 6",
    content: `
      <div class="space-y-4 py-4 text-xs text-slate-700">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <h4 class="font-bold text-slate-900 text-sm"><i class="fa-solid fa-landmark mr-1"></i>Official Government Initiatives</h4>
            <p>• <strong>Mission Karmayogi:</strong> National Programme for Civil Services Capacity Building (DoPT).</p>
            <p>• <strong>iGOT Karmayogi Portal:</strong> Competency-based digital learning infrastructure and FRAC dictionary.</p>
            <p>• <strong>Ministry of Statistics & PI:</strong> NSS Operational Manuals & National Accounts 2011-12 Series.</p>
          </div>
          <div class="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <h4 class="font-bold text-slate-900 text-sm"><i class="fa-solid fa-graduation-cap mr-1"></i>Technical Research Foundations</h4>
            <p>• <strong>Adaptive Learning Systems:</strong> Bayesian Knowledge Tracing and personalized learning path algorithms.</p>
            <p>• <strong>RAG & Question Generation:</strong> Grounded question generation utilizing vector embeddings and semantic search.</p>
            <p>• <strong>Bloom's Cognitive Taxonomy:</strong> Automated question classification from recall to analytical evaluation.</p>
          </div>
        </div>
        <div class="text-center text-xs text-slate-400 pt-2">
          Smart India Hackathon 2026 • Team SKILL FORGE (Team ID: 356) • Problem Statement ID: SIH26101
        </div>
      </div>
    `
  }
];

function renderCurrentSlide() {
  const container = document.getElementById('slideContentContainer');
  if (!container) return;

  const slide = sihSlides[currentSlideIndex];
  container.innerHTML = `
    <div class="p-6 md:p-8">
      <div class="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
        <div>
          <span class="text-xs font-bold text-blue-700 uppercase tracking-wider">${slide.badge}</span>
          <h2 class="text-2xl font-black text-slate-900 mt-1">${slide.title}</h2>
          <p class="text-sm text-slate-500 font-medium">${slide.subtitle}</p>
        </div>
        <div class="text-right">
          <span class="text-3xl font-black text-slate-300">0${slide.slide_num}</span>
          <span class="text-xs text-slate-400 block">/ 06</span>
        </div>
      </div>
      <div>${slide.content}</div>
    </div>
  `;

  // Update dots
  const dots = document.getElementById('slideDotsContainer');
  if (dots) {
    dots.innerHTML = '';
    sihSlides.forEach((s, idx) => {
      const dot = document.createElement('button');
      dot.className = `w-3 h-3 rounded-full transition-all ${idx === currentSlideIndex ? 'bg-blue-700 w-8' : 'bg-slate-300 hover:bg-slate-400'}`;
      dot.onclick = () => {
        currentSlideIndex = idx;
        renderCurrentSlide();
      };
      dots.appendChild(dot);
    });
  }
}

function nextSlide() {
  currentSlideIndex = (currentSlideIndex + 1) % sihSlides.length;
  renderCurrentSlide();
}

function prevSlide() {
  currentSlideIndex = (currentSlideIndex - 1 + sihSlides.length) % sihSlides.length;
  renderCurrentSlide();
}
