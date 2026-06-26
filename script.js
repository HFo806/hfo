/**
 * نظام حاسبة التفاعل التراكمي المحمي للأدمن السبعة - تحالف HFo
 * وضع الزائر: مشاهدة صرفة.
 * محرك التصفير الذكي المؤتمت والأرشفة الحصادية عند الإثنين تمام الـ 5:00 صباحاً.
 * إعداد وإشراف وتطوير - 806 Abo S3D - HFo
 */

const CALCULATOR_WEIGHTS = {
    DUEL_POINTS_DIVIDER: 100000, 
    TECH_POINTS_DIVIDER: 100,    
    DESERT_ATTEND_VAL: 30,       
    VALLEY_ATTEND_VAL: 30,       
    SEASON_WAR_VAL: 50           
};

const ALLIANCE_ADMINS = {
    "Abo S3D": { pin: "1403", role: "owner" }, 
    "الهفوف": { pin: "1992", role: "admin" },
    "AhmedBj": { pin: "2580", role: "admin" },
    "saloohka1": { pin: "8064", role: "admin" },
    "STEEV": { pin: "1747", role: "admin" },
    "Rooz5": { pin: "2023", role: "admin" },
    "Abu som3a": { pin: "8067", role: "admin" }
};

let currentLoggedInAdmin = null; 
let currentAdminRole = "viewer"; 

let members = [];
let auditLogs = [];
let seasonalArchive = []; // مخزن الأرشفة للمواسم والأسابيع السابقة

let currentEditMemberOldData = { duel: 0, tech: 0, desert: 0, valley: 0, season: 0 };

const defaultMembers = [
    { id: "1", name: "فارس_HFo", duel: 14400000, tech: 12000, desert: 1, valley: 1, season: 1 },
    { id: "2", name: "المدمر_01", duel: 7200000, tech: 6000, desert: 1, valley: 1, season: 0 },
    { id: "3", name: "عاصف_الجبهة", duel: 8500000, tech: 9000, desert: 0, valley: 1, season: 1 },
    { id: "4", name: "كاسر_الدروع", duel: 7300000, tech: 6200, desert: 1, valley: 0, season: 0 },
    { id: "5", name: "M_General", duel: 4200000, tech: 3000, desert: 0, valley: 1, season: 0 }
];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    startLiveClockAndAutomation(); // تشغيل العداد والميقاتي الذكي
});

function initApp() {
    members = JSON.parse(localStorage.getItem('hfo_strict_members')) || [...defaultMembers];
    auditLogs = JSON.parse(localStorage.getItem('hfo_strict_logs')) || [];
    seasonalArchive = JSON.parse(localStorage.getItem('hfo_seasonal_archive')) || [];
    
    saveToStorage();
    calculateScoresAndRender();
    applyVisibilityRules();
}

function saveToStorage() {
    localStorage.setItem('hfo_strict_members', JSON.stringify(members));
    localStorage.setItem('hfo_strict_logs', JSON.stringify(auditLogs));
    localStorage.setItem('hfo_seasonal_archive', JSON.stringify(seasonalArchive));
}

function setupEventListeners() {
    document.getElementById('loginAdminBtn').addEventListener('click', handleAdminLogin);
    document.getElementById('logoutAdminBtn').addEventListener('click', handleAdminLogout);
    document.getElementById('openAddModalBtn').addEventListener('click', () => openModal());
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('memberForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('searchInput').addEventListener('input', (e) => calculateScoresAndRender(e.target.value));
    document.getElementById('exportHonorBtn').addEventListener('click', generateHonorRollImage);
    document.getElementById('exportTableImgBtn').addEventListener('click', generateWeeklyTableImage); 
    
    document.getElementById('viewAuditLogBtn').addEventListener('click', openAuditModal);
    document.getElementById('closeAuditModalBtn').addEventListener('click', () => document.getElementById('auditModal').style.display='none');
    
    document.getElementById('viewArchiveBtn').addEventListener('click', openArchiveModal);
    document.getElementById('closeArchiveModalBtn').addEventListener('click', () => document.getElementById('archiveModal').style.display='none');

    document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
    document.getElementById('importCsvInput').addEventListener('change', importFromCSV);
    document.getElementById('weeklyReportBtn').addEventListener('click', prepareWeeklyMailReport);
}

function getFormattedDateTime() {
    const now = new Date();
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return `${days[now.getDay()]}، ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} | ${now.toLocaleTimeString('ar-EG')}`;
}

function getWeeklyDateRangeString() {
    const now = new Date();
    const currentDay = now.getDay(); 
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay; 
    const monday = new Date(now); monday.setDate(now.getDate() + distanceToMonday);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return `${monday.getDate()} ${months[monday.getMonth()]} - ${sunday.getDate()} ${months[sunday.getMonth()]}`;
}

function getWeekNumber() {
    const now = new Date(); const oneJan = new Date(now.getFullYear(), 0, 1);
    return Math.ceil((Math.floor((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
}

// ⏰ محرك الميقاتي الحركي: يفحص الوقت بالثانية وينفذ التصفير الفوري عند الـ 5:00 صباح الإثنين
function startLiveClockAndAutomation() {
    const clockElement = document.getElementById('liveTimeBadge');
    
    // رصد وتثبيت علامة تمنع تكرار التصفير في نفس الساعة
    let lastResetWeek = localStorage.getItem('hfo_last_reset_week') || "";

    setInterval(() => {
        const now = new Date();
        clockElement.textContent = getFormattedDateTime();

        const currentDay = now.getDay(); // 1 يعني يوم الإثنين
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentWeekStr = `${now.getFullYear()}-W${getWeekNumber()}`;

        // شرط التصفير والأرشفة: يوم الإثنين الفعلي + الساعة 5 صباحاً + لم يتم تصفيره هذا الأسبوع بعد
        if (currentDay === 1 && currentHour === 5 && currentMinute === 0 && lastResetWeek !== currentWeekStr) {
            executeAutomaticWeeklyReset(currentWeekStr);
            lastResetWeek = currentWeekStr;
            localStorage.setItem('hfo_last_reset_week', currentWeekStr);
        }
    }, 1000);
}

// 🗂️ دالة الإغلاق والأرشفة التلقائية للموسم والتصفير للعدادات
function executeAutomaticWeeklyReset(weekId) {
    // 1. أخذ لقطة سريعة (Snapshot) وحفظها بالأرشيف قبل المسح
    const archiveItem = {
        archiveId: Date.now().toString(),
        weekCode: weekId,
        weekLabel: `الأسبوع رقم (${getWeekNumber()})`,
        dateRange: getWeeklyDateRangeString(),
        totalMembersCount: members.length,
        dataSnapshot: JSON.parse(JSON.stringify(members)) // نسخة عميقة غير قابلة للتلف
    };
    
    seasonalArchive.unshift(archiveItem);

    // 2. تصفير العدادات التراكمية بالكامل لكافة جبهات التحالف أوتوماتيكياً
    members.forEach(m => {
        m.duel = 0;
        m.tech = 0;
        m.desert = 0;
        m.valley = 0;
        m.season = 0;
        m.finalScore = 0;
    });

    // 3. توثيق الحدث التاريخي والأمني داخل سجل التدقيق
    auditLogs.unshift({
        operator: "نظام الأتمتة المؤتمت",
        action: "تصفير وأرشفة أسبوعية أوتوماتيكية",
        details: `تم الإغلاق الفوري وحفظ كشوفات الأسبوع ${weekId} بالأرشيف بنجاح عند الساعة 5:00 صباحاً.`,
        datetime: getFormattedDateTime()
    });

    saveToStorage();
    calculateScoresAndRender();
}

function handleAdminLogin() {
    let pinInput = prompt("الرجاء إدخال الرمز السري الخاص بالأدمن:");
    if (!pinInput) return;
    let foundAdmin = null; let adminName = null;
    for (const [name, info] of Object.entries(ALLIANCE_ADMINS)) {
        if (info.pin === pinInput) { foundAdmin = info; adminName = name; break; }
    }
    if (foundAdmin) {
        currentLoggedInAdmin = adminName; currentAdminRole = foundAdmin.role;
        alert(`مرحباً بالأدمن: [${adminName}]. تم فتح الصلاحيات المخصصة لك.`);
        document.getElementById('loginAdminBtn').style.display = 'none';
        document.getElementById('logoutAdminBtn').style.display = 'inline-block';
        document.getElementById('adminStatusBadge').textContent = `الأدمن الحالي: ${adminName} ✨`;
        document.getElementById('adminStatusBadge').className = "status-badge badge-unlocked";
        if (currentAdminRole === "owner") document.getElementById('ownerZone').style.display = 'block';
    } else { alert("الرمز السري غير صحيح!"); }
    applyVisibilityRules(); calculateScoresAndRender();
}

function handleAdminLogout() {
    currentLoggedInAdmin = null; currentAdminRole = "viewer";
    document.getElementById('loginAdminBtn').style.display = 'inline-block';
    document.getElementById('logoutAdminBtn').style.display = 'none';
    document.getElementById('adminStatusBadge').textContent = "الوضع الحالي: مشاهدة فقط 👁️";
    document.getElementById('adminStatusBadge').className = "status-badge badge-locked";
    document.getElementById('ownerZone').style.display = 'none';
    applyVisibilityRules(); calculateScoresAndRender();
}

function applyVisibilityRules() {
    const isAuthorizedAdmin = (currentAdminRole === "admin" || currentAdminRole === "owner");
    const isOwnerOnly = (currentAdminRole === "owner"); 
    
    document.getElementById('openAddModalBtn').style.display = isAuthorizedAdmin ? 'inline-block' : 'none';
    document.getElementById('exportHonorBtn').style.display = isOwnerOnly ? 'inline-block' : 'none';
    document.getElementById('exportTableImgBtn').style.display = isOwnerOnly ? 'inline-block' : 'none'; 
    document.getElementById('viewAuditLogBtn').style.display = isOwnerOnly ? 'inline-block' : 'none';
    document.getElementById('viewArchiveBtn').style.display = isOwnerOnly ? 'inline-block' : 'none'; // حصر مستعرض الأرشيف الموسمي لـ Abo S3D
    document.getElementById('exportCsvBtn').style.display = isOwnerOnly ? 'inline-block' : 'none';
    document.getElementById('importCsvLabel').style.display = isOwnerOnly ? 'inline-block' : 'none';
    document.getElementById('weeklyReportBtn').style.display = isOwnerOnly ? 'inline-block' : 'none';
    
    const ths = document.getElementsByClassName('action-th');
    for(let th of ths) { th.style.display = isAuthorizedAdmin ? 'table-cell' : 'none'; }
}

function calculateScoresAndRender(filterKeyword = '') {
    members.forEach(member => {
        const dScore = (parseInt(member.duel) || 0) / CALCULATOR_WEIGHTS.DUEL_POINTS_DIVIDER;
        const tScore = (parseInt(member.tech) || 0) / CALCULATOR_WEIGHTS.TECH_POINTS_DIVIDER;
        const desertScore = (parseInt(member.desert) || 0) * CALCULATOR_WEIGHTS.DESERT_ATTEND_VAL;
        const valleyScore = (parseInt(member.valley) || 0) * CALCULATOR_WEIGHTS.VALLEY_ATTEND_VAL;
        const seasonScore = (parseInt(member.season) || 0) * CALCULATOR_WEIGHTS.SEASON_WAR_VAL;
        member.finalScore = Math.round(dScore + tScore + desertScore + valleyScore + seasonScore);
    });

    members.sort((a, b) => b.finalScore - a.finalScore);
    document.getElementById('statTotalMembers').textContent = members.length;
    const sum = members.reduce((acc, m) => acc + m.finalScore, 0);
    document.getElementById('statAverageScore').textContent = members.length ? Math.round(sum / members.length) : 0;
    if(members[0]) document.getElementById('statTopMember').textContent = `${members[0].name} (${members[0].finalScore} ن)`;

    let displayedMembers = members.filter(m => m.name.toLowerCase().includes(filterKeyword.toLowerCase()));
    const tbody = document.getElementById('membersTableBody'); tbody.innerHTML = '';
    const isAuthorizedAdmin = (currentAdminRole === "admin" || currentAdminRole === "owner");

    displayedMembers.forEach((member, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="rank-badge">${index + 1}</span></td>
            <td style="font-weight: bold; color: var(--text-light);">${escapeHtml(member.name)}</td>
            <td>${Number(member.duel).toLocaleString()}</td>
            <td>${Number(member.tech).toLocaleString()}</td>
            <td>${member.desert} معركة</td>
            <td>${member.valley} معركة</td>
            <td>${member.season || 0} مشاركة</td>
            <td class="final-score-cell">${member.finalScore} ن</td>
            ${isAuthorizedAdmin ? `<td>
                <button class="btn btn-info" style="padding: 4px 8px; font-size:0.8rem;" onclick="editMember('${member.id}')">➕ حقن نقاط</button>
                ${currentAdminRole === 'owner' ? `<button class="btn btn-danger" style="padding: 4px 8px; font-size:0.8rem;" onclick="deleteMember('${member.id}')">حذف</button>` : ''}
            </td>` : ''}
        `;
        tbody.appendChild(tr);
    });
    applyVisibilityRules();
}

function handleFormSubmit(e) {
    e.preventDefault(); if (!currentLoggedInAdmin) return;
    const id = document.getElementById('memberId').value; const name = document.getElementById('memberName').value.trim();
    const inputDuel = parseInt(document.getElementById('allianceDuel').value) || 0; const inputTech = parseInt(document.getElementById('techDonations').value) || 0;
    const inputDesert = parseInt(document.getElementById('desertStorm').value) || 0; const inputValley = parseInt(document.getElementById('valleyBattle').value) || 0;
    const inputSeason = parseInt(document.getElementById('seasonWars').value) || 0;
    const currentTimestamp = getFormattedDateTime(); 

    if (id) {
        const index = members.findIndex(m => m.id === id);
        if (index !== -1) {
            members[index].duel = currentEditMemberOldData.duel + inputDuel; members[index].tech = currentEditMemberOldData.tech + inputTech;
            members[index].desert = currentEditMemberOldData.desert + inputDesert; members[index].valley = currentEditMemberOldData.valley + inputValley;
            members[index].season = currentEditMemberOldData.season + inputSeason;
            auditLogs.unshift({ operator: currentLoggedInAdmin, action: "حقن نقاط تراكمية", details: `إضافة للعضو [${name}]: مبارزة (+${inputDuel.toLocaleString()})`, datetime: currentTimestamp });
        }
    } else {
        members.push({ id: Date.now().toString(), name, duel: inputDuel, tech: inputTech, desert: inputDesert, valley: inputValley, season: inputSeason });
        auditLogs.unshift({ operator: currentLoggedInAdmin, action: "إضافة عضو جديد", details: `تسجيل العضو [${name}]`, datetime: currentTimestamp });
    }
    saveToStorage(); calculateScoresAndRender(); closeModal();
}

function openModal(member = null) {
    const modal = document.getElementById('memberModal'); document.getElementById('memberForm').reset(); document.getElementById('memberId').value = '';
    if (member) {
        document.getElementById('modalTitle').textContent = `حقن نقاط جديدة لـ: ${member.name}`;
        document.getElementById('memberId').value = member.id; document.getElementById('memberName').value = member.name; document.getElementById('memberName').readOnly = true;
        currentEditMemberOldData = { duel: parseInt(member.duel) || 0, tech: parseInt(member.tech) || 0, desert: parseInt(member.desert) || 0, valley: parseInt(member.valley) || 0, season: parseInt(member.season) || 0 };
        document.getElementById('currentDuelBadge').textContent = `الرصيد الحالي: ${currentEditMemberOldData.duel.toLocaleString()}`;
        document.getElementById('currentTechBadge').textContent = `الرصيد الحالي: ${currentEditMemberOldData.tech.toLocaleString()}`;
        document.getElementById('currentDesertBadge').textContent = `الحضور الحالي: ${currentEditMemberOldData.desert}`;
        document.getElementById('currentValleyBadge').textContent = `الحضور الحالي: ${currentEditMemberOldData.valley}`;
        document.getElementById('currentSeasonBadge').textContent = `الحضور الحالي: ${currentEditMemberOldData.season}`;
    } else {
        document.getElementById('modalTitle').textContent = 'إضافة عضو جديد لكشوفات التحالف'; document.getElementById('memberName').readOnly = false;
        currentEditMemberOldData = { duel: 0, tech: 0, desert: 0, valley: 0, season: 0 };
    }
    modal.style.display = 'flex';
}

function closeModal() { document.getElementById('memberModal').style.display = 'none'; }
window.editMember = function(id) { const member = members.find(m => m.id === id); if (member) openModal(member); };

window.deleteMember = function(id) {
    if (currentAdminRole !== 'owner') return;
    const member = members.find(m => m.id === id);
    if (member && confirm(`هل تود حذف العضو (${member.name}) نهائياً؟`)) {
        auditLogs.unshift({ operator: currentLoggedInAdmin, action: "طرد وحذف عضو", details: `مسح العضو [${member.name}] نهائياً`, datetime: getFormattedDateTime() });
        members = members.filter(m => m.id !== id); saveToStorage(); calculateScoresAndRender();
    }
};

function openAuditModal() {
    if (currentAdminRole !== 'owner') return;
    const tbody = document.getElementById('auditLogTableBody'); tbody.innerHTML = '';
    auditLogs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="color:var(--gold-primary); font-weight:bold;">${escapeHtml(log.operator)}</td><td><b>${log.action}</b></td><td style="color:#cbd5e1;">${log.details}</td><td style="color:var(--text-muted); font-size:0.8rem; font-weight:600;">${log.datetime}</td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('auditModal').style.display = 'flex';
}

// فتح ونافذة مستعرض الأرشيف الموسمي التلقائي لـ Abo S3D
function openArchiveModal() {
    if (currentAdminRole !== 'owner') return;
    const tbody = document.getElementById('archiveTableBody');
    tbody.innerHTML = '';

    if (seasonalArchive.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">الأرشيف فارغ حالياً، بانتظار حلول أول إغلاق لإثنين القادم الساعة 5:00 صباحاً.</td></tr>`;
    } else {
        seasonalArchive.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:var(--gold-primary); font-weight:bold;">${item.weekLabel}</td>
                <td><b>${item.dateRange}</b></td>
                <td>${item.totalMembersCount} عضو قتالي</td>
                <td>
                    <button class="btn btn-success" style="padding:4px 10px; font-size:0.8rem;" onclick="downloadArchiveAsCSV('${item.archiveId}')">📥 تحميل التقرير (CSV)</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    document.getElementById('archiveModal').style.display = 'flex';
}

// تحميل كشف أسبوعي مؤرشف سابقاً كملف مستقل ومفصل لدعم حصاد التقييم النهائي للموسم
window.downloadArchiveAsCSV = function(archiveId) {
    if (currentAdminRole !== 'owner') return;
    const archiveItem = seasonalArchive.find(a => a.archiveId === archiveId);
    if (!archiveItem) return;

    let csvContent = "\uFEFF# كشف أسبوعي مؤرشف سابقاً لتقييم الموسم - " + archiveItem.weekLabel + " [النطاق الزمني: " + archiveItem.dateRange + "]\n";
    csvContent += "الترتيب,الاسم,نقاط المبارزة التراكمية,نقاط التبرع التراكمية,حضور الصحراء,حضور الوادي,حروب الموسم,المجموع الفعلي المحقق\n";
    
    archiveItem.dataSnapshot.forEach((m, idx) => {
        csvContent += `${idx + 1},"${m.name}",${m.duel},${m.tech},${m.desert},${m.valley},${m.season || 0},${m.finalScore}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `أرشيف_تحالف_HFo_${archiveItem.weekCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

function generateWeeklyTableImage() {
    if (currentAdminRole !== "owner") return; if (members.length === 0) return;
    const canvas = document.createElement('canvas'); const headerH = 160; const rowH = 45; const footerH = 70;
    canvas.width = 1400; canvas.height = headerH + (members.length * rowH) + footerH + 40; const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#eab308'; ctx.lineWidth = 8; ctx.strokeRect(12, 10, canvas.width - 24, canvas.height - 20);
    ctx.fillStyle = '#1c140e'; ctx.fillRect(35, 30, canvas.width - 70, 110);
    ctx.strokeStyle = '#eab308'; ctx.lineWidth = 2; ctx.strokeRect(35, 30, canvas.width - 70, 110);
    ctx.fillStyle = '#facc15'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`كشف تقرير التفاعل الأسبوعي الشامل - تحالف HFo`, canvas.width / 2, 75);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px Arial';
    ctx.fillText(`نطاق الحساب الدوري للأسبوع الحالي: ${getWeeklyDateRangeString()}`, canvas.width / 2, 112);
    const startY = 165; ctx.fillStyle = '#1e293b'; ctx.fillRect(35, startY, canvas.width - 70, 40);
    ctx.strokeStyle = '#475569'; ctx.strokeRect(35, startY, canvas.width - 70, 40);
    ctx.fillStyle = '#eab308'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'right';
    const cols = [50, 260, 480, 680, 840, 980, 1120, 1280];
    ctx.fillText('الترتيب', canvas.width - cols[0], startY + 26); ctx.fillText('اسم عضو التحالف', canvas.width - cols[1], startY + 26);
    ctx.fillText('نقاط مبارزة التحالف التراكمية', canvas.width - cols[2], startY + 26); ctx.fillText('نقاط تبرع تقنية التحالف', canvas.width - cols[3], startY + 26);
    ctx.fillText('حضور عاصفة الصحراء', canvas.width - cols[4], startY + 26); ctx.fillText('حضور معركة الوادي', canvas.width - cols[5], startY + 26);
    ctx.fillText('حروب الموسم', canvas.width - cols[6], startY + 26); ctx.fillText('المجموع الإجمالي الكلي', canvas.width - cols[7], startY + 26);
    let nextY = startY + 40; ctx.font = 'bold 15px Arial';
    members.forEach((m, idx) => {
        if (idx % 2 === 0) { ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'; ctx.fillRect(35, nextY, canvas.width - 70, rowH); }
        ctx.fillStyle = '#94a3b8'; ctx.fillText(`#${idx + 1}`, canvas.width - cols[0], nextY + 28);
        ctx.fillStyle = '#ffffff'; ctx.fillText(m.name, canvas.width - cols[1], nextY + 28);
        ctx.fillStyle = '#cbd5e1'; ctx.fillText(Number(m.duel).toLocaleString(), canvas.width - cols[2], nextY + 28);
        ctx.fillText(Number(m.tech).toLocaleString(), canvas.width - cols[3], nextY + 28);
        ctx.fillText(`${m.desert} معركة`, canvas.width - cols[4], nextY + 28); ctx.fillText(`${m.valley} معركة`, canvas.width - cols[5], nextY + 28);
        ctx.fillText(`${m.season || 0} مشاركة`, canvas.width - cols[6], nextY + 28);
        ctx.fillStyle = '#facc15'; ctx.font = 'bold 16px Arial'; ctx.fillText(`${m.finalScore} نقطة`, canvas.width - cols[7], nextY + 28);
        ctx.font = 'bold 15px Arial'; ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(35, nextY + rowH); ctx.lineTo(canvas.width - 35, nextY + rowH); ctx.stroke(); nextY += rowH;
    });
    ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`إعداد وإشراف وإغلاق أسبوعي بواسطة المالك: 806 Abo S3D - HFo © 2026  |  توقيت التصدير والأرشفة: ${getFormattedDateTime()}`, canvas.width / 2, canvas.height - 35);
    const imageURI = canvas.toDataURL('image/png'); const link = document.createElement('a');
    link.download = `كشف_تفاعل_التحالف_الأسبوع_${getWeekNumber()}_رسمي.png`; link.href = imageURI;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function generateHonorRollImage() {
    if (currentAdminRole !== "owner") return; if (members.length === 0) return;
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 760; const ctx = canvas.getContext('2d');
    let bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height); bgGrad.addColorStop(0, '#110c08'); bgGrad.addColorStop(0.5, '#0d131f'); bgGrad.addColorStop(1, '#08090d');
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    let glowGrad = ctx.createRadialGradient(canvas.width/2, 210, 20, canvas.width/2, 210, 250); glowGrad.addColorStop(0, 'rgba(234, 179, 8, 0.15)'); glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad; ctx.fillRect(0, 100, canvas.width, 350);
    ctx.strokeStyle = '#1e1610'; ctx.lineWidth = 16; ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 2; ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
    ctx.fillStyle = '#1c140e'; ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(320, 20); ctx.lineTo(880, 20); ctx.lineTo(830, 110); ctx.lineTo(370, 110); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ca8a04'; ctx.fillRect(320, 20, 10, 10); ctx.fillRect(870, 20, 10, 10);
    ctx.fillStyle = '#facc15'; ctx.font = 'bold 28px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 4;
    ctx.fillText('لوحة شرف مبارزة التحالف HFo', canvas.width / 2, 65);
    ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 14px Arial'; ctx.fillText(`نطاق تقييم الأسبوع: ${getWeeklyDateRangeString()}`, canvas.width / 2, 95); ctx.shadowBlur = 0; 
    const top3 = members.slice(0, 3); const centerY = 215;
    if (top3[1]) { let x = 320, y = centerY; ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 16px Arial'; ctx.fillText('#2 الفارس الفضي', x, y - 25); ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 22px Arial'; ctx.fillText(top3[1].name, x, y + 8); ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 14px Arial'; ctx.fillText(`${top3[1].finalScore} pts`, x, y + 33); }
    if (top3[0]) { let x = 600, y = centerY - 15; ctx.fillStyle = '#eab308'; ctx.font = 'bold 20px Arial'; ctx.fillText('👑 بطل الجبهة #1', x, y - 30); ctx.fillStyle = '#facc15'; ctx.font = 'bold 26px Arial'; ctx.fillText(top3[0].name, x, y + 10); ctx.fillStyle = '#4ade80'; ctx.font = 'bold 16px Arial'; ctx.fillText(`${top3[0].finalScore} pts`, x, y + 38); }
    if (top3[2]) { let x = 880, y = centerY; ctx.fillStyle = '#f97316'; ctx.font = 'bold 16px Arial'; ctx.fillText('#3 الفارس البرونزي', x, y - 25); ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 22px Arial'; ctx.fillText(top3[2].name, x, y + 8); ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 14px Arial'; ctx.fillText(`${top3[2].finalScore} pts`, x, y + 33); }
    const tableX = 150; const tableY = 325; const tableW = 900; const rowH = 38;
    ctx.fillStyle = 'rgba(17, 20, 28, 0.88)'; ctx.fillRect(tableX, tableY, tableW, rowH * 7 + 40);
    ctx.strokeStyle = '#2e3d52'; ctx.strokeRect(tableX, tableY, tableW, rowH * 7 + 40);
    ctx.fillStyle = 'rgba(28, 35, 48, 0.95)'; ctx.fillRect(tableX, tableY, tableW, 35);
    ctx.fillStyle = '#ca8a04'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText('الرتبة', tableX + 50, tableY + 22); ctx.fillText('شعار التفاعل', tableX + 180, tableY + 22);
    ctx.fillText('اسم الفارس المستبسل', tableX + 450, tableY + 22); ctx.fillText('النقاط التراكمية المحققة', tableX + 780, tableY + 22);
    const runners = members.slice(3, 10); let currentY = tableY + 62;
    runners.forEach((m, idx) => {
        const actualRank = idx + 4;
        if (idx % 2 === 0) { ctx.fillStyle = 'rgba(255, 255, 255, 0.02)'; ctx.fillRect(tableX + 5, currentY - 20, tableW - 10, rowH); }
        ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 14px Arial'; ctx.fillText(`#${actualRank}`, tableX + 50, currentY);
        ctx.fillStyle = actualRank < 7 ? '#ca8a04' : '#475569'; ctx.beginPath(); ctx.arc(tableX + 180, currentY - 4, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 15px Arial'; ctx.fillText(m.name, tableX + 450, currentY);
        ctx.fillStyle = '#facc15'; ctx.font = 'bold 14px Arial'; ctx.fillText(`${m.finalScore.toLocaleString()} pts`, tableX + 780, currentY);
        currentY += rowH;
    });
    ctx.fillStyle = '#475569'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`إعداد وإشراف وتطوير - 806 Abo S3D - HFo © 2026  |  تاريخ التصدير: ${getFormattedDateTime()}`, canvas.width / 2, canvas.height - 25);
    const imageURI = canvas.toDataURL('image/png'); const link = document.createElement('a'); link.download = `لوحة_شرف_مبارزة_التحالف_HFo.png`; link.href = imageURI;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function exportToCSV() {
    if (currentAdminRole !== "owner") return;
    const timeStampLabel = getFormattedDateTime().replace(/\|/g, "-").replace(/:/g, "."); const weekNum = getWeekNumber();
    const rangeStr = getWeeklyDateRangeString().replace(/ /g, "_");
    let csvContent = "\uFEFF# تقرير تفاعل تحالف HFo الدوري - نطاق الحساب: " + getWeeklyDateRangeString() + " - المستخرج في: " + timeStampLabel + "\n";
    csvContent += "الترتيب الأسبوعي,الاسم,مبارزة التحالف (الرصيد التراكمي),تبرع التقنية (الرصيد التراكمي),عاصفة الصحراء,معركة الوادي,حروب الموسم,إجمالي النقاط الفعلي الحركي\n";
    members.forEach((m, index) => { csvContent += `${index + 1},"${m.name}",${m.duel},${m.tech},${m.desert},${m.valley},${m.season || 0},${m.finalScore}\n`; });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `كشف_تفاعل_${rangeStr}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function importFromCSV(e) {
    if (currentAdminRole !== "owner") return;
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const lines = evt.target.result.split('\n'); const newMembers = []; let startRow = lines[0].startsWith('#') || lines[0].startsWith('\uFEFF#') ? 2 : 1;
            for (let i = startRow; i < lines.length; i++) {
                const line = lines[i].trim(); if (!line) continue;
                const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                if (columns.length >= 7) {
                    newMembers.push({ id: (Date.now() + i).toString(), name: columns[1].replace(/^"|"$/g, '').trim(), duel: parseInt(columns[2]) || 0, tech: parseInt(columns[3]) || 0, desert: parseInt(columns[4]) || 0, valley: parseInt(columns[5]) || 0, season: parseInt(columns[6]) || 0 });
                }
            }
            if (newMembers.length > 0 && confirm(`تم رصد ${newMembers.length} عضو. استبدال الكشوفات؟`)) { members = newMembers; saveToStorage(); calculateScoresAndRender(); alert("تم استيراد البيانات."); }
        } catch (error) { alert('خطأ في الملف.'); }
        e.target.value = '';
    };
    reader.readAsText(file, 'UTF-8');
}

function prepareWeeklyMailReport() {
    if (currentAdminRole !== "owner") return;
    const emailTarget = "s.jlaighm@gmail.com"; const currentFullTime = getFormattedDateTime();
    const subject = encodeURIComponent(`تقرير كشف تفاعل تحالف HFo الدوري - نطاق الحساب: ${getWeeklyDateRangeString()}`);
    let bodyText = `تحية طيبة،\n\nنرفق لكم الكشف الأسبوعي لنقاط تفاعل تحالف HFo.\nنطاق التقييم: ${getWeeklyDateRangeString()}\nتوقيت استخراج الكشف النهائي: ${currentFullTime}\n\n`;
    bodyText += `--------------------------------------------------------\nالترتيب الأسبوعي | اسم الفارس | إجمالي النقاط المحققة\n--------------------------------------------------------\n`;
    members.forEach((m, index) => { bodyText += `#${index + 1} - ${m.name} | النتيجة: ${m.finalScore} نقطة\n`; });
    bodyText += `--------------------------------------------------------\nإشراف وتوجيه القائد المالك: Abo S3D.\n`;
    window.location.href = `mailto:${emailTarget}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
    auditLogs.unshift({ operator: "Abo S3D", action: "تصدير تقرير بريدي", details: `إرسال الكشف الأسبوعي بريدياً لنطاق الأسبوع الحالي`, datetime: currentFullTime });
    saveToStorage();
}

function escapeHtml(text) { const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }; return String(text).replace(/[&<>"']/g, m => map[m]); }
