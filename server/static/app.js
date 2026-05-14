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
    const messageText     = document.getElementById('message-text');
    const resultCard      = document.getElementById('result-card');
    const resultName      = document.getElementById('result-name');
    const resultBadge     = document.getElementById('result-badge');
    const badgeText       = document.getElementById('badge-text');
    const probabilityList = document.getElementById('probability-list');
    const resultsPlaceholder = document.getElementById('results-placeholder');
    const celebGrid       = document.getElementById('celeb-grid');
    const statusDot       = document.getElementById('status-dot');
    const statusText      = document.getElementById('status-text');

    let currentImageBase64 = null;

    // ── Init ──
    document.addEventListener('DOMContentLoaded', () => {
        checkServerHealth();
        loadClasses();
        setupEventListeners();
    });

    // ── Server Health ──
    async function checkServerHealth() {
        try {
            const res = await fetch('/api/health');
            if (res.ok) {
                statusDot.style.background = '#16a34a';
                statusText.textContent = 'Ready';
            } else {
                setStatusError();
            }
        } catch {
            setStatusError();
        }
    }

    function setStatusError() {
        statusDot.style.background = '#dc2626';
        statusText.textContent = 'Offline';
    }

    // ── Load Classes ──
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
        const sorted = Object.entries(classDict).sort((a, b) => a[1] - b[1]);
        sorted.forEach(([name, idx]) => {
            const chip = document.createElement('div');
            chip.className = 'celeb-chip';
            const displayName = name.replace(/_/g, ' ');
            chip.innerHTML = `<span class="chip-number">${idx + 1}</span> ${displayName}`;
            celebGrid.appendChild(chip);
        });
    }

    // ── Event Listeners ──
    function setupEventListeners() {
        browseLink.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });

        uploadArea.addEventListener('click', (e) => {
            if (e.target !== browseLink) fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
        });

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
            if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        });

        classifyBtn.addEventListener('click', classifyImage);
        clearBtn.addEventListener('click', resetUI);
    }

    // ── File Handling ──
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showMessage('error', 'Please upload a valid image file (JPG, PNG, GIF).');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showMessage('error', 'File size exceeds 10MB.');
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

    // ── UI State ──
    function showPreview() {
        uploadArea.style.display = 'none';
        previewContainer.classList.add('active');
    }

    function hidePreview() {
        uploadArea.style.display = '';
        previewContainer.classList.remove('active');
    }

    function showMessage(type, text) {
        messageBox.className = `message-box active ${type}`;
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
            showMessage('error', 'No image selected.');
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
                showMessage('success', 'Classification complete.');
            } else if (data.error) {
                showMessage('error', data.error);
                hideResults();
            } else {
                showMessage('error', 'Unexpected response from server.');
                hideResults();
            }
        } catch (err) {
            console.error('Classification error:', err);
            showMessage('error', 'Network error. Is the server running?');
            hideResults();
        } finally {
            setLoading(false);
        }
    }

    // ── Display Results ──
    function displayResults(result) {
        const predictedName = result.class.replace(/_/g, ' ');
        resultName.textContent = predictedName;

        const probs = result.class_probability;
        const topProb = probs.find(p => p.class === result.class);
        const topProbValue = topProb ? topProb.probability : 0;

        let badgeClass;
        if (topProbValue >= 70) badgeClass = 'high';
        else if (topProbValue >= 40) badgeClass = 'medium';
        else badgeClass = 'low';

        resultBadge.className = `badge ${badgeClass}`;
        badgeText.textContent = `${topProbValue}%`;

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

            requestAnimationFrame(() => {
                setTimeout(() => {
                    li.querySelector('.probability-bar-fill').style.width = `${p.probability}%`;
                }, 30 + index * 60);
            });
        });

        showResults();
    }

})();
