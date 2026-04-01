// ============================================
// Sports Celebrity Image Classifier — Frontend
// ============================================

(() => {
    'use strict';

    // ── DOM Elements ──
    const uploadArea      = document.getElementById('upload-area');
    const fileInput       = document.getElementById('file-input');
    const browseLink      = document.getElementById('browse-link');
    const previewContainer = document.getElementById('preview-container');
    const previewImg      = document.getElementById('preview-img');
    const classifyBtn     = document.getElementById('classify-btn');
    const classifyText    = document.getElementById('classify-text');
    const classifySpinner = document.getElementById('classify-spinner');
    const clearBtn        = document.getElementById('clear-btn');
    const messageBox      = document.getElementById('message-box');
    const messageIcon     = document.getElementById('message-icon');
    const messageText     = document.getElementById('message-text');
    const resultCard      = document.getElementById('result-card');
    const resultName      = document.getElementById('result-name');
    const resultBadge     = document.getElementById('result-badge');
    const badgeIcon       = document.getElementById('badge-icon');
    const badgeText       = document.getElementById('badge-text');
    const probabilityList = document.getElementById('probability-list');
    const resultsPlaceholder = document.getElementById('results-placeholder');
    const celebGrid       = document.getElementById('celeb-grid');
    const statusDot       = document.getElementById('status-dot');
    const statusText      = document.getElementById('status-text');

    let currentImageBase64 = null;

    // ── Initialization ──
    document.addEventListener('DOMContentLoaded', () => {
        checkServerHealth();
        loadClasses();
        setupEventListeners();
    });

    // ── Server Health Check ──
    async function checkServerHealth() {
        try {
            const res = await fetch('/api/health');
            if (res.ok) {
                statusDot.style.background = 'var(--success)';
                statusText.textContent = 'Model Ready';
            } else {
                setStatusError();
            }
        } catch {
            setStatusError();
        }
    }

    function setStatusError() {
        statusDot.style.background = 'var(--error)';
        statusDot.style.animation = 'none';
        statusText.textContent = 'Server Offline';
    }

    // ── Load Recognized Classes ──
    async function loadClasses() {
        try {
            const res = await fetch('/api/get_classes');
            const data = await res.json();
            if (data.success && data.classes) {
                renderCelebGrid(data.classes);
            }
        } catch (err) {
            console.error('Failed to load classes:', err);
        }
    }

    function renderCelebGrid(classDict) {
        celebGrid.innerHTML = '';
        const sportEmojis = {
            'maria_sharapova': '🎾',
            'virat_kohli': '🏏',
            'lionel_messi': '⚽',
            'serena_williams': '🎾',
            'roger_federer': '🎾'
        };

        const sorted = Object.entries(classDict).sort((a, b) => a[1] - b[1]);
        sorted.forEach(([name, idx]) => {
            const chip = document.createElement('div');
            chip.className = 'celeb-chip';
            const emoji = sportEmojis[name] || '⭐';
            const displayName = name.replace(/_/g, ' ');
            chip.innerHTML = `
                <span class="chip-number">${idx + 1}</span>
                ${emoji} ${displayName}
            `;
            celebGrid.appendChild(chip);
        });
    }

    // ── Event Listeners ──
    function setupEventListeners() {
        // Browse link click
        browseLink.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });

        // Upload area click
        uploadArea.addEventListener('click', (e) => {
            if (e.target !== browseLink) {
                fileInput.click();
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
            }
        });

        // Classify button
        classifyBtn.addEventListener('click', classifyImage);

        // Clear button
        clearBtn.addEventListener('click', resetUI);
    }

    // ── File Handling ──
    function handleFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showMessage('error', '⚠️', 'Please upload a valid image file (JPG, PNG, GIF).');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            showMessage('error', '⚠️', 'File size exceeds 10MB. Please upload a smaller image.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            currentImageBase64 = e.target.result;
            previewImg.src = currentImageBase64;
            showPreview();
            hideMessage();
            hideResults();
        };
        reader.readAsDataURL(file);
    }

    // ── UI State Management ──
    function showPreview() {
        uploadArea.style.display = 'none';
        previewContainer.classList.add('active');
    }

    function hidePreview() {
        uploadArea.style.display = '';
        previewContainer.classList.remove('active');
    }

    function showMessage(type, icon, text) {
        messageBox.className = `message-box active ${type}`;
        messageIcon.textContent = icon;
        messageText.textContent = text;
    }

    function hideMessage() {
        messageBox.className = 'message-box';
    }

    function showResults() {
        resultsPlaceholder.style.display = 'none';
        resultCard.classList.add('active');
    }

    function hideResults() {
        resultsPlaceholder.style.display = '';
        resultCard.classList.remove('active');
    }

    function setLoading(loading) {
        classifyBtn.disabled = loading;
        classifyText.style.display = loading ? 'none' : '';
        classifySpinner.classList.toggle('active', loading);
    }

    function resetUI() {
        currentImageBase64 = null;
        fileInput.value = '';
        previewImg.src = '';
        hidePreview();
        hideMessage();
        hideResults();
    }

    // ── Classification ──
    async function classifyImage() {
        if (!currentImageBase64) {
            showMessage('error', '⚠️', 'No image selected. Please upload an image first.');
            return;
        }

        setLoading(true);
        hideMessage();

        try {
            const formData = new FormData();
            formData.append('image_data', currentImageBase64);

            const res = await fetch('/api/classify_image', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (data.success && data.result && data.result.length > 0) {
                displayResults(data.result[0]);
                showMessage('info', '✅', 'Classification complete! See results on the right.');
            } else if (data.error) {
                showMessage('error', '😕', data.error);
                hideResults();
            } else {
                showMessage('error', '⚠️', 'Unexpected response from server.');
                hideResults();
            }
        } catch (err) {
            console.error('Classification error:', err);
            showMessage('error', '❌', 'Network error. Make sure the server is running.');
            hideResults();
        } finally {
            setLoading(false);
        }
    }

    // ── Results Display ──
    function displayResults(result) {
        // Set main prediction
        const predictedName = result.class.replace(/_/g, ' ');
        resultName.textContent = predictedName;

        // Find the top probability
        const probs = result.class_probability;
        const topProb = probs.find(p => p.class === result.class);
        const topProbValue = topProb ? topProb.probability : 0;

        // Set confidence badge
        let badgeClass, badgeIconText;
        if (topProbValue >= 70) {
            badgeClass = 'high';
            badgeIconText = '✓';
        } else if (topProbValue >= 40) {
            badgeClass = 'medium';
            badgeIconText = '~';
        } else {
            badgeClass = 'low';
            badgeIconText = '?';
        }

        resultBadge.className = `result-confidence-badge ${badgeClass}`;
        badgeIcon.textContent = badgeIconText;
        badgeText.textContent = `${topProbValue}% Confidence`;

        // Build probability bars
        probabilityList.innerHTML = '';
        const sortedProbs = [...probs].sort((a, b) => b.probability - a.probability);

        sortedProbs.forEach((p, index) => {
            const li = document.createElement('li');
            li.className = 'probability-item';

            const displayName = p.class.replace(/_/g, ' ');
            const isTop = index === 0;

            li.innerHTML = `
                <div class="probability-header">
                    <span class="probability-name">${displayName}</span>
                    <span class="probability-value">${p.probability}%</span>
                </div>
                <div class="probability-bar-track">
                    <div class="probability-bar-fill ${isTop ? 'top' : ''}" style="width: 0%"></div>
                </div>
            `;
            probabilityList.appendChild(li);

            // Animate the bar after a short delay
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const bar = li.querySelector('.probability-bar-fill');
                    bar.style.width = `${p.probability}%`;
                }, 50 + index * 100);
            });
        });

        showResults();
    }

})();
