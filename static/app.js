document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const loadingOverlay = document.getElementById('loading-overlay');
    const resultArea = document.getElementById('result-area');
    const transcriptionText = document.getElementById('transcription-text');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');

    // Drag & Drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Copy button
    copyBtn.addEventListener('click', () => {
        const text = transcriptionText.innerText;
        navigator.clipboard.writeText(text).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
            }, 2000);
        });
    });

    // Download button
    downloadBtn.addEventListener('click', () => {
        const text = transcriptionText.innerText;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcription_${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    async function handleFile(file) {
        if (!file.type.startsWith('audio/')) {
            alert('音声ファイルを選択してください。');
            return;
        }

        fileInfo.textContent = `選択中: ${file.name}`;
        
        // Show loading
        loadingOverlay.classList.remove('hidden');
        resultArea.classList.add('hidden');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/transcribe', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                transcriptionText.textContent = data.text;
                resultArea.classList.remove('hidden');
            } else {
                const errorMessage = data.error || data.detail || '不明なエラー';
                alert(`エラーが発生しました: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert(`通信エラーが発生しました。\n詳細: ${error.message}`);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }
});
