// ==UserScript==
// @name         Direct Social Video Downloader (X, Instagram, TikTok)
// @namespace    https://github.com/custom-downloader
// @version      2.0.0
// @description  X (Twitter), Instagram ve TikTok videolarını reklamsız, yönlendirmesiz tek tıkla doğrudan MP4 olarak indirir.
// @author       Custom
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @match        https://www.instagram.com/*
// @match        https://www.tiktok.com/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Stil ve Bildirim (Toast) Tasarımı
    GM_addStyle(`
        .direct-dl-btn {
            position: fixed;
            z-index: 2147483647 !important;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(15, 15, 15, 0.85);
            border: 1.5px solid rgba(255, 255, 255, 0.25);
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            backdrop-filter: blur(6px);
            transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .direct-dl-btn:hover {
            background: #1d9bf0;
            border-color: #fff;
            transform: scale(1.08);
        }
        .direct-dl-btn svg {
            width: 22px;
            height: 22px;
            fill: #ffffff;
            pointer-events: none;
        }
        .direct-dl-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(20, 20, 20, 0.95);
            color: #fff;
            padding: 12px 18px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 2147483647;
            box-shadow: 0 6px 16px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.1);
            transition: opacity 0.25s ease;
        }
    `);

    function showToast(msg, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'direct-dl-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // İndirme İkonu
    function createDownloadButton() {
        const btn = document.createElement('div');
        btn.className = 'direct-dl-btn';
        btn.title = 'Videoyu İndir (MP4)';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M12 16l-5-5 1.41-1.41L11 12.17V4h2v8.17l2.59-2.58L17 11l-5 5zm-6 2h12v2H6v-2z"/>
            </svg>
        `;
        document.body.appendChild(btn);
        return btn;
    }

    // Videonun ait olduğu gönderi URL'sini bulur
    function resolvePostUrl(videoEl) {
        const host = location.hostname;

        if (host.includes('x.com') || host.includes('twitter.com')) {
            const article = videoEl.closest('article');
            if (article) {
                const statusLink = article.querySelector('a[href*="/status/"]');
                if (statusLink) return statusLink.href.split('?')[0];
            }
        }

        if (host.includes('instagram.com')) {
            const article = videoEl.closest('article');
            if (article) {
                const postLink = article.querySelector('a[href*="/reel/"], a[href*="/p/"], a[href*="/reels/"]');
                if (postLink) return postLink.href.split('?')[0];
            }
        }

        if (host.includes('tiktok.com')) {
            const container = videoEl.closest('[data-e2e="recommend-list-item-container"], [class*="DivItemContainer"]');
            if (container) {
                const videoLink = container.querySelector('a[href*="/video/"]');
                if (videoLink) return videoLink.href.split('?')[0];
            }
        }

        return location.href.split('?')[0];
    }

    // Doğrudan Blob/MP4 İndirme Fonksiyonu
    function downloadDirectFile(url, filename) {
        showToast('İndirme başlatıldı...');
        GM_download({
            url: url,
            name: filename,
            saveAs: false,
            onload: () => showToast('İndirme tamamlandı!'),
            onerror: () => {
                // GM_download başarısız olursa Blob fallback
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    onload: (res) => {
                        const blobUrl = URL.createObjectURL(res.response);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                        showToast('İndirme tamamlandı!');
                    },
                    onerror: () => showToast('İndirme başarısız oldu.')
                });
            }
        });
    }

    // Ana İndirme Yöneticisi
    async function handleDownload(videoEl) {
        if (!videoEl) return;

        const filename = `video_${Date.now()}.mp4`;
        const videoSrc = videoEl.currentSrc || videoEl.src;

        // 1. Eğer video doğrudan MP4 linki barındırıyorsa (blob: değilse) anında indir
        if (videoSrc && !videoSrc.startsWith('blob:')) {
            downloadDirectFile(videoSrc, filename);
            return;
        }

        // 2. Video MSE/Blob kullanıyorsa (X, TikTok, Reels) gönderi URL'sini çözümle
        const postUrl = resolvePostUrl(videoEl);
        showToast('Video kaynağı çözümleniyor...');

        // Açık kaynaklı API üzerinden doğrudan medya akışını çek (yeni sekme açmadan)
        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://api.cobalt.tools/api/json',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                url: postUrl,
                vQuality: '1080'
            }),
            onload: (res) => {
                try {
                    const data = JSON.parse(res.responseText);
                    if (data && data.url) {
                        downloadDirectFile(data.url, filename);
                    } else {
                        showToast('Doğrudan akış alınamadı, alternatif deneniyor...');
                        fallbackTikTokOrInsta(postUrl, filename);
                    }
                } catch (e) {
                    fallbackTikTokOrInsta(postUrl, filename);
                }
            },
            onerror: () => fallbackTikTokOrInsta(postUrl, filename)
        });
    }

    // TikTok ve X için Yedek Çözümleyici (Arka planda sessiz çalışır)
    function fallbackTikTokOrInsta(postUrl, filename) {
        if (postUrl.includes('tiktok.com')) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://www.tikwm.com/api/?url=${encodeURIComponent(postUrl)}`,
                onload: (res) => {
                    try {
                        const json = JSON.parse(res.responseText);
                        if (json?.data?.play) {
                            downloadDirectFile(json.data.play, filename);
                        } else {
                            showToast('Video kaynağı bulunamadı.');
                        }
                    } catch (e) {
                        showToast('Hata oluştu.');
                    }
                }
            });
        } else if (postUrl.includes('x.com') || postUrl.includes('twitter.com')) {
            const apiUrl = postUrl.replace(/(x\.com|twitter\.com)/, 'api.vxtwitter.com');
            GM_xmlhttpRequest({
                method: 'GET',
                url: apiUrl,
                onload: (res) => {
                    try {
                        const json = JSON.parse(res.responseText);
                        const mediaUrl = json?.media_extended?.[0]?.url;
                        if (mediaUrl) {
                            downloadDirectFile(mediaUrl, filename);
                        } else {
                            showToast('X videosu çözümlenemedi.');
                        }
                    } catch (e) {
                        showToast('X API hatası.');
                    }
                }
            });
        } else {
            showToast('Bu video doğrudan indirilemedi.');
        }
    }

    // Fare Takibi ve Buton Konumlandırma
    const downloadBtn = createDownloadButton();
    let activeVideo = null;

    function updateButtonPosition(video) {
        const rect = video.getBoundingClientRect();
        if (rect.width < 60 || rect.height < 60) {
            downloadBtn.style.display = 'none';
            return;
        }
        downloadBtn.style.display = 'flex';
        downloadBtn.style.top = `${Math.max(10, rect.top + 14)}px`;
        downloadBtn.style.left = `${Math.max(10, rect.right - 56)}px`;
    }

    window.addEventListener('mousemove', (e) => {
        const target = e.target;

        // Fare butonun üzerindeyse gizleme
        if (target === downloadBtn || downloadBtn.contains(target)) {
            return;
        }

        // Fare bir videonun üzerinde mi kontrol et
        const videos = document.querySelectorAll('video');
        let foundVideo = null;

        for (const v of videos) {
            const r = v.getBoundingClientRect();
            if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
                if (r.width > 60 && r.height > 60) {
                    foundVideo = v;
                    break;
                }
            }
        }

        if (foundVideo) {
            activeVideo = foundVideo;
            updateButtonPosition(foundVideo);
        } else {
            downloadBtn.style.display = 'none';
            activeVideo = null;
        }
    }, { passive: true });

    window.addEventListener('scroll', () => {
        if (activeVideo && downloadBtn.style.display === 'flex') {
            updateButtonPosition(activeVideo);
        }
    }, { passive: true, capture: true });

    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (activeVideo) {
            handleDownload(activeVideo);
        }
    });

})();