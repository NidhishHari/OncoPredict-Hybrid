document.addEventListener('DOMContentLoaded', () => {
    // Element references with null checks
    const valuationForm = document.getElementById('valuation-form');
    const inputView = document.getElementById('input-view');
    const resultView = document.getElementById('result-view');
    const navResults = document.getElementById('nav-results');
    const analyzeBtn = document.getElementById('analyze-btn');
    const downloadBtn = document.getElementById('download-btn');

    // Only access properties if elements exist
    const btnText = analyzeBtn ? analyzeBtn.querySelector('span') : null;
    const loader = analyzeBtn ? analyzeBtn.querySelector('.loader') : null;

    // Store latest result for download
    let currentResultData = null;
    let patientData = {};

    // Navigation Elements
    const navItems = document.querySelectorAll('.nav-item');
    const sections = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5'];

    // ===================================
    // AUTO-SAVE FUNCTIONALITY
    // ===================================
    const AUTOSAVE_KEY = 'oncopredict_autosave';
    let autoSaveTimeout = null;

    // Auto-save form data to localStorage
    function autoSaveFormData() {
        const formData = {
            patientId: document.getElementById('patient-id')?.value || '',
            patientAge: document.getElementById('patient-age')?.value || '',
            cancerType: document.getElementById('cancer-type')?.value || '',
            cancerStage: document.getElementById('cancer-stage')?.value || '',
            bioTp53: document.getElementById('bio-tp53')?.value || '',
            bioEgfr: document.getElementById('bio-egfr')?.value || '',
            bioP16: document.getElementById('bio-p16')?.value || '',
            bioKi67: document.getElementById('bio-ki67')?.value || '',
            bioCyclin: document.getElementById('bio-cyclin')?.value || '',
            bioMmp9: document.getElementById('bio-mmp9')?.value || '',
            bioVegf: document.getElementById('bio-vegf')?.value || '',
            bioHer2: document.getElementById('bio-her2')?.value || '',
            dataContent: document.getElementById('data-content')?.value || '',
            timestamp: new Date().toISOString()
        };

        try {
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
            showAutoSaveIndicator();
        } catch (e) {
            console.warn('Auto-save failed:', e);
        }
    }

    // Debounced auto-save (saves 1 second after user stops typing)
    function debouncedAutoSave() {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(autoSaveFormData, 1000);
    }

    // Show auto-save indicator
    function showAutoSaveIndicator() {
        let indicator = document.getElementById('autosave-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'autosave-indicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(34, 197, 94, 0.9);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 0.85rem;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            indicator.innerHTML = '<i class="fa-solid fa-check"></i> Auto-saved';
            document.body.appendChild(indicator);
        }

        indicator.style.opacity = '1';
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 2000);
    }

    // Restore form data from localStorage
    function restoreFormData() {
        try {
            const savedData = localStorage.getItem(AUTOSAVE_KEY);
            if (savedData) {
                const data = JSON.parse(savedData);

                // Ask user if they want to restore
                const savedDate = new Date(data.timestamp);
                const timeAgo = getTimeAgo(savedDate);

                if (confirm(`Found auto-saved data from ${timeAgo}. Would you like to restore it?`)) {
                    document.getElementById('patient-id').value = data.patientId || '';
                    document.getElementById('patient-age').value = data.patientAge || '';
                    document.getElementById('cancer-type').value = data.cancerType || '';
                    document.getElementById('cancer-stage').value = data.cancerStage || '';
                    document.getElementById('bio-tp53').value = data.bioTp53 || '';
                    document.getElementById('bio-egfr').value = data.bioEgfr || '';
                    document.getElementById('bio-p16').value = data.bioP16 || '';
                    document.getElementById('bio-ki67').value = data.bioKi67 || '';
                    document.getElementById('bio-cyclin').value = data.bioCyclin || '';
                    document.getElementById('bio-mmp9').value = data.bioMmp9 || '';
                    document.getElementById('bio-vegf').value = data.bioVegf || '';
                    document.getElementById('bio-her2').value = data.bioHer2 || '';
                    document.getElementById('data-content').value = data.dataContent || '';
                }
            }
        } catch (e) {
            console.warn('Failed to restore auto-saved data:', e);
        }
    }

    // Helper function to get time ago
    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    // Attach auto-save listeners to all form inputs
    const formInputs = document.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', debouncedAutoSave);
        input.addEventListener('change', debouncedAutoSave);
    });

    // Restore data on page load
    restoreFormData();

    // Clear auto-save after successful analysis
    function clearAutoSave() {
        try {
            localStorage.removeItem(AUTOSAVE_KEY);
        } catch (e) {
            console.warn('Failed to clear auto-save:', e);
        }
    }

    // ===================================
    // PROGRESS BAR & NOTIFICATIONS
    // ===================================
    let progressBarElement = null;

    function showProgressBar(message, progress) {
        if (!progressBarElement) {
            progressBarElement = document.createElement('div');
            progressBarElement.id = 'progress-overlay';
            progressBarElement.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            progressBarElement.innerHTML = `
                <div style="background: rgba(20, 30, 50, 0.95); padding: 2rem; border-radius: 1rem; min-width: 400px; border: 1px solid var(--border-color); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);">
                    <div id="progress-message" style="color: white; margin-bottom: 1rem; font-size: 1rem; text-align: center;"></div>
                    <div style="width: 100%; background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div id="progress-bar-fill" style="width: 0%; background: linear-gradient(90deg, var(--primary), var(--accent)); height: 100%; transition: width 0.3s ease;"></div>
                    </div>
                    <div id="progress-percent" style="color: var(--text-muted); margin-top: 0.5rem; font-size: 0.85rem; text-align: center;"></div>
                </div>
            `;

            document.body.appendChild(progressBarElement);
        }

        updateProgress(message, progress);
    }

    function updateProgress(message, progress) {
        if (!progressBarElement) return;

        const messageEl = document.getElementById('progress-message');
        const fillEl = document.getElementById('progress-bar-fill');
        const percentEl = document.getElementById('progress-percent');

        if (messageEl) messageEl.textContent = message;
        if (fillEl) fillEl.style.width = progress + '%';
        if (percentEl) percentEl.textContent = Math.round(progress) + '%';
    }

    function hideProgressBar() {
        if (progressBarElement) {
            progressBarElement.remove();
            progressBarElement = null;
        }
    }

    function showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            z-index: 10002;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <i class="fa-solid fa-exclamation-circle" style="font-size: 1.5rem;"></i>
                <div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">Error</div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">${message}</div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Add CSS animations for notifications
    if (!document.querySelector('#notification-animations')) {
        const style = document.createElement('style');
        style.id = 'notification-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // ===================================
    // INPUT VALIDATION
    // ===================================
    function validateInput(input, min, max, fieldName) {
        const value = parseFloat(input.value);
        let errorMsg = '';

        if (input.value && isNaN(value)) {
            errorMsg = `${fieldName} must be a number`;
        } else if (value < min) {
            errorMsg = `${fieldName} must be at least ${min}`;
        } else if (value > max) {
            errorMsg = `${fieldName} cannot exceed ${max}`;
        }

        // Show/hide error message
        let errorEl = input.nextElementSibling;
        if (errorEl && !errorEl.classList.contains('validation-error')) {
            errorEl = null;
        }

        if (errorMsg) {
            if (!errorEl) {
                errorEl = document.createElement('div');
                errorEl.className = 'validation-error';
                errorEl.style.cssText = 'color: var(--risk-high); font-size: 0.8rem; margin-top: 0.25rem;';
                input.parentNode.insertBefore(errorEl, input.nextSibling);
            }
            errorEl.textContent = errorMsg;
            input.style.borderColor = 'var(--risk-high)';
            return false;
        } else {
            if (errorEl) errorEl.remove();
            input.style.borderColor = '';
            return true;
        }
    }

    // Add validation listeners
    const ageInput = document.getElementById('patient-age');
    if (ageInput) {
        ageInput.addEventListener('input', () => validateInput(ageInput, 0, 120, 'Age'));
    }

    const ki67Input = document.getElementById('bio-ki67');
    if (ki67Input) {
        ki67Input.addEventListener('input', () => validateInput(ki67Input, 0, 100, 'Ki-67 Index'));
    }

    const vegfInput = document.getElementById('bio-vegf');
    if (vegfInput) {
        vegfInput.addEventListener('input', () => validateInput(vegfInput, 0, 10000, 'VEGF Level'));
    }

    // ===================================
    // KEYBOARD SHORTCUTS
    // ===================================
    document.addEventListener('keydown', (e) => {
        // Esc to close tooltips
        if (e.key === 'Escape') {
            const activeTooltip = document.querySelector('.custom-tooltip.active');
            if (activeTooltip) {
                activeTooltip.classList.remove('active');
                e.preventDefault();
            }
        }

        // Enter to submit on analyze button (when focused)
        if (e.key === 'Enter' && document.activeElement === analyzeBtn) {
            analyzeBtn.click();
            e.preventDefault();
        }

        // Ctrl+Enter to trigger analyze from anywhere in Step 2
        if (e.ctrlKey && e.key === 'Enter') {
            const currentStep = document.querySelector('.step-content.active');
            if (currentStep && currentStep.id === 'step-2' && analyzeBtn) {
                analyzeBtn.click();
                e.preventDefault();
            }
        }

        // Arrow keys for navigation between steps (Ctrl+Arrow)
        if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            const activeNav = document.querySelector('.nav-item.active');
            if (activeNav) {
                const currentIndex = Array.from(navItems).indexOf(activeNav);
                let newIndex = currentIndex;

                if (e.key === 'ArrowLeft' && currentIndex > 0) {
                    newIndex = currentIndex - 1;
                } else if (e.key === 'ArrowRight' && currentIndex < navItems.length - 1) {
                    newIndex = currentIndex + 1;
                }

                if (newIndex !== currentIndex && !navItems[newIndex].classList.contains('disabled')) {
                    goToStep(newIndex);
                    e.preventDefault();
                }
            }
        }
    });

    // Add keyboard shortcut help tooltip
    function showKeyboardHelp() {
        const helpDiv = document.createElement('div');
        helpDiv.style.cssText = `
            position: fixed;
            bottom: 60px;
            right: 20px;
            background: rgba(20, 30, 50, 0.95);
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid var(--border-color);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            font-size: 0.85rem;
            max-width: 300px;
        `;
        helpDiv.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--primary);">⌨️ Keyboard Shortcuts</div>
            <div style="display: grid; gap: 0.25rem; color: var(--text-muted);">
                <div><kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px;">Esc</kbd> Close tooltips</div>
                <div><kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px;">Ctrl+Enter</kbd> Analyze</div>
                <div><kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px;">Ctrl+←/→</kbd> Navigate steps</div>
            </div>
        `;
        document.body.appendChild(helpDiv);

        setTimeout(() => {
            helpDiv.style.transition = 'opacity 0.3s';
            helpDiv.style.opacity = '0';
            setTimeout(() => helpDiv.remove(), 300);
        }, 5000);
    }

    // Show keyboard help on first load
    setTimeout(showKeyboardHelp, 2000);


    // Demo Data Function
    function loadDemoData() {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = val;
                el.classList.remove('input-highlight');
                void el.offsetWidth;
                el.classList.add('input-highlight');
            }
        };

        setVal('patient-id', "DEMO_001");
        setVal('patient-age', "58");
        setVal('cancer-type', "Oral Carcinoma");
        setVal('cancer-stage', "III");

        // Step 2
        setVal('bio-tp53', "Mutated");
        setVal('bio-egfr', "Overexpression");
        setVal('bio-p16', "Negative");
        setVal('bio-ki67', "82");

        setVal('bio-cyclin', "7.4");
        setVal('bio-mmp9', "7.8");
        setVal('bio-vegf', "7.1");
        setVal('bio-her2', "Negative");

        // Clinical Notes
        setVal('data-content', "A 58-year-old male with a long history of tobacco smoking presented with a non-healing ulcerative lesion on the lateral border of the tongue for three months. Clinical examination revealed induration and ipsilateral cervical lymph node enlargement. Biopsy confirmed moderately differentiated oral squamous cell carcinoma, Stage III. Biomarker analysis showed elevated EGFR expression (8.9), TP53 mutation index (7.6), and a high Ki-67 proliferation index (8.2). Cyclin D1 was also overexpressed (7.4), along with increased MMP-9 (7.8) and VEGF (7.1) levels, indicating strong invasive and angiogenic activity. p16 expression was low (2.3), suggesting a non-HPV-associated tumor.");

        alert("Demo Patient Data (Oral Squamous Cell Carcinoma) Loaded Successfully!");
    }

    const btnDemo = document.getElementById('btn-demo-patient');
    if (btnDemo) btnDemo.addEventListener('click', loadDemoData);

    // Auto-fill Sample button (same as demo data)
    const btnAutofill = document.getElementById('btn-autofill');
    if (btnAutofill) btnAutofill.addEventListener('click', loadDemoData);

    // New Assessment nav link
    const navNewAssessment = document.getElementById('nav-new-assessment');
    if (navNewAssessment) {
        navNewAssessment.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Start New Assessment?\nCurrent progress will be reset.")) {
                window.location.reload();
            }
        });
    }

    // Restart button on final page
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
        btnRestart.addEventListener('click', () => {
            if (confirm("Start New Assessment?\nCurrent progress will be reset.")) {
                window.location.reload();
            }
        });
    }

    function goToStep(stepIndex) {
        // Hide all sections
        sections.forEach(s => document.getElementById(s).style.display = 'none');
        // Show target
        document.getElementById(sections[stepIndex]).style.display = 'block';
        window.scrollTo(0, 0);

        // Update Nav
        navItems.forEach((item, idx) => {
            if (idx === stepIndex) {
                item.classList.add('active');
                item.classList.remove('disabled');
            } else if (idx < stepIndex) {
                item.classList.add('completed');
                item.classList.remove('active');
            } else {
                item.classList.remove('active', 'completed');
                item.classList.add('disabled');
            }
        });
    }

    // Step 1 -> Step 2 (Validation)
    document.getElementById('btn-to-step-2').addEventListener('click', () => {
        const age = document.getElementById('patient-age').value;
        const type = document.getElementById('cancer-type').value;
        const stage = document.getElementById('cancer-stage').value;
        const id = document.getElementById('patient-id').value;

        if (!id) { alert("Please enter Patient ID."); return; }
        if (!age || age < 1 || age > 120) { alert("Please enter a valid age (1-120)."); return; }
        if (!type) { alert("Please select a Cancer Type."); return; }
        if (!stage) { alert("Please select a Cancer Stage."); return; }

        goToStep(1);
    });

    // Back Buttons
    const btnBack1 = document.getElementById('btn-back-step-1');
    if (btnBack1) btnBack1.addEventListener('click', () => goToStep(0));

    const btnBack3 = document.getElementById('btn-back-step-3');
    if (btnBack3) btnBack3.addEventListener('click', () => goToStep(2));

    // Step 3 -> 4
    const btnTo4 = document.getElementById('btn-to-step-4');
    if (btnTo4) btnTo4.addEventListener('click', () => goToStep(3));

    // Step 4 -> 5
    const btnTo5 = document.getElementById('btn-to-step-5');
    if (btnTo5) btnTo5.addEventListener('click', () => goToStep(4));


    // Analyze Button (Step 2 -> 3)
    const btnAnalyze = document.getElementById('btn-analyze');
    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', async () => {
            // Validate Biomarkers
            const ki67 = document.getElementById('bio-ki67').value;
            const vegf = document.getElementById('bio-vegf').value;

            if (ki67 && (ki67 < 0 || ki67 > 100)) {
                alert("Ki-67 Index must be between 0 and 100.");
                return;
            }
            if (vegf && vegf < 0) {
                alert("VEGF Level cannot be negative.");
                return;
            }

            // Capture Form Data
            const pId = document.getElementById('patient-id').value;
            const pAge = document.getElementById('patient-age').value;
            const pType = document.getElementById('cancer-type').value;
            const pStage = document.getElementById('cancer-stage').value;
            const inputData = document.getElementById('data-content').value;

            if (!inputData.trim()) {
                alert("Please enter clinical notes or biomarker data.");
                return;
            }

            patientData = {
                id: pId,
                age: pAge,
                type: pType,
                stage: pStage,
                clinical_text: inputData
            };


            setLoading(true);
            showProgressBar('Analyzing biomarker data...', 0);

            try {
                // Simulate progress updates
                updateProgress('Processing patient information...', 20);

                const response = await fetch('http://localhost:8000/analyze_risk', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        clinical_data: inputData
                    })
                });

                updateProgress('Evaluating risk factors...', 60);

                if (!response.ok) throw new Error('API Error');

                const data = await response.json();
                currentResultData = data;

                updateProgress('Generating results...', 90);

                // Populate and Show Results
                populatePatientSummary(patientData);
                displayResults(data);

                updateProgress('Complete!', 100);

                // Clear auto-save after successful analysis
                clearAutoSave();

                // Navigate to Step 3 after a brief delay
                setTimeout(() => {
                    hideProgressBar();
                    goToStep(2);
                }, 500);

            } catch (error) {
                console.error('Error:', error);
                hideProgressBar();
                showErrorNotification('An error occurred. Make sure the backend is running at http://localhost:8000!');
            } finally {
                setLoading(false);
            }
        });
    }

    // Validation for Submit (only if form exists)
    if (valuationForm) {
        valuationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // ... (existing logic) ...

            function generateDownload(data, pData) {
                // ... (existing logic) ...
                // Ensure PDF logic is inside here or global
            }

            // Capture Form Data
            const pId = document.getElementById('patient-id').value;
            const pAge = document.getElementById('patient-age').value;
            const pType = document.getElementById('cancer-type').value;
            const pStage = document.getElementById('cancer-stage').value;
            const inputData = document.getElementById('data-content').value;

            if (!inputData.trim()) return;

            patientData = {
                id: pId,
                age: pAge,
                type: pType,
                stage: pStage,
                clinical_text: inputData
            };

            setLoading(true);

            try {
                const response = await fetch('http://localhost:8000/analyze_risk', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        clinical_data: inputData
                    })
                });

                if (!response.ok) throw new Error('API Error');

                const data = await response.json();
                currentResultData = data;

                // Populate and Show Results
                populatePatientSummary(patientData);
                displayResults(data);

                // Switch Views
                inputView.style.display = 'none';
                resultView.style.display = 'block';

                // Update Navigation
                document.querySelector('.nav-item.active').classList.remove('active');
                navResults.classList.add('active');
                navResults.classList.remove('disabled');

            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Make sure the backend is running!');
            } finally {
                setLoading(false);
            }
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!currentResultData) return;
            generateDownload(currentResultData, patientData);
        });
    }

    function setLoading(isLoading) {
        if (!analyzeBtn || !btnText || !loader) return;

        if (isLoading) {
            btnText.style.opacity = '0';
            loader.style.display = 'block';
            analyzeBtn.disabled = true;
        } else {
            btnText.style.opacity = '1';
            loader.style.display = 'none';
            analyzeBtn.disabled = false;
        }
    }

    function populatePatientSummary(pData) {
        const resId = document.getElementById('res-id');
        const resAge = document.getElementById('res-age');
        const resType = document.getElementById('res-type');
        const resStage = document.getElementById('res-stage');

        if (resId) resId.textContent = pData.id;
        if (resAge) resAge.textContent = pData.age;
        if (resType) resType.textContent = pData.type;
        if (resStage) resStage.textContent = pData.stage;
    }

    function displayResults(data) {
        // Prediction Result Card
        const riskBadge = document.getElementById('res-risk-badge');
        if (riskBadge) {
            riskBadge.textContent = data.risk_level;
            riskBadge.className = 'badge'; // reset
            if (data.risk_level === 'High') {
                riskBadge.style.backgroundColor = 'var(--risk-high)';
                riskBadge.style.color = 'white';
            } else if (data.risk_level === 'Moderate') {
                riskBadge.style.backgroundColor = 'var(--risk-med)';
                riskBadge.style.color = 'black';
            } else {
                riskBadge.style.backgroundColor = 'var(--risk-low)';
                riskBadge.style.color = 'white';
            }
        }

        const resScore = document.getElementById('res-score');
        if (resScore) resScore.textContent = data.risk_score + '%';

        // -------------------------
        // New: Biomarker Chart
        // -------------------------
        const chartContainer = document.getElementById('risk-factors-chart');
        if (chartContainer) {
            chartContainer.innerHTML = '';

            let maxVal = 0;
            // Find max for scaling
            for (const [key, val] of Object.entries(data.risk_factors || {})) {
                if (val > maxVal) maxVal = val;
            }
            if (maxVal === 0) maxVal = 100;

            for (const [key, val] of Object.entries(data.risk_factors || {})) {
                const percentage = (val / maxVal) * 100;
                const row = document.createElement('div');
                row.style.marginBottom = '0.5rem';
                row.innerHTML = `
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.2rem;">
                        <span>${key}</span>
                        <span>${val} pts</span>
                    </div>
                    <div style="width: 100%; background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${percentage}%; background: var(--accent); height: 100%; border-radius: 4px; transition: width 1s ease;"></div>
                    </div>
                `;
                chartContainer.appendChild(row);
            }
        }

        // -------------------------
        // New: Drug Options
        // -------------------------
        const drugContainer = document.getElementById('drug-options-list');
        if (drugContainer) {
            drugContainer.innerHTML = '';

            (data.drug_options || []).forEach(drug => {
                const badge = document.createElement('div');
                badge.className = 'treatment-badge';
                badge.style.margin = '0'; // override
                badge.textContent = drug;
                drugContainer.appendChild(badge);
            });
        }

        // -------------------------
        // New: Explainability
        // -------------------------
        const explainList = document.getElementById('explainability-list');
        if (explainList) {
            explainList.innerHTML = '';

            for (const [key, val] of Object.entries(data.explainability || {})) {
                const li = document.createElement('li');
                li.style.cssText = "list-style: none; margin-bottom: 0.8rem; font-size: 0.9rem; color: #cbd5e1; display: flex; align-items: start; gap: 0.5rem;";
                li.innerHTML = `
                    <i class="fa-solid fa-check" style="color: var(--primary); margin-top: 3px;"></i>
                    <div>
                        <strong style="color: white; display: block; margin-bottom: 2px;">${key}</strong>
                        <span style="color: var(--text-muted); font-size: 0.85rem;">${val}</span>
                    </div>
                `;
                explainList.appendChild(li);
            }
        }


        // -------------------------
        // New: Drug Sensitivity Table
        // -------------------------
        const sensitivityTable = document.getElementById('drug-sensitivity-table');
        if (sensitivityTable) {
            sensitivityTable.innerHTML = '';

            for (const [drug, response] of Object.entries(data.drug_sensitivity || {})) {
                let color = '#fff';
                if (response.toLowerCase().includes('sensitive')) color = 'var(--risk-low)';
                else if (response.toLowerCase().includes('resistant')) color = 'var(--risk-high)';
                else if (response.toLowerCase().includes('moderate')) color = 'var(--risk-med)';

                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                tr.innerHTML = `
                    <td style="padding: 10px; color: #e2e8f0;">${drug}</td>
                    <td style="padding: 10px; text-align: right; color: ${color}; font-weight: 500;">
                        ${response}
                    </td>
                `;
                sensitivityTable.appendChild(tr);
            }
        }

        // Biomarker Interpretation (Analysis Text + detailed valuation)
        const bioContent = document.getElementById('biomarker-content');
        if (bioContent && data.biomarker_valuation) {
            // Simple formatting
            let formattedValuation = data.biomarker_valuation
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');

            bioContent.innerHTML = `
                <p style="margin-bottom: 1rem; color: #cbd5e1;">${data.analysis_text || ''}</p>
                <div style="font-size: 0.9rem; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                    ${formattedValuation}
                </div>
            `;
        }

        // Implications / Next Steps
        const impList = document.getElementById('res-implications');
        if (impList) {
            impList.innerHTML = '';

            // Combine major points and recs for the "What this means" section
            const combinedPoints = [...(data.major_points || []), ...(data.recommended_next_steps || [])];
            combinedPoints.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                impList.appendChild(li);
            });
        }
    }

    function generateDownload(data, pData) {
        // Populate PDF Template
        document.getElementById('pdf-id').textContent = pData.id;
        document.getElementById('pdf-age').textContent = pData.age;
        document.getElementById('pdf-type').textContent = pData.type;
        document.getElementById('pdf-stage').textContent = pData.stage;

        document.getElementById('pdf-date').textContent = new Date().toLocaleString();
        document.getElementById('pdf-report-id').textContent = `REF-${Math.floor(Math.random() * 100000)}`;

        const riskEl = document.getElementById('pdf-risk');
        riskEl.textContent = data.risk_level.toUpperCase();
        riskEl.style.color = data.risk_level === 'High' ? '#e74c3c' : (data.risk_level === 'Moderate' ? '#f39c12' : '#27ae60');

        document.getElementById('pdf-score').textContent = data.risk_score + '%';
        document.getElementById('pdf-analysis').innerHTML = data.analysis_text;

        // Biomarkers text
        let formattedValuation = data.biomarker_valuation
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        document.getElementById('pdf-valuation').innerHTML = formattedValuation;

        // Drugs
        const drugContainer = document.getElementById('pdf-drugs');
        drugContainer.innerHTML = '';
        (data.drug_options || ["None indicated"]).forEach(drug => {
            const span = document.createElement('span');
            span.style.cssText = "background: #eef2f7; padding: 5px 10px; border-radius: 4px; border: 1px solid #dcdcdc; font-size: 0.9em;";
            span.textContent = drug;
            drugContainer.appendChild(span);
        });

        // Recommendations (Merge major points and next steps)
        const recList = document.getElementById('pdf-recommendations');
        recList.innerHTML = '';
        const allPoints = [...data.major_points, ...data.recommended_next_steps];
        allPoints.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            recList.appendChild(li);
        });

        // Generate PDF
        const element = document.getElementById('pdf-report');
        // Unhide temporarily if needed (html2pdf sometimes needs it visible to render styles correctly)
        // But usually it can clone. Let's try direct.
        const opt = {
            margin: 0.5,
            filename: `OncoPredict_Report_${pData.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Temporarily display block to ensure rendering, then hide
        element.style.display = 'block';
        html2pdf().set(opt).from(element).save().then(() => {
            element.style.display = 'none';
        });
    }
    // Enhanced Tooltip Handler
    function showTooltip(text, targetElement) {
        // Remove any existing tooltips
        const existingTooltip = document.querySelector('.custom-tooltip');
        if (existingTooltip) existingTooltip.remove();

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.innerHTML = `
            <div style="position: relative;">
                <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--primary);">
                    <i class="fa-solid fa-info-circle"></i> Biomarker Information
                </div>
                <div style="color: #cbd5e1; line-height: 1.5;">${text}</div>
                <button class="tooltip-close" style="position: absolute; top: -5px; right: -5px; background: var(--primary); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 0.8rem;">×</button>
            </div>
        `;

        // Style the tooltip
        tooltip.style.cssText = `
            position: fixed;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98));
            border: 1px solid var(--primary);
            border-radius: 12px;
            padding: 1.5rem;
            max-width: 350px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
            z-index: 10000;
            animation: tooltipFadeIn 0.2s ease;
        `;

        // Position near the icon
        const rect = targetElement.getBoundingClientRect();
        tooltip.style.left = Math.min(rect.left + 30, window.innerWidth - 370) + 'px';
        tooltip.style.top = (rect.top - 10) + 'px';

        document.body.appendChild(tooltip);

        // Close button handler
        tooltip.querySelector('.tooltip-close').addEventListener('click', () => tooltip.remove());

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeTooltip(e) {
                if (!tooltip.contains(e.target) && !e.target.classList.contains('tooltip-icon')) {
                    tooltip.remove();
                    document.removeEventListener('click', closeTooltip);
                }
            });
        }, 100);
    }

    // Add CSS animation for tooltip
    if (!document.querySelector('#tooltip-animation-style')) {
        const style = document.createElement('style');
        style.id = 'tooltip-animation-style';
        style.textContent = `
            @keyframes tooltipFadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    // Global Navigation & Icon Handler
    document.addEventListener('click', (e) => {
        // Only trigger on specific elements if they aren't form inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        // Tooltip Icons
        if (e.target.classList.contains('tooltip-icon')) {
            e.stopPropagation();
            const tooltip = e.target.getAttribute('data-tooltip');
            if (tooltip) showTooltip(tooltip, e.target);
            return;
        }

        let target = e.target.closest('a, .nav-item, .user-profile');
        if (!target) return;

        const id = target.id || '';
        const txt = target.textContent.trim();

        // Avoid interrupting core flow buttons
        if (target.tagName === 'BUTTON' || id.includes('btn-')) return;

        // Top Nav Links
        if (txt === 'Dashboard') {
            e.preventDefault();
            if (confirm("Reload Application?\nCurrent progress will be reset.")) window.location.reload();
        }
        else if (txt === 'Reports') { e.preventDefault(); alert("Reports Module\n\nNo saved reports found."); }
        else if (txt === 'About') { e.preventDefault(); alert("OncoPredict Hybrid v1.2\nDeveloped by Nidhish P Hari\nKIT COLLEGE, CBE"); }
        else if (txt === 'Help') { e.preventDefault(); alert("System Usage:\n1. Enter Patient ID & Age\n2. Input Biomarker Data\n3. Click Analyze\n\nSupport: +91 8089032447"); }

        // User Profile
        else if (target.classList.contains('user-profile')) {
            alert("User Profile\n\nName: Nidhish\nRole: Bio Web Developer\nMission: Building the future of healthcare 🧬\n\nPowered by AI & Innovation ✨");
        }

        // Sidebar Navigation
        else if (target.classList.contains('nav-item')) {
            if (target.classList.contains('disabled')) {
                alert("Please complete the current step first.");
            } else {
                // Allow jumping back
                const parts = id.split('-');
                const step = parseInt(parts[2]); // nav-step-X
                if (step) goToStep(step - 1);
            }
        }
    });

});
