// ========================================
// Custom FFmpeg Utility Functions
// (Replaces @ffmpeg/util to avoid CORS issues)
// ========================================

// Convert a file/blob to Uint8Array
async function fetchFile(file) {
    if (file instanceof File || file instanceof Blob) {
        const arrayBuffer = await file.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    }
    // If it's a URL string
    if (typeof file === 'string') {
        const response = await fetch(file);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    }
    throw new Error('Invalid file input');
}

// Convert a URL to a blob URL for script loading
async function toBlobURL(url, mimeType) {
    const response = await fetch(url);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

// ========================================
// State Management
// ========================================
const state = {
    files: [],          // Array of file objects with info
    isConverting: false,
    isLoading: false,
    isCancelled: false,
    currentFileIndex: 0,
    results: [],
    conversionStartTime: null,
    elapsedTimeInterval: null  // Timer for updating elapsed time display
};

// FFmpeg state
let ffmpeg = null;
let ffmpegReady = false;

// ========================================
// DOM Elements - Initialize after DOM is ready
// ========================================
let elements = {};

function initializeElements() {
    elements = {
        // Drop zone
        dropZone: document.getElementById('dropZone'),
        selectFilesBtn: document.getElementById('selectFilesBtn'),
        fileInput: document.getElementById('fileInput'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        ffmpegLoadingOverlay: document.getElementById('ffmpegLoadingOverlay'),
        ffmpegLoadingText: document.getElementById('ffmpegLoadingText'),
        ffmpegLoadingProgress: document.getElementById('ffmpegLoadingProgress'),

        // Browser warning
        browserWarning: document.getElementById('browserWarning'),
        warningMessage: document.getElementById('warningMessage'),

        // File list
        fileListContainer: document.getElementById('fileListContainer'),
        fileList: document.getElementById('fileList'),
        fileCount: document.getElementById('fileCount'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        startConvertBtn: document.getElementById('startConvertBtn'),

        // Settings
        outputFormat: document.getElementById('outputFormat'),
        videoCodec: document.getElementById('videoCodec'),
        crfSlider: document.getElementById('crfSlider'),
        crfValue: document.getElementById('crfValue'),
        qualitySettingsGroup: document.getElementById('qualitySettingsGroup'),
        qualityOverrideHint: document.getElementById('qualityOverrideHint'),
        audioMode: document.getElementById('audioMode'),

        // Resize settings
        enableResize: document.getElementById('enableResize'),
        resizeOptions: document.getElementById('resizeOptions'),
        resizeWidth: document.getElementById('resizeWidth'),
        resizeHeight: document.getElementById('resizeHeight'),

        // Target size settings
        enableTargetSize: document.getElementById('enableTargetSize'),
        targetSizeOptions: document.getElementById('targetSizeOptions'),
        targetSizeValue: document.getElementById('targetSizeValue'),
        targetSizeUnit: document.getElementById('targetSizeUnit'),

        // Progress
        progressPanel: document.getElementById('progressPanel'),
        currentFileInfo: document.getElementById('currentFileInfo'),
        progressBar: document.getElementById('progressBar'),
        progressText: document.getElementById('progressText'),
        progressStatus: document.getElementById('progressStatus'),
        elapsedTime: document.getElementById('elapsedTime'),
        remainingTime: document.getElementById('remainingTime'),
        cancelBtn: document.getElementById('cancelBtn'),

        // Results
        resultsPanel: document.getElementById('resultsPanel'),
        resultsList: document.getElementById('resultsList'),
        newConversionBtn: document.getElementById('newConversionBtn'),
        clearResultsBtn: document.getElementById('clearResultsBtn'),

        // Toast
        toastContainer: document.getElementById('toastContainer')
    };
}

// ========================================
// Utility Functions
// ========================================
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '--:--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getFileIcon(extension) {
    const icons = {
        'mov': '🎬',
        'mp4': '🎬',
        'mpg': '📼',
        'mpeg': '📼',
        'wmv': '🎞️',
        'webm': '🌐',
        'avi': '📹',
        'mkv': '🎥',
        'flv': '📺',
        'm4v': '🍎',
        '3gp': '📱'
    };
    return icons[extension.toLowerCase()] || '🎬';
}

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hours}${mins}`;
}

function showToast(message, type = 'info') {
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Get current settings
function getCurrentSettings() {
    return {
        quality: parseInt(elements.crfSlider.value),
        codec: elements.videoCodec.value,
        audioMode: elements.audioMode.value,
        enableResize: elements.enableResize.checked,
        resizeWidth: parseInt(elements.resizeWidth.value) || null,
        resizeHeight: parseInt(elements.resizeHeight.value) || null,
        enableTargetSize: elements.enableTargetSize.checked,
        targetSize: parseFloat(elements.targetSizeValue.value) || null,
        targetSizeUnit: elements.targetSizeUnit.value
    };
}

// Estimate compressed size based on quality percentage
function estimateCompressedSize(originalSize, videoWidth, videoHeight, settings) {
    const { quality, codec, audioMode, enableResize, resizeWidth, resizeHeight, enableTargetSize, targetSize, targetSizeUnit } = settings;

    // If target size is set, use that
    if (enableTargetSize && targetSize) {
        let targetBytes = targetSize;
        if (targetSizeUnit === 'KB') targetBytes *= 1024;
        else if (targetSizeUnit === 'MB') targetBytes *= 1024 * 1024;
        else if (targetSizeUnit === 'GB') targetBytes *= 1024 * 1024 * 1024;
        return Math.min(targetBytes, originalSize);
    }

    // Calculate resolution factor if resize is enabled
    let resizeFactor = 1;
    if (enableResize && (resizeWidth || resizeHeight)) {
        const widthRatio = resizeWidth ? Math.min(1, resizeWidth / videoWidth) : 1;
        const heightRatio = resizeHeight ? Math.min(1, resizeHeight / videoHeight) : 1;
        resizeFactor = Math.min(widthRatio, heightRatio);
        resizeFactor = Math.max(resizeFactor, 0.2);
    }

    // Quality factor
    const qualityFactor = quality / 100;

    // Audio factor
    let audioFactor = 1;
    if (audioMode === 'mute') {
        audioFactor = 0.9;
    } else if (audioMode === 'compress') {
        audioFactor = 0.95;
    }

    const estimatedSize = originalSize * qualityFactor * resizeFactor * audioFactor;
    return Math.max(estimatedSize, originalSize * 0.05);
}

function showLoading(show) {
    state.isLoading = show;
    if (show) {
        elements.loadingOverlay.classList.remove('hidden');
    } else {
        elements.loadingOverlay.classList.add('hidden');
    }
}

// ========================================
// FFmpeg Initialization
// ========================================
async function initFFmpeg() {
    if (ffmpegReady) return true;

    // Check if FFmpegWASM library is available
    if (typeof FFmpegWASM === 'undefined') {
        showToast('FFmpeg 函式庫載入失敗，請重新整理頁面', 'error');
        console.error('FFmpegWASM is not defined');
        return false;
    }

    elements.ffmpegLoadingOverlay.classList.remove('hidden');
    elements.ffmpegLoadingProgress.style.width = '0%';

    try {
        const { FFmpeg } = FFmpegWASM;
        // Using our custom toBlobURL function (defined at top of file)

        ffmpeg = new FFmpeg();

        // Listen to progress events
        ffmpeg.on('progress', ({ progress }) => {
            const percent = Math.round(progress * 100);
            if (state.isConverting) {
                elements.progressBar.querySelector('.progress-fill').style.width = `${percent}%`;
                elements.progressText.textContent = `${percent}%`;

                // Calculate elapsed and remaining time
                if (state.conversionStartTime && percent > 2) {
                    const elapsedMs = Date.now() - state.conversionStartTime;
                    const elapsedSec = Math.floor(elapsedMs / 1000);
                    elements.elapsedTime.textContent = formatDuration(elapsedSec);

                    const totalEstimatedMs = (elapsedMs / percent) * 100;
                    const remainingMs = totalEstimatedMs - elapsedMs;
                    const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
                    elements.remainingTime.textContent = formatDuration(remainingSec);
                }
            }
        });

        // Listen to log events
        ffmpeg.on('log', ({ message }) => {
            console.log('[FFmpeg]', message);
            if (state.isConverting) {
                elements.progressStatus.textContent = '編碼中...';
            }
        });

        elements.ffmpegLoadingText.textContent = '正在載入 FFmpeg 核心...';
        elements.ffmpegLoadingProgress.style.width = '25%';

        // Use local files to avoid CORS issues with workers
        // Files are stored in the ffmpeg folder
        await ffmpeg.load({
            coreURL: await toBlobURL('./ffmpeg/ffmpeg-core.js', 'text/javascript'),
            wasmURL: await toBlobURL('./ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
        });

        elements.ffmpegLoadingProgress.style.width = '100%';
        elements.ffmpegLoadingText.textContent = 'FFmpeg 已就緒';

        ffmpegReady = true;

        setTimeout(() => {
            elements.ffmpegLoadingOverlay.classList.add('hidden');
        }, 500);

        return true;
    } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        elements.ffmpegLoadingOverlay.classList.add('hidden');
        showToast('FFmpeg 載入失敗: ' + error.message, 'error');
        return false;
    }
}

// ========================================
// Video Info Extraction
// ========================================
async function getVideoInfo(file) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            URL.revokeObjectURL(video.src);
            resolve({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                size: file.size
            });
        };

        video.onerror = () => {
            URL.revokeObjectURL(video.src);
            // Return default values if we can't get metadata
            resolve({
                duration: 0,
                width: 1920,
                height: 1080,
                size: file.size
            });
        };

        video.src = URL.createObjectURL(file);
    });
}

// Generate video thumbnail
async function generateThumbnail(file) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;

        video.onloadeddata = () => {
            video.currentTime = Math.min(1, video.duration / 4);
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 80;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(video.src);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };

        video.onerror = () => {
            URL.revokeObjectURL(video.src);
            resolve(null);
        };

        video.src = URL.createObjectURL(file);
    });
}

// ========================================
// File Handling
// ========================================
async function addFiles(fileList) {
    showLoading(true);

    // Clear previous results when adding new files
    if (state.results.length > 0) {
        state.results = [];
        elements.resultsPanel.classList.add('hidden');
    }

    const validExtensions = ['mov', 'mp4', 'mpg', 'mpeg', 'wmv', 'webm', 'avi', 'mkv', 'flv', 'm4v', '3gp'];

    for (const file of fileList) {
        const ext = getFileExtension(file.name);

        if (!validExtensions.includes(ext)) {
            showToast(`不支援的格式: ${file.name}`, 'warning');
            continue;
        }

        // Check if already added
        if (state.files.find(f => f.file.name === file.name && f.file.size === file.size)) {
            showToast(`已跳過重複檔案: ${file.name}`, 'warning');
            continue;
        }

        try {
            const info = await getVideoInfo(file);
            const thumbnail = await generateThumbnail(file);

            state.files.push({
                file: file,
                name: file.name,
                extension: ext,
                info: info,
                thumbnail: thumbnail
            });

            showToast(`已加入: ${file.name}`, 'success');
        } catch (error) {
            console.error('Error getting video info:', error);
            showToast(`無法讀取檔案: ${file.name}`, 'error');
        }
    }

    showLoading(false);
    updateFileList();
}

function removeFile(index) {
    state.files.splice(index, 1);
    updateFileList();
}

function clearAllFiles() {
    state.files = [];
    updateFileList();
}

function removeResult(index) {
    state.results.splice(index, 1);
    if (state.results.length === 0) {
        elements.resultsPanel.classList.add('hidden');
        elements.dropZone.style.display = 'flex';
    } else {
        renderResultsList();
    }
}

function clearAllResults() {
    state.results = [];
    elements.resultsPanel.classList.add('hidden');
    elements.dropZone.style.display = 'flex';
}

function updateFileList() {
    const count = state.files.length;
    elements.fileCount.textContent = count;
    elements.startConvertBtn.disabled = count === 0;

    if (count === 0) {
        elements.fileListContainer.classList.add('hidden');
        elements.dropZone.style.display = 'flex';
        return;
    }

    elements.fileListContainer.classList.remove('hidden');
    elements.dropZone.style.display = 'none';

    const settings = getCurrentSettings();

    elements.fileList.innerHTML = state.files.map((item, index) => {
        const videoWidth = item.info.width || 1920;
        const videoHeight = item.info.height || 1080;
        const estimatedSize = estimateCompressedSize(item.info.size, videoWidth, videoHeight, settings);
        const compressionPercent = ((1 - estimatedSize / item.info.size) * 100).toFixed(0);

        const thumbnailHtml = item.thumbnail
            ? `<img src="${item.thumbnail}" class="file-thumbnail" alt="thumbnail">`
            : `<div class="file-icon">${getFileIcon(item.extension)}</div>`;

        return `
    <div class="file-item" data-index="${index}">
      ${thumbnailHtml}
      <div class="file-info">
        <div class="file-name">${item.name}</div>
        <div class="file-meta">
          <span>📐 ${videoWidth}×${videoHeight}</span>
          <span>📦 ${formatBytes(item.info.size)}</span>
          <span>⏱️ ${formatDuration(item.info.duration)}</span>
        </div>
        <div class="file-estimate">
          <span class="estimate-label">預估壓縮後:</span>
          <span class="estimate-value">${formatBytes(estimatedSize)}</span>
          <span class="estimate-percent">(節省 ${compressionPercent}%)</span>
        </div>
      </div>
      <div class="file-actions">
        <button class="file-action-btn remove" title="移除" data-action="remove-file" data-index="${index}">🗑️</button>
      </div>
    </div>
  `;
    }).join('');
}

// ========================================
// Video Conversion
// ========================================
async function convertVideo(fileItem, outputFormat, settings) {
    if (!ffmpegReady) {
        const loaded = await initFFmpeg();
        if (!loaded) throw new Error('FFmpeg 未就緒');
    }

    // Using our custom fetchFile function (defined at top of file)

    const inputFileName = `input_${Date.now()}.${fileItem.extension}`;
    const baseName = fileItem.name.replace(/\.[^/.]+$/, '');
    const timestamp = getTimestamp();
    const outputFileName = `${baseName}_${timestamp}.${outputFormat}`;

    // Write input file to FFmpeg virtual filesystem
    elements.progressStatus.textContent = '讀取檔案中...';
    const inputData = await fetchFile(fileItem.file);
    await ffmpeg.writeFile(inputFileName, inputData);

    // Build FFmpeg arguments
    const args = ['-i', inputFileName];

    // Video codec
    if (settings.codec === 'h264') {
        args.push('-c:v', 'libx264');
        // Quality: map percentage to CRF (0-51, lower is better)
        const crf = Math.round(51 - (settings.quality / 100) * 33);
        args.push('-crf', String(crf));
        // Use ultrafast preset for browser - much faster encoding at cost of slightly larger file
        args.push('-preset', 'ultrafast');
    } else if (settings.codec === 'vp8') {
        args.push('-c:v', 'libvpx');
        const crf = Math.round(63 - (settings.quality / 100) * 53);
        args.push('-crf', String(crf));
        args.push('-b:v', '0');
        // Use fastest settings for VP8
        args.push('-cpu-used', '8');
        args.push('-deadline', 'realtime');
    }

    // Audio settings
    if (settings.audioMode === 'mute') {
        args.push('-an');
    } else if (settings.audioMode === 'compress') {
        if (outputFormat === 'webm') {
            args.push('-c:a', 'libvorbis', '-q:a', '4');
        } else {
            args.push('-c:a', 'aac', '-b:a', '128k');
        }
    } else {
        if (outputFormat === 'webm') {
            args.push('-c:a', 'libvorbis', '-q:a', '6');
        } else {
            args.push('-c:a', 'aac', '-b:a', '192k');
        }
    }

    // Resize if enabled
    if (settings.enableResize && (settings.resizeWidth || settings.resizeHeight)) {
        const width = settings.resizeWidth || -2;
        const height = settings.resizeHeight || -2;
        args.push('-vf', `scale=${width}:${height}`);
    }

    // Target size
    if (settings.enableTargetSize && settings.targetSize) {
        let targetBytes = settings.targetSize;
        if (settings.targetSizeUnit === 'KB') targetBytes *= 1024;
        else if (settings.targetSizeUnit === 'MB') targetBytes *= 1024 * 1024;
        else if (settings.targetSizeUnit === 'GB') targetBytes *= 1024 * 1024 * 1024;

        const duration = fileItem.info.duration || 60;
        const targetBitrate = Math.floor((targetBytes * 8) / duration * 0.9);
        args.push('-b:v', `${targetBitrate}`);
    }

    if (outputFormat === 'mp4') {
        args.push('-movflags', '+faststart');
    }

    args.push(outputFileName);

    elements.progressStatus.textContent = '編碼中...';
    state.conversionStartTime = Date.now();

    // Start elapsed time timer - updates every second so user knows app is running
    if (state.elapsedTimeInterval) {
        clearInterval(state.elapsedTimeInterval);
    }
    state.elapsedTimeInterval = setInterval(() => {
        if (state.conversionStartTime) {
            const elapsedMs = Date.now() - state.conversionStartTime;
            const elapsedSec = Math.floor(elapsedMs / 1000);
            elements.elapsedTime.textContent = formatDuration(elapsedSec);
        }
    }, 1000);

    // Execute FFmpeg
    await ffmpeg.exec(args);

    // Stop the timer
    if (state.elapsedTimeInterval) {
        clearInterval(state.elapsedTimeInterval);
        state.elapsedTimeInterval = null;
    }

    if (state.isCancelled) {
        throw new Error('已取消');
    }

    // Read output file
    elements.progressStatus.textContent = '處理輸出檔案...';
    const outputData = await ffmpeg.readFile(outputFileName);

    // Clean up virtual filesystem
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);

    // Create blob and download URL
    const mimeType = outputFormat === 'webm' ? 'video/webm' : 'video/mp4';
    const blob = new Blob([outputData.buffer], { type: mimeType });

    return {
        outputFileName: outputFileName,
        outputSize: blob.size,
        blob: blob,
        url: URL.createObjectURL(blob)
    };
}

// ========================================
// Conversion Process
// ========================================
async function startConversion() {
    if (state.files.length === 0) return;

    // Initialize FFmpeg if not ready
    if (!ffmpegReady) {
        const loaded = await initFFmpeg();
        if (!loaded) {
            showToast('FFmpeg 載入失敗，無法開始轉檔', 'error');
            return;
        }
    }

    state.isConverting = true;
    state.isCancelled = false;
    state.currentFileIndex = 0;
    state.results = [];

    // Show progress panel
    elements.progressPanel.classList.remove('hidden');
    elements.fileListContainer.classList.add('hidden');
    elements.resultsPanel.classList.add('hidden');

    // Get settings
    const settings = {
        codec: elements.videoCodec.value,
        quality: parseInt(elements.crfSlider.value),
        audioMode: elements.audioMode.value,
        enableResize: elements.enableResize.checked,
        resizeWidth: parseInt(elements.resizeWidth.value) || null,
        resizeHeight: parseInt(elements.resizeHeight.value) || null,
        enableTargetSize: elements.enableTargetSize.checked,
        targetSize: parseFloat(elements.targetSizeValue.value) || null,
        targetSizeUnit: elements.targetSizeUnit.value
    };

    const outputFormat = elements.outputFormat.value;

    // Process each file
    for (let i = 0; i < state.files.length; i++) {
        if (!state.isConverting || state.isCancelled) break;

        state.currentFileIndex = i;
        const fileItem = state.files[i];

        // Reset progress UI
        elements.currentFileInfo.innerHTML = `
      <div class="file-name">正在處理: ${fileItem.name} (${i + 1}/${state.files.length})</div>
    `;
        elements.progressBar.querySelector('.progress-fill').style.width = '0%';
        elements.progressText.textContent = '0%';
        elements.elapsedTime.textContent = '--:--';
        elements.remainingTime.textContent = '計算中...';
        elements.progressStatus.textContent = '準備中...';

        try {
            const result = await convertVideo(fileItem, outputFormat, settings);

            state.results.push({
                inputName: fileItem.name,
                inputSize: fileItem.info.size,
                outputName: result.outputFileName,
                outputSize: result.outputSize,
                blob: result.blob,
                url: result.url,
                success: true
            });

        } catch (error) {
            console.error('Conversion error:', error);

            if (error.message !== '已取消') {
                state.results.push({
                    inputName: fileItem.name,
                    success: false,
                    error: error.message
                });
                showToast(`轉檔失敗: ${fileItem.name}`, 'error');
            }
        }
    }

    state.isConverting = false;

    if (!state.isCancelled) {
        showResults();
    }
}

function cancelConversion() {
    state.isConverting = false;
    state.isCancelled = true;

    // Stop the elapsed time timer
    if (state.elapsedTimeInterval) {
        clearInterval(state.elapsedTimeInterval);
        state.elapsedTimeInterval = null;
    }

    showToast('已取消轉檔', 'warning');

    elements.progressPanel.classList.add('hidden');
    elements.fileListContainer.classList.remove('hidden');
}

function showResults() {
    elements.progressPanel.classList.add('hidden');
    elements.resultsPanel.classList.remove('hidden');

    const successCount = state.results.filter(r => r.success).length;
    showToast(`完成! ${successCount}/${state.results.length} 個檔案成功轉換`, 'success');

    renderResultsList();
}

function renderResultsList() {
    elements.resultsList.innerHTML = state.results.map((result, index) => {
        if (!result.success) {
            return `
        <div class="result-item error" data-index="${index}">
          <div class="result-icon" style="background: linear-gradient(135deg, var(--danger), #dc2626)">❌</div>
          <div class="result-info">
            <div class="result-name">${result.inputName}</div>
            <div class="result-stats">
              <span class="stat-item" style="color: var(--danger)">${result.error || '轉檔失敗'}</span>
            </div>
          </div>
          <div class="result-actions">
            <button class="file-action-btn remove" title="刪除記錄" data-action="remove" data-index="${index}">🗑️</button>
          </div>
        </div>
      `;
        }

        const compressionRatio = ((1 - result.outputSize / result.inputSize) * 100).toFixed(1);

        return `
      <div class="result-item" data-index="${index}">
        <div class="result-icon">✓</div>
        <div class="result-info">
          <div class="result-name">${result.outputName}</div>
          <div class="result-stats">
            <span class="stat-item">
              <span class="stat-label">原始:</span>
              <span class="stat-value">${formatBytes(result.inputSize)}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">壓縮後:</span>
              <span class="stat-value success">${formatBytes(result.outputSize)}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">節省:</span>
              <span class="stat-value success">${compressionRatio}%</span>
            </span>
          </div>
        </div>
        <div class="result-actions">
          <button class="btn btn-sm btn-success" data-action="download" data-index="${index}">
            <span class="btn-icon">💾</span>
            下載
          </button>
          <button class="btn btn-sm btn-secondary" data-action="preview" data-index="${index}">
            <span class="btn-icon">▶️</span>
            預覽
          </button>
          <button class="file-action-btn remove" title="刪除記錄" data-action="remove" data-index="${index}">🗑️</button>
        </div>
      </div>
    `;
    }).join('');
}

function downloadResult(index) {
    const result = state.results[index];
    if (!result || !result.success) return;

    const link = document.createElement('a');
    link.href = result.url;
    link.download = result.outputName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function previewResult(index) {
    const result = state.results[index];
    if (!result || !result.success) return;

    window.open(result.url, '_blank');
}

function startNewConversion() {
    // Clean up old blob URLs
    state.results.forEach(result => {
        if (result.url) {
            URL.revokeObjectURL(result.url);
        }
    });

    state.files = [];
    state.results = [];
    elements.resultsPanel.classList.add('hidden');
    elements.dropZone.style.display = 'flex';
    updateFileList();
}

// ========================================
// Event Listeners Setup
// ========================================
function setupEventListeners() {
    // File selection button
    elements.selectFilesBtn.addEventListener('click', () => {
        console.log('Select files button clicked');
        elements.fileInput.click();
    });

    // File input change
    elements.fileInput.addEventListener('change', async (e) => {
        console.log('File input changed', e.target.files);
        if (e.target.files && e.target.files.length > 0) {
            await addFiles(Array.from(e.target.files));
            e.target.value = ''; // Reset input
        }
    });

    // Drag and drop on drop zone
    elements.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.add('drag-over');
    });

    elements.dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.remove('drag-over');
    });

    elements.dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.remove('drag-over');

        console.log('Files dropped on drop zone', e.dataTransfer.files);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await addFiles(files);
        }
    });

    // Global drag and drop
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    document.addEventListener('drop', async (e) => {
        e.preventDefault();

        if (state.isConverting || state.isLoading) return;

        console.log('Files dropped on document', e.dataTransfer.files);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await addFiles(files);
        }
    });

    // Settings change listeners
    elements.crfSlider.addEventListener('input', (e) => {
        elements.crfValue.textContent = e.target.value + '%';
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        if (state.files.length > 0) {
            updateFileList();
        }
    });

    elements.videoCodec.addEventListener('change', () => {
        if (state.files.length > 0) updateFileList();
    });

    elements.audioMode.addEventListener('change', () => {
        if (state.files.length > 0) updateFileList();
    });

    elements.enableResize.addEventListener('change', () => {
        if (elements.enableResize.checked) {
            elements.resizeOptions.classList.remove('hidden');
        } else {
            elements.resizeOptions.classList.add('hidden');
        }
        if (state.files.length > 0) updateFileList();
    });

    elements.resizeWidth.addEventListener('input', () => {
        if (state.files.length > 0) updateFileList();
    });

    elements.resizeHeight.addEventListener('input', () => {
        if (state.files.length > 0) updateFileList();
    });

    elements.enableTargetSize.addEventListener('change', () => {
        const isEnabled = elements.enableTargetSize.checked;

        if (isEnabled) {
            elements.targetSizeOptions.classList.remove('hidden');
            elements.crfSlider.disabled = true;
            elements.qualitySettingsGroup.classList.add('disabled');
            elements.qualityOverrideHint.classList.remove('hidden');
            elements.crfValue.textContent = '--';
        } else {
            elements.targetSizeOptions.classList.add('hidden');
            elements.crfSlider.disabled = false;
            elements.qualitySettingsGroup.classList.remove('disabled');
            elements.qualityOverrideHint.classList.add('hidden');
            elements.crfValue.textContent = elements.crfSlider.value + '%';
        }

        if (state.files.length > 0) updateFileList();
    });

    elements.targetSizeValue.addEventListener('input', () => {
        if (state.files.length > 0) updateFileList();
    });

    elements.targetSizeUnit.addEventListener('change', () => {
        if (state.files.length > 0) updateFileList();
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const quality = btn.dataset.quality;
            const codec = btn.dataset.codec;

            elements.crfSlider.value = quality;
            elements.crfValue.textContent = quality + '%';
            elements.videoCodec.value = codec;

            if (state.files.length > 0) updateFileList();
        });
    });

    // Format/codec relationship
    elements.outputFormat.addEventListener('change', () => {
        const format = elements.outputFormat.value;
        if (format === 'webm') {
            elements.videoCodec.value = 'vp8';
        } else if (elements.videoCodec.value === 'vp8') {
            elements.videoCodec.value = 'h264';
        }
        if (state.files.length > 0) updateFileList();
    });

    // Action buttons
    elements.clearAllBtn.addEventListener('click', clearAllFiles);
    elements.startConvertBtn.addEventListener('click', startConversion);
    elements.cancelBtn.addEventListener('click', cancelConversion);
    elements.newConversionBtn.addEventListener('click', startNewConversion);
    elements.clearResultsBtn.addEventListener('click', clearAllResults);

    // File list event delegation
    elements.fileList.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index);

        if (action === 'remove-file' && !isNaN(index)) {
            removeFile(index);
        }
    });

    // Results list event delegation
    elements.resultsList.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index);

        if (action === 'download' && !isNaN(index)) {
            downloadResult(index);
        } else if (action === 'preview' && !isNaN(index)) {
            previewResult(index);
        } else if (action === 'remove' && !isNaN(index)) {
            removeResult(index);
        }
    });
}

// ========================================
// Browser Compatibility Check
// ========================================
function checkBrowserCompatibility() {
    const issues = [];

    // Check for WebAssembly (required)
    if (typeof WebAssembly === 'undefined') {
        issues.push('您的瀏覽器不支援 WebAssembly。應用程式無法運行。請使用 Chrome、Firefox、Edge 或 Safari 最新版本。');
    }

    // Note: We use single-threaded FFmpeg core, so SharedArrayBuffer is NOT required
    // This means broader compatibility but slower performance

    if (issues.length > 0) {
        elements.browserWarning.classList.remove('hidden');
        elements.warningMessage.textContent = issues.join(' ');
    }
}

// ========================================
// Initialization
// ========================================
function init() {
    console.log('Video Compressor Web v1.0.0 initializing...');

    // Initialize DOM elements
    initializeElements();

    // Check browser compatibility
    checkBrowserCompatibility();

    // Setup all event listeners
    setupEventListeners();

    console.log('Event listeners attached successfully');
    console.log('FFmpegWASM available:', typeof FFmpegWASM !== 'undefined');

    // Pre-load FFmpeg in the background after a short delay
    // This way it's ready when the user starts conversion
    setTimeout(() => {
        console.log('Pre-loading FFmpeg in background...');
        initFFmpeg()
            .then(success => {
                if (success) {
                    console.log('FFmpeg pre-loaded successfully!');
                    showToast('FFmpeg 已準備就緒', 'success');
                } else {
                    console.error('FFmpeg pre-load failed');
                }
            })
            .catch(err => {
                console.error('FFmpeg pre-load error:', err);
            });
    }, 1000);

    console.log('Video Compressor Web ready!');
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
