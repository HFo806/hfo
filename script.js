/**
 * نظام حاسبة التفاعل التراكمي المحمي للأدمن السبعة - تحالف HFo
 * وضع الزائر: مشاهدة صرفة بدون أي تحكم أو صلاحيات تصدير لوحات شرف
 * المالك والمتحكم الرئيسي والمطور: Abo S3D HFo 806
 */

const CALCULATOR_WEIGHTS = {
    DUEL_POINTS_DIVIDER: 100000, 
    TECH_POINTS_DIVIDER: 100,    
    DESERT_ATTEND_VAL: 30,       
    VALLEY_ATTEND_VAL: 30,       
    SEASON_WAR_VAL: 50           
};

// هيكل الأدمن السبعة الرسمي مع الرموز السرية الخاصة بكل منهم
const ALLIANCE_ADMINS = {
    "Abo S3D": { pin: "8061", role: "owner" }, // المالك والمتحكم العام
    "الهفوف": { pin: "8062", role: "admin" },
    "AhmedBj": { pin: "8063", role: "admin" },
    "saloohka1": { pin: "8064", role: "admin" },
    "STEEV": { pin: "8065", role: "admin" },
    "Rooz5": { pin: "8066", role: "admin" },
    "Abu som3a": { pin: "8067", role: "admin" }
};

// إعدادات الجلسة الافتراضية عند دخول الزائر (مشاهدة فقط)
let currentLoggedInAdmin = null; 
let currentAdminRole = "viewer"; 

let members = [];
let auditLogs = [];
let currentEditMemberOldData = { duel: 0, tech: 0, desert: 0, valley: 0, season: 0 };

// بيانات تجريبية لـ 10 أعضاء
const defaultMembers = [
    { id: "1", name: "فارس_HFo", duel: 14400000, tech: 12000, desert: 1, valley: 1, season: 1 },
    { id: "2", name: "المدمر_01", duel: 7200000, tech: 6000, desert: 1, valley: 1, season: 0 },
    { id: "3", name: "عاصف_الجبهة", duel: 8500000, tech: 9000, desert: 0, valley: 1, season: 1 },
    { id: "4", name: "كاسر_الدروع", duel: 7300000, tech: 6200, desert: 1, valley: 0, season: 0 },
    { id: "5", name: "M_General", duel: 4200000, tech: 3000, desert: 0, valley: 1, season: 0 },
    { id: "6", name: "السهم_الملكي", duel: 7200000, tech: 1500, desert: 1, valley: 0, season: 0 },
    { id: "7", name: "المرعب_بصمت", duel: 1200000, tech: 6000, desert: 0, valley: 0, season: 0 },
    { id: "8", name: "صياد_التحالف", duel: 3000000, tech: 4000, desert: 0, valley: 0, season: 0 },
    { id: "9", name: "HFo_Ghost", duel: 0, tech: 2000, desert: 0, valley: 0, season: 0 },
    { id: "10", name: "المحارب_الأخير", duel: 0, tech: 0, desert: 0, valley: 0, season: 0 }
];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    members = JSON.parse(localStorage.getItem('hfo_strict_members')) || [...defaultMembers];
    auditLogs = JSON.parse(localStorage.getItem('hfo_strict_logs')) || [
        { operator: "النظام", action: "تأمين شامل", details: "تم عزل وضع الزائر بالكامل، وإخفاء أزرار التحكم والتصدير بنجاح", datetime: new Date().toLocaleString('ar-EG') }
    ];
    
    saveToStorage();
    calculateScoresAndRender();
    applyVisibilityRules();
}

function saveToStorage() {
    localStorage.setItem('hfo_strict_members', JSON.stringify(members));
    localStorage.setItem('hfo_strict_logs', JSON.stringify(auditLogs));
}

function setupEventListeners() {
    document.getElementById('loginAdminBtn').addEventListener('click', handleAdminLogin);
    document.getElementById('logoutAdminBtn').addEventListener('click', handleAdminLogout);
    document.getElementById('openAddModalBtn').addEventListener('click', () => openModal());
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('memberForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('searchInput').addEventListener('input', (e) => calculateScoresAndRender(e.target.value));
    document.getElementById('exportHonorBtn').addEventListener('click', generateHonorRollImage);
    document.getElementById('viewAuditLogBtn').addEventListener('click', openAuditModal);
    document.getElementById('closeAuditModalBtn').addEventListener('click', () => document.getElementById('auditModal').style.display='none');
}

// نظام التحقق الصارم من هوية الرموز السرية للإدارة
function handleAdminLogin() {
    let pinInput = prompt("الرجاء إدخال الرمز السري الخاص بالأدمن:");
    if (!pinInput) return;

    let foundAdmin = null;
    let adminName = null;

    for (const [name, info] of Object.entries(ALLIANCE_ADMINS)) {
        if (info.pin === pinInput) {
            foundAdmin = info;
            adminName = name;
            break;
        }
    }

    if (foundAdmin) {
        currentLoggedInAdmin = adminName;
        currentAdminRole = foundAdmin.role;
        
        alert(`تم تفعيل صلاحيات الإدارة الكاملة. مرحباً بالأدمن: [${adminName}].`);
        
        document.getElementById('loginAdminBtn').style.display = 'none';
        document.getElementById('logoutAdminBtn').style.display = 'inline-block';
        document.getElementById('adminStatusBadge').textContent = `الأدمن الحالي: ${adminName} ✨`;
        document.getElementById('adminStatusBadge').className = "status-badge badge-unlocked";
        
        if (currentAdminRole === "owner") {
            document.getElementById('ownerZone').style.display = 'block';
        }
    } else {
        alert("الرمز السري غير صحيح! ستبقى واجهتك في وضع المشاهدة الصرفة المحمية.");
    }
    
    applyVisibilityRules();
    calculateScoresAndRender();
}

function handleAdminLogout() {
    currentLoggedInAdmin = null;
    currentAdminRole = "viewer";
    
    document.getElementById('loginAdminBtn').style.display = 'inline-block';
    document.getElementById('logoutAdminBtn').style.display = 'none';
    document.getElementById('adminStatusBadge').textContent = "الوضع الحالي: مشاهدة فقط 👁️";
    document.getElementById('adminStatusBadge').className = "status-badge badge-locked";
    document.getElementById('ownerZone').style.display = 'none';
    
    applyVisibilityRules();
    calculateScoresAndRender();
}

// العزل التام والمطلق لأزرار لوحة الشرف والتعديل والإضافة عن الزائر
function applyVisibilityRules() {
    const isAuthorized = (currentAdminRole === "admin" || currentAdminRole === "owner");
    
    // إخفاء أو إظهار أزرار اللوحة الرئيسية ديناميكياً
    document.getElementById('openAddModalBtn').style.display = isAuthorized ? 'inline-block' : 'none';
    document.getElementById('exportHonorBtn').style.display = isAuthorized ? 'inline-block' : 'none';
    document.getElementById('viewAuditLogBtn').style.display = isAuthorized ? 'inline-block' : 'none';
    
    // التحكم في عمود الإجراءات بالجدول
    const ths = document.getElementsByClassName('action-th');
    for(let th of ths) { th.style.display = isAuthorized ? 'table-cell' : 'none'; }
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
    const tbody = document.getElementById('membersTableBody');
    tbody.innerHTML = '';

    const isAuthorized = (currentAdminRole === "admin" || currentAdminRole === "owner");

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
            ${isAuthorized ? `<td>
                <button class="btn btn-info" style="padding: 4px 8px; font-size:0.8rem;" onclick="editMember('${member.id}')">➕ حقن نقاط</button>
                ${currentAdminRole === 'owner' ? `<button class="btn btn-danger" style="padding: 4px 8px; font-size:0.8rem;" onclick="deleteMember('${member.id}')">حذف</button>` : ''}
            </td>` : ''}
        `;
        tbody.appendChild(tr);
    });
    applyVisibilityRules();
}

function handleFormSubmit(e) {
    e.preventDefault();
    if (!currentLoggedInAdmin) return;

    const id = document.getElementById('memberId').value;
    const name = document.getElementById('memberName').value.trim();
    
    const inputDuel = parseInt(document.getElementById('allianceDuel').value) || 0;
    const inputTech = parseInt(document.getElementById('techDonations').value) || 0;
    const inputDesert = parseInt(document.getElementById('desertStorm').value) || 0;
    const inputValley = parseInt(document.getElementById('valleyBattle').value) || 0;
    const inputSeason = parseInt(document.getElementById('seasonWars').value) || 0;

    const currentTimestamp = new Date().toLocaleString('ar-EG');

    if (id) {
        const index = members.findIndex(m => m.id === id);
        if (index !== -1) {
            members[index].duel = currentEditMemberOldData.duel + inputDuel;
            members[index].tech = currentEditMemberOldData.tech + inputTech;
            members[index].desert = currentEditMemberOldData.desert + inputDesert;
            members[index].valley = currentEditMemberOldData.valley + inputValley;
            members[index].season = currentEditMemberOldData.season + inputSeason;

            auditLogs.unshift({
                operator: currentLoggedInAdmin,
                action: "حقن نقاط تراكمية",
                details: `إضافة للعضو [${name}]: مبارزة (+${inputDuel.toLocaleString()}), تقنية (+${inputTech.toLocaleString()}), أحداث [صحراء:+${inputDesert}, وادي:+${inputValley}, موسم:+${inputSeason}]`,
                datetime: currentTimestamp
            });
        }
    } else {
        members.push({ id: Date.now().toString(), name, duel: inputDuel, tech: inputTech, desert: inputDesert, valley: inputValley, season: inputSeason });
        auditLogs.unshift({
            operator: currentLoggedInAdmin,
            action: "إضافة عضو جديد",
            details: `تسجيل العضو الجديد [${name}] برصيد نقاط مبدئي`,
            datetime: currentTimestamp
        });
    }

    saveToStorage();
    calculateScoresAndRender();
    closeModal();
}

function openModal(member = null) {
    const modal = document.getElementById('memberModal');
    document.getElementById('memberForm').reset();
    document.getElementById('memberId').value = '';

    if (member) {
        document.getElementById('modalTitle').textContent = `حقن نقاط جديدة لـ: ${member.name}`;
        document.getElementById('memberId').value = member.id;
        document.getElementById('memberName').value = member.name;
        document.getElementById('memberName').readOnly = true;
        
        currentEditMemberOldData = {
            duel: parseInt(member.duel) || 0, tech: parseInt(member.tech) || 0,
            desert: parseInt(member.desert) || 0, valley: parseInt(member.valley) || 0, season: parseInt(member.season) || 0
        };

        document.getElementById('currentDuelBadge').textContent = `الرصيد الحالي: ${currentEditMemberOldData.duel.toLocaleString()}`;
        document.getElementById('currentTechBadge').textContent = `الرصيد الحالي: ${currentEditMemberOldData.tech.toLocaleString()}`;
        document.getElementById('currentDesertBadge').textContent = `الحضور الحالي: ${currentEditMemberOldData.desert}`;
        document.getElementById('currentValleyBadge').textContent = `الحضور الحالي: ${currentEditMemberOldData.valley}`;
        document.getElementById('currentSeasonBadge').textContent = `الحضور الحالي: ${currentEditMemberOldData.season}`;
    } else {
        document.getElementById('modalTitle').textContent = 'إضافة عضو جديد لكشوفات التحالف';
        document.getElementById('memberName').readOnly = false;
        currentEditMemberOldData = { duel: 0, tech: 0, desert: 0, valley: 0, season: 0 };
    }
    modal.style.display = 'flex';
}

function closeModal() { document.getElementById('memberModal').style.display = 'none'; }

window.editMember = function(id) { const member = members.find(m => m.id === id); if (member) openModal(member); };

window.deleteMember = function(id) {
    if (currentAdminRole !== 'owner') { alert("صلاحية مرفوضة! المالك Abo S3D هو المخول الوحيد بالحذف."); return; }
    const member = members.find(m => m.id === id);
    if (member && confirm(`هل تود حذف العضو (${member.name}) نهائياً؟`)) {
        auditLogs.unshift({
            operator: currentLoggedInAdmin,
            action: "طرد وحذف عضو",
            details: `مسح كشوفات العضو [${member.name}] نهائياً من قاعدة البيانات`,
            datetime: new Date().toLocaleString('ar-EG')
        });
        members = members.filter(m => m.id !== id);
        saveToStorage();
        calculateScoresAndRender();
    }
};

function openAuditModal() {
    const tbody = document.getElementById('auditLogTableBody');
    tbody.innerHTML = '';
    auditLogs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="color:var(--gold-primary); font-weight:bold;">${escapeHtml(log.operator)}</td><td><b>${log.action}</b></td><td style="color:#cbd5e1;">${log.details}</td><td style="color:var(--text-muted); font-size:0.8rem;">${log.datetime}</td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('auditModal').style.display = 'flex';
}

function generateHonorRollImage() {
    if (currentAdminRole === "viewer") return; // جدار حماية لمنع الزائر من تشغيل الدالة برمجياً
    const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 1000; const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#eab308'; ctx.lineWidth = 8; ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(40, 40, canvas.width - 80, 160);
    ctx.fillStyle = '#eab308'; ctx.font = 'bold 34px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('لوحة الشرف الأسبوعية - تحالف HFo', canvas.width / 2, 105);
    ctx.fillStyle = '#94a3b8'; ctx.font = '20px Arial, sans-serif';
    ctx.fillText('إشراف وتطوير القائد العام: Abo S3D HFo 806', canvas.width / 2, 155);

    const podiumY = 480; const top3 = members.slice(0, 3);
    if (top3[1]) { ctx.fillStyle = '#475569'; ctx.fillRect(150, podiumY, 150, 120); ctx.fillStyle = '#cbd5e1'; ctx.font = 'bold 22px Arial, sans-serif'; ctx.fillText(top3[1].name, 225, podiumY - 40); ctx.fillText(`${top3[1].finalScore} ن`, 225, podiumY - 10); }
    if (top3[0]) { ctx.fillStyle = '#ca8a04'; ctx.fillRect(325, podiumY - 50, 150, 170); ctx.fillStyle = '#eab308'; ctx.font = 'bold 26px Arial, sans-serif'; ctx.fillText(top3[0].name, 400, podiumY - 95); ctx.fillText(`${top3[0].finalScore} ن`, 400, podiumY - 65); }
    if (top3[2]) { ctx.fillStyle = '#78350f'; ctx.fillRect(500, podiumY, 150, 120); ctx.fillStyle = '#b45309'; ctx.font = 'bold 22px Arial, sans-serif'; ctx.fillText(top3[2].name, 575, podiumY - 40); ctx.fillText(`${top3[2].finalScore} ن`, 575, podiumY - 10); }

    ctx.fillStyle = '#1e293b'; ctx.fillRect(60, 640, canvas.width - 120, 260);
    ctx.fillStyle = '#eab308'; ctx.font = 'bold 20px Arial, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('فرسان التفاعل الإضافية للأسبوع الحالي:', canvas.width - 80, 685);
    const runners = members.slice(3, 8); let startY = 725; ctx.font = '18px Arial, sans-serif'; ctx.fillStyle = '#f8fafc';
    runners.forEach((m, idx) => { ctx.textAlign = 'right'; ctx.fillText(`${idx + 4}. ${m.name}`, canvas.width - 90, startY); ctx.textAlign = 'left'; ctx.fillText(`${m.finalScore} نقطة`, 90, startY); startY += 35; });

    ctx.fillStyle = '#94a3b8'; ctx.font = '15px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('تطوير وإشراف - 806 Abo S3D - HFo', canvas.width / 2, 955);
    const imageURI = canvas.toDataURL('image/png'); const link = document.createElement('a'); link.download = `لوحة_شرف_تحالف_HFo.png`; link.href = imageURI; document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function escapeHtml(text) { const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }; return String(text).replace(/[&<>"']/g, m => map[m]); }